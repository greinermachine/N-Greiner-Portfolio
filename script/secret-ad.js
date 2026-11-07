// SECRET AD: independently roll once on each ordinary page load.
(() => {
    const appearanceChance = 0.25;
    if (Math.random() >= appearanceChance) return;

    const panel = document.createElement("aside");
    panel.className = "secret-ad";
    panel.setAttribute("aria-label", "Advertisement");
    panel.innerHTML = `
        <div class="secret-ad-banner">
            <img class="secret-ad-art" src="fakeAD.gif" alt="Advertisement" width="468" height="60">
            <span class="secret-ad-still">[ special offer! ]</span>
            <button class="secret-ad-close" type="button" aria-label="Close advertisement">
                <img src="close_me.gif" alt="" width="32" height="32">
            </button>
        </div>
        <a class="secret-ad-door" href="secret-room.html" aria-label="Enter the little door" hidden>
            <img src="door.gif" alt="" width="32" height="32"><span class="secret-ad-door-still">[door]</span>
        </a>`;
    const banner = panel.querySelector(".secret-ad-banner");
    const close = panel.querySelector(".secret-ad-close");
    const door = panel.querySelector(".secret-ad-door");
    close.addEventListener("click", () => {
        banner.hidden = true;
        door.hidden = false;
        door.focus({ preventScroll: true });
    });
    door.addEventListener("click", () => {
        const current = location.pathname.split("/").pop() || "index.html";
        if (["index.html", "projects.html", "research.html", "animals.html", "about.html"].includes(current)) {
            try { sessionStorage.setItem("secret-return-page", current); } catch { /* The homepage is the fallback. */ }
        }
    });
    document.body.append(panel);
})();
