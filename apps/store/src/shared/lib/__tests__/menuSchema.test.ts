import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { MENU_ICON_KEYS, menuTargetRefusal } from '@estrelinha/core/menu'

/**
 * O guarda da migration da feature 39 — o menu que deixa de ser código e passa a ser curadoria.
 *
 * Lê o `.sql` **do disco**, como `materialTransitions`, `homeSections`, `faqSchema` e `importSchema`.
 * O motivo é o de sempre: **afrouxar uma migration não quebra nada**. Uma coluna gerada que volta a
 * ser comum, um backfill que muda de lugar, um `do nothing` que vira `do update` — tudo isso aplica
 * limpo e passa em build, em `tsc` e em teste de componente. Quem descobre é a Adri, com a curadoria
 * do menu apagada, ou a cliente, com a barra vazia.
 *
 * Duas asserções aqui guardam coisas que **só se pagam no dia do deploy**, e por isso é fácil
 * afrouxá-las sem perceber:
 *
 * - **`show_in_menu` gerada** é o que mantém a LOJA publicada funcionando durante a janela entre o
 *   `db push` e o deploy da Vercel, que rodam em paralelo. Voltar a coluna comum não quebra teste
 *   nenhum — só faz o menu da loja no ar sumir por alguns minutos.
 * - **`menu_promo` preservada** é o mesmo, do lado do painel: apagá-la faria toda gravação de
 *   categoria morrer com `PGRST204` na mesma janela.
 *
 * Cada régua é um **predicado**, para poder ser exercida contra texto mutado. Sem esse par, uma
 * asserção que sempre passa é indistinguível de uma que funciona — e o modo de falhar de um teste
 * que lê disco é varrer o vazio e ficar verde.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20260905130000_39-menu-configuravel.sql')

const sql = readFileSync(CAMINHO, 'utf8')
const minusculo = sql.toLowerCase()

/** As três colunas que a feature acrescenta. `show_in_menu` não entra: ela é convertida, não criada. */
const COLUNAS_NOVAS = ['menu_desktop', 'menu_mobile', 'menu_banners'] as const

// -------------------------------------------------------------------------------------------
// As réguas, como predicados
// -------------------------------------------------------------------------------------------

/** Coluna acrescentada de forma reexecutável: `add column if not exists <nome>`. */
const colunaAditiva = (texto: string, coluna: string): boolean =>
  new RegExp(`add column if not exists\\s+${coluna}\\s`, 'i').test(texto)

/**
 * `show_in_menu` é **gerada** a partir das duas booleanas — nunca uma terceira coluna escrita.
 *
 * A expressão é conferida junto do tipo: `generated always as (menu_desktop) stored` também
 * compilaria, e faria a loja publicada esconder do computador o que só estava no celular.
 */
const derivadaDasDuas = (texto: string): boolean =>
  /add column\s+show_in_menu\s+boolean\s+not null\s+generated always as \(\s*menu_desktop or menu_mobile\s*\)\s+stored/is.test(
    texto,
  )

/**
 * O SQL **sem os comentários de linha**.
 *
 * Toda régua de ausência abaixo precisa disto, e não é zelo: este arquivo EXPLICA por escrito que
 * nenhum `grant` alcança `anon` e que `menu_promo` não é apagada. Sem tirar os comentários, a prosa
 * que documenta a regra derrubaria a própria regra — e a saída óbvia (apagar a prosa) é a errada,
 * porque é ali que mora o "não apaguei de propósito".
 *
 * Trata CRLF e LF: o repositório roda em Windows e os dois aparecem.
 */
const semComentarios = (texto: string): string => texto.replace(/--[^\r\n]*/g, '')

/** Nenhuma coluna que uma tela publicada lê hoje é removida — só `show_in_menu`, e ela volta. */
const soDerrubaShowInMenu = (texto: string): boolean => {
  const quedas = semComentarios(texto).toLowerCase().match(/drop column\s+(\w+)/g) ?? []
  return quedas.length > 0 && quedas.every((q) => /show_in_menu$/.test(q))
}

/**
 * Os backfills leem `show_in_menu` com o valor da feature 16 e **precisam** rodar antes da
 * conversão. Depois dela a coluna é derivada — e nesse momento vale `false` para todo mundo.
 */
const backfillsAntesDoDrop = (texto: string): boolean => {
  const drop = texto.toLowerCase().indexOf('drop column show_in_menu')
  const primeiroBackfill = texto.toLowerCase().indexOf('set menu_desktop = true')
  const backfillDoBanner = texto.toLowerCase().indexOf('set menu_banners = jsonb_build_object')
  if (drop === -1 || primeiroBackfill === -1 || backfillDoBanner === -1) return false
  return primeiroBackfill < drop && backfillDoBanner < drop
}

/**
 * A conversão inteira é guardada pelo estado da própria coluna (`attgenerated = ''`).
 *
 * **É a asserção que protege a curadoria da Adri.** Sem a guarda, uma segunda execução rodaria os
 * backfills contra a coluna já derivada e ligaria nas DUAS superfícies tudo que estivesse ligado em
 * UMA — apagando em silêncio a decisão dela de mostrar algo só no celular.
 */
const conversaoGuardada = (texto: string): boolean => {
  const bloco = texto.match(/do \$\$[\s\S]*?\$\$;/)?.[0] ?? ''
  return (
    bloco.includes("attname = 'show_in_menu'") &&
    bloco.includes("attgenerated = ''") &&
    bloco.includes('drop column show_in_menu')
  )
}

/** O índice parcial da 16 cai junto com a coluna e tem de voltar. */
const indiceParcialRecriado = (texto: string): boolean =>
  /create index if not exists\s+categories_show_in_menu_idx\s+on public\.categories \(sort_order\)\s+where show_in_menu;/is.test(
    texto,
  )

/** A semeadura não pode sobrescrever a linha existente — nem devolver um link que a Adri apagou. */
const semeaduraNaoSobrescreve = (texto: string): boolean => {
  const insert = texto.toLowerCase().match(/insert into public\.store_settings[\s\S]*?;/)?.[0]
  if (!insert) return false
  return insert.includes('on conflict (key) do nothing') && !insert.includes('do update')
}

/** Nenhum `grant` alcança `anon` — nem por curinga (`public`). */
const nenhumGrantParaAnon = (texto: string): boolean =>
  !/grant[^;]*\bto\b[^;]*\b(anon|public)\b/is.test(semComentarios(texto))

/** A régua de `categories.icon`, extraída do próprio SQL. */
const reguaDoIcone = (texto: string): string | null =>
  texto.match(/icon\s+!~\s+'([^']+)'/)?.[1] ?? null

/** O `href` do link semeado, extraído do próprio SQL. */
const hrefSemeado = (texto: string): string | null =>
  texto.match(/'href',\s*'([^']+)'/)?.[1] ?? null

/**
 * Os `update` da migration, um por elemento e na ordem do arquivo.
 *
 * Lidos do texto **sem comentário**: o cabeçalho desta migration descreve os três backfills em prosa,
 * e uma régua que casasse a prosa mediria o que ninguém executa.
 */
const updates = (texto: string): string[] =>
  semComentarios(texto).match(/update public\.categories[\s\S]*?;/gi) ?? []

/**
 * As marcas dos três backfills, escritas **literalmente** — cada uma casa um `update` e só ele.
 *
 * Elas existem porque a régua anterior era **uma só**, e era a forma do backfill 1
 * (`set menu_desktop = true, menu_mobile = true where show_in_menu`). O backfill 2 traz
 * `from public.categories p` entre o `set` e o `where` e **escapava dela**: reduzi-lo a
 * `set menu_desktop = true` deixava os 2182 testes da loja verdes, e no `db push` todo painel do menu
 * do CELULAR — a superfície de ~90% dos acessos — nasceria vazio, com o do computador intacto.
 */
const BACKFILL_1 = /where\s+show_in_menu/i
const BACKFILL_2 = /from public\.categories p/i
const BACKFILL_3 = /set menu_banners = jsonb_build_object/i

/** O `update` cuja forma casa `marca` — ou `null`, para a asserção poder dizer QUAL deles sumiu. */
const backfill = (texto: string, marca: RegExp): string | null =>
  updates(texto).find((u) => marca.test(u)) ?? null

/**
 * A cláusula `set` de um `update` — de `set` até o `from` ou o `where`, o que vier primeiro.
 *
 * É o recorte que faltava: sem separar o `set` do resto, a única forma de conferir as colunas era
 * casar o comando inteiro numa expressão só — e aí basta um `from` no meio para a régua deixar de
 * alcançar o comando, em silêncio.
 */
const clausulaSet = (update: string): string =>
  update.match(/\bset\b([\s\S]*?)\b(?:from|where)\b/i)?.[1] ?? ''

/** O `update` liga as DUAS superfícies. É a asserção que o mutante sobrevivente atravessou. */
const ligaAsDuasSuperficies = (update: string): boolean => {
  const set = clausulaSet(update)
  return /menu_desktop\s*=\s*true/i.test(set) && /menu_mobile\s*=\s*true/i.test(set)
}

/**
 * Os campos que o backfill 3 escreve para uma superfície, sem repetição e em ordem alfabética.
 *
 * O banner é montado com `jsonb_build_object`, onde cada nome aparece duas vezes (a chave e a leitura
 * de `menu_promo`); o que interessa é o CONJUNTO — e é ele que tem de ser o mesmo nos dois
 * dispositivos, porque o anúncio é um só e o que mudaria entre eles é a arte, que o card da 16 não
 * tinha.
 */
const camposDoBanner = (bloco: string, chave: 'desktop' | 'mobile'): string[] => {
  const depois = bloco.split(new RegExp(`'${chave}',`))[1] ?? ''
  const ate = depois.split(/'(?:desktop|mobile)',/)[0]
  const nomes = [...ate.matchAll(/'(target|kind|id|badge|title|subtitle)'/g)].map((m) => m[1])
  return [...new Set(nomes)].sort()
}

// -------------------------------------------------------------------------------------------

describe('âncoras — a varredura olhou alguma coisa', () => {
  it('a migration existe e tem corpo', () => {
    // Caminho errado leria string vazia, e TODA asserção de ausência passaria em verde. É a pior
    // falha possível num teste que lê disco: ele não acusa nada porque não olhou nada.
    expect(sql.length).toBeGreaterThan(4000)
    expect(minusculo).toContain('alter table public.categories')
  })

  it('achou as três colunas novas no texto lido', () => {
    // A segunda metade da âncora dupla: arquivo lido **e** alvos encontrados.
    const achadas = COLUNAS_NOVAS.filter((coluna) => minusculo.includes(coluna))
    expect(achadas).toHaveLength(COLUNAS_NOVAS.length)
  })
})

describe('as colunas da curadoria por superfície', () => {
  it('as três entram de forma reexecutável', () => {
    for (const coluna of COLUNAS_NOVAS) {
      expect(colunaAditiva(sql, coluna), `${coluna} não é aditiva`).toBe(true)
    }
  })

  it('as duas booleanas nascem `not null default false`', () => {
    // Nascer `true` faria toda categoria do catálogo aparecer no menu no dia do deploy — 37 itens
    // numa barra desenhada para poucos. O backfill é quem escolhe quem entra, e ele é explícito.
    for (const coluna of ['menu_desktop', 'menu_mobile']) {
      expect(
        new RegExp(`${coluna}\\s+boolean not null default false`, 'i').test(sql),
        `${coluna} não nasce desligada`,
      ).toBe(true)
    }
  })

  it('`menu_banners` é jsonb, e não colunas soltas de texto', () => {
    expect(colunaAditiva(sql, 'menu_banners')).toBe(true)
    expect(sql).toMatch(/add column if not exists menu_banners jsonb/i)
  })
})

describe('`show_in_menu` vira coluna gerada', () => {
  it('é derivada das duas booleanas, e é `not null`', () => {
    expect(derivadaDasDuas(sql)).toBe(true)
  })

  it('SENSOR: voltar a ser coluna comum reprova na mesma régua', () => {
    const mutado = sql.replace(
      /add column show_in_menu boolean not null\s+generated always as \(menu_desktop or menu_mobile\) stored;/s,
      'add column show_in_menu boolean not null default false;',
    )
    expect(mutado).not.toBe(sql)
    expect(derivadaDasDuas(mutado)).toBe(false)
  })

  it('SENSOR: derivar de UMA das superfícies reprova', () => {
    // `generated always as (menu_desktop) stored` esconderia da loja publicada tudo que a Adri
    // tivesse posto só no celular — que é ~90% dos acessos.
    const mutado = sql.replace(
      'generated always as (menu_desktop or menu_mobile) stored',
      'generated always as (menu_desktop) stored',
    )
    expect(mutado).not.toBe(sql)
    expect(derivadaDasDuas(mutado)).toBe(false)
  })

  it('a conversão é guardada pelo estado da própria coluna', () => {
    expect(conversaoGuardada(sql)).toBe(true)
  })

  it('SENSOR: perder a guarda de `attgenerated` reprova', () => {
    const mutado = sql.replace("and attgenerated = ''", '')
    expect(mutado).not.toBe(sql)
    expect(conversaoGuardada(mutado)).toBe(false)
  })

  it('o índice parcial da feature 16 é recriado', () => {
    expect(indiceParcialRecriado(sql)).toBe(true)
  })

  it('SENSOR: sem o `create index`, a régua acusa', () => {
    const mutado = sql.replace(
      /create index if not exists\s+categories_show_in_menu_idx[\s\S]*?;/,
      '',
    )
    expect(mutado).not.toBe(sql)
    expect(indiceParcialRecriado(mutado)).toBe(false)
  })
})

describe('a janela de deploy — nada que uma tela publicada lê é removido', () => {
  it('`menu_promo` continua existindo', () => {
    expect(soDerrubaShowInMenu(sql)).toBe(true)
    expect(minusculo).not.toMatch(/drop column\s+menu_promo/)
  })

  it('SENSOR: apagar `menu_promo` reprova na mesma régua', () => {
    // Apagá-la faria o painel PUBLICADO morrer com PGRST204 em toda gravação de categoria, entre o
    // `db push` e o deploy da Vercel — que rodam em paralelo, sem ordem garantida.
    const mutado = `${sql}\nalter table public.categories drop column menu_promo;\n`
    expect(soDerrubaShowInMenu(mutado)).toBe(false)
  })

  it('a migration declara por escrito por que as duas sobrevivem', () => {
    // Comentário é o único lugar onde "não apaguei de propósito" cabe. Sem ele, a próxima pessoa lê
    // uma coluna morta e a limpa.
    expect(minusculo).toContain('legado')
    expect(minusculo).toContain('pgrst204')
  })
})

describe('os backfills', () => {
  it('rodam antes da conversão', () => {
    expect(backfillsAntesDoDrop(sql)).toBe(true)
  })

  it('SENSOR: converter antes de fazer o backfill reprova', () => {
    // Nesta ordem o backfill leria a coluna derivada, que vale `false` para todo mundo nesse
    // instante: o menu da loja no ar sumiria inteiro, sem nada em tela dizendo por quê.
    const drop = 'alter table public.categories drop column show_in_menu;'
    const mutado = `${drop}\n${sql.replace(drop, '')}`
    expect(mutado).not.toBe(sql)
    expect(backfillsAntesDoDrop(mutado)).toBe(false)
  })

  it('ÂNCORA: a varredura achou os TRÊS, e cada marca casa um `update` e só um', () => {
    // Sem isto, uma marca que deixasse de casar faria `backfill()` devolver `null` — e a asserção
    // seguinte reprovaria pelo motivo errado, ou (pior) uma marca frouxa cobriria o backfill errado
    // e o certo ficaria sem guarda nenhuma. É a segunda metade da âncora dupla, no nível do comando.
    expect(updates(sql).length).toBeGreaterThanOrEqual(3)
    for (const [nome, marca] of [
      ['1', BACKFILL_1],
      ['2', BACKFILL_2],
      ['3', BACKFILL_3],
    ] as const) {
      expect(
        updates(sql).filter((u) => marca.test(u)),
        `a marca do backfill ${nome} não casou exatamente um \`update\``,
      ).toHaveLength(1)
    }
  })

  it('backfill 1 — quem estava na barra entra nas DUAS superfícies', () => {
    const bloco = backfill(sql, BACKFILL_1)
    expect(bloco, 'o backfill 1 sumiu do arquivo').not.toBeNull()
    expect(ligaAsDuasSuperficies(bloco)).toBe(true)
  })

  it('SENSOR: o backfill 1 ligando SÓ o computador reprova', () => {
    const bloco = backfill(sql, BACKFILL_1)
    const mutado = bloco.replace(/,\s*menu_mobile\s*=\s*true/i, '')
    expect(mutado).not.toBe(bloco)
    expect(ligaAsDuasSuperficies(mutado)).toBe(false)
  })

  it('backfill 2 — as filhas ativas entram nas DUAS superfícies', () => {
    // **A asserção que faltava, e o mutante que passou por ela.** O Verifier reduziu este `set` a
    // `menu_desktop = true` e a suíte inteira ficou verde: a régua antiga terminava em
    // `where show_in_menu`, e aqui há um `from public.categories p` no meio. Aplicaria limpo, e o
    // painel do menu do celular nasceria vazio em produção sem nada em tela dizendo por quê.
    const bloco = backfill(sql, BACKFILL_2)
    expect(bloco, 'o backfill 2 sumiu do arquivo').not.toBeNull()
    expect(ligaAsDuasSuperficies(bloco)).toBe(true)
  })

  it('SENSOR: o backfill 2 ligando SÓ o computador reprova — a mutação exata que sobreviveu', () => {
    const bloco = backfill(sql, BACKFILL_2)
    const mutado = bloco.replace(/,\s*menu_mobile\s*=\s*true/i, '')
    expect(mutado).not.toBe(bloco)
    expect(mutado).toContain('from public.categories p')
    expect(ligaAsDuasSuperficies(mutado)).toBe(false)
  })

  it('as filhas do backfill 2 são recortadas por `active`', () => {
    // O `MegaMenu` da 16 mostrava todas as filhas da entrada aberta — mas só as ativas chegavam ao
    // navegador, por `public read categories using (active = true)`. Trazer as inativas aqui poria
    // no painel da loja categorias que ninguém deveria ver.
    const bloco = backfill(sql, BACKFILL_2) ?? ''
    expect(bloco).toContain('c.parent_id = p.id')
    expect(bloco).toContain('p.show_in_menu')
    expect(bloco).toContain('c.active')
  })

  it('backfill 3 — o card da 16 vira o MESMO banner nas duas superfícies, sem chave nula', () => {
    const bloco = backfill(sql, BACKFILL_3)
    expect(bloco, 'o backfill 3 sumiu do arquivo').not.toBeNull()

    const doComputador = camposDoBanner(bloco, 'desktop')
    expect(doComputador).toEqual(['badge', 'id', 'kind', 'subtitle', 'target', 'title'])
    // O anúncio é UM: o celular recebe o mesmo objeto, campo a campo. Uma superfície com menos
    // campos que a outra é a dona publicando metade do anúncio para metade das clientes.
    expect(camposDoBanner(bloco, 'mobile')).toEqual(doComputador)

    // `jsonb_strip_nulls` porque ausente ≠ nulo para quem lê: `resolveMenuBanners` herda o nome do
    // destino quando o título FALTA, e um `"title": null` gravado passaria pela mesma porta por acaso.
    expect(bloco).toContain('jsonb_strip_nulls')
    // O destino sai na forma que `resolveMenuTarget` sabe ler.
    expect(bloco).toMatch(/'target',\s*jsonb_build_object\('kind',\s*'category',\s*'id'/)
  })

  it('SENSOR: o backfill 3 deixando o celular sem o anúncio reprova', () => {
    // A mutação irmã da do backfill 2, na coluna de jsonb: a chave `'mobile'` continua lá — o que
    // some é o anúncio dentro dela. Uma régua de `toContain("'mobile'")` passaria nisto.
    const bloco = backfill(sql, BACKFILL_3)
    const mutado = bloco.replace(/'mobile',[\s\S]*$/, "'mobile', '[]'::jsonb);")
    expect(mutado).not.toBe(bloco)
    expect(mutado).toContain("'mobile'")
    expect(camposDoBanner(mutado, 'mobile')).toEqual([])
    expect(camposDoBanner(mutado, 'mobile')).not.toEqual(camposDoBanner(mutado, 'desktop'))
  })

  it('o backfill do banner não sobrescreve banner já configurado', () => {
    const bloco = backfill(sql, BACKFILL_3) ?? ''
    expect(bloco).toContain('menu_banners is null')
  })
})

describe('`categories.icon` reusada como chave do ícone', () => {
  it('a limpeza usa a MESMA régua do catálogo de chaves', () => {
    const regua = reguaDoIcone(sql)
    expect(regua, 'a migration não declara a régua do ícone').not.toBeNull()

    // Âncora: o catálogo tem tamanho de verdade. Uma lista vazia faria o laço abaixo não olhar nada.
    expect(MENU_ICON_KEYS.length).toBeGreaterThanOrEqual(20)

    const re = new RegExp(regua)
    for (const chave of MENU_ICON_KEYS) {
      expect(re.test(chave), `a migration apagaria a chave "${chave}"`).toBe(true)
    }
  })

  it('a régua recusa o que a coluna guardava antes: emoji e caixa alta', () => {
    // Este é o sensor da asserção acima: uma régua frouxa (`.` ou `.*`) aceitaria tudo e o laço
    // anterior passaria por não excluir nada.
    const re = new RegExp(reguaDoIcone(sql))
    for (const lixo of ['🎀', '💍', 'Corrente', 'corrente!', '', ' ', '2fios']) {
      expect(re.test(lixo), `a régua aceita "${lixo}"`).toBe(false)
    }
  })

  it('não há `check` copiando o catálogo para dentro do banco', () => {
    // Copiá-lo daria duas listas do mesmo catálogo, e a de SQL ficaria para trás na primeira chave
    // nova. Ícone não é dinheiro nem segurança: valor desconhecido vira "sem ícone".
    expect(minusculo).not.toMatch(/check\s*\([^)]*icon/)
  })
})

describe('a semeadura de `store_settings.menu`', () => {
  it('não sobrescreve a linha existente', () => {
    expect(semeaduraNaoSobrescreve(sql)).toBe(true)
  })

  it('SENSOR: um upsert reprova na mesma régua', () => {
    // Com `do update`, todo `db push` futuro devolveria o "Sobre" que a Adri tivesse apagado — e
    // apagaria os links que ela tivesse criado. É o mesmo defeito que o `NOT value ?` da 37 evita.
    //
    // A mutação leva o `;` junto **de propósito**: o cabeçalho da migration CITA
    // `on conflict (key) do nothing` em prosa, e um `replace` de string troca só a primeira
    // ocorrência. Sem o `;`, a mutação mexeria no comentário, o comando ficaria intacto, e este
    // sensor passaria a "provar" uma régua que nunca foi exercida — que é exatamente o defeito que
    // sensor existe para pegar. Medido: a primeira versão deste caso reprovou por isso.
    const mutado = sql.replace(
      'on conflict (key) do nothing;',
      'on conflict (key) do update set value = excluded.value;',
    )
    expect(mutado).not.toBe(sql)
    expect(mutado).toContain('do update set value = excluded.value;')
    expect(semeaduraNaoSobrescreve(mutado)).toBe(false)
  })

  it('semeia o "Sobre" com a forma que `MenuLink` descreve', () => {
    const insert = sql.match(/insert into public\.store_settings[\s\S]*?;/)?.[0] ?? ''
    expect(insert).toContain("'menu'")
    expect(insert).toContain("'links'")
    for (const campo of ['id', 'label', 'href', 'icon', 'desktop', 'mobile', 'sort_order']) {
      expect(insert, `o link semeado não traz "${campo}"`).toContain(`'${campo}'`)
    }
    expect(insert).toContain("'Sobre'")
    // Nasce visível nas duas superfícies porque é o que o `Header` faz HOJE, em JSX. A tarefa que
    // tira o link do código não pode fazê-lo sumir da loja.
    expect(insert).toMatch(/'desktop',\s*true/)
    expect(insert).toMatch(/'mobile',\s*true/)
  })

  it('o destino semeado passa pelo MESMO validador que o painel usa', () => {
    // Cruzamento de donos: a régua do destino é `menuTargetRefusal`, em `@estrelinha/core/menu`.
    // Semear um `href` que a tela recusaria daria à Adri um item que ela não consegue reeditar.
    const href = hrefSemeado(sql)
    expect(href).toBe('/sobre')
    expect(menuTargetRefusal({ kind: 'url', href })).toBeNull()
  })

  it('SENSOR: um destino com typo seria recusado pelo mesmo validador', () => {
    expect(menuTargetRefusal({ kind: 'url', href: '/sobree' })).not.toBeNull()
  })
})

describe('RLS e permissões', () => {
  it('nenhum `grant` alcança `anon`', () => {
    expect(nenhumGrantParaAnon(sql)).toBe(true)
  })

  it('SENSOR: um grant para `anon` reprova na mesma régua', () => {
    const mutado = `${sql}\ngrant update on public.categories to anon;\n`
    expect(nenhumGrantParaAnon(mutado)).toBe(false)
  })

  it('SENSOR: o removedor de comentário funciona — e com LF e com CRLF', () => {
    // A régua acima lê o arquivo SEM os comentários, porque este `.sql` explica por escrito que
    // nada alcança `anon`. Se o removedor não funcionasse, a prosa derrubaria a própria regra — e
    // a saída óbvia (apagar a prosa) é a errada. Os dois finais de linha entram porque o
    // repositório roda em Windows e os dois aparecem em arquivo versionado.
    for (const quebra of ['\n', '\r\n']) {
      const soComentario = `${sql}${quebra}-- grant select on public.categories to anon;${quebra}`
      expect(nenhumGrantParaAnon(soComentario), `comentário derrubou a régua com ${JSON.stringify(quebra)}`).toBe(
        true,
      )

      const comandoDeVerdade = `${sql}${quebra}grant select on public.categories to anon;${quebra}`
      expect(nenhumGrantParaAnon(comandoDeVerdade)).toBe(false)
    }
  })

  it('nenhuma policy nova é criada — as da tabela já alcançam colunas novas', () => {
    // Registrar "não mudou" é informação: evita a próxima pessoa procurar a policy que faltou.
    expect(minusculo).not.toContain('create policy')
    expect(minusculo).toContain('rls não muda')
  })
})
