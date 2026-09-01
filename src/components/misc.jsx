// ─── Constituição ──────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { askAI, askAIJSON } from '@/lib/ai'
import { useLegalSourceStore, useUIStore } from '@/store'

const CF_DATA = {
  'art. 5': { title: 'Título II — Direitos e Garantias Fundamentais', ch: 'Capítulo I', arts: [
    { n: 'Art. 5°, caput', t: 'Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade.' },
    { n: 'Art. 5°, I',    t: 'homens e mulheres são iguais em direitos e obrigações, nos termos desta Constituição;' },
    { n: 'Art. 5°, II',   t: 'ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei;' },
    { n: 'Art. 5°, III',  t: 'ninguém será submetido a tortura nem a tratamento desumano ou degradante;' },
    { n: 'Art. 5°, IV',   t: 'é livre a manifestação do pensamento, sendo vedado o anonimato;' },
    { n: 'Art. 5°, LIV',  t: 'ninguém será privado da liberdade ou de seus bens sem o devido processo legal;' },
    { n: 'Art. 5°, LV',   t: 'aos litigantes são assegurados o contraditório e a ampla defesa, com os meios e recursos a ela inerentes;' },
  ]},
  'art. 37': { title: 'Título III — Da Organização do Estado', ch: 'Cap. VII — Administração Pública', arts: [
    { n: 'Art. 37, caput', t: 'A administração pública obedecerá aos princípios de legalidade, impessoalidade, moralidade, publicidade e eficiência.' },
    { n: 'Art. 37, I',   t: 'os cargos, empregos e funções públicas são acessíveis aos brasileiros que preencham os requisitos estabelecidos em lei;' },
    { n: 'Art. 37, II',  t: 'a investidura em cargo ou emprego público depende de aprovação prévia em concurso público de provas ou de provas e títulos;' },
  ]},
  'art. 93': { title: 'Título IV — Da Organização dos Poderes', ch: 'Seção I — Do Poder Judiciário', arts: [
    { n: 'Art. 93, caput', t: 'Lei complementar, de iniciativa do STF, disporá sobre o Estatuto da Magistratura.' },
    { n: 'Art. 93, IX',    t: 'todos os julgamentos dos órgãos do Poder Judiciário serão públicos e fundamentadas todas as decisões, sob pena de nulidade;' },
  ]},
  'art. 170': { title: 'Título VII — Da Ordem Econômica e Financeira', ch: 'Capítulo I', arts: [
    { n: 'Art. 170, caput', t: 'A ordem econômica, fundada na valorização do trabalho humano e na livre iniciativa, tem por fim assegurar a todos existência digna.' },
    { n: 'Art. 170, IV', t: 'livre concorrência;' },
    { n: 'Art. 170, V',  t: 'defesa do consumidor;' },
  ]},
  'art. 196': { title: 'Título VIII — Da Ordem Social', ch: 'Seção II — Da Saúde', arts: [
    { n: 'Art. 196', t: 'A saúde é direito de todos e dever do Estado, garantido mediante políticas sociais e econômicas.' },
    { n: 'Art. 197', t: 'São de relevância pública as ações e serviços de saúde, cabendo ao Poder Público dispor sobre sua regulamentação.' },
  ]},
}

function LegalNotice({ children }) {
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800 p-3 text-xs leading-relaxed">
      {children}
    </div>
  )
}

export function Constituicao() {
  const { constitution, notes, favorites, updateSource, setNote, toggleFavorite } = useLegalSourceStore()
  const [query, setQuery]   = useState('')
  const [result, setResult] = useState(null)
  const [aiExpl, setAiExpl] = useState('')
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  const data = constitution?.articles?.length ? constitution.articles : Object.values(CF_DATA).flatMap((group) => group.arts)
  const selected = result || { title: constitution ? 'Constituição Federal' : CF_DATA['art. 5'].title, ch: constitution ? `${constitution.articleCount} artigos importados` : CF_DATA['art. 5'].ch, arts: constitution ? data.slice(0, 12) : CF_DATA['art. 5'].arts }

  useEffect(() => {
    if (!constitution) refresh()
  }, [])

  const search = (q) => {
    const raw = (q || query).toLowerCase().replace(/\s/g, '')
    if (constitution?.articles?.length) {
      const found = constitution.articles.filter((article) =>
        article.n.toLowerCase().replace(/\s/g, '').includes(raw) ||
        article.t.toLowerCase().includes((q || query).toLowerCase())
      )
      if (found.length) {
        setResult({ title: 'Resultado da busca', ch: `${found.length} artigo(s)`, arts: found.slice(0, 50) })
        setAiExpl('')
        return
      }
    }
    const key = Object.keys(CF_DATA).find((k) => raw.includes(k.replace(/[\s.]/g, '')))
    if (key) { setResult(CF_DATA[key]); setAiExpl('') }
    else alert(constitution ? 'Nenhum artigo encontrado.' : 'Tente: art. 5, art. 37, art. 93, art. 170 ou art. 196')
  }

  const refresh = async () => {
    setUpdating(true)
    try {
      const updated = await updateSource('constitution')
      setResult({ title: 'Constituição Federal atualizada', ch: `${updated.articleCount} artigos importados`, arts: updated.articles.slice(0, 12) })
    } catch (err) {
      alert(err.message || 'Erro ao atualizar Constituicao.')
    } finally {
      setUpdating(false)
    }
  }

  const explain = async (artText) => {
    setLoading(true)
    try {
      const r = await askAI(`Explique de forma didática para concurso público: "${artText}". Máximo 4 frases, linguagem clara. Inclua uma ressalva curta para validar o texto em fonte oficial antes de uso profissional.`)
      setAiExpl(r)
    } finally { setLoading(false) }
  }

  return (
    <div className="fade-in">
      <LegalNotice>
        Fonte atualizavel pelo Planalto. Suas notas e favoritos ficam separados por artigo para preservar o historico mesmo quando o texto legal for atualizado.
      </LegalNotice>
      <div className="flex gap-2 flex-wrap mb-4">
        {Object.keys(CF_DATA).map((k) => (
          <button key={k} onClick={() => { setQuery(k); search(k) }}
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-500 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 transition-colors">
            {k.toUpperCase()}
          </button>
        ))}
        <button onClick={refresh} disabled={updating} className="btn-primary text-xs">
          {updating ? 'Atualizando...' : 'Atualizar fonte oficial'}
        </button>
        {constitution?.fetchedAt && <span className="chip bg-teal-50 text-teal-700 border-teal-200">Atualizada em {new Date(constitution.fetchedAt).toLocaleString('pt-BR')}</span>}
      </div>
      <div className="flex gap-2 mb-4">
        <input className="input flex-1" placeholder="Buscar artigo (ex: art 5)..." value={query}
          onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="btn-primary" onClick={() => search()}>Buscar</button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium">{selected.title}</h2>
          <span className="chip bg-brand-50 text-brand-700 border-brand-200">{selected.ch}</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
          {selected.arts.map((a, index) => {
            const articleId = a.id || a.n.toLowerCase().replace(/\s+/g, '-')
            const noteKey = `constitution:${articleId}`
            return (
            <div key={`${articleId}-${index}`} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-brand-600">{a.n}</span>
                <div className="flex gap-2">
                  <button onClick={() => explain(a.t)} className="text-xs text-gray-400 hover:text-brand-600">✦ Explicar</button>
                  <button onClick={() => toggleFavorite('constitution', articleId)}
                    className={`text-sm ${favorites[noteKey] ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}>
                    {favorites[noteKey] ? '★' : '☆'}
                  </button>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{a.t}</p>
              <textarea
                className="input h-16 resize-none mt-3 text-xs"
                placeholder="Anotacoes deste artigo..."
                value={notes[noteKey]?.text || ''}
                onChange={(e) => setNote('constitution', articleId, e.target.value)}
              />
            </div>
          )})}
        </div>
      </div>

      {aiExpl && (
        <div className="mt-4 card border-l-4 border-brand-400 bg-brand-50 dark:bg-brand-900/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-brand-700">✦ Explicação IA</span>
            {loading && <span className="text-xs text-gray-400">Gerando...</span>}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{aiExpl}</p>
        </div>
      )}
    </div>
  )
}

// ─── Quiz ───────────────────────────────────────────────────────────────────────
export function Quiz() {
  const [qs, setQs]         = useState([])
  const [answered, setAnswered] = useState(0)
  const [correct, setCorrect]   = useState(0)
  const [loading, setLoading]   = useState(false)
  const [cfg, setCfg] = useState({ tema: 'Direitos Fundamentais', dif: 'Médio', num: 2, foco: 'Conceitos gerais' })

  const gerar = async () => {
    setLoading(true); setQs([])
    try {
      const r = await askAIJSON(
        `Gere ${cfg.num} questão(ões) de múltipla escolha sobre ${cfg.tema}, nível ${cfg.dif}, foco ${cfg.foco}. JSON apenas sem markdown: {"questoes":[{"pergunta":"...","alternativas":["A) ...","B) ...","C) ...","D) ..."],"correta":0,"explicacao":"..."}]}`
      )
      setQs(r.questoes.map((q) => ({ ...q, answered: null })))
    } catch (err) { alert(err.message || 'Erro ao gerar. Verifique a configuracao server-side da IA.') }
    finally { setLoading(false) }
  }

  const responder = (qi, ai) => {
    if (qs[qi].answered !== null) return
    setQs((prev) => prev.map((q, i) => i === qi ? { ...q, answered: ai } : q))
    setAnswered((n) => n + 1)
    if (ai === qs[qi].correta) setCorrect((n) => n + 1)
  }

  return (
    <div className="fade-in">
      <LegalNotice>
        Questoes geradas por IA podem conter erro, omissao ou referencia incompleta. Use como treino e valide fundamentos em doutrina, lei e fonte oficial.
      </LegalNotice>
      {/* Placar */}
      <div className="card flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-full border-[3px] border-brand-600 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-xl font-medium text-brand-600">{correct}</span>
          <span className="text-[9px] text-gray-400">acertos</span>
        </div>
        <div>
          <p className="text-sm font-medium">Desempenho da sessão</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {answered === 0 ? 'Nenhuma questão respondida ainda.' : `${correct} de ${answered} — ${Math.round((correct / answered) * 100)}% de aproveitamento`}
          </p>
        </div>
      </div>

      {/* Setup */}
      <div className="card mb-5">
        <h3 className="text-sm font-medium mb-4">Configurar questões</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            ['Tema', 'tema', ['Direitos Fundamentais','Direito Penal','Direito Civil','Direito Administrativo','Processo Civil','Processo Penal','Direito Constitucional','Direito Tributário']],
            ['Dificuldade', 'dif', ['Fácil','Médio','Difícil','Concurso']],
            ['Quantidade', 'num', ['1','2','3']],
            ['Foco', 'foco', ['Conceitos gerais','Artigos específicos','Jurisprudência','Casos práticos']],
          ].map(([label, key, opts]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <select className="select w-full" value={cfg[key]} onChange={(e) => setCfg({ ...cfg, [key]: key === 'num' ? Number(e.target.value) : e.target.value })}>
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <button className="btn-primary w-full justify-center" onClick={gerar} disabled={loading}>
          {loading ? 'Gerando questões...' : '✦ Gerar questões com IA'}
        </button>
      </div>

      {/* Questões */}
      {qs.map((q, qi) => (
        <div key={qi} className="card mb-4">
          <div className="flex gap-2 mb-3">
            <span className="chip bg-gray-50 text-gray-600 border-gray-200">Q{qi + 1}</span>
            <span className="chip chip-media">{cfg.dif}</span>
          </div>
          <p className="text-sm font-medium leading-relaxed mb-4">{q.pergunta}</p>
          {q.alternativas.map((a, ai) => {
            const state = q.answered !== null ? (ai === q.correta ? 'correct' : ai === q.answered ? 'wrong' : 'neutral') : 'idle'
            return (
              <div key={ai} onClick={() => responder(qi, ai)}
                className={`flex gap-3 items-start px-3 py-2.5 rounded-lg border mb-2 text-sm cursor-pointer transition-colors leading-snug ${
                  state === 'correct' ? 'border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-900/20' :
                  state === 'wrong'   ? 'border-red-300 bg-red-50 text-red-800 dark:bg-red-900/20' :
                  state === 'neutral' ? 'border-gray-200 dark:border-gray-700 opacity-60' :
                  'border-gray-200 dark:border-gray-700 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                }`}>
                {a}
              </div>
            )
          })}
          {q.answered !== null && (
            <div className="mt-3 pl-3 border-l-4 border-brand-400 bg-brand-50 dark:bg-brand-900/20 py-2 pr-3 rounded-r-lg">
              <p className="text-xs font-medium text-brand-700 mb-1">✦ Explicação</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{q.explicacao}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Calculadora de Pena ────────────────────────────────────────────────────────
export function Pena() {
  const { penalCode, updateSource } = useLegalSourceStore()
  const [form, setForm] = useState({ crime: '', base: 4, aten: 0, agr: 0, multaDias: 10, tipo: 'privativa' })
  const [result, setResult] = useState(null)
  const [query, setQuery] = useState('')
  const [updating, setUpdating] = useState(false)

  const calc = () => {
    const final = Math.max(0, form.base - form.aten + form.agr)
    const regime = final > 8 ? 'Fechado como regra inicial' : final > 4 ? 'Semiaberto como regra inicial' : 'Aberto em hipoteses favoraveis'
    const obs = 'Resultado orientativo. Reincidencia, violencia, circunstancias judiciais, concurso de crimes, substituicao e sursis podem alterar a conclusao.'
    setResult({ final, regime, obs })
  }

  const refreshPenalCode = async () => {
    setUpdating(true)
    try { await updateSource('penalCode') }
    catch (err) { alert(err.message || 'Erro ao atualizar Codigo Penal.') }
    finally { setUpdating(false) }
  }

  const catalog = penalCode?.penalCatalog || []
  const filtered = catalog.filter((item) =>
    !query || item.article.toLowerCase().includes(query.toLowerCase()) ||
    item.penalty.toLowerCase().includes(query.toLowerCase()) ||
    item.fullText.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20)

  useEffect(() => {
    if (!penalCode) refreshPenalCode()
  }, [])

  return (
    <div className="fade-in">
      <LegalNotice>
        Catalogo atualizavel pelo Planalto e calculo educacional. Para atender o Codigo Penal inteiro, o sistema busca penas no texto oficial e preserva a dosimetria como ferramenta de apoio, nao decisao automatica.
      </LegalNotice>
      <div className="grid grid-cols-[minmax(320px,420px)_1fr] gap-4">
      <div className="card space-y-4">
        <h3 className="text-sm font-medium">Calculadora de Pena</h3>
        <div>
          <label className="label">Crime</label>
          <input className="input" value={form.crime} onChange={(e) => setForm({ ...form, crime: e.target.value })} placeholder="Ex: Roubo simples (Art. 157 CP)" />
        </div>
        <div>
          <label className="label">Tipo de pena</label>
          <select className="select w-full" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="privativa">Privativa de liberdade</option>
            <option value="restritiva">Restritiva de direitos / substituicao</option>
            <option value="multa">Multa</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[['Pena base (anos)', 'base'], ['Atenuantes', 'aten'], ['Agravantes', 'agr']].map(([l, k]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input type="number" className="input" min={0} step={0.5} value={form[k]} onChange={(e) => setForm({ ...form, [k]: parseFloat(e.target.value) || 0 })} />
            </div>
          ))}
        </div>
        <div>
          <label className="label">Dias-multa, se aplicavel</label>
          <input type="number" className="input" min={0} value={form.multaDias} onChange={(e) => setForm({ ...form, multaDias: Number(e.target.value) || 0 })} />
        </div>
        <button className="btn-primary w-full justify-center" onClick={calc}>Calcular pena final</button>

        {result && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-2xl font-medium">{result.final.toFixed(1)} anos</div><div className="text-xs text-gray-500">Pena final</div></div>
              <div><div className="text-xl font-medium text-brand-600">{result.regime}</div><div className="text-xs text-gray-500">Regime inicial</div></div>
            </div>
            <p className="text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">{result.obs}</p>
            {form.tipo === 'multa' && <p className="text-xs text-gray-500">Multa informada: {form.multaDias} dias-multa. O valor depende da situacao economica e parametros legais.</p>}
          </div>
        )}
      </div>
      <div className="card">
        <div className="flex gap-2 items-center mb-3">
          <div className="flex-1">
            <h3 className="text-sm font-medium">Catalogo de penas do Codigo Penal</h3>
            <p className="text-xs text-gray-500 mt-1">{penalCode ? `${penalCode.penalCatalog?.length || 0} dispositivos com pena encontrados` : 'Atualize a fonte oficial para preencher o catalogo.'}</p>
          </div>
          <button className="btn-primary text-xs" onClick={refreshPenalCode} disabled={updating}>{updating ? 'Atualizando...' : 'Atualizar CP'}</button>
        </div>
        <input className="input mb-3" placeholder="Buscar crime, artigo ou pena..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {filtered.length ? filtered.map((item, index) => (
            <button key={`${item.id}-${index}`} className="w-full text-left border border-gray-200 dark:border-gray-800 rounded-lg p-3 hover:border-brand-400 transition-colors"
              onClick={() => setForm({ ...form, crime: item.article })}>
              <div className="flex gap-2 items-center mb-1">
                <span className="text-xs font-medium text-brand-600">{item.article}</span>
                {item.types.map((type) => <span key={type} className="chip bg-gray-50 text-gray-500 border-gray-200">{type}</span>)}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{item.penalty}</p>
            </button>
          )) : <p className="text-sm text-gray-400 py-8 text-center">Nenhuma pena carregada/encontrada.</p>}
        </div>
      </div>
      </div>
    </div>
  )
}

// ─── Config ─────────────────────────────────────────────────────────────────────
export function Config() {
  const { darkMode, toggleDarkMode } = useUIStore()
  return (
    <div className="fade-in max-w-md">
      <div className="card space-y-4">
        <h3 className="text-sm font-medium">Configurações</h3>
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
          <div><p className="text-sm">Tema escuro</p><p className="text-xs text-gray-500">Alterna entre claro e escuro</p></div>
          <button onClick={toggleDarkMode} className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-brand-600' : 'bg-gray-200'} relative`}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="py-2">
          <p className="text-sm font-medium mb-1">IA server-side</p>
          <p className="text-xs text-gray-500 mb-2">As chaves de IA devem ficar no servidor. Configure <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">GEMINI_API_KEY</code> ou <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">ANTHROPIC_API_KEY</code> no ambiente de deploy.</p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs font-mono text-gray-500">Frontend -&gt; /api/ai -&gt; provedor de IA</div>
        </div>
      </div>
    </div>
  )
}
