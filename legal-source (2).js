import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SOURCES = {
  constitution: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm',
  penalCode: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm',
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
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
    const penalty = article.t.match(/Pena\s+[-–]\s*([^\.]+(?:\.[^A-Z]*)?)/i)?.[1]?.trim()
    if (!penalty) return null
    return {
      id: article.id,
      article: article.n,
      title: article.t.slice(0, 140),
      penalty,
      types: [
        /reclus[aã]o/i.test(penalty) ? 'reclusao' : null,
        /deten[cç][aã]o/i.test(penalty) ? 'detencao' : null,
        /multa/i.test(penalty) ? 'multa' : null,
      ].filter(Boolean),
      fullText: article.t,
    }
  }).filter(Boolean)
}

async function readSnapshot(type) {
  const text = await readFile(join(process.cwd(), 'public', 'legal', `${type}.json`), 'utf8')
  return JSON.parse(text)
}

export async function handler(event) {
  const type = event.queryStringParameters?.type
  const source = SOURCES[type]
  if (!source) return json(400, { error: 'Fonte invalida.' })

  try {
    const response = await fetch(source)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const text = stripHtml(await response.text())
    const articles = parseArticles(text)
    const body = {
      type,
      source,
      fetchedAt: new Date().toISOString(),
      articleCount: articles.length,
      articles,
    }
    if (type === 'penalCode') body.penalCatalog = parsePenalCatalog(articles)
    return json(200, body)
  } catch (error) {
    try {
      const snapshot = await readSnapshot(type)
      return json(200, {
        ...snapshot,
        stale: true,
        fallbackReason: error.message || 'Fonte online indisponivel.',
      })
    } catch {
      return json(500, { error: error.message || 'Erro ao atualizar fonte juridica.' })
    }
  }
}
