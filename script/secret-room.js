(() => {
    const button = document.querySelector("#secret-switch");
    const door = document.querySelector("#secret-unlocked-door");
    const status = document.querySelector("#secret-light-status");
    const returnLink = document.querySelector("#secret-room-return");
    let lightsOn = true;
    let sawDark = false;

    try {
        const page = sessionStorage.getItem("secret-return-page");
        if (["index.html", "projects.html", "research.html", "animals.html", "about.html"].includes(page)) returnLink.href = page;
    } catch { /* The homepage is always available. */ }

    button.addEventListener("click", () => {
        lightsOn = !lightsOn;
        if (!lightsOn) sawDark = true;
        document.body.classList.toggle("is-dark", !lightsOn);
        button.setAttribute("aria-pressed", String(lightsOn));
        button.setAttribute("aria-label", lightsOn ? "Turn the lights off" : "Turn the lights on");
        door.hidden = !lightsOn || !sawDark;
        status.textContent = lightsOn
            ? (sawDark ? "The lights are on. A door has appeared." : "The lights are on.")
            : "The lights are off. The room is dark and foggy.";
    });
    button.disabled = false;
})();
