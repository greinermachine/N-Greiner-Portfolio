// PROJECTS PAGE: floating hand behavior for the home-door controls.
const projectHomes = document.querySelectorAll(".project-home[data-pointer-side]");

projectHomes.forEach((projectHome) => {
    const pointerHand = projectHome.querySelector(".pointer-hand");
    const homeDoor = projectHome.querySelector(".home-link img");
    const pointerSide = projectHome.dataset.pointerSide;

    if (!pointerHand || !homeDoor) {
        return;
    }

    let handIsFloating = false;
    let handIsDismissed = false;
    let handDocumentTop = 0;
    let handDocumentLeft = 0;
    const narrowViewport = window.matchMedia("(max-width: 40rem)");

    const measureHand = () => {
        const origin = pointerHand.getBoundingClientRect();
        handDocumentTop = origin.top + window.scrollY;
        handDocumentLeft = origin.left;
    };

    const updateHandDirection = () => {
        const hand = pointerHand.getBoundingClientRect();
        const door = homeDoor.getBoundingClientRect();
        const handCenterX = hand.left + hand.width / 2;
        const handCenterY = hand.top + hand.height / 2;
        const doorCenterX = door.left + door.width / 2;
        const doorCenterY = door.top + door.height / 2;
        const angleToDoor = Math.atan2(doorCenterY - handCenterY, doorCenterX - handCenterX) * 180 / Math.PI;

        // The supplied hand points left, so zero degrees already aims left.
        pointerHand.style.setProperty("--hand-angle", `${angleToDoor - 180}deg`);
    };

    const setHandFloating = (floating) => {
        handIsFloating = floating;

        if (floating) {
            pointerHand.style.setProperty("--hand-left", `${handDocumentLeft}px`);
        } else {
            pointerHand.style.removeProperty("--hand-left");
        }

        projectHome.classList.toggle("hand-floating", floating);
    };

    const updateHand = () => {
        if (narrowViewport.matches) {
            if (handIsFloating) {
                setHandFloating(false);
            }
            updateHandDirection();
            return;
        }

        if (!handIsFloating) {
            measureHand();
        }

        const viewportBottom = window.scrollY + window.innerHeight;
        const passedOriginalPosition = pointerSide === "bottom"
            ? viewportBottom < handDocumentTop - 24
            : window.scrollY > handDocumentTop + pointerHand.offsetHeight;
        const originalPositionIsVisible = pointerSide === "bottom"
            ? viewportBottom >= handDocumentTop - 24
            : window.scrollY <= Math.max(0, handDocumentTop - 24);

        if (originalPositionIsVisible) {
            handIsDismissed = false;
        }

        if (!handIsFloating && !handIsDismissed && passedOriginalPosition) {
            setHandFloating(true);
        } else if (handIsFloating && originalPositionIsVisible) {
            setHandFloating(false);
        }

        updateHandDirection();
    };

    pointerHand.addEventListener("click", () => {
        if (!handIsFloating) {
            return;
        }

        handIsDismissed = true;
        setHandFloating(false);
        pointerHand.blur();
    });

    window.addEventListener("scroll", updateHand, { passive: true });
    window.addEventListener("resize", updateHand);
    updateHand();
});
