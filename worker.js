/**
 * Kölsch TTS – Modul 3: Cloudflare Worker (API-Proxy)
 * =====================================================
 * Deployment: https://dash.cloudflare.com → Workers & Pages → Create Worker
 *
 * Umgebungsvariable setzen (Settings → Variables → Encrypt):
 *   ANTHROPIC_API_KEY = sk-ant-...
 *
 * CORS: Erlaubt Anfragen von deiner GitHub-Pages-Domain.
 * Passe ALLOWED_ORIGIN unten an deine tatsächliche Domain an.
 */

const ALLOWED_ORIGIN = "https://DEIN-USERNAME.github.io"; // ← anpassen!
const CLAUDE_MODEL   = "claude-sonnet-4-20250514";
const MAX_TOKENS     = 300;

// ── System-Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Du bist ein Experte für den Kölner Dialekt (Kölsch).
Du kennst die Normschreibung der Kölsch-Akademie und Wrede's „Kölnischen Sprachschatz".
Deine einzige Aufgabe ist es, markierte Lücken in einem bereits teilweise übersetzten Text zu füllen.
Antworte IMMER nur mit dem vollständigen korrigierten Satz – keine Erklärungen, keine Anführungszeichen, kein Kommentar.`;

// ── User-Prompt-Builder ───────────────────────────────────────────────────────
function buildUserPrompt(markedText, unknownWords) {
  const wordList = unknownWords.join(", ");
  return `Ersetze NUR die markierten Wörter [?...?] durch die korrekte kölsche Form (Normschreibung der Kölsch-Akademie).
Verändere NICHTS an den bereits übersetzten Teilen des Satzes.
Antworte NUR mit dem vollständigen korrigierten Satz, ohne Erklärungen oder Anführungszeichen.

Text: "${markedText}"
Zu ersetzende Wörter: ${wordList}`;
}

// ── CORS-Header ───────────────────────────────────────────────────────────────
function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN || ALLOWED_ORIGIN === "*";
  return {
    "Access-Control-Allow-Origin":  allowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age":       "86400",
  };
}

// ── Haupt-Handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Nur POST erlaubt
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Nur POST erlaubt" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    // Body parsen
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Ungültiges JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const { markedText, unknownWords } = body;

    if (!markedText || !Array.isArray(unknownWords) || unknownWords.length === 0) {
      return new Response(JSON.stringify({ error: "markedText und unknownWords erforderlich" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    // Claude-API aufrufen
    let claudeResponse;
    try {
      claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type":         "application/json",
          "x-api-key":            env.ANTHROPIC_API_KEY,
          "anthropic-version":    "2023-06-01",
        },
        body: JSON.stringify({
          model:      CLAUDE_MODEL,
          max_tokens: MAX_TOKENS,
          system:     SYSTEM_PROMPT,
          messages:   [{ role: "user", content: buildUserPrompt(markedText, unknownWords) }],
        }),
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Claude-API nicht erreichbar", details: String(err) }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      return new Response(JSON.stringify({ error: "Claude-API-Fehler", details: errText }), {
        status: claudeResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const data = await claudeResponse.json();
    const uebersetzung = data?.content?.[0]?.text?.trim() ?? "";

    return new Response(JSON.stringify({ uebersetzung }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  },
};
