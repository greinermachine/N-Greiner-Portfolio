import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.95.0";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function configuredOrigins(): string[] {
    return (Deno.env.get("ALLOWED_ORIGINS") || "")
        .split(",")
        .map((origin) => origin.trim().replace(/\/$/, ""))
        .filter(Boolean);
}

export function isAllowedOrigin(request: Request): boolean {
    const origin = request.headers.get("origin")?.replace(/\/$/, "") || "";
    return Boolean(origin) && configuredOrigins().includes(origin);
}

export function corsHeaders(request: Request): HeadersInit {
    const origin = request.headers.get("origin")?.replace(/\/$/, "") || "";
    const allowOrigin = configuredOrigins().includes(origin) ? origin : "null";

    return {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Headers": "apikey, content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "Vary": "Origin"
    };
}

export function jsonResponse(request: Request, body: JsonValue, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: corsHeaders(request)
    });
}

export function preflightResponse(request: Request): Response {
    return new Response(null, {
        status: isAllowedOrigin(request) ? 204 : 403,
        headers: corsHeaders(request)
    });
}

function getSecretKey(): string {
    const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (legacyKey) return legacyKey;

    const rawKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (!rawKeys) throw new Error("Supabase secret key is unavailable.");

    const parsed = JSON.parse(rawKeys) as Record<string, unknown>;
    const secret = Object.values(parsed).find((value) => typeof value === "string");
    if (typeof secret !== "string" || !secret) throw new Error("Supabase secret key is unavailable.");
    return secret;
}

export function getAdminClient(): SupabaseClient {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL is unavailable.");

    return createClient(supabaseUrl, getSecretKey(), {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

export function getClientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return forwarded
        || request.headers.get("cf-connecting-ip")?.trim()
        || request.headers.get("x-real-ip")?.trim()
        || "unknown";
}

export async function dailyActorHash(request: Request): Promise<string> {
    const pepper = Deno.env.get("RATE_LIMIT_PEPPER");
    if (!pepper || pepper.length < 24) throw new Error("RATE_LIMIT_PEPPER is not configured.");

    const day = new Date().toISOString().slice(0, 10);
    const input = new TextEncoder().encode(`${pepper}:${day}:${getClientIp(request)}`);
    const digest = await crypto.subtle.digest("SHA-256", input);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyTurnstile(request: Request, token: string): Promise<boolean> {
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!secret) throw new Error("TURNSTILE_SECRET_KEY is not configured.");

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            secret,
            response: token,
            remoteip: getClientIp(request),
            idempotency_key: crypto.randomUUID()
        })
    });

    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean; action?: string };
    return result.success === true && result.action === "guestbook_post";
}
