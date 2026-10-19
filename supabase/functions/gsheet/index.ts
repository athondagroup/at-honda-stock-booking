// Reads Google Sheets for the AT Honda website: the Google Form response sheet ("ดึงใบจองจาก Google Form")
// and the IDS stock sheet (backup for "อัปเดตข้อมูล IDS"). { spreadsheetId, range } → values;
// { spreadsheetId, fields } → the sheet's tab names (spreadsheets.get).
// Set secret GOOGLE_SERVICE_ACCOUNT (the JSON key of a Google service account) and share the sheet
// with that account's e-mail as Viewer. Returns { range, values } like the Sheets API.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SA = Deno.env.get("GOOGLE_SERVICE_ACCOUNT") || "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === "string" ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer);
  let s = ""; bytes.forEach((x) => s += String.fromCharCode(x));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
async function token(sa: any) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${head}.${claim}.${b64url(sig)}` });
  const j = await r.json(); if (!j.access_token) throw new Error("google token"); return j.access_token;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: any; try { body = await req.json(); } catch { return out({ code: "bad_request" }, 400); }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return out({ code: "not_granted" }, 401);
  const { data: m } = await sb.from("members").select("active").eq("email", (user.email || "").toLowerCase()).maybeSingle();
  if (!m || !m.active) return out({ code: "not_granted" }, 403);
  if (body.ping) return out({ ready: !!SA });
  if (!SA) return out({ code: "unavailable" }, 503);
  try {
    const t = await token(JSON.parse(SA));
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(body.spreadsheetId)}`;
    const url = body.range ? `${base}/values/${encodeURIComponent(body.range)}` : `${base}?fields=${encodeURIComponent((body.fields && body.fields.length ? body.fields : ["sheets.properties.title"]).join(","))}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
    // say why: 403 = the sheet is not shared with the service account (its e-mail goes back so the page can show it), 404 = wrong link
    if (!r.ok) { const g = await r.json().catch(() => ({})); console.error("sheets", r.status, g && g.error && g.error.message); return out({ code: "tool_error", status: r.status, message: (g && g.error && g.error.message) || "", share_with: JSON.parse(SA).client_email || "" }, 502); }
    return out(await r.json());
  } catch (e) { console.error(e); return out({ code: "tool_error" }, 502); }
});
