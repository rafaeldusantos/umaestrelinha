import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FAQ_QUESTION_MAX, faqQuestionKey } from '@estrelinha/core/faq'

/**
 * `FAQL-26`, `FAQL-27`, `FAQL-29` — o guarda entre o schema em **SQL** da feature 46 e o que o resto
 * do projeto afirma sobre ele.
 *
 * Vale aqui a mesma propriedade ruim que obrigou `faqSchema.test.ts` e `homeSections.test.ts` a
 * existirem: **errar nisto não quebra nada.** A policy de escrita sem `has_role` abre a colocação
 * inteira para qualquer pessoa autenticada e a suíte segue verde; o `on delete restrict` virar
 * `cascade` só se descobre no dia em que uma entrada apagada some da página **e** de 453 páginas de
 * produto; um valor a mais no `check` de assunto produz um grupo que a loja não sabe desenhar.
 *
 * A falha que este arquivo precisa evitar **em si mesmo** é um caminho errado varrendo zero e
 * passando em silêncio. Daí a **âncora dupla**: o arquivo é encontrado (tamanho mínimo) **e** o
 * número de tabelas, índices, policies e `check` encontrados é asserido.
 *
 * **Uma régua por COMANDO, nunca uma para a família** (`L-033`). Esta migration emite quatro
 * `alter table` sobre duas tabelas diferentes; uma expressão que casasse "algum `add constraint` com
 * 4000" mediria a forma do primeiro e deixaria o segundo escapar em silêncio — que é exatamente o
 * caso em que o painel do produto aceitaria 4000 caracteres e o banco recusaria em 601.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * Os caminhos por extenso, de propósito. A régua nunca é o objeto medido — derivá-los de uma
 * constante do projeto faria a varredura encolher junto com o que ela deveria guardar.
 */
const MIGRATION = join(ROOT, 'supabase/migrations/20260912120000_46-perguntas-frequentes-da-loja.sql')
const MIGRATION_28 = join(ROOT, 'supabase/migrations/20260816120000_28-perguntas-frequentes.sql')

/**
 * CRLF normalizado **antes** de qualquer régua (`L-031`). Num checkout Windows o arquivo chega com
 * `\r\n`, e toda expressão ancorada em `\n` passaria a medir outra coisa — silenciosamente.
 */
const ler = (caminho: string): string => readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')

const SQL = ler(MIGRATION)
const SQL_28 = ler(MIGRATION_28)

/** Comentário não é código: sem tirá-los, o texto que EXPLICA a regra entraria na medição dela. */
const semComentarios = (fonte: string): string => fonte.replace(/--[^\n]*/g, '')

const LIMPO = semComentarios(SQL)
const LIMPO_28 = semComentarios(SQL_28)

/**
 * O SQL sem os literais de texto — é sobre ISTO que as réguas de "que comandos esta migration emite"
 * rodam.
 *
 * Desde a semeadura o arquivo carrega 26 respostas escritas pela dona. Uma régua de comando aplicada
 * sobre o texto dela mediria o conteúdo em vez do código: bastaria uma resposta futura conter a
 * palavra "delete" para o guarda acusar uma migration correta. O objeto medido é o comando; a prosa
 * da dona não é régua de nada.
 */
const semLiterais = (fonte: string): string => fonte.replace(/'(?:[^']|'')*'/g, "''")

const CODIGO = semLiterais(LIMPO)

const ocorrencias = (re: RegExp): string[] => [...LIMPO.matchAll(re)].map(m => m[0])

// ---------------------------------------------------------------------------
// Âncora — sem ela, todo o resto pode passar sobre nada
// ---------------------------------------------------------------------------

describe('a migration da 46 está onde este teste procura', () => {
  it('o arquivo existe e tem corpo — e o corpo sobrevive à remoção dos comentários', () => {
    expect(SQL.length).toBeGreaterThan(3000)
    expect(LIMPO.length).toBeGreaterThan(800)
  })

  it('cria uma tabela e um índice, e nenhum a mais', () => {
    expect(ocorrencias(/create table if not exists public\.\w+/g)).toEqual([
      'create table if not exists public.faq_page_items',
    ])
    expect(ocorrencias(/create (unique )?index if not exists \w+/g)).toEqual([
      'create index if not exists faq_page_items_order_idx',
    ])
  })

  it('declara exatamente 2 policies e 4 `check`', () => {
    expect(ocorrencias(/create policy "[^"]+"/g)).toHaveLength(2)
    // `\s+` e não ` ` — o SQL alinha o `check` em coluna e três das quatro constraints têm quebra de
    // linha entre o nome e a palavra. Um parser exigindo espaço único acharia 1 de 4 e a âncora
    // reprovaria por motivo errado.
    expect(ocorrencias(/constraint \w+\s+check/g)).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// O teto de 4000 — uma régua por comando (L-033)
// ---------------------------------------------------------------------------

/** Os dois números do `between A and B` do `add constraint` daquela constraint, ou `null`. */
const faixaDoAdd = (constraint: string): [number, number] | null => {
  const re = new RegExp(`add constraint ${constraint}(?![-\\w])([\\s\\S]{0,200})`)
  const bloco = LIMPO.match(re)
  if (!bloco) return null
  if (!bloco[1].includes('check')) return null
  const faixa = bloco[1].match(/between\s+(\d+)\s+and\s+(\d+)/)
  return faixa ? [Number(faixa[1]), Number(faixa[2])] : null
}

/** O mesmo, para o `check` inline de uma constraint declarada dentro de um `create table`. */
const faixaDoCheckInline = (constraint: string, fonte: string): [number, number] | null => {
  const re = new RegExp(`constraint ${constraint}(?![-\\w])([\\s\\S]{0,240})`)
  const bloco = fonte.match(re)
  if (!bloco) return null
  if (!bloco[1].includes('check')) return null
  const faixa = bloco[1].match(/between\s+(\d+)\s+and\s+(\d+)/)
  return faixa ? [Number(faixa[1]), Number(faixa[2])] : null
}

describe('o teto da resposta sobe para 4000, comando a comando', () => {
  it('`faqs_answer_len` é derrubada antes de ser recriada — na tabela `faqs`', () => {
    expect(LIMPO).toMatch(
      /alter table public\.faqs drop constraint if exists faqs_answer_len\s*;/,
    )
  })

  it('`faqs_answer_len` é recriada com 4000 — na tabela `faqs`', () => {
    expect(LIMPO).toMatch(/alter table public\.faqs add constraint faqs_answer_len/)
    expect(faixaDoAdd('faqs_answer_len')).toEqual([1, 4000])
  })

  // O segundo comando, com asserção PRÓPRIA. O teto é compartilhado — `FAQ_ANSWER_MAX` é o mesmo
  // número no editor da biblioteca e no `maxLength` da resposta própria do produto (`FaqTab.tsx`) —,
  // então subir um só faria a tela aceitar 4000 caracteres que o banco recusa em 601.
  it('`product_faqs_override_len` é derrubada antes de ser recriada — na tabela `product_faqs`', () => {
    expect(LIMPO).toMatch(
      /alter table public\.product_faqs drop constraint if exists product_faqs_override_len\s*;/,
    )
  })

  it('`product_faqs_override_len` é recriada com 4000 — na tabela `product_faqs`', () => {
    expect(LIMPO).toMatch(
      /alter table public\.product_faqs add constraint product_faqs_override_len/,
    )
    expect(faixaDoAdd('product_faqs_override_len')).toEqual([1, 4000])
  })

  // O `drop`+`add` revalida a tabela inteira. Ele só é seguro numa tabela com linhas em produção
  // porque a direção é de AFROUXAMENTO: nenhuma linha existente pode violar um limite maior que o que
  // ela já respeita. Se um dia alguém baixar o número, este caso reprova antes do `db push`.
  it('a direção é de afrouxamento: o teto novo é MAIOR que o que a 28 declarou', () => {
    const antigo = faixaDoCheckInline('faqs_answer_len', LIMPO_28)
    expect(antigo).toEqual([1, 600])
    expect(faixaDoAdd('faqs_answer_len')[1]).toBeGreaterThan(antigo[1])
  })

  // Sem isto o parser poderia estar devolvendo `null` para tudo e as asserções acima reprovariam por
  // motivo errado. Aqui ele prova que SABE não achar.
  it('o parser devolve `null` para uma constraint que não existe', () => {
    expect(faixaDoAdd('constraint_que_nao_existe')).toBeNull()
    expect(faixaDoCheckInline('constraint_que_nao_existe', LIMPO)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// faq_page_items — a colocação
// ---------------------------------------------------------------------------

/** O corpo do `create table`, do `(` até o `);`. */
const CORPO_DA_TABELA = (() => {
  const inicio = LIMPO.indexOf('create table if not exists public.faq_page_items')
  const fim = LIMPO.indexOf(');', inicio)
  return LIMPO.slice(inicio, fim)
})()

describe('faq_page_items', () => {
  it('a leitura do corpo da tabela encontrou as cinco colunas — âncora do recorte', () => {
    for (const coluna of ['faq_id', 'category', 'position', 'answer_override', 'created_at']) {
      expect(CORPO_DA_TABELA).toContain(coluna)
    }
  })

  // A página é UMA, então a mesma pergunta não pode estar duas vezes nela: a PK é o próprio `faq_id`,
  // e não uma coluna a mais. É a diferença deliberada em relação a `product_faqs`, cuja PK é composta
  // porque existem 680 produtos.
  it('`faq_id` é a PK e aponta para `faqs(id)` com `on delete restrict` — NUNCA cascade', () => {
    expect(CORPO_DA_TABELA).toMatch(
      /faq_id\s+uuid primary key references public\.faqs\(id\) on delete restrict/,
    )
    expect(LIMPO).not.toMatch(/references public\.faqs\(id\) on delete cascade/)
  })

  it('`category` e `position` são obrigatórias; `answer_override` é nullable', () => {
    expect(CORPO_DA_TABELA).toMatch(/category text not null/)
    expect(CORPO_DA_TABELA).toMatch(/position integer not null default 0/)
    expect(CORPO_DA_TABELA).toMatch(/created_at timestamptz not null default now\(\)/)
    // `null` significa "usa a resposta da biblioteca". Torná-la obrigatória obrigaria a gravar uma
    // cópia do padrão — o texto com dois donos que `faqOverrideOf` existe para impedir.
    expect(CORPO_DA_TABELA).toMatch(/\n\tanswer_override text,/)
  })

  // O texto mora em `faqs`, que já carrega o trigger da feature 28. Um `updated_at` aqui seria um
  // segundo carimbo de "quando esta resposta mudou", apontando para a colocação em vez do conteúdo.
  it('não tem `updated_at` nem trigger próprio', () => {
    expect(CORPO_DA_TABELA).not.toContain('updated_at')
    expect(LIMPO).not.toMatch(/create trigger/)
  })

  it('a resposta própria da página tem o mesmo teto de 4000', () => {
    expect(faixaDoCheckInline('faq_page_items_override_len', LIMPO)).toEqual([1, 4000])
    expect(CORPO_DA_TABELA).toMatch(/answer_override is null or char_length\(btrim\(answer_override\)\)/)
  })

  it('o índice da leitura da loja é `(category, position)`', () => {
    expect(LIMPO).toMatch(
      /create index if not exists faq_page_items_order_idx on public\.faq_page_items \(category, position\)/,
    )
  })
})

// ---------------------------------------------------------------------------
// O vocabulário de assunto — item a item
// ---------------------------------------------------------------------------

/** Os valores aceitos pelo `check (category in (…))`, na ordem em que o SQL os declara. */
const valoresDoCheckDeAssunto = (fonte: string): string[] => {
  const bloco = fonte.match(/check \(category in \(([^)]*)\)\)/)
  if (!bloco) return []
  return [...bloco[1].matchAll(/'([^']+)'/g)].map(m => m[1])
}

/**
 * A lista escrita **literalmente**, e não importada de `FAQ_PAGE_CATEGORIES`.
 *
 * A régua nunca pode ser o objeto medido: comparar a constante com ela mesma passaria com as duas
 * pontas erradas. Quem compara a constante do TypeScript com este `.sql` é `page.test.ts`, em `core`
 * — as duas asserções juntas fecham o triângulo.
 */
const ASSUNTOS = [
  'sobre',
  'o-processo',
  'envio-do-material',
  'materiais-e-acabamentos',
  'personalizacao',
  'cuidados',
]

describe('o vocabulário de assunto é fechado', () => {
  it('o `check` declara os seis valores, item a item e nessa ordem', () => {
    expect(valoresDoCheckDeAssunto(LIMPO)).toEqual(ASSUNTOS)
  })

  it('o parser de assunto devolve lista vazia quando não acha o `check` — sensor', () => {
    expect(valoresDoCheckDeAssunto('create table x ();')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// RLS
// ---------------------------------------------------------------------------

/** O corpo de uma policy, do `create policy` até o `;`. */
const corpoDaPolicy = (nome: string): string => {
  const inicio = LIMPO.indexOf(`create policy "${nome}"`)
  if (inicio === -1) return ''
  const fim = LIMPO.indexOf(';', inicio)
  return fim === -1 ? LIMPO.slice(inicio) : LIMPO.slice(inicio, fim)
}

describe('RLS', () => {
  it('a tabela liga row level security', () => {
    expect(LIMPO).toMatch(/alter table public\.faq_page_items enable row level security/)
  })

  // Deliberado, e é a mesma decisão de `product_faqs`: é o que faz o vínculo para uma entrada inativa
  // chegar ao navegador com `faq: null`, exercitando o ramo de "pular a vaga" de `resolveFaqPage` em
  // produção. Fechá-lo na policy faria o código existir sem nada exercitá-lo.
  it('a leitura pública é sem condição, e a decisão está escrita no arquivo', () => {
    const policy = corpoDaPolicy('public read faq page items')
    expect(policy).toContain('for select to public')
    expect(policy).toMatch(/using \(true\)/)
    expect(SQL).toMatch(/lida publicamente SEM CONDIÇÃO/i)
  })

  it('a escrita é `to authenticated` com `has_role` no using E no with check', () => {
    const policy = corpoDaPolicy('admin full faq page items')
    expect(policy).toContain('for all to authenticated')
    expect(policy).toMatch(/using \(public\.has_role\(auth\.uid\(\), 'admin'\)\)/)
    expect(policy).toMatch(/with check \(public\.has_role\(auth\.uid\(\), 'admin'\)\)/)
  })

  it('nenhuma policy alcança `anon`', () => {
    for (const nome of ['public read faq page items', 'admin full faq page items']) {
      expect(corpoDaPolicy(nome)).not.toContain('anon')
    }
  })

  it('o leitor de policy devolve vazio para uma policy que não existe — sensor', () => {
    expect(corpoDaPolicy('policy que nao existe')).toBe('')
  })

  it('a migration não emite `grant` nenhum', () => {
    expect(CODIGO).not.toMatch(/\bgrant\b/i)
  })
})

// ---------------------------------------------------------------------------
// A semeadura das 26 perguntas (FAQL-28)
// ---------------------------------------------------------------------------

interface LinhaSemeada {
  question: string
  answer: string
  question_key: string
  category: string
  position: number
}

/**
 * Lê o `values` da semeadura **do SQL cru**, com um tokenizador que respeita literal de texto.
 *
 * Ler do `LIMPO` seria errado por construção: as respostas são texto da dona, e um `--` dentro de uma
 * delas faria o removedor de comentário comer o resto da linha — o guarda passaria a medir um corpus
 * mutilado sem reprovar. A aspa dobrada (`''`) é a única sequência de escape do Postgres.
 */
const lerSemente = (fonte: string): LinhaSemeada[] => {
  const inicio = fonte.indexOf('\tvalues\n')
  const fim = fonte.indexOf('\n),\ninseridas as (')
  if (inicio === -1 || fim === -1 || fim < inicio) return []

  const bloco = fonte.slice(inicio, fim)
  const linhas: LinhaSemeada[] = []
  let campos: string[] = []
  let numero = ''
  let i = 0

  while (i < bloco.length) {
    const c = bloco[i]
    if (c === "'") {
      let texto = ''
      i += 1
      while (i < bloco.length) {
        if (bloco[i] === "'" && bloco[i + 1] === "'") {
          texto += "'"
          i += 2
          continue
        }
        if (bloco[i] === "'") {
          i += 1
          break
        }
        texto += bloco[i]
        i += 1
      }
      campos.push(texto)
      continue
    }
    if (c >= '0' && c <= '9') {
      numero += c
      i += 1
      continue
    }
    if (c === ')' && campos.length === 4 && numero !== '') {
      linhas.push({
        question: campos[0],
        answer: campos[1],
        question_key: campos[2],
        category: campos[3],
        position: Number(numero),
      })
      campos = []
      numero = ''
    }
    i += 1
  }

  return linhas
}

const SEMENTE = lerSemente(SQL)

/** As contagens por assunto, medidas em `conteudo.md` e conferidas pelo gerador. */
const POR_ASSUNTO: Record<string, number> = {
  sobre: 5,
  'o-processo': 3,
  'envio-do-material': 4,
  'materiais-e-acabamentos': 8,
  personalizacao: 3,
  cuidados: 3,
}

describe('a semeadura é o corpus da loja', () => {
  it('o tokenizador leu as 26 linhas — âncora, sem ela todo laço abaixo roda sobre nada', () => {
    expect(SEMENTE).toHaveLength(26)
    // O tokenizador poderia estar devolvendo campos vazios e a contagem ainda bater.
    expect(SEMENTE.every(l => l.question !== '' && l.answer !== '' && l.question_key !== '')).toBe(true)
  })

  it('o tokenizador devolve lista vazia quando o bloco não existe — sensor', () => {
    expect(lerSemente('select 1;')).toEqual([])
  })

  /**
   * A asserção que impede o transporte de apodrecer.
   *
   * `question_key` é escrita pela aplicação (a 28 recusou coluna gerada para não criar uma segunda
   * normalização), então a migration carrega o resultado LITERAL de `faqQuestionKey`. Se alguém
   * editar uma pergunta aqui sem regerar a chave, a dedup deixa de funcionar para aquela linha — e
   * nada quebra: a pergunta simplesmente entra duas vezes na biblioteca.
   */
  it('`faqQuestionKey(question)` é a `question_key` gravada, em cada uma das 26 linhas', () => {
    const divergentes = SEMENTE.filter(l => faqQuestionKey(l.question) !== l.question_key).map(
      l => `${l.question} → gravado "${l.question_key}", esperado "${faqQuestionKey(l.question)}"`,
    )
    expect(divergentes).toEqual([])
    expect(SEMENTE.filter(l => faqQuestionKey(l.question) === l.question_key)).toHaveLength(26)
  })

  it('as 26 `question_key` são distintas — duas iguais perderiam uma pergunta no `do nothing`', () => {
    expect(new Set(SEMENTE.map(l => l.question_key)).size).toBe(26)
  })

  it('a soma por assunto é 5/3/4/8/3/3', () => {
    const contagem: Record<string, number> = {}
    for (const l of SEMENTE) contagem[l.category] = (contagem[l.category] ?? 0) + 1
    expect(contagem).toEqual(POR_ASSUNTO)
  })

  it('todo assunto semeado está no vocabulário fechado do `check`', () => {
    const aceitos = valoresDoCheckDeAssunto(LIMPO)
    const fora = SEMENTE.filter(l => !aceitos.includes(l.category)).map(l => l.category)
    expect(fora).toEqual([])
  })

  it('dentro de um assunto, nenhuma posição se repete', () => {
    const repetidas: string[] = []
    for (const key of Object.keys(POR_ASSUNTO)) {
      const posicoes = SEMENTE.filter(l => l.category === key).map(l => l.position)
      if (new Set(posicoes).size !== posicoes.length) repetidas.push(key)
    }
    expect(repetidas).toEqual([])
  })

  // `FAQL-10`: o registro é memorial. O texto de origem trazia `✨` e `❤️`, e a transcrição os tirou.
  it('nenhum emoji entrou no banco', () => {
    const comEmoji = SEMENTE.filter(
      l => /\p{Extended_Pictographic}/u.test(l.question) || /\p{Extended_Pictographic}/u.test(l.answer),
    ).map(l => l.question)
    expect(comEmoji).toEqual([])
  })

  it('toda pergunta cabe em `FAQ_QUESTION_MAX` e toda resposta em 4000', () => {
    expect(SEMENTE.filter(l => l.question.trim().length > FAQ_QUESTION_MAX)).toEqual([])
    expect(SEMENTE.filter(l => l.answer.trim().length > 4000)).toEqual([])
  })

  // A medição que obriga o teto a subir. Com 600 esta migration falharia com 23514 no `db push`.
  it('há resposta acima de 600 caracteres — é por isso que o teto subiu', () => {
    expect(Math.max(...SEMENTE.map(l => l.answer.trim().length))).toBeGreaterThan(600)
  })
})

describe('a semeadura é aditiva e idempotente', () => {
  it('as duas pontas são `on conflict … do nothing`', () => {
    expect(CODIGO).toMatch(/on conflict \(question_key\) do nothing/)
    expect(CODIGO).toMatch(/on conflict \(faq_id\) do nothing/)
  })

  // Rodar duas vezes não pode apagar edição da dona. Um `update` aqui sobrescreveria o texto que ela
  // corrigiu no painel, e o `db push` roda em TODO push em `master`.
  it('não há um `update` sequer — nem statement, nem `do update`', () => {
    expect(CODIGO).not.toMatch(/\bupdate\s+public\./i)
    expect(CODIGO).not.toMatch(/\bupdate\s+only\b/i)
    expect(CODIGO).not.toMatch(/\bdo\s+update\b/i)
  })

  it('não há um `delete` sequer', () => {
    expect(CODIGO).not.toMatch(/\bdelete\s+from\b/i)
    expect(CODIGO).not.toMatch(/\btruncate\b/i)
  })

  /**
   * O `join` por `question_key` é o que faz a pergunta que JÁ EXISTE na biblioteca entrar na página
   * sem virar uma segunda. Sem ele, "Quanto tempo demora" — hoje em dezenas de produtos — seria
   * inserida de novo (e recusada pelo `do nothing`), e a colocação dela nunca apareceria.
   */
  it('a colocação encontra tanto a linha nova quanto a que já existia na biblioteca', () => {
    expect(CODIGO).toMatch(/returning id, question_key/)
    expect(CODIGO).toMatch(/left join inseridas i on i\.question_key = s\.question_key/)
    expect(CODIGO).toMatch(/left join public\.faqs f on f\.question_key = s\.question_key/)
    expect(CODIGO).toMatch(/coalesce\(i\.id, f\.id\)/)
  })

  // O desenho previa dois `insert` sobre o mesmo `values` repetido — 26 chaves escritas duas vezes,
  // que é o "defeito 01" dentro da migration que existe para evitá-lo.
  it('a lista de 26 linhas aparece UMA vez no arquivo', () => {
    expect([...CODIGO.matchAll(/\bvalues\b/g)]).toHaveLength(1)
  })
})
