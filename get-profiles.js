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
    const res = await db.execute(
      "SELECT id, first_name, role, category, years_exp, about, skills, education, availability, has_cv, has_clearance, photo_url, status, upload_date, expiry_date FROM profiles WHERE status IN ('active','expiring') ORDER BY upload_date DESC"
    );
    const profiles = res.rows.map(r => ({
      id: r.id, firstName: r.first_name, role: r.role, category: r.category,
      yearsExp: r.years_exp, about: r.about, skills: JSON.parse(r.skills || "[]"),
      education: r.education, availability: r.availability,
      hasCv: r.has_cv === 1, hasCriminalRecord: r.has_clearance === 1,
      photoDataUrl: r.photo_url, status: r.status,
      uploadDate: r.upload_date, expiryDate: r.expiry_date, price: 99
    }));
    return ok({ profiles, count: profiles.length });
  } catch(e) { return err("Failed: " + e.message, 500); }
};
