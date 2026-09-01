const PROVIDERS = {
  gemini: callGemini,
  anthropic: callAnthropic,
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
    return json(500, { error: error.message || 'Erro ao processar IA.' })
  }
}

async function callGemini({ prompt, systemPrompt, maxTokens }) {
  const key = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  if (!key) throw new Error('GEMINI_API_KEY nao configurada no servidor.')

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
  if (!response.ok) throw new Error(data?.error?.message || `Gemini API error: ${response.status}`)
  return data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || ''
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
