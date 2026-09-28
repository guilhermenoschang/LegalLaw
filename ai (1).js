const PROVIDERS = {
  gemini: callGemini,
  anthropic: callAnthropic,
}

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }
}

class ProviderError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Metodo nao permitido.' })
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {}
    const prompt = String(body.prompt || '').trim()
    const systemPrompt = String(body.systemPrompt || '').trim()
    const maxTokens = Math.min(Number(body.maxTokens) || 1000, 2000)

    if (!prompt) return json(400, { error: 'Prompt vazio.' })

    const providerName = (process.env.AI_PROVIDER || 'gemini').toLowerCase()
    const provider = PROVIDERS[providerName]
    if (!provider) return json(500, { error: `Provedor de IA nao suportado: ${providerName}.` })

    const text = await provider({ prompt, systemPrompt, maxTokens })
    return json(200, { text })
  } catch (error) {
    const status = Number(error.statusCode) || 500
    const headers = status === 503 ? { 'Retry-After': '5' } : {}
    return json(status, { error: error.message || 'Erro ao processar IA.' }, headers)
  }
}

async function callGemini({ prompt, systemPrompt, maxTokens }) {
  const key = process.env.GEMINI_API_KEY
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash'
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite'
  if (!key) throw new Error('GEMINI_API_KEY nao configurada no servidor.')

  const models = [...new Set([primaryModel, fallbackModel].filter(Boolean))]
  let lastError = null

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
            }),
          }
        )

        const data = await response.json()
        if (response.ok) {
          const candidate = data?.candidates?.[0]
          const text = candidate?.content?.parts?.map((part) => part.text || '').join('') || ''
          if (!text) throw new ProviderError('A IA respondeu sem conteudo. Tente novamente.', 502)
          if (candidate?.finishReason === 'MAX_TOKENS') {
            throw new ProviderError('A resposta da IA ficou incompleta.', 502)
          }
          return text
        }

        const retryable = response.status === 408 || response.status === 429 || response.status >= 500
        lastError = new ProviderError(data?.error?.message || `Gemini API error: ${response.status}`, response.status)
        if (!retryable) throw lastError
      } catch (error) {
        if (error instanceof ProviderError && error.statusCode < 500 && ![408, 429].includes(error.statusCode)) throw error
        lastError = error
      }

      if (attempt === 0) await delay(700 + Math.floor(Math.random() * 300))
    }
  }

  throw new ProviderError(
    'A IA esta temporariamente sobrecarregada. Aguarde alguns segundos e tente novamente.',
    lastError?.statusCode === 429 ? 429 : 503
  )
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callAnthropic({ prompt, systemPrompt, maxTokens }) {
  const key = process.env.ANTHROPIC_API_KEY
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
  if (!key) throw new Error('ANTHROPIC_API_KEY nao configurada no servidor.')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || `Anthropic API error: ${response.status}`)
  return data?.content?.map((block) => block.text || '').join('') || ''
}
