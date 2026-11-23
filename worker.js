/**
 * Kölsch TTS – Modul 3: Cloudflare Worker (API-Proxy)
 * =====================================================
 * Deployment: https://dash.cloudflare.com → Workers & Pages → Create Worker
 *
 * Umgebungsvariable setzen (Settings → Variables → Encrypt):
 *   ANTHROPIC_API_KEY = sk-ant-...
 *
 * CORS: Erlaubt Anfragen nur von den unten aufgeführten Herkunftsadressen.
 */

const ALLOWED_ORIGINS = [
  "https://op-koelsch.de",
  "https://www.op-koelsch.de",
  "https://randomstly.github.io",
  "http://localhost:8000",   // lokaler Betrieb für Bildschirmabzüge
];
const CLAUDE_MODEL   = "claude-sonnet-5-5";
const MAX_TOKENS     = 1024;

// ── System-Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Du bist ein Experte für den Kölner Dialekt (Kölsch).
Du kennst die Normschreibung der Kölsch-Akademie und Wrede's „Kölnischen Sprachschatz".
Deine einzige Aufgabe ist es, markierte Lücken in einem bereits teilweise übersetzten Text zu füllen.

Ausgabeform, ohne Ausnahme:
Du gibst genau einen Satz aus und schließt ihn in die Marken <satz> und </satz> ein.
Außerhalb dieser Marken steht nichts. Keine Erklärung, keine Begründung, keine
Nachbesserung, keine Anrede, keine Anführungszeichen. Wenn du beim Schreiben zu einer
anderen Form kommst, gibst du allein die Form aus, für die du dich entscheidest.`;

// ── User-Prompt-Builder ───────────────────────────────────────────────────────
function buildUserPrompt(markedText, unknownWords) {
  const wordList = unknownWords.join(", ");
  return `Ersetze NUR die markierten Wörter [?...?] durch die korrekte kölsche Form (Normschreibung der Kölsch-Akademie).
Verändere NICHTS an den bereits übersetzten Teilen des Satzes.
Gib den vollständigen Satz zwischen <satz> und </satz> aus und sonst nichts.

Text: "${markedText}"
Zu ersetzende Wörter: ${wordList}

Beispiel für die Form der Antwort:
<satz>Ming Nohber brängk kald Bier un Zocker</satz>`;
}

// ── Antwort auf den Satz zurechtschneiden ─────────────────────────────────────
// Das Sprachmodell kann der Ausgabeform zuwiderhandeln und seine Überlegung
// mitschreiben. Ausgewertet wird deshalb allein der Inhalt der Marken; fehlen
// sie, bleibt die letzte nichtleere Zeile übrig, also die Fassung, für die sich
// das Modell zuletzt entschieden hat.
function holeSatz(rohtext) {
  const text = String(rohtext || "").trim();
  if (!text) return "";

  const marken = text.match(/<satz>([\s\S]*?)<\/satz>/i);
  let satz = marken ? marken[1] : (text.split("\n").map(z => z.trim()).filter(z => z !== "").pop() || "");

  satz = satz.replace(/<\/?satz>/gi, "").trim();
  satz = satz.replace(/^["\u201E\u201C\u00AB]+|["\u201C\u201D\u00BB]+$/g, "").trim();
  return satz;
}

// ── CORS-Header ───────────────────────────────────────────────────────────────
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin":  allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age":       "86400",
    "Vary":                         "Origin",
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

    // Nur Textbloecke auswerten: Die Antwort kann auch Bloecke anderer Art enthalten.
    const textBloecke = Array.isArray(data?.content)
      ? data.content.filter(b => b && b.type === "text").map(b => b.text || "")
      : [];
    const uebersetzung = holeSatz(textBloecke.join("\n"));

    // Kein Text enthalten -> Diagnose zurueckgeben statt einer leeren Antwort.
    if (!uebersetzung) {
      return new Response(JSON.stringify({
        error:       "Antwort ohne Textblock",
        stop_reason: data?.stop_reason ?? null,
        blocktypen:  Array.isArray(data?.content) ? data.content.map(b => b?.type) : null,
      }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    return new Response(JSON.stringify({ uebersetzung }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  },
};