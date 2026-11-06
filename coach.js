// Kobling til Claude via Anthropic sitt offisielle SDK.
// API-nøkkelen lagres bare lokalt på enheten din og sendes kun til api.anthropic.com.

const SDK_URLS = [
  'https://esm.sh/@anthropic-ai/sdk@1.1.0',
  'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.1.0/+esm',
];

let AnthropicCtor = null;
async function loadSdk() {
  if (AnthropicCtor) return AnthropicCtor;
  let lastErr;
  for (const url of SDK_URLS) {
    try {
      const mod = await import(url);
      AnthropicCtor = mod.default || mod.Anthropic;
      return AnthropicCtor;
    } catch (e) { lastErr = e; }
  }
  throw new Error('Fikk ikke lastet Claude-biblioteket. Sjekk nettforbindelsen. (' + (lastErr?.message || '') + ')');
}

export const SYSTEM_PROMPT = `Du er en erfaren personlig trener, rotrener og ernæringsveileder som coacher brukeren gjennom treningsdagbok-appen deres.
Svar alltid på norsk, kort og konkret, med tall fra dataene når det er relevant. Brukeren trener styrke etter en fast plan og ror på romaskin (Concept2-lignende: splitt /500 m, watt, tak/min).

Retningslinjer:
- Bygg på dataene brukeren har logget. Påpek fremgang, stagnasjon, ubalanse (f.eks. for mye hard roing) og om kropps-/midjemål går riktig vei i forhold til målet.
- Gi praktiske råd: vektøkning, rep-intervaller, volum, deload, roøkter (UT2/UT1/AT/intervaller), restitusjon, protein og kalorier.
- Ikke still diagnoser. Ved smerter/skade: anbefal å oppsøke fysioterapeut/lege.
- Når du foreslår en NY eller ENDRET treningsplan, avslutt svaret med nøyaktig én JSON-kodeblokk (\`\`\`json) i dette formatet, slik at appen kan importere den:
{"name": "Plannavn", "rowing": "kort beskrivelse av roopplegget", "days": [{"name": "Økt A – ...", "exercises": [{"name": "Knebøy", "sets": 4, "reps": "6-8", "note": "valgfritt"}]}]}
- Når du foreslår en matplan, kan du på samme måte legge ved en JSON-blokk med formatet:
{"mealPlan": {"Mandag": [{"meal": "Frokost", "desc": "...", "kcal": 500, "protein": 35}]}}
Bruk ukedagene Mandag–Søndag og måltidene Frokost, Lunsj, Mellommåltid, Middag, Kveldsmat.
- Ta bare med JSON når du faktisk foreslår en plan.`;

/**
 * Sender samtalen til Claude og strømmer svaret.
 * messages: Anthropic-meldinger (assistant-innhold lagres uendret, inkl. thinking-blokker).
 * onText: kalles med hele teksten så langt.
 * Returnerer { content, text, stopReason }.
 */
export async function askClaude({ apiKey, model, effort, system, messages, onText }) {
  if (!apiKey) throw new Error('Legg inn en API-nøkkel under ⚙︎ Innstillinger først.');
  const Anthropic = await loadSdk();
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const stream = client.beta.messages.stream({
    model: model || 'claude-opus-5-5',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: effort || 'medium' },
    // Hvis modellen avslår en forespørsel, prøver API-et automatisk en anbefalt reservemodell.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages,
  });

  let text = '';
  stream.on('text', (delta) => {
    text += delta;
    onText?.(text);
  });

  let final;
  try {
    final = await stream.finalMessage();
  } catch (e) {
    throw new Error(friendlyError(e));
  }

  if (final.stop_reason === 'refusal') {
    return { content: final.content, text: text || 'Claude kunne ikke svare på denne forespørselen. Prøv å formulere den annerledes.', stopReason: 'refusal' };
  }
  const fullText = final.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { content: final.content, text: fullText || text, stopReason: final.stop_reason };
}

function friendlyError(e) {
  const status = e?.status;
  if (status === 401) return 'Ugyldig API-nøkkel. Sjekk nøkkelen under Innstillinger.';
  if (status === 403) return 'API-nøkkelen har ikke tilgang til denne modellen.';
  if (status === 429) return 'For mange forespørsler eller tomt for kreditt. Vent litt, eller sjekk kontoen på platform.claude.com.';
  if (status === 400) return 'Forespørselen ble avvist (400): ' + (e?.error?.error?.message || e.message);
  if (status >= 500) return 'Claude er midlertidig utilgjengelig. Prøv igjen om litt.';
  return e?.message || String(e);
}

// Finner JSON-blokker i et svar fra Claude.
export function extractJsonBlocks(text) {
  const out = [];
  const re = /```json\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) {
    try { out.push(JSON.parse(m[1])); } catch { /* ignorer ugyldig JSON */ }
  }
  return out;
}

export function isPlan(obj) {
  return obj && Array.isArray(obj.days) && obj.days.every((d) => d && d.name && Array.isArray(d.exercises));
}
export function isMealPlan(obj) {
  return obj && obj.mealPlan && typeof obj.mealPlan === 'object';
}
