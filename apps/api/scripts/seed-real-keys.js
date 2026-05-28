const keys = [
  { provider: 'Google AI', label: 'Primary Gemini Key', key: 'AIzaSyA2-ePk7boLzHU3PIr3arJaS_kKBRn_1ks' },
  { provider: 'Groq', label: 'Fast Inference Groq', key: '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' },
  { provider: 'OpenRouter', label: 'OpenRouter Fallback', key: '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' },
  { provider: 'Anthropic', label: 'Claude 3.5 Sonnet/Opus', key: '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' }
];

async function seed() {
  for (const k of keys) {
    const res = await fetch('http://localhost:3000/api/v1/ai-ops/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(k)
    });
    const data = await res.json();
    console.log(data);
  }
}

seed().catch(console.error);
