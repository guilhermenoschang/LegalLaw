const SOURCES = {
  constitution: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm',
  penalCode: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm',
}

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
  try {
    const response = await fetch(source)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } catch {
    const https = await import('node:https')
    return new Promise((resolve, reject) => {
      https.get(source, { rejectUnauthorized: false }, (response) => {
        if (response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode}`))
          return
        }
        let data = ''
        response.setEncoding('latin1')
        response.on('data', (chunk) => { data += chunk })
        response.on('end', () => resolve(Buffer.from(data, 'latin1').toString('utf8')))
      }).on('error', reject)
    })
  }
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h\d>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ordm;/g, 'o')
    .replace(/&sect;/g, '§')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&atilde;/g, 'ã')
    .replace(/&otilde;/g, 'õ')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&acirc;/g, 'â')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&Atilde;/g, 'Ã')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const type = url.searchParams.get('type')
  const source = SOURCES[type]

  if (!source) return sendJson(res, 400, { error: 'Fonte invalida.' })

  try {
    const html = await fetchText(source)
    const text = stripHtml(html)
    const articles = parseArticles(text)
    const body = {
      type,
      source,
      fetchedAt: new Date().toISOString(),
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
        stale: true,
        fallbackReason: error.message || 'Fonte online indisponivel.',
      })
    } catch {
      return sendJson(res, 500, { error: error.message || 'Erro ao atualizar fonte juridica.' })
    }
  }
}
