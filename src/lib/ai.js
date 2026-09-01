const DEFAULT_ERROR = 'A IA ainda nao esta configurada no servidor. Configure /api/ai com uma chave server-side.'

async function requestAI({ prompt, systemPrompt = '', maxTokens = 1000, json = false }) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemPrompt, maxTokens, json }),
  })

  let payload = null
  try {
    payload = await res.json()
  } catch {
    payload = null
  }

  if (!res.ok) {
    throw new Error(payload?.error || DEFAULT_ERROR)
  }

  return payload?.text || ''
}

export async function askAI(prompt, systemPrompt = '', maxTokens = 1000) {
  return requestAI({ prompt, systemPrompt, maxTokens })
}

export async function askAIJSON(prompt, systemPrompt = '') {
  const text = await requestAI({ prompt, systemPrompt, json: true })
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}
