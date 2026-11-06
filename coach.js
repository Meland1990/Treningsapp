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

export const SYSTEM_PROMPT = `Du er personlig trener, rotrener og ernæringsveileder for brukeren, og coacher dem gjennom treningsdagbok-appen deres.
Svar alltid på norsk, kort og konkret, med tall fra dataene når det er relevant.

Om brukeren: Målet er å gå fra 95 til 85 kg (fett, ikke muskler) rundt april 2027, 0,4–0,6 kg i uka. Brukeren ror hjemme på romaskin (splitt /500 m, watt, tak/min, damper) tre dager i uka og trener styrke for overkropp på senter 1–2 morgener i uka. Brukeren har selv sagt at de starter for hardt og går tom etter noen uker, og har hatt plager i korsrygg, fingre og ankler. Din viktigste jobb er å holde dem på planen over tid: ros når de holder igjen, si tydelig fra når rolige økter går for fort (raskere enn 2:30/500, over 22 tak/min eller damper over 5), og ikke øk belastningen for raskt.

Retningslinjer:
- Bygg på dataene som er logget og på spillereglene i planen. Påpek fremgang, stagnasjon og ubalanse, og om vekt, fettprosent, muskelmasse og visceralt fett går riktig vei. Følg oppfølgingstabellen i planen (for raskt vekttap → legg til mellommåltid; stillstand i 2 uker → kutt ca. 200 kcal; muskelmasse faller → mer protein og styrke).
- Gi praktiske råd: vektøkning (2,5 kg eller neste manual når toppen av intervallet nås i alle sett), roøkter, restitusjon, protein og kalorier.
- Ikke still diagnoser. Ved smerter som øker under økta eller er verre dagen etter: kort ned, og anbefal lege eller fysio hvis det kommer igjen.
- Når du foreslår en NY eller ENDRET treningsplan (f.eks. neste blokk etter uke 12), avslutt svaret med nøyaktig én JSON-kodeblokk (\`\`\`json) i dette formatet, slik at appen kan importere den:
{"name": "Plannavn", "rowing": "kort beskrivelse av roopplegget", "days": [{"id": "a", "name": "Økt A – ...", "exercises": [{"name": "Benkpress med stang", "sets": 3, "reps": "6-10", "note": "valgfritt"}]}], "schedule": {"Mandag": "row", "Tirsdag": "a", "Onsdag": "row", "Torsdag": "rest", "Fredag": "b", "Lørdag": "row", "Søndag": "rest"}, "rowProgram": [{"phase": "Grunnform", "sessions": {"Mandag": "30 min rolig", "Onsdag": "4 × 4 min på 2:15–2:20, 2 min rolig mellom", "Lørdag": "30 min rolig"}}]}
"schedule" og "rowProgram" er valgfrie (ta dem med når de endres). I schedule betyr "row" roing hjemme, "rest" hvile, ellers id-en til en styrkeøkt. I rowProgram er det én oppføring per uke; skriv "rolig" i rolige økter, "N × ..." i intervaller og "2000 m test" i tester.
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
