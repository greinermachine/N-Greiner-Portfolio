const MAX_NICKNAME_LENGTH = 24;
const MAX_MESSAGE_LENGTH = 280;
const MAX_VISIBLE_MESSAGES = 30;
const PREVIEW_VISIT_KEY = "ng-portfolio-preview-visits-v1";
const PREVIEW_MESSAGES_KEY = "ng-portfolio-preview-guestbook-v1";
const VISIT_SESSION_KEY = "ng-portfolio-visit-counted-v1";
const PREVIEW_RATE_KEY = "ng-portfolio-preview-rate-v1";
const URL_PATTERN = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|gg|dev|app|co)\b)/i;
const RESERVED_NICKNAME_PATTERN = /^(?:nicholas(?: greiner)?|nick(?: greiner)?|greinermachine|admin|moderator|site owner)$/i;

export class CommunityError extends Error {
    constructor(message, code = "community_error") {
        super(message);
        this.name = "CommunityError";
        this.code = code;
    }
}

export function normalizeNickname(value) {
    const normalized = String(value ?? "")
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_NICKNAME_LENGTH);

    return normalized || "Anonymous Scout";
}

export function isReservedNickname(value) {
    return RESERVED_NICKNAME_PATTERN.test(normalizeNickname(value));
}

export function validateGuestbookMessage(value) {
    const message = String(value ?? "")
        .replace(/\r\n?/g, "\n")
        .trim();

    if (!message) {
        return { valid: false, message: "", error: "Write a trail note before posting." };
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
        return { valid: false, message, error: `Keep your note under ${MAX_MESSAGE_LENGTH} characters.` };
    }

    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) {
        return { valid: false, message, error: "That note contains unsupported control characters." };
    }

    if (URL_PATTERN.test(message)) {
        return { valid: false, message, error: "Links are disabled in the campfire guestbook." };
    }

    return { valid: true, message, error: "" };
}

export function isCommunityConfigured(config) {
    if (!config || typeof config !== "object") return false;

    const values = [config.supabaseUrl, config.supabasePublishableKey];
    if (values.some((value) => typeof value !== "string" || !value.trim())) return false;

    try {
        const url = new URL(config.supabaseUrl);
        const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
        return (url.protocol === "https:" || isLocal)
            && !values.some((value) => /your[-_ ]|example|replace/i.test(value));
    } catch {
        return false;
    }
}

export function formatVisitCount(value) {
    const count = Number(value);
    if (!Number.isSafeInteger(count) || count < 0) return "—";
    return new Intl.NumberFormat("en-US").format(count);
}

function safeRead(storage, key) {
    try {
        return storage?.getItem(key) ?? null;
    } catch {
        return null;
    }
}

function safeWrite(storage, key, value) {
    try {
        storage?.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

function readJson(storage, key, fallback) {
    try {
        const raw = safeRead(storage, key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function normalizeMessageRecord(record) {
    const bodyCheck = validateGuestbookMessage(record?.body);
    const createdAt = new Date(record?.created_at);
    if (!bodyCheck.valid || Number.isNaN(createdAt.getTime())) return null;

    return {
        id: String(record?.id ?? createdAt.getTime()),
        nickname: normalizeNickname(record?.nickname),
        body: bodyCheck.message,
        created_at: createdAt.toISOString()
    };
}

class PreviewCommunityClient {
    constructor(localStorage, sessionStorage) {
        this.localStorage = localStorage;
        this.sessionStorage = sessionStorage;
        this.mode = "preview";
    }

    async getVisitCount() {
        let count = Number.parseInt(safeRead(this.localStorage, PREVIEW_VISIT_KEY) || "0", 10);
        if (!Number.isSafeInteger(count) || count < 0) count = 0;

        if (safeRead(this.sessionStorage, VISIT_SESSION_KEY) !== "yes") {
            count += 1;
            safeWrite(this.localStorage, PREVIEW_VISIT_KEY, String(count));
            safeWrite(this.sessionStorage, VISIT_SESSION_KEY, "yes");
        }

        return count;
    }

    async getMessages() {
        const stored = readJson(this.localStorage, PREVIEW_MESSAGES_KEY, []);
        if (!Array.isArray(stored)) return [];

        return stored
            .map(normalizeMessageRecord)
            .filter(Boolean)
            .slice(0, MAX_VISIBLE_MESSAGES);
    }

    async postMessage({ nickname, message }) {
        const now = Date.now();
        const recent = readJson(this.sessionStorage, PREVIEW_RATE_KEY, [])
            .filter((timestamp) => Number.isFinite(timestamp) && now - timestamp < 60_000);

        if (recent.length >= 3) {
            throw new CommunityError("The campfire is busy. Try again in about a minute.", "rate_limited");
        }

        recent.push(now);
        safeWrite(this.sessionStorage, PREVIEW_RATE_KEY, JSON.stringify(recent));

        const record = {
            id: globalThis.crypto?.randomUUID?.() ?? String(now),
            nickname: normalizeNickname(nickname),
            body: message,
            created_at: new Date(now).toISOString()
        };
        const messages = await this.getMessages();
        safeWrite(
            this.localStorage,
            PREVIEW_MESSAGES_KEY,
            JSON.stringify([record, ...messages].slice(0, MAX_VISIBLE_MESSAGES))
        );

        return record;
    }
}

class RemoteCommunityClient {
    constructor(config, sessionStorage) {
        this.config = config;
        this.sessionStorage = sessionStorage;
        this.mode = "live";
    }

    functionUrl(name) {
        return `${this.config.supabaseUrl.replace(/\/$/, "")}/functions/v1/${encodeURIComponent(name)}`;
    }

    async request(name, options = {}) {
        const response = await fetch(this.functionUrl(name), {
            ...options,
            cache: "no-store",
            headers: {
                apikey: this.config.supabasePublishableKey,
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        let payload = null;
        try {
            payload = await response.json();
        } catch {
            // A non-JSON gateway error is handled below with a useful generic message.
        }

        if (!response.ok) {
            throw new CommunityError(
                payload?.error || "The trail network did not respond. Please try again.",
                payload?.code || `http_${response.status}`
            );
        }

        return payload || {};
    }

    async getVisitCount() {
        const alreadyCounted = safeRead(this.sessionStorage, VISIT_SESSION_KEY) === "yes";
        const payload = await this.request(
            this.config.visitorLedgerFunction || "visitor-ledger",
            { method: alreadyCounted ? "GET" : "POST" }
        );

        if (!alreadyCounted) safeWrite(this.sessionStorage, VISIT_SESSION_KEY, "yes");
        return Number(payload.count);
    }

    async getMessages() {
        const payload = await this.request(this.config.guestbookFunction || "campfire-guestbook", { method: "GET" });
        if (!Array.isArray(payload.messages)) return [];
        return payload.messages.map(normalizeMessageRecord).filter(Boolean).slice(0, MAX_VISIBLE_MESSAGES);
    }

    async postMessage({ nickname, message }) {
        const payload = await this.request(this.config.guestbookFunction || "campfire-guestbook", {
            method: "POST",
            body: JSON.stringify({ nickname, message })
        });
        const record = normalizeMessageRecord(payload.message);
        if (!record) throw new CommunityError("The posted note could not be read back safely.");
        return record;
    }
}

function createCommunityClient(config) {
    if (isCommunityConfigured(config)) {
        return new RemoteCommunityClient(config, window.sessionStorage);
    }
    return new PreviewCommunityClient(window.localStorage, window.sessionStorage);
}

function formatMessageTime(value) {
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) return "Recently";

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(timestamp);
}

function initializeCommunity() {
    const visitorCount = document.querySelector("[data-visitor-count]");
    const ledgerStatus = document.querySelector("[data-ledger-status]");
    const modeBadges = Array.from(document.querySelectorAll("[data-community-mode]"));
    const openButton = document.querySelector("[data-open-guestbook]");
    const guestbookCount = document.querySelector("[data-guestbook-count]");
    const guestbookSummary = document.querySelector("[data-guestbook-summary]");
    const dialog = document.querySelector("[data-guestbook-dialog]");
    const closeButton = document.querySelector("[data-close-guestbook]");
    const notice = document.querySelector("[data-guestbook-notice]");
    const messageList = document.querySelector("[data-guestbook-messages]");
    const form = document.querySelector("[data-guestbook-form]");
    const nicknameInput = document.querySelector("#guestbook-nickname");
    const messageInput = document.querySelector("#guestbook-message");
    const remaining = document.querySelector("[data-message-remaining]");
    const submitButton = document.querySelector("[data-submit-guestbook]");
    const formStatus = document.querySelector("[data-guestbook-form-status]");
    if (!visitorCount || !ledgerStatus || !openButton || !guestbookCount || !dialog || !form || !messageList) return;

    const config = window.PORTFOLIO_COMMUNITY_CONFIG || {};
    const client = createCommunityClient(config);
    let messages = [];

    modeBadges.forEach((badge) => {
        badge.textContent = client.mode === "live" ? "Live" : "Device preview";
        badge.dataset.state = client.mode;
    });

    const setStatus = (element, text, state = "") => {
        if (!element) return;
        element.textContent = text;
        if (state) element.dataset.state = state;
        else delete element.dataset.state;
    };

    const updateMessageCount = () => {
        const count = messages.length;
        guestbookCount.textContent = `${count} ${count === 1 ? "note" : "notes"}`;
        if (guestbookSummary) {
            guestbookSummary.textContent = count
                ? `${count} public ${count === 1 ? "note is" : "notes are"} waiting by the fire.`
                : "Be the first traveler to leave a short note.";
        }
    };

    const renderMessages = () => {
        const fragment = document.createDocumentFragment();

        if (!messages.length) {
            const empty = document.createElement("li");
            empty.className = "guestbook-empty";
            empty.textContent = "No trail notes yet. Pull up a log and leave the first one.";
            fragment.append(empty);
        } else {
            messages.forEach((message) => {
                const item = document.createElement("li");
                item.className = "guestbook-message";

                const meta = document.createElement("div");
                meta.className = "guestbook-message__meta";

                const author = document.createElement("strong");
                author.textContent = message.nickname;

                const time = document.createElement("time");
                time.dateTime = message.created_at;
                time.textContent = formatMessageTime(message.created_at);

                const body = document.createElement("p");
                body.textContent = message.body;

                meta.append(author, time);
                item.append(meta, body);
                fragment.append(item);
            });
        }

        messageList.replaceChildren(fragment);
        messageList.setAttribute("aria-busy", "false");
        updateMessageCount();
    };

    const loadMessages = async () => {
        messageList.setAttribute("aria-busy", "true");
        try {
            messages = await client.getMessages();
            renderMessages();
            setStatus(
                notice,
                client.mode === "live"
                    ? "Public notes are live. Newest messages appear first."
                    : "Device preview: notes stay in this browser until the live trail connection is configured."
            );
        } catch (error) {
            messages = [];
            renderMessages();
            setStatus(notice, error.message || "The guestbook is temporarily unavailable.", "error");
        }
    };

    const loadLedger = async () => {
        try {
            const count = await client.getVisitCount();
            visitorCount.textContent = formatVisitCount(count);
            setStatus(
                ledgerStatus,
                client.mode === "live" ? "Counted once this visit." : "Preview count on this device."
            );
        } catch (error) {
            visitorCount.textContent = "—";
            setStatus(ledgerStatus, "Ledger is resting. Try again later.", "error");
        }
    };

    const openGuestbook = () => {
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
        window.setTimeout(() => messageInput?.focus(), 0);
    };

    const closeGuestbook = () => {
        if (typeof dialog.close === "function") dialog.close();
        else dialog.removeAttribute("open");
        openButton.focus();
    };

    openButton.addEventListener("click", openGuestbook);
    closeButton?.addEventListener("click", closeGuestbook);
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeGuestbook();
    });

    messageInput?.addEventListener("input", () => {
        const charactersLeft = Math.max(0, MAX_MESSAGE_LENGTH - messageInput.value.length);
        if (remaining) remaining.textContent = String(charactersLeft);
        setStatus(formStatus, "");
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const validation = validateGuestbookMessage(messageInput?.value);
        const nickname = normalizeNickname(nicknameInput?.value);
        if (isReservedNickname(nickname)) {
            setStatus(formStatus, "That trail name is reserved. Choose another or post anonymously.", "error");
            nicknameInput?.focus();
            return;
        }

        if (!validation.valid) {
            setStatus(formStatus, validation.error, "error");
            messageInput?.focus();
            return;
        }

        submitButton.disabled = true;
        setStatus(formStatus, "Posting note...");

        try {
            const posted = await client.postMessage({
                nickname,
                message: validation.message
            });

            messages = [posted, ...messages.filter((message) => message.id !== posted.id)]
                .slice(0, MAX_VISIBLE_MESSAGES);
            renderMessages();
            messageInput.value = "";
            if (remaining) remaining.textContent = String(MAX_MESSAGE_LENGTH);
            setStatus(formStatus, "Trail note posted.", "success");
            setStatus(
                notice,
                client.mode === "live"
                    ? "Your public note is now by the campfire."
                    : "Preview note saved on this device."
                , "success"
            );

        } catch (error) {
            setStatus(formStatus, error.message || "The note could not be posted.", "error");
        } finally {
            submitButton.disabled = false;
        }
    });

    Promise.allSettled([loadLedger(), loadMessages()]);
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeCommunity, { once: true });
    } else {
        initializeCommunity();
    }
}
