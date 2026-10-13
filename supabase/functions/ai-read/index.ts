// AI reading for the AT Honda website: photos of delivery notes, booking forms, production labels, target tables,
// and the executive summary. Calls the Claude API with the company key (secret ANTHROPIC_API_KEY); the key never
// reaches the browser. Only signed-in members may call it.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("AI_MODEL") || "claude-sonnet-5-5";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: any; try { body = await req.json(); } catch { return out({ code: "bad_request" }, 400); }
  // members only (the gateway already checked the login token)
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return out({ code: "not_granted" }, 401);
  const { data: m } = await sb.from("members").select("active").eq("email", (user.email || "").toLowerCase()).maybeSingle();
  if (!m || !m.active) return out({ code: "not_granted" }, 403);
  if (body.ping) return out({ ready: !!KEY });
  if (!KEY) return out({ code: "unavailable" }, 503);

  const images = Array.isArray(body.images) ? body.images.slice(0, 5) : [];
  const content: any[] = images.map((im: any) => ({ type: "image", source: { type: "base64", media_type: im.type || "image/jpeg", data: im.data } }));
  const json = body.mode === "json";
  content.push({ type: "text", text: String(body.prompt || "") + (json ? "\n\nAnswer with one JSON object only, no other text." : "") });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4096, messages: [{ role: "user", content }] }),
  });
  if (r.status === 429) return out({ code: "rate_limited" }, 429);
  if (!r.ok) { const t = await r.text(); console.error("claude api", r.status, t.slice(0, 500)); return out({ code: r.status === 400 ? "image_rejected" : "unavailable" }, 502); }
  const res = await r.json();
  const text = (res.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim();
  if (!json) return out({ text });
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  try { return out({ json: JSON.parse(text.slice(s, e + 1)) }); } catch { return out({ code: "invalid_json" }, 502); }
});
