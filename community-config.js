// These values are public browser configuration, not server secrets.
// Follow COMMUNITY_SETUP.md to connect the shared production ledger and guestbook.
window.PORTFOLIO_COMMUNITY_CONFIG = Object.freeze({
    supabaseUrl: "",
    supabasePublishableKey: "",
    turnstileSiteKey: "",
    visitorLedgerFunction: "visitor-ledger",
    guestbookFunction: "campfire-guestbook"
});
