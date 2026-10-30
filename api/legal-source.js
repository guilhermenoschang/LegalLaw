const SOURCES = {
  constitution: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm',
  penalCode: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm',
}

const CONSTITUTION_PORTAL = 'https://www2.camara.leg.br/a-camara/atividade-legislativa/legislacao/constituicao1988'
const MIN_ARTICLES = { constitution: 250, penalCode: 200 }

async function readSnapshot(type) {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const url = await import('node:url')
  const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)))
  const file = path.join(root, 'public', 'legal', `${type}.json`)
  const text = await fs.readFile(file, 'utf8')
  return JSON.parse(text)
}

async function fetchText(source) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(source, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'LegalFlowOS/1.0 (+https://legallaw.netlify.app)',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const bytes = await response.arrayBuffer()
    const preview = new TextDecoder('windows-1252').decode(bytes.slice(0, 4096))
    const declaredCharset = response.headers.get('content-type')?.match(/charset=([^;\s]+)/i)?.[1]
      || preview.match(/charset=["']?([^"'\s/>]+)/i)?.[1]
      || 'windows-1252'

    try {
      return new TextDecoder(declaredCharset).decode(bytes)
    } catch {
      return new TextDecoder('windows-1252').decode(bytes)
    }
  } finally {
    clearTimeout(timeout)
  }
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

const HTML_ENTITIES = {
  amp: '&', apos: "'", gt: '>', ldquo: '“', lt: '<', nbsp: ' ', ordm: 'º', quot: '"',
  rdquo: '”', rsquo: '’', sect: '§',
  Aacute: 'Á', Acirc: 'Â', Agrave: 'À', Atilde: 'Ã', Auml: 'Ä',
  Ccedil: 'Ç', Eacute: 'É', Ecirc: 'Ê', Egrave: 'È', Euml: 'Ë',
  Iacute: 'Í', Icirc: 'Î', Igrave: 'Ì', Iuml: 'Ï', Ntilde: 'Ñ',
  Oacute: 'Ó', Ocirc: 'Ô', Ograve: 'Ò', Otilde: 'Õ', Ouml: 'Ö',
  Uacute: 'Ú', Ucirc: 'Û', Ugrave: 'Ù', Uuml: 'Ü',
  aacute: 'á', acirc: 'â', agrave: 'à', atilde: 'ã', auml: 'ä',
  ccedil: 'ç', eacute: 'é', ecirc: 'ê', egrave: 'è', euml: 'ë',
  iacute: 'í', icirc: 'î', igrave: 'ì', iuml: 'ï', ntilde: 'ñ',
  oacute: 'ó', ocirc: 'ô', ograve: 'ò', otilde: 'õ', ouml: 'ö',
  uacute: 'ú', ucirc: 'û', ugrave: 'ù', uuml: 'ü',
}

function decodeHtmlEntities(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16))
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10))
    return HTML_ENTITIES[entity] ?? match
  })
}

function stripHtml(html) {
  return decodeHtmlEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h\d>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim())
}

function parseArticles(text) {
  const matches = [...text.matchAll(/(?:^|\n)\s*(Art\.?\s*\d+[ºo]?(?:-[A-Z])?\.?[\s\S]*?)(?=(?:\n\s*Art\.?\s*\d+[ºo]?(?:-[A-Z])?\.?)|$)/gi)]
  const seen = new Map()
  return matches.map((match) => {
    const body = match[1].replace(/\s+/g, ' ').trim()
    const label = body.match(/Art\.?\s*\d+[ºo]?(?:-[A-Z])?\.?/i)?.[0]?.replace(/\.$/, '') || 'Artigo'
    const number = label.match(/\d+[ºo]?(?:-[A-Z])?/i)?.[0] || label
    const baseId = label.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
    const count = (seen.get(baseId) || 0) + 1
    seen.set(baseId, count)
    return {
      id: count === 1 ? baseId : `${baseId}-${count}`,
      n: label,
      number,
      t: body,
    }
  }).filter((article) => article.t.length > 20)
}

function parsePenalCatalog(articles) {
  return articles.map((article) => {
    const text = article.t
    const penalty = text.match(/Pena\s+[-–]\s*([^\.]+(?:\.[^A-Z]*)?)/i)?.[1]?.trim()
    if (!penalty) return null
    const reclusion = /reclus[aã]o/i.test(penalty)
    const detention = /deten[cç][aã]o/i.test(penalty)
    const fine = /multa/i.test(penalty)
    return {
      id: article.id,
      article: article.n,
      title: text.slice(0, 140),
      penalty,
      types: [
        reclusion ? 'reclusao' : null,
        detention ? 'detencao' : null,
        fine ? 'multa' : null,
      ].filter(Boolean),
      fullText: text,
    }
  }).filter(Boolean)
}

async function fetchConstitutionFromCamara() {
  const portalHtml = await fetchText(CONSTITUTION_PORTAL)
  const relativeUrl = portalHtml.match(/href=["']([^"']*ConstituicaoTextoAtualizado[^"']*\.html)["']/i)?.[1]
  if (!relativeUrl) throw new Error('Link do texto atualizado nao encontrado na Camara.')
  const source = new URL(relativeUrl.replace(/&amp;/g, '&'), CONSTITUTION_PORTAL).href
  return { source, html: await fetchText(source) }
}

async function fetchOfficialSource(type) {
  const errors = []
  const candidates = [{ source: SOURCES[type], load: () => fetchText(SOURCES[type]) }]

  if (type === 'constitution') {
    candidates.push({ source: CONSTITUTION_PORTAL, load: fetchConstitutionFromCamara })
  }

  for (const candidate of candidates) {
    try {
      const loaded = await candidate.load()
      const source = typeof loaded === 'string' ? candidate.source : loaded.source
      const html = typeof loaded === 'string' ? loaded : loaded.html
      const articles = parseArticles(stripHtml(html))
      if (articles.length < MIN_ARTICLES[type]) {
        throw new Error(`Conteudo incompleto (${articles.length} artigos).`)
      }
      return { source, articles }
    } catch (error) {
      errors.push(`${candidate.source}: ${error.message || 'falha na consulta'}`)
    }
  }

  throw new Error(errors.join(' | '))
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const type = url.searchParams.get('type')
  const source = SOURCES[type]

  if (!source) return sendJson(res, 400, { error: 'Fonte invalida.' })

  try {
    const official = await fetchOfficialSource(type)
    const checkedAt = new Date().toISOString()
    const articles = official.articles
    const body = {
      type,
      source: official.source,
      fetchedAt: checkedAt,
      checkedAt,
      sourceStatus: 'online',
      stale: false,
      articleCount: articles.length,
      articles,
    }

    if (type === 'penalCode') {
      body.penalCatalog = parsePenalCatalog(articles)
    }

    return sendJson(res, 200, body)
  } catch (error) {
    try {
      const snapshot = await readSnapshot(type)
      return sendJson(res, 200, {
        ...snapshot,
        checkedAt: new Date().toISOString(),
        sourceStatus: 'snapshot',
        stale: true,
        fallbackReason: error.message || 'Fonte online indisponivel.',
      })
    } catch {
      return sendJson(res, 500, { error: error.message || 'Erro ao atualizar fonte juridica.' })
    }
  }
}
