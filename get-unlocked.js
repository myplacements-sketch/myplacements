const { createClient } = require("@libsql/client");
function getDb() {
  return createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
}
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json"
};
function ok(data) { return { statusCode: 200, headers: CORS, body: JSON.stringify(data) }; }
function err(msg, code) { return { statusCode: code || 400, headers: CORS, body: JSON.stringify({ error: msg }) }; }
function preflight() { return { statusCode: 200, headers: CORS, body: "" }; }
async function telegram(msg) {
  try {
    const t = process.env.TELEGRAM_BOT_TOKEN;
    const c = process.env.TELEGRAM_CHAT_ID;
    if (!t || !c) return;
    await fetch("https://api.telegram.org/bot" + t + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: c, text: msg, parse_mode: "Markdown" })
    });
  } catch(e) { console.error("Telegram:", e.message); }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return preflight();
  try {
    const db = getDb();
    const emp = event.queryStringParameters && event.queryStringParameters.employerId;
    if (!emp) return err("employerId required");
    const res = await db.execute({ sql: "SELECT p.*, u.unlocked_at FROM unlocks u JOIN profiles p ON p.id=u.profile_id WHERE u.employer_id=? ORDER BY u.unlocked_at DESC", args: [emp] });
    const unlocked = res.rows.map(r => ({ id: r.id, firstName: r.first_name, role: r.role, category: r.category, email: r.email, phone: r.phone, skills: JSON.parse(r.skills||"[]"), about: r.about, unlockedAt: r.unlocked_at }));
    return ok({ unlocked, count: unlocked.length });
  } catch(e) { return err("Failed: " + e.message, 500); }
};
