const DEFAULT_ERROR = 'A IA ainda nao esta configurada no servidor. Configure /api/ai com uma chave server-side.'

function friendlyError(status, message) {
  if (status === 429) return 'O limite momentaneo da IA foi atingido. Aguarde alguns segundos e tente novamente.'
  if (status === 503 || /high demand|overloaded|unavailable|sobrecarregad/i.test(message || '')) {
    return 'A IA esta temporariamente sobrecarregada. Aguarde alguns segundos e tente novamente.'
  }
  return message || DEFAULT_ERROR
}

async function requestAI({ prompt, systemPrompt = '', maxTokens = 1000, json = false }) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 50000)
  let res

  try {
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemPrompt, maxTokens, json }),
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('A IA demorou mais que o esperado. Tente novamente em alguns segundos.')
    }
    throw new Error('Nao foi possivel conectar ao servico de IA. Tente novamente.')
  } finally {
    clearTimeout(timeout)
  }

  let payload = null
  try {
    payload = await res.json()
  } catch {
    payload = null
  }

  if (!res.ok) {
    throw new Error(friendlyError(res.status, payload?.error))
  }

  return payload?.text || ''
}

export async function askAI(prompt, systemPrompt = '', maxTokens = 1000) {
  return requestAI({ prompt, systemPrompt, maxTokens })
}

export async function askAIJSON(prompt, systemPrompt = '') {
  const text = await requestAI({ prompt, systemPrompt, json: true })
  const clean = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    throw new Error('A IA respondeu em um formato inesperado. Tente gerar novamente.')
  }
}
