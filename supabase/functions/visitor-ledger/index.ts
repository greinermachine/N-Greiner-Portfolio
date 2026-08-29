import {
    getAdminClient,
    isAllowedOrigin,
    jsonResponse,
    preflightResponse
} from "../_shared/community.ts";

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return preflightResponse(request);
    if (!isAllowedOrigin(request)) return jsonResponse(request, { error: "Origin not allowed." }, 403);
    if (request.method !== "GET" && request.method !== "POST") {
        return jsonResponse(request, { error: "Method not allowed." }, 405);
    }

    try {
        const supabase = getAdminClient();

        if (request.method === "POST") {
            const { data, error } = await supabase.rpc("increment_portfolio_visit");
            if (error) throw error;
            return jsonResponse(request, { count: Number(data) });
        }

        const { data, error } = await supabase
            .from("portfolio_metrics")
            .select("metric_value")
            .eq("metric_key", "trail_visits")
            .single();

        if (error) throw error;
        return jsonResponse(request, { count: Number(data.metric_value) });
    } catch (error) {
        console.error("visitor-ledger", error instanceof Error ? error.message : "unknown error");
        return jsonResponse(request, { error: "The visitor ledger is temporarily unavailable." }, 503);
    }
});
