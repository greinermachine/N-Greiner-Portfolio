// ABOUT PAGE: a small, self-contained single-player pool practice table.
// The wallet uses native <details>, so it does not depend on JavaScript.
(() => {
    const wallet = document.querySelector(".about-wallet");
    const walletClose = document.querySelector("#wallet-close");
    if (wallet && walletClose) {
        walletClose.hidden = false;
        walletClose.addEventListener("click", () => {
            wallet.open = false;
            wallet.querySelector("summary").focus({ preventScroll: true });
        });
    }

    const canvas = document.querySelector("#pool-table");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const controls = document.querySelector("#pool-controls");
    const aimInput = document.querySelector("#pool-aim");
    const powerInput = document.querySelector("#pool-power");
    const angleValue = document.querySelector("#pool-angle-value");
    const powerValue = document.querySelector("#pool-power-value");
    const sideSpinInput = document.querySelector("#pool-side-spin");
    const rollSpinInput = document.querySelector("#pool-roll-spin");
    const sideSpinValue = document.querySelector("#pool-side-value");
    const rollSpinValue = document.querySelector("#pool-roll-value");
    const spinPad = document.querySelector("#pool-spin-pad");
    const spinDot = document.querySelector("#pool-spin-dot");
    const spinReset = document.querySelector("#pool-spin-reset");
    const shootButton = document.querySelector("#pool-shoot");
    const resetButton = document.querySelector("#pool-reset");
    const chalkButton = document.querySelector("#pool-chalk");
    const status = document.querySelector("#pool-status");
    const remainingLabel = document.querySelector("#pool-remaining");
    const shotsLabel = document.querySelector("#pool-shots");

    const table = { left: 40, right: 600, top: 40, bottom: 320 };
    // Keep the original table coordinates and add an input area around them.
    const inputMargin = 56;
    const tableWidth = 640;
    const tableHeight = 360;
    const radius = 9;
    const pocketRadius = 17;
    const stepSeconds = 1 / 120;
    const pockets = [
        [table.left, table.top], [320, table.top], [table.right, table.top],
        [table.left, table.bottom], [320, table.bottom], [table.right, table.bottom]
    ];
    const colors = {
        1: "#e4b92e", 2: "#2f5bb1", 3: "#b33b32", 4: "#80539b",
        5: "#df812b", 6: "#397b54", 7: "#8d3534", 8: "#1a1a1a",
        9: "#e4b92e", 10: "#2f5bb1", 11: "#b33b32", 12: "#80539b",
        13: "#df812b", 14: "#397b54", 15: "#8d3534"
    };
    const chalkColors = ["#78a9d0", "#d8b76d", "#b88ab7", "#85b786"];
    let balls = [];
    let shots = 0;
    let angle = 0;
    let gameOver = false;
    let moving = false;
    let dragging = null;
    let frameId = null;
    let lastFrame = null;
    let accumulator = 0;
    let pocketedThisShot = [];
    let scratched = false;
    let eightWasLegal = false;
    let chalkIndex = 0;
    let chalkCount = 0;
    let pointer = null;
    let drawRequest = null;

    const cueBall = () => balls[0];
    const remaining = () => balls.filter(ball => ball.number !== 0 && ball.active).length;
    const stillOnTable = () => balls.filter(ball => ball.number !== 0 && ball.number !== 8 && ball.active).length;
    const makeBall = (number, x, y) => ({ number, x, y, vx: 0, vy: 0, sideSpin: 0, rollSpin: 0, active: true });

    function updateScore() {
        remainingLabel.textContent = `BALLS LEFT: ${remaining()}`;
        shotsLabel.textContent = `SHOTS: ${shots}`;
    }

    function updateControls() {
        const degrees = ((Math.round(angle * 180 / Math.PI) % 360) + 360) % 360;
        aimInput.value = degrees;
        angleValue.textContent = `${degrees}°`;
        powerValue.textContent = `${powerInput.value}%`;
        shootButton.disabled = moving || gameOver;
    }

    function updateSpin() {
        const side = Number(sideSpinInput.value);
        const roll = Number(rollSpinInput.value);
        const sideText = side === 0 ? "center" : `${Math.abs(side)}% ${side < 0 ? "left" : "right"}`;
        const rollText = roll === 0 ? "center" : `${Math.abs(roll)}% ${roll < 0 ? "draw" : "follow"}`;
        sideSpinValue.textContent = sideText;
        rollSpinValue.textContent = rollText;
        sideSpinInput.setAttribute("aria-valuetext", sideText);
        rollSpinInput.setAttribute("aria-valuetext", rollText);
        spinDot.style.left = `${50 + side * 0.32}%`;
        spinDot.style.top = `${50 - roll * 0.32}%`;
    }

    // Coalesce rapid pointer events into one paint per frame.
    function requestDraw() {
        if (moving || drawRequest !== null) return;
        drawRequest = requestAnimationFrame(() => {
            drawRequest = null;
            draw();
        });
    }

    function resetGame() {
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
        lastFrame = null;
        accumulator = 0;
        moving = false;
        gameOver = false;
        dragging = null;
        shots = 0;
        angle = 0;
        powerInput.value = 55;
        sideSpinInput.value = rollSpinInput.value = 0;
        pocketedThisShot = [];
        scratched = false;
        eightWasLegal = false;
        // A normal fifteen-ball rack, with the 8 in the middle.
        const rack = [[1], [9, 2], [10, 8, 3], [11, 4, 12, 5], [6, 13, 7, 14, 15]];
        const spacing = radius * 2 + 0.35;
        balls = [makeBall(0, 180, 180)];
        rack.forEach((row, rowIndex) => row.forEach((number, ballIndex) => {
            balls.push(makeBall(number, 425 + rowIndex * spacing * Math.sqrt(3) / 2,
                180 + (ballIndex - rowIndex / 2) * spacing));
        }));
        status.textContent = "Ready when you are. Try breaking the rack!";
        updateScore();
        updateControls();
        updateSpin();
        draw();
    }

    function cushionDistance(x, y, dx, dy) {
        let distance = Infinity;
        if (dx > 0) distance = Math.min(distance, (table.right - radius - x) / dx);
        if (dx < 0) distance = Math.min(distance, (table.left + radius - x) / dx);
        if (dy > 0) distance = Math.min(distance, (table.bottom - radius - y) / dy);
        if (dy < 0) distance = Math.min(distance, (table.top + radius - y) / dy);
        return Math.max(0, distance);
    }

    // Find the first object the cue ball would touch, accounting for both balls' radii.
    function aimGuide(dx, dy) {
        const cue = cueBall();
        let distance = cushionDistance(cue.x, cue.y, dx, dy);
        let target = null;
        balls.slice(1).forEach(ball => {
            if (!ball.active) return;
            const x = ball.x - cue.x;
            const y = ball.y - cue.y;
            const along = x * dx + y * dy;
            const perpendicularSquared = x * x + y * y - along * along;
            const collisionRadius = radius * 2;
            if (along > 0 && perpendicularSquared < collisionRadius * collisionRadius) {
                const hit = along - Math.sqrt(collisionRadius * collisionRadius - perpendicularSquared);
                if (hit >= 0 && hit < distance) {
                    distance = hit;
                    target = ball;
                }
            }
        });
        if (!target) return { distance, target: null };
        const contact = { x: cue.x + dx * distance, y: cue.y + dy * distance };
        const normalX = target.x - contact.x;
        const normalY = target.y - contact.y;
        const normalLength = Math.hypot(normalX, normalY);
        const targetDx = normalX / normalLength;
        const targetDy = normalY / normalLength;
        return { distance, target, contact, targetDx, targetDy,
            targetLength: Math.min(90, cushionDistance(target.x, target.y, targetDx, targetDy)) };
    }

    function drawBall(ball) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.number === 0 ? "#f7f5e9" : colors[ball.number];
        ctx.fill();
        ctx.strokeStyle = "#262626";
        ctx.lineWidth = 0.7;
        ctx.stroke();
        if (ball.number > 8) {
            ctx.clip();
            ctx.fillStyle = "#f5f2e5";
            ctx.fillRect(ball.x - radius, ball.y - radius, radius * 2, radius * 0.48);
            ctx.fillRect(ball.x - radius, ball.y + radius * 0.52, radius * 2, radius * 0.48);
        }
        ctx.restore();
        if (ball.number === 0) {
            // The cue ball is very serious about this extremely serious game.
            ctx.fillStyle = "#302d29";
            ctx.beginPath();
            ctx.arc(ball.x - 2.5, ball.y - 1.2, 0.9, 0, Math.PI * 2);
            ctx.arc(ball.x + 2.5, ball.y - 1.2, 0.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.strokeStyle = "#302d29";
            ctx.lineWidth = 0.8;
            if (moving) {
                ctx.arc(ball.x, ball.y + 3, 1.1, 0, Math.PI * 2);
            } else {
                ctx.moveTo(ball.x - 2, ball.y + 2);
                ctx.quadraticCurveTo(ball.x, ball.y + 4, ball.x + 2, ball.y + 2);
            }
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, 5.2, 0, Math.PI * 2);
            ctx.fillStyle = "#faf9f3";
            ctx.fill();
            ctx.fillStyle = "#111";
            ctx.font = "bold 7px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(ball.number), ball.x, ball.y + 0.3);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // This plain margin is part of the interactive canvas, not the playing surface.
        ctx.fillStyle = "#e7e3d8";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#b4aea0";
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
        ctx.save();
        ctx.translate(inputMargin, inputMargin);
        // Flat colors and simple lines keep the table at home on the old-web page.
        ctx.fillStyle = "#68472f";
        ctx.fillRect(0, 0, 640, 360);
        ctx.strokeStyle = "#a78256";
        ctx.lineWidth = 4;
        ctx.strokeRect(5, 5, 630, 350);
        ctx.fillStyle = "#1d4934";
        ctx.fillRect(23, 23, 594, 314);
        ctx.fillStyle = "#286746";
        ctx.fillRect(table.left, table.top, table.right - table.left, table.bottom - table.top);
        ctx.fillStyle = "#e4d4b4";
        [180, 320, 460].forEach(x => {
            ctx.fillRect(x - 2, 12, 4, 4);
            ctx.fillRect(x - 2, 344, 4, 4);
        });
        pockets.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, pocketRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#151512";
            ctx.fill();
            ctx.strokeStyle = "#3d2b1d";
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        const cue = cueBall();
        if (!moving && !gameOver && cue.active) {
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            const guide = aimGuide(dx, dy);
            ctx.save();
            ctx.setLineDash([5, 6]);
            ctx.strokeStyle = "rgba(255,255,240,0.8)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cue.x + dx * radius, cue.y + dy * radius);
            ctx.lineTo(cue.x + dx * guide.distance, cue.y + dy * guide.distance);
            ctx.stroke();
            ctx.restore();
            if (guide.target) {
                // Gold indicates the target ball's initial direction, not a
                // prediction of subsequent collisions, pockets, or spin.
                const target = guide.target;
                const targetX = target.x + guide.targetDx * guide.targetLength;
                const targetY = target.y + guide.targetDy * guide.targetLength;
                ctx.save();
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = "#ffd978";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(target.x, target.y);
                ctx.lineTo(targetX, targetY);
                ctx.stroke();
                ctx.setLineDash([]);
                if (guide.targetLength > radius + 5) {
                    ctx.beginPath();
                    ctx.moveTo(targetX, targetY);
                    ctx.lineTo(targetX - guide.targetDx * 8 - guide.targetDy * 4,
                        targetY - guide.targetDy * 8 + guide.targetDx * 4);
                    ctx.moveTo(targetX, targetY);
                    ctx.lineTo(targetX - guide.targetDx * 8 + guide.targetDy * 4,
                        targetY - guide.targetDy * 8 - guide.targetDx * 4);
                    ctx.stroke();
                }
                ctx.strokeStyle = "rgba(255,255,240,0.6)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(guide.contact.x, guide.contact.y, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            const pull = dragging ? dragging.pull : 0;
            const tipX = cue.x - dx * (radius + 6 + pull);
            const tipY = cue.y - dy * (radius + 6 + pull);
            ctx.lineCap = "round";
            ctx.lineWidth = 7;
            ctx.strokeStyle = "#b48b55";
            ctx.beginPath();
            ctx.moveTo(cue.x - dx * (radius + 140 + pull), cue.y - dy * (radius + 140 + pull));
            ctx.lineTo(tipX, tipY);
            ctx.stroke();
            ctx.lineWidth = 4;
            ctx.strokeStyle = chalkColors[chalkIndex];
            ctx.beginPath();
            ctx.moveTo(tipX - dx * 4, tipY - dy * 4);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();
            ctx.lineCap = "butt";
        }
        balls.forEach(ball => { if (ball.active) drawBall(ball); });
        // The system cursor stays hidden over the table. A tiny drawn pointer
        // remains visible even while balls are moving, avoiding cursor swaps.
        if (pointer) {
            ctx.beginPath();
            ctx.arc(pointer.x, pointer.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = "#f7f5e9";
            ctx.fill();
            ctx.strokeStyle = "#30302c";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    }

    function pocketBall(ball) {
        ball.active = false;
        ball.vx = ball.vy = 0;
        if (ball.number === 0) {
            scratched = true;
        } else {
            if (ball.number === 8) eightWasLegal = stillOnTable() === 0;
            pocketedThisShot.push(ball.number);
        }
        updateScore();
    }

    function stepPhysics(dt) {
        const friction = Math.exp(-0.75 * dt);
        const spinFriction = Math.exp(-0.55 * dt);
        balls.forEach(ball => {
            if (!ball.active) return;
            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;
            if (pockets.some(([x, y]) => Math.hypot(ball.x - x, ball.y - y) < pocketRadius)) {
                pocketBall(ball);
                return;
            }
            if (ball.x < table.left + radius) {
                ball.x = table.left + radius;
                const incoming = ball.vx;
                ball.vx = Math.abs(ball.vx) * 0.86;
                ball.vy += Math.sign(incoming) * ball.sideSpin * Math.min(Math.abs(incoming) * 0.35, 140);
                ball.sideSpin *= 0.65;
            } else if (ball.x > table.right - radius) {
                ball.x = table.right - radius;
                const incoming = ball.vx;
                ball.vx = -Math.abs(ball.vx) * 0.86;
                ball.vy += Math.sign(incoming) * ball.sideSpin * Math.min(Math.abs(incoming) * 0.35, 140);
                ball.sideSpin *= 0.65;
            }
            if (ball.y < table.top + radius) {
                ball.y = table.top + radius;
                const incoming = ball.vy;
                ball.vy = Math.abs(ball.vy) * 0.86;
                ball.vx -= Math.sign(incoming) * ball.sideSpin * Math.min(Math.abs(incoming) * 0.35, 140);
                ball.sideSpin *= 0.65;
            } else if (ball.y > table.bottom - radius) {
                ball.y = table.bottom - radius;
                const incoming = ball.vy;
                ball.vy = -Math.abs(ball.vy) * 0.86;
                ball.vx -= Math.sign(incoming) * ball.sideSpin * Math.min(Math.abs(incoming) * 0.35, 140);
                ball.sideSpin *= 0.65;
            }
            ball.vx *= friction;
            ball.vy *= friction;
            // Rolling resistance brings slow balls to rest instead of letting
            // them coast forever; the remaining spin fades over the cloth.
            const speed = Math.hypot(ball.vx, ball.vy);
            if (speed > 0) {
                const rollingScale = Math.max(0, speed - 9 * dt) / speed;
                ball.vx *= rollingScale;
                ball.vy *= rollingScale;
            }
            ball.sideSpin *= spinFriction;
            ball.rollSpin *= spinFriction;
        });

        for (let i = 0; i < balls.length; i += 1) {
            const a = balls[i];
            if (!a.active) continue;
            for (let j = i + 1; j < balls.length; j += 1) {
                const b = balls[j];
                if (!b.active) continue;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const distance = Math.hypot(dx, dy);
                if (distance >= radius * 2) continue;
                const nx = distance ? dx / distance : 1;
                const ny = distance ? dy / distance : 0;
                const overlap = (radius * 2 - distance) / 2;
                a.x -= nx * overlap;
                a.y -= ny * overlap;
                b.x += nx * overlap;
                b.y += ny * overlap;
                const relativeSpeed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                if (relativeSpeed < 0) {
                    const cue = a.number === 0 ? a : b.number === 0 ? b : null;
                    const cueSpeed = cue ? Math.hypot(cue.vx, cue.vy) : 0;
                    const cueDirX = cueSpeed ? cue.vx / cueSpeed : 0;
                    const cueDirY = cueSpeed ? cue.vy / cueSpeed : 0;
                    const impulse = -(1 + 0.96) * relativeSpeed / 2;
                    a.vx -= impulse * nx;
                    a.vy -= impulse * ny;
                    b.vx += impulse * nx;
                    b.vy += impulse * ny;
                    if (cue && cueSpeed > 1 && Math.abs(relativeSpeed) > 5) {
                        // A small amount of stored forward/backward spin becomes
                        // cue-ball motion after impact (a simple follow/draw model).
                        const kick = Math.max(-Math.abs(relativeSpeed) * 0.55,
                            Math.min(Math.abs(relativeSpeed) * 0.55, cue.rollSpin));
                        cue.vx += cueDirX * kick;
                        cue.vy += cueDirY * kick;
                        cue.rollSpin *= 0.2;
                    }
                }
            }
        }

        let hasMotion = false;
        balls.forEach(ball => {
            if (!ball.active) return;
            if (Math.hypot(ball.vx, ball.vy) < 4) ball.vx = ball.vy = 0;
            else hasMotion = true;
        });
        return hasMotion;
    }

    function respotCue() {
        const cue = cueBall();
        const spots = [[180, 180]];
        for (let x = table.left + radius + 2; x <= table.right - radius - 2; x += 22) {
            for (let y = table.top + radius + 2; y <= table.bottom - radius - 2; y += 22) spots.push([x, y]);
        }
        const spot = spots.find(([x, y]) =>
            !pockets.some(([px, py]) => Math.hypot(x - px, y - py) < pocketRadius + radius) &&
            balls.every(ball => ball === cue || !ball.active || Math.hypot(x - ball.x, y - ball.y) >= radius * 2 + 1));
        if (!spot) return false;
        [cue.x, cue.y] = spot;
        cue.vx = cue.vy = 0;
        cue.sideSpin = cue.rollSpin = 0;
        cue.active = true;
        return true;
    }

    function finishShot() {
        moving = false;
        frameId = null;
        lastFrame = null;
        accumulator = 0;
        if (pocketedThisShot.includes(8)) {
            gameOver = true;
            status.textContent = eightWasLegal
                ? `You cleared the table in ${shots} ${shots === 1 ? "shot" : "shots"}! The crowd goes mildly wild.`
                : "The 8 went in early. The table wins this round. Rack 'em again?";
        } else if (scratched) {
            if (respotCue()) status.textContent = "Scratch! The cue ball is back. It has learned nothing.";
            else {
                gameOver = true;
                status.textContent = "No room to return the cue ball. Please rack 'em again.";
            }
        } else if (pocketedThisShot.length) {
            status.textContent = `${pocketedThisShot.length} ${pocketedThisShot.length === 1 ? "ball" : "balls"} pocketed. The crowd (one cue ball) applauds.`;
        } else {
            status.textContent = stillOnTable() === 0 ? "Only the 8 is left. You know what to do." : "Your turn again. The table is being very patient.";
        }
        updateScore();
        updateControls();
        draw();
    }

    function tick(timestamp) {
        if (!moving) return;
        if (lastFrame === null) lastFrame = timestamp;
        accumulator += Math.min((timestamp - lastFrame) / 1000, 0.1);
        lastFrame = timestamp;
        while (accumulator >= stepSeconds) {
            accumulator -= stepSeconds;
            if (!stepPhysics(stepSeconds)) {
                finishShot();
                return;
            }
        }
        draw();
        frameId = requestAnimationFrame(tick);
    }

    function shoot(power) {
        if (moving || gameOver || !cueBall().active) return;
        const speed = 180 + Math.max(0.15, Math.min(1, power)) * 620;
        cueBall().vx = Math.cos(angle) * speed;
        cueBall().vy = Math.sin(angle) * speed;
        // Keep extreme diagonal selections within one unit of spin.
        const side = Number(sideSpinInput.value) / 100;
        const roll = Number(rollSpinInput.value) / 100;
        const spinScale = Math.max(1, Math.hypot(side, roll));
        cueBall().sideSpin = side / spinScale;
        cueBall().rollSpin = speed * 0.55 * roll / spinScale;
        shots += 1;
        pocketedThisShot = [];
        scratched = false;
        eightWasLegal = false;
        moving = true;
        status.textContent = "Balls in motion...";
        updateScore();
        updateControls();
        frameId = requestAnimationFrame(tick);
    }

    function pointerPosition(event) {
        const rect = canvas.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * canvas.width / rect.width - inputMargin,
            y: (event.clientY - rect.top) * canvas.height / rect.height - inputMargin };
    }

    // Near an edge, scale the pull to the space available behind the pointer.
    function availablePull(position, dx, dy) {
        let distance = Infinity;
        if (dx > 0) distance = Math.min(distance, (position.x + inputMargin) / dx);
        if (dx < 0) distance = Math.min(distance, (tableWidth + inputMargin - position.x) / -dx);
        if (dy > 0) distance = Math.min(distance, (position.y + inputMargin) / dy);
        if (dy < 0) distance = Math.min(distance, (tableHeight + inputMargin - position.y) / -dy);
        return Math.max(8, Math.min(100, distance - 3));
    }

    function pointCueAt(position) {
        const cue = cueBall();
        const dx = cue.x - position.x;
        const dy = cue.y - position.y;
        // A small dead zone prevents the cue from jumping as the pointer
        // crosses the middle of the cue ball.
        if (Math.hypot(dx, dy) > radius * 3) angle = Math.atan2(dy, dx);
        updateControls();
        requestDraw();
    }

    canvas.addEventListener("pointermove", event => {
        const position = pointerPosition(event);
        if (event.pointerType === "mouse") {
            pointer = position.x >= -inputMargin && position.x <= tableWidth + inputMargin &&
                position.y >= -inputMargin && position.y <= tableHeight + inputMargin ? position : null;
        }
        if (moving || gameOver) {
            requestDraw();
            return;
        }
        if (dragging && event.pointerId === dragging.pointerId) {
            const dx = position.x - dragging.start.x;
            const dy = position.y - dragging.start.y;
            dragging.pull = Math.max(0, Math.min(dragging.maxPull, -(dx * Math.cos(angle) + dy * Math.sin(angle))));
            if (dragging.pull > 4) powerInput.value = Math.round((15 + dragging.pull / dragging.maxPull * 85) / 5) * 5;
            updateControls();
            requestDraw();
        } else if (!dragging && event.pointerType !== "touch") {
            pointCueAt(position);
        }
    });

    canvas.addEventListener("pointerleave", event => {
        if (event.pointerType === "mouse") {
            pointer = null;
            requestDraw();
        }
    });

    canvas.addEventListener("pointerdown", event => {
        if (moving || gameOver || dragging || (event.pointerType === "mouse" && event.button !== 0)) return;
        event.preventDefault();
        const position = pointerPosition(event);
        if (event.pointerType === "mouse") pointer = position;
        pointCueAt(position);
        dragging = { pointerId: event.pointerId, start: position, pull: 0,
            maxPull: availablePull(position, Math.cos(angle), Math.sin(angle)) };
        canvas.setPointerCapture(event.pointerId);
        requestDraw();
    });

    canvas.addEventListener("pointerup", event => {
        if (!dragging || dragging.pointerId !== event.pointerId) return;
        const power = dragging.pull > 4 ? Number(powerInput.value) / 100 : 0.55;
        dragging = null;
        shoot(power);
    });

    canvas.addEventListener("pointercancel", event => {
        if (!dragging || dragging.pointerId !== event.pointerId) return;
        dragging = null;
        requestDraw();
    });

    canvas.addEventListener("lostpointercapture", event => {
        if (!dragging || dragging.pointerId !== event.pointerId) return;
        dragging = null;
        requestDraw();
    });

    canvas.addEventListener("keydown", event => {
        if (moving || gameOver) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            angle += (event.key === "ArrowRight" ? 1 : -1) * Math.PI / 180 * (event.shiftKey ? 10 : 2);
            updateControls();
            draw();
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            powerInput.value = Math.max(15, Math.min(100, Number(powerInput.value) + (event.key === "ArrowUp" ? 5 : -5)));
            updateControls();
        } else if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            shoot(Number(powerInput.value) / 100);
        }
    });

    aimInput.addEventListener("input", () => {
        angle = Number(aimInput.value) * Math.PI / 180;
        updateControls();
        draw();
    });
    powerInput.addEventListener("input", updateControls);
    sideSpinInput.addEventListener("input", updateSpin);
    rollSpinInput.addEventListener("input", updateSpin);

    function setSpinFromPointer(event) {
        const rect = spinPad.getBoundingClientRect();
        const side = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
        const roll = Math.max(-1, Math.min(1, 1 - (event.clientY - rect.top) / rect.height * 2));
        sideSpinInput.value = Math.round(side * 10) * 10;
        rollSpinInput.value = Math.round(roll * 10) * 10;
        updateSpin();
    }

    spinPad.addEventListener("pointerdown", event => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        spinPad.setPointerCapture(event.pointerId);
        setSpinFromPointer(event);
    });
    spinPad.addEventListener("pointermove", event => {
        if (spinPad.hasPointerCapture(event.pointerId)) setSpinFromPointer(event);
    });
    spinPad.addEventListener("keydown", event => {
        if (event.key === "Home") {
            event.preventDefault();
            sideSpinInput.value = rollSpinInput.value = 0;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            sideSpinInput.value = Math.max(-100, Math.min(100, Number(sideSpinInput.value) + (event.key === "ArrowRight" ? 10 : -10)));
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            rollSpinInput.value = Math.max(-100, Math.min(100, Number(rollSpinInput.value) + (event.key === "ArrowUp" ? 10 : -10)));
        } else return;
        updateSpin();
    });
    spinReset.addEventListener("click", () => {
        sideSpinInput.value = rollSpinInput.value = 0;
        updateSpin();
    });
    shootButton.addEventListener("click", () => shoot(Number(powerInput.value) / 100));
    resetButton.addEventListener("click", resetGame);
    chalkButton.addEventListener("click", () => {
        chalkIndex = (chalkIndex + 1) % chalkColors.length;
        chalkCount += 1;
        const notes = ["Cue chalked. It believes in itself.", "Cue chalked again. It would like a raise.", "Cue chalked. The chalk is now mostly cue."];
        status.textContent = notes[Math.min(chalkCount - 1, notes.length - 1)];
        draw();
    });
    document.addEventListener("visibilitychange", () => {
        // Never simulate a hidden tab's entire elapsed time in one frame.
        lastFrame = null;
    });
    // Keep the cursor style constant throughout aiming, dragging, and motion.
    canvas.style.cursor = "none";
    controls.disabled = false;
    resetGame();
})();
