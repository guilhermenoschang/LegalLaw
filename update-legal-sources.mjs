import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outDir = join(root, 'public', 'legal')

const SOURCES = {
  constitution: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm',
  penalCode: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm',
}

function download(url) {
  return execFileSync('powershell', [
    '-NoProfile',
    '-Command',
    `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; (Invoke-WebRequest -UseBasicParsing -Uri '${url}' -TimeoutSec 30).Content`,
  ], { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 })
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

mkdirSync(outDir, { recursive: true })

for (const [type, source] of Object.entries(SOURCES)) {
  const html = download(source)
  const text = stripHtml(html)
  const articles = parseArticles(text)
  const payload = {
    type,
    source,
    fetchedAt: new Date().toISOString(),
    articleCount: articles.length,
    articles,
  }
  if (type === 'penalCode') payload.penalCatalog = parsePenalCatalog(articles)
  writeFileSync(join(outDir, `${type}.json`), JSON.stringify(payload, null, 2), 'utf8')
  console.log(`${type}: ${articles.length} artigos`)
}
