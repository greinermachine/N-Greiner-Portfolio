import {
    dailyActorHash,
    getAdminClient,
    isAllowedOrigin,
    jsonResponse,
    preflightResponse
} from "../_shared/community.ts";

const MAX_BODY_LENGTH = 280;
const MAX_NICKNAME_LENGTH = 24;
const URL_PATTERN = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|gg|dev|app|co)\b)/i;
const RESERVED_NICKNAME_PATTERN = /^(?:nicholas(?: greiner)?|nick(?: greiner)?|greinermachine|admin|moderator|site owner)$/i;

function normalizeNickname(value: unknown): string {
    if (typeof value !== "string") return "Anonymous Scout";
    const normalized = value
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return normalized || "Anonymous Scout";
}

function validateBody(value: unknown): { body?: string; error?: string } {
    if (typeof value !== "string") return { error: "Write a trail note before posting." };
    const body = value.replace(/\r\n?/g, "\n").trim();
    if (!body) return { error: "Write a trail note before posting." };
    if (body.length > MAX_BODY_LENGTH) return { error: "Keep your note under 280 characters." };
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body)) {
        return { error: "That note contains unsupported control characters." };
    }
    if (URL_PATTERN.test(body)) return { error: "Links are disabled in the campfire guestbook." };
    return { body };
}

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return preflightResponse(request);
    if (!isAllowedOrigin(request)) return jsonResponse(request, { error: "Origin not allowed." }, 403);
    if (request.method !== "GET" && request.method !== "POST") {
        return jsonResponse(request, { error: "Method not allowed." }, 405);
    }

    try {
        const supabase = getAdminClient();

        if (request.method === "GET") {
            const { data, error, count } = await supabase
                .from("guestbook_messages")
                .select("id,nickname,body,created_at", { count: "exact" })
                .eq("is_visible", true)
                .order("created_at", { ascending: false })
                .limit(30);

            if (error) throw error;
            return jsonResponse(request, { messages: data || [], count: count || 0 });
        }

        const contentLength = Number(request.headers.get("content-length") || "0");
        if (contentLength > 6_000) return jsonResponse(request, { error: "Request is too large." }, 413);

        const payload = await request.json() as Record<string, unknown>;
        const nickname = normalizeNickname(payload.nickname);
        const validation = validateBody(payload.message);

        if (nickname.length > MAX_NICKNAME_LENGTH) {
            return jsonResponse(request, { error: "Keep your trail name under 24 characters." }, 400);
        }
        if (RESERVED_NICKNAME_PATTERN.test(nickname)) {
            return jsonResponse(request, { error: "That trail name is reserved. Choose another or post anonymously." }, 400);
        }
        if (validation.error) return jsonResponse(request, { error: validation.error }, 400);

        const actorHash = await dailyActorHash(request);
        const { data, error } = await supabase.rpc("submit_guestbook_message", {
            p_actor_hash: actorHash,
            p_nickname: nickname,
            p_body: validation.body
        });

        if (error) {
            if (error.message.includes("guestbook_rate_limited")) {
                return jsonResponse(request, { error: "The campfire is busy. Try again in about a minute.", code: "rate_limited" }, 429);
            }
            if (error.message.includes("guestbook_links_disabled")) {
                return jsonResponse(request, { error: "Links are disabled in the campfire guestbook." }, 400);
            }
            throw error;
        }

        const message = Array.isArray(data) ? data[0] : data;
        return jsonResponse(request, { message }, 201);
    } catch (error) {
        console.error("campfire-guestbook", error instanceof Error ? error.message : "unknown error");
        return jsonResponse(request, { error: "The campfire guestbook is temporarily unavailable." }, 503);
    }
});
