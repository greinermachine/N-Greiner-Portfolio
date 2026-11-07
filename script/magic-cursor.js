// Keep a chosen magic cursor for this tab while the visitor explores the site.
(() => {
    const icons = ["mouse_icon1.gif", "mouse_icon2.gif", "mouse_icon3.gif", "mouse_iconDEAFULT.gif"];
    let selected = -1;
    let cursor = null;
    try {
        const saved = sessionStorage.getItem("portfolio-magic-cursor");
        if (saved !== null && Number.isInteger(Number(saved)) && Number(saved) >= 0 && Number(saved) < icons.length) selected = Number(saved);
    } catch { /* The cursor can still be changed in the magic room. */ }

    function select(index) {
        if (!Number.isInteger(index) || index < 0 || index >= icons.length) return;
        selected = index;
        if (!cursor) {
            cursor = document.createElement("img");
            cursor.id = "magic-cursor";
            cursor.className = "magic-cursor";
            cursor.alt = "";
            cursor.setAttribute("aria-hidden", "true");
            cursor.width = cursor.height = 20;
            cursor.hidden = true;
            document.body.append(cursor);
        }
        const url = new URL(icons[index], document.baseURI).href;
        cursor.src = url;
        document.body.style.setProperty("--magic-static-cursor", `url("${url}") 0 0, auto`);
    }

    function move(x, y, target) {
        if (!cursor) return;
        // The pool table draws its own cue pointer; do not cover it.
        if (target && target.id === "pool-table") {
            cursor.hidden = true;
            return;
        }
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
        cursor.hidden = false;
        document.body.classList.add("magic-cursor-active");
    }

    if (selected >= 0) select(selected);
    window.addEventListener("magic-cursor-change", event => {
        select(event.detail.index);
        if (event.detail.pointer) move(event.detail.x, event.detail.y, document.elementFromPoint(event.detail.x, event.detail.y));
    });
    document.addEventListener("pointermove", event => {
        if (event.pointerType === "mouse" && selected >= 0) move(event.clientX, event.clientY, event.target);
    }, { passive: true });
    document.addEventListener("pointerout", event => {
        if (cursor && !event.relatedTarget) cursor.hidden = true;
    });
})();
