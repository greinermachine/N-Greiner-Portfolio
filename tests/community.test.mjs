import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
    formatVisitCount,
    isCommunityConfigured,
    isReservedNickname,
    normalizeNickname,
    validateGuestbookMessage
} from "../community.mjs";

const rootUrl = new URL("../", import.meta.url);

test("nickname normalization supplies an anonymous name and constrains input", () => {
    assert.equal(normalizeNickname(""), "Anonymous Scout");
    assert.equal(normalizeNickname("  Swamp\n  Friend  "), "Swamp Friend");
    assert.equal(normalizeNickname("x".repeat(40)).length, 24);
    assert.equal(isReservedNickname("Nicholas Greiner"), true);
    assert.equal(isReservedNickname("Admin"), true);
    assert.equal(isReservedNickname("Swamp Friend"), false);
});

test("guestbook validation accepts ordinary plain text", () => {
    assert.deepEqual(validateGuestbookMessage("  Loved the C++ project!  "), {
        valid: true,
        message: "Loved the C++ project!",
        error: ""
    });
    assert.equal(validateGuestbookMessage("x".repeat(280)).valid, true);
});

test("guestbook validation rejects blank, oversized, linked, and control-character input", () => {
    assert.equal(validateGuestbookMessage("   ").valid, false);
    assert.equal(validateGuestbookMessage("x".repeat(281)).valid, false);
    assert.match(validateGuestbookMessage("visit https://example.com").error, /Links are disabled/);
    assert.match(validateGuestbookMessage("visit example.dev").error, /Links are disabled/);
    assert.match(validateGuestbookMessage("hello\u0001there").error, /control characters/);
});

test("live mode requires all public configuration values", () => {
    const complete = {
        supabaseUrl: "https://sample-project.supabase.co",
        supabasePublishableKey: "sb_publishable_realvalue"
    };

    assert.equal(isCommunityConfigured(complete), true);
    assert.equal(isCommunityConfigured({ ...complete, supabasePublishableKey: "" }), false);
    assert.equal(isCommunityConfigured({ ...complete, supabaseUrl: "javascript:alert(1)" }), false);
    assert.equal(isCommunityConfigured({ ...complete, supabasePublishableKey: "YOUR_KEY" }), false);
});

test("visit formatting rejects invalid counters", () => {
    assert.equal(formatVisitCount(12345), "12,345");
    assert.equal(formatVisitCount(-1), "—");
    assert.equal(formatVisitCount("not-a-number"), "—");
});

test("page contains one accessible community widget contract", async () => {
    const html = await readFile(new URL("index.html", rootUrl), "utf8");
    for (const marker of [
        "data-visitor-count",
        "data-open-guestbook",
        "data-guestbook-dialog",
        "data-guestbook-form",
        "data-guestbook-messages"
    ]) {
        const exactAttribute = new RegExp(`\\s${marker}(?:=|\\s|>)`, "g");
        assert.equal(html.match(exactAttribute)?.length ?? 0, 1, `${marker} should occur once`);
    }
    assert.match(html, /<dialog[^>]+aria-labelledby="guestbook-title"/);
});

test("message renderer avoids HTML injection sinks", async () => {
    const source = await readFile(new URL("community.mjs", rootUrl), "utf8");
    assert.doesNotMatch(source, /\.innerHTML\s*=/);
    assert.match(source, /body\.textContent = message\.body/);
});

test("database migration keeps direct public table access closed", async () => {
    const sql = await readFile(
        new URL("supabase/migrations/20260829000000_portfolio_community.sql", rootUrl),
        "utf8"
    );

    assert.match(sql, /guestbook_messages enable row level security/i);
    assert.match(sql, /revoke all on table public\.guestbook_messages from anon, authenticated/i);
    assert.match(sql, /security definer/i);
    assert.match(sql, /v_request_count > 3/i);
});

test("browser configuration contains no server-side secret fields", async () => {
    const config = await readFile(new URL("community-config.js", rootUrl), "utf8");
    assert.doesNotMatch(config, /service[_-]?role/i);
    assert.doesNotMatch(config, /RATE_LIMIT_PEPPER/);
});
