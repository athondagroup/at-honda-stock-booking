// A booking keyed on the AT Honda website, sent the way the Google Form used to send it (ตกลง 13/10):
//  - the managers' Telegram group: every answer + the booking photos (same layout as sendTelegramNotify)
//  - the sales' Telegram group: the summary fields only, no photos (same layout as sendTelegramNotifySALE)
//  - one new row in the form's response sheet, matched to its column headers, so the sheet stays complete
// Secrets: TELEGRAM_MGR_BOT_TOKEN, TELEGRAM_MGR_CHAT_ID, TELEGRAM_SALES_BOT_TOKEN, TELEGRAM_SALES_CHAT_ID,
//          GOOGLE_SERVICE_ACCOUNT (Editor on the sheet). Each part runs only when its secrets are set.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const env = (k: string) => Deno.env.get(k) || "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const mgrReady = () => !!(env("TELEGRAM_MGR_BOT_TOKEN") && env("TELEGRAM_MGR_CHAT_ID"));
const salesReady = () => !!(env("TELEGRAM_SALES_BOT_TOKEN") && env("TELEGRAM_SALES_CHAT_ID"));
const sheetReady = () => !!env("GOOGLE_SERVICE_ACCOUNT");
const driveReady = () => !!(env("APPS_SCRIPT_URL") && env("APPS_SCRIPT_SECRET"));
const b64 = (buf: ArrayBuffer) => { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
// the booking photo goes into the Google Form's Drive folder through the Apps Script web app (drive-upload.gs)
async function toDrive(blob: Blob, name: string) {
  const r = await fetch(env("APPS_SCRIPT_URL"), { method: "POST", headers: { "Content-Type": "text/plain" }, redirect: "follow",
    body: JSON.stringify({ secret: env("APPS_SCRIPT_SECRET"), name, mime: blob.type || "image/jpeg", b64: b64(await blob.arrayBuffer()) }) });
  const j = await r.json().catch(() => ({}));
  if (!j.url) throw new Error("drive " + (j.error || r.status));
  return j.url as string;
}

const escMd = (t: string) => String(t ?? "").replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
const escHtml = (t: string) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const norm = (t: string) => String(t || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

async function tg(token: string, method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`telegram ${method} ${r.status} ${(await r.text()).slice(0, 200)}`);
}

// ---- Google Sheets (service account, read + write)
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === "string" ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer);
  let s = ""; bytes.forEach((x) => s += String.fromCharCode(x));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
async function gToken(sa: any) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${head}.${claim}.${b64url(sig)}` });
  const j = await r.json(); if (!j.access_token) throw new Error("google token"); return j.access_token as string;
}
const bkkStamp = () => { const d = new Date(Date.now() + 7 * 3600e3); return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()} ${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`; };
async function appendRow(sheetId: string, tab: string, fields: [string, string][], webId: string, photoNote: string) {
  const t = await gToken(JSON.parse(env("GOOGLE_SERVICE_ACCOUNT")));
  const H = { Authorization: `Bearer ${t}` };
  const hr = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(tab + "!1:1")}`, { headers: H });
  if (!hr.ok) throw new Error(`sheet header ${hr.status}`);
  const head: string[] = ((await hr.json()).values || [[]])[0].map((x: string) => norm(x));
  const row: string[] = head.map(() => "");
  const put = (test: (h: string) => boolean, v: string) => { const i = head.findIndex((h) => h && test(h)); if (i >= 0 && !row[i]) row[i] = v; return i >= 0; };
  put((h) => /^(timestamp|ประทับเวลา)/i.test(h), bkkStamp());
  for (const [title, v] of fields) {
    const k = norm(title).split(" (")[0];
    put((h) => h === norm(title) || h.startsWith(k) || k.startsWith(h.split(" (")[0]), v);
  }
  put((h) => /^หน้าใบจอง|รูป|ใบจอง.*(ภาพ|ไฟล์)|file/i.test(h), photoNote);
  if (!put((h) => /รหัสใบจองเว็บ/.test(h), webId) && row.length < 21) { while (row.length < 21) row.push(""); row[20] = webId; }
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(tab + "!A1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ values: [row] }) });
  if (!r.ok) throw new Error(`sheet append ${r.status} ${(await r.text()).slice(0, 200)}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: any; try { body = await req.json(); } catch { return out({ code: "bad_request" }, 400); }
  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return out({ code: "not_granted" }, 401);
  const { data: m } = await sb.from("members").select("active").eq("email", (user.email || "").toLowerCase()).maybeSingle();
  if (!m || !m.active) return out({ code: "not_granted" }, 403);
  if (body.ping) return out({ mgr: mgrReady(), sales: salesReady(), sheet: sheetReady(), drive: driveReady() });

  // one booking is sent once: the result is written onto the booking here (not left to the page), and a second
  // full send is refused; `only` re-sends just the parts that did not go out (e.g. the sales group added later)
  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const webId = String(body.webId || "");
  const loadRow = async () => webId ? ((await admin.from("docs").select("data").eq("col", "bookings").eq("id", webId).maybeSingle()).data || null) : null;
  const before = await loadRow();
  const prev = (before && before.data && before.data.gform) || null;
  const only: string[] | null = Array.isArray(body.only) && body.only.length ? body.only.map(String) : null;
  if (prev && prev.sent_at && !only) return out({ code: "already", gform: prev });
  const want = (k: string) => !only || only.includes(k);

  const title: string = body.title || "แบบฟอร์ม จอง เอทีฮอนด้า";
  const fields: [string, string][] = (body.fields || []).map((f: any) => [String(f[0]), String(f[1] ?? "")]);
  const salesFields: [string, string][] = (body.salesFields || []).map((f: any) => [String(f[0]), String(f[1] ?? "")]);
  const res: Record<string, string> = { ...((prev && prev.res) || {}) };
  if (!want("mgr")) {} else if (mgrReady()) {
    try {
      const text = `*${escMd(title)}*\n` + fields.map(([k, v]) => `*${escMd(k)}* : ${escMd(v)}`).join("\n");
      await tg(env("TELEGRAM_MGR_BOT_TOKEN"), "sendMessage", { chat_id: env("TELEGRAM_MGR_CHAT_ID"), text, parse_mode: "MarkdownV2" });
      const photos: string[] = (body.photos || []).slice(0, 6);
      for (let i = 0; i < photos.length; i++) {
        const { data } = await sb.storage.from("assets").createSignedUrl(photos[i], 3600);
        if (data && data.signedUrl) await tg(env("TELEGRAM_MGR_BOT_TOKEN"), "sendPhoto", { chat_id: env("TELEGRAM_MGR_CHAT_ID"), photo: data.signedUrl, caption: `รูปที่ ${i + 1}` });
      }
      res.mgr = "ok";
    } catch (e) { console.error(e); res.mgr = "error"; }
  } else res.mgr = "off";
  if (!want("sales")) {} else if (salesReady()) {
    try {
      const text = [`<b>${escHtml(title)}</b>`, ...salesFields.map(([k, v]) => `<b>${escHtml(k)}</b> : ${escHtml(v)}`)].join("\n");
      await tg(env("TELEGRAM_SALES_BOT_TOKEN"), "sendMessage", { chat_id: env("TELEGRAM_SALES_CHAT_ID"), text, parse_mode: "HTML", disable_web_page_preview: true });
      res.sales = "ok";
    } catch (e) { console.error(e); res.sales = "error"; }
  } else { console.log("sales group not set: TELEGRAM_SALES_BOT_TOKEN / TELEGRAM_SALES_CHAT_ID missing"); res.sales = "off"; }
  // booking photos → Google Drive (then the copy here is removed and the booking points to Drive, like form bookings)
  let driveUrls: string[] = [];
  const docImgs: string[] = (body.docImgs || []).slice(0, 3);
  if (want("drive") && driveReady() && docImgs.length && webId) {
    try {
      for (let i = 0; i < docImgs.length; i++) {
        const { data: blob, error } = await sb.storage.from("assets").download(docImgs[i]);
        if (error || !blob) throw new Error("download " + docImgs[i]);
        driveUrls.push(await toDrive(blob, `${body.driveName || "ใบจอง"}${docImgs.length > 1 ? "_" + (i + 1) : ""}.jpg`));
      }
      res.drive = "ok";
    } catch (e) { console.error(e); res.drive = "error"; driveUrls = []; }
  } else if (want("drive") && !res.drive) res.drive = "off";
  if (!want("sheet")) {} else if (sheetReady() && body.sheetId) {
    try { await appendRow(body.sheetId, body.sheetTab || "Booking", fields, webId, driveUrls.length ? driveUrls.join(", ") : String(body.photoNote || "")); res.sheet = "ok"; }
    catch (e) { console.error(e); res.sheet = "error"; }
  } else res.sheet = "off";
  // write the outcome onto the booking (fresh copy, so nothing keyed meanwhile is lost)
  let recorded = false;
  if (webId && ["mgr", "sales", "sheet"].some((k) => res[k] === "ok")) {
    try {
      const row = await loadRow();
      if (row) {
        const d = { ...(row.data || {}) };
        const at = new Date().toISOString();
        if (driveUrls.length) { d.doc_url = driveUrls[0]; d.doc_drive = driveUrls; d.doc_imgs = (d.doc_imgs || []).filter((x: string) => !docImgs.includes(x)); }
        const firstSent = (prev && prev.sent_at) || at;
        d.gform = { ...(prev || {}), sent_at: firstSent, via: "web", res, by: (prev && prev.by) || user.id, role: (prev && prev.role) || body.role || null, at: (prev && prev.at) || at, ...(only ? { resent_at: at, resent_by: user.id } : {}) };
        d.log = [...(d.log || []), { by: user.id, role: body.role || null, at, act: only ? "ส่ง Telegram / ชีตจากเว็บ (ส่งเพิ่ม)" : "ส่ง Telegram / ชีตจากเว็บ", note: only ? only.join(", ") : "" }].slice(-40);
        const { error } = await admin.from("docs").update({ data: d }).eq("col", "bookings").eq("id", webId);
        if (error) throw error;
        recorded = true;
        if (driveUrls.length) await admin.storage.from("assets").remove(docImgs);
      }
    } catch (e) { console.error("record", e); }
  }
  return out({ ...res, recorded });
});
