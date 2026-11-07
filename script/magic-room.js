(() => {
    const button = document.querySelector("#magic-ball");
    const status = document.querySelector("#magic-status");
    const wall = document.querySelector("#magic-wall");
    const icons = ["mouse_icon1.gif", "mouse_icon2.gif", "mouse_icon3.gif", "mouse_iconDEAFULT.gif"];
    let current = -1;
    try {
        const saved = Number(sessionStorage.getItem("portfolio-magic-cursor"));
        if (sessionStorage.getItem("portfolio-magic-cursor") !== null && Number.isInteger(saved) && saved >= 0 && saved < icons.length) current = saved;
    } catch { /* Start with the first cursor if session storage is unavailable. */ }

    button.addEventListener("click", event => {
        current = (current + 1) % icons.length;
        try { sessionStorage.setItem("portfolio-magic-cursor", String(current)); } catch { /* It still works in this room. */ }
        const mouseClick = event.detail !== 0 && (event.pointerType
            ? event.pointerType === "mouse"
            : window.matchMedia("(hover: hover) and (pointer: fine)").matches);
        window.dispatchEvent(new CustomEvent("magic-cursor-change", {
            detail: { index: current, x: event.clientX, y: event.clientY, pointer: mouseClick }
        }));
        status.textContent = `Pointer ${current + 1} of ${icons.length} selected.`;
    });
    button.disabled = false;

    // Render names as text, never HTML. Fetch every page instead of silently
    // stopping at the database API's default row limit.
    async function loadNames() {
        const endpoint = "https://turpqldwvyhtadvssgfo.supabase.co/rest/v1/rpc/get_guestbook_names";
        const key = "sb_publishable_ijL5eQi3z3I6pEDu_nw0Cg_3GIvZVm_";
        const pageSize = 500;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const names = [];
        try {
            for (let offset = 0; ; offset += pageSize) {
                const response = await fetch(`${endpoint}?limit=${pageSize}&offset=${offset}`, {
                    headers: { "apikey": key }, signal: controller.signal, cache: "no-store"
                });
                if (!response.ok) throw new Error("Guestbook unavailable");
                const rows = await response.json();
                if (!Array.isArray(rows)) throw new Error("Invalid guestbook response");
                rows.forEach(row => {
                    if (typeof row.display_name !== "string" || row.display_name.length > 24) throw new Error("Invalid name");
                    names.push(row.display_name);
                });
                if (rows.length < pageSize) break;
            }
            const fragment = document.createDocumentFragment();
            names.forEach(name => {
                const entry = document.createElement("span");
                entry.textContent = name;
                fragment.append(entry);
            });
            wall.replaceChildren(fragment);
        } catch {
            wall.textContent = "The writing on the wall is unavailable.";
        } finally {
            clearTimeout(timeout);
        }
    }
    loadNames();
})();
