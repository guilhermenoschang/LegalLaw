const LEGAL_ALIASES = {
  tcu: ['tribunal de contas da uniao', 'controle externo', 'fiscalizacao contabil financeira orcamentaria'],
  stf: ['supremo tribunal federal'],
  stj: ['superior tribunal de justica'],
  cnj: ['conselho nacional de justica'],
  mp: ['ministerio publico'],
  mpu: ['ministerio publico da uniao'],
  dpu: ['defensoria publica da uniao'],
  oab: ['ordem dos advogados do brasil', 'advocacia'],
  isonomia: ['igualdade perante a lei', 'igualdade'],
  privacidade: ['intimidade', 'vida privada'],
  expressao: ['manifestacao do pensamento', 'liberdade de manifestacao'],
  concurso: ['concurso publico', 'investidura em cargo ou emprego publico'],
  tributo: ['tributacao', 'imposto', 'taxa', 'contribuicao'],
}

const WORD_PATTERN = /[a-z0-9]+/g
const SEARCH_STOP_WORDS = new Set(['a', 'as', 'o', 'os', 'de', 'da', 'das', 'do', 'dos', 'e', 'em', 'para', 'por'])

export function normalizeLegalText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(WORD_PATTERN)?.join(' ') || ''
}

function distance(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    previous = current
  }
  return previous[b.length]
}

function tokenMatches(queryToken, textToken) {
  if (queryToken === textToken) return true
  if (queryToken.length >= 4 && (textToken.startsWith(queryToken) || queryToken.startsWith(textToken))) return true
  if (queryToken.length < 4 || Math.abs(queryToken.length - textToken.length) > 2) return false
  return distance(queryToken, textToken) <= (queryToken.length >= 7 ? 2 : 1)
}

function hasNearbyTokens(queryTokens, textTokens) {
  if (queryTokens.length === 1) return textTokens.some((word) => tokenMatches(queryTokens[0], word))

  for (let start = 0; start < textTokens.length; start += 1) {
    if (!tokenMatches(queryTokens[0], textTokens[start])) continue
    let queryIndex = 1
    const end = Math.min(textTokens.length, start + queryTokens.length * 4)
    for (let index = start + 1; index < end && queryIndex < queryTokens.length; index += 1) {
      if (tokenMatches(queryTokens[queryIndex], textTokens[index])) queryIndex += 1
    }
    if (queryIndex === queryTokens.length) return true
  }

  return false
}

function scoreArticle(article, query) {
  const label = normalizeLegalText(article.n)
  const text = normalizeLegalText(article.t)
  const searchable = `${label} ${text}`
  const queryTokens = query.split(' ').filter((token) => token && !SEARCH_STOP_WORDS.has(token))

  if (label === query || label.startsWith(`${query} `)) return 120
  if (searchable.includes(query)) return 100

  const aliases = LEGAL_ALIASES[query] || []
  const aliasIndex = aliases.findIndex((alias) => searchable.includes(alias))
  if (aliasIndex >= 0) {
    const phrasePosition = searchable.indexOf(aliases[aliasIndex])
    return 95 - aliasIndex + Math.max(0, 20 - Math.floor(phrasePosition / 100))
  }

  const textTokens = searchable.split(' ')
  if (queryTokens.length > 0 && hasNearbyTokens(queryTokens, textTokens)) return 70 + queryTokens.length

  return 0
}

export function searchLegalArticles(articles, rawQuery, limit = 50) {
  const query = normalizeLegalText(rawQuery)
  if (!query) return []

  return articles
    .map((article, index) => ({ article, index, score: scoreArticle(article, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.article)
}
