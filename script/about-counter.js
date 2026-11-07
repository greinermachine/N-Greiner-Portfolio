// ABOUT PAGE: a shared, self-reported real-person counter.
// This is a publishable browser key, not a server secret.
(() => {
    const display = document.querySelector("#about-visit-count");
    const button = document.querySelector("#real-person-button");
    const status = document.querySelector("#real-person-status");
    const nameInput = document.querySelector("#guestbook-name");
    const dialog = document.querySelector("#guestbook-dialog");
    const message = document.querySelector("#guestbook-dialog-message");
    if (!display || !button || !status || !nameInput || !dialog || !message) return;

    const api = "https://turpqldwvyhtadvssgfo.supabase.co/rest/v1/rpc/";
    const publicKey = "sb_publishable_ijL5eQi3z3I6pEDu_nw0Cg_3GIvZVm_";
    const idKey = "portfolio-real-person-id-v1";
    const countedKey = "portfolio-real-person-counted-v1";
    let inMemoryId = null;
    let counted = false;
    try { counted = localStorage.getItem(countedKey) === "yes"; } catch { /* Storage is optional. */ }

    // One random ID per browser, kept for retries and duplicate suppression.
    function personId() {
        if (inMemoryId) return inMemoryId;
        try {
            const saved = localStorage.getItem(idKey);
            if (saved) return (inMemoryId = saved);
        } catch { /* Use an in-memory ID when browser storage is blocked. */ }
        inMemoryId = crypto.randomUUID();
        try { localStorage.setItem(idKey, inMemoryId); } catch { /* The current page can still retry. */ }
        return inMemoryId;
    }

    function showCount(count) {
        if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid count");
        display.textContent = String(count).padStart(6, "0");
    }

    function updateButton() {
        button.disabled = counted;
        nameInput.readOnly = counted;
        button.setAttribute("aria-label", counted ? "Guestbook signed" : "Sign my guestbook");
    }

    async function request(path, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
            const response = await fetch(api + path, {
                ...options,
                headers: { "apikey": publicKey, ...options.headers },
                signal: controller.signal,
                cache: "no-store"
            });
            if (!response.ok) throw new Error("Counter unavailable");
            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    button.addEventListener("click", async () => {
        if (counted || button.disabled) return;
        const name = nameInput.value.trim();
        if (name.length > 24 || /[\x00-\x1f\x7f]/.test(name)) {
            status.textContent = "please use a name of 24 characters or less";
            nameInput.focus();
            return;
        }
        button.disabled = true;
        status.textContent = "signing...";
        try {
            const count = await request("sign_real_person_guestbook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ p_person_id: personId(), p_display_name: name || null })
            });
            showCount(count);
            counted = true;
            try { localStorage.setItem(countedKey, "yes"); } catch { /* Server still deduplicates retries. */ }
            status.textContent = "thanks for signing!";
            message.textContent = name
                ? "Your name is forever immortalized into my portfolio :), thank you, perhaps try finding it."
                : "Thanks for signing my guestbook!";
            if (typeof dialog.showModal === "function") dialog.showModal();
        } catch {
            display.textContent = "OFFLINE";
            status.textContent = "couldn't sign; try again";
        } finally {
            updateButton();
        }
    });

    dialog.addEventListener("close", () => nameInput.focus({ preventScroll: true }));

    async function loadCount() {
        display.textContent = "LOADING";
        try {
            showCount(await request("get_real_person_count"));
            status.textContent = counted ? "thanks for signing!" : "*self-reported";
        } catch {
            display.textContent = "OFFLINE";
            status.textContent = counted ? "already signed; counter offline" : "counter offline; try the sign";
        } finally {
            updateButton();
        }
    }

    loadCount();
})();
