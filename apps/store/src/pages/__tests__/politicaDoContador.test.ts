import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `VIS-37` (feature `71`) — o contador de visitas não existe na loja sem o parágrafo da política.
 *
 * O contador começa a contar no primeiro acesso depois do deploy, e guarda um código no navegador
 * da cliente. Sem o parágrafo na Política de Privacidade, a loja trataria um identificador
 * persistente sem declará-lo — e nada quebraria: build, `tsc` e teste de componente passam com o
 * módulo publicado e a política calada. Este guarda lê os dois arquivos **do disco**.
 *
 * O texto é o do Apêndice A da spec, palavra por palavra. A aprovação da Adri é pré-condição do
 * DEPLOY (fica no handoff); a do código é esta.
 *
 * Feature `83` (`LAV-66`): o servidor passou a guardar também a hora cheia da primeira visita do
 * dia (`store_visits.first_hour`), e o parágrafo passou a ser o do Apêndice A da spec da `83`. O
 * texto da `71` ("esse código e a data") deixou de ser verdadeiro — o sensor da hora prova que ele
 * reprova.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../..')

/** Escritos literalmente: a régua não pode ser o objeto que ela mede. */
const CONTADOR = resolve(SRC, 'shared/lib/visits/visitor.ts')
const PRESENCA = resolve(SRC, 'shared/lib/presence/presence.ts')
const POLITICA = resolve(SRC, 'pages/PrivacyPolicyPage.tsx')

const PARAGRAFO =
  'Além disso, conto quantas visitas a loja recebe a cada dia. Para isso, o seu navegador guarda um código aleatório, que não identifica você pelo nome e não tem relação com os seus pedidos. Em cada dia em que você visita a loja, o meu servidor registra esse código, a data e a hora cheia da sua primeira visita naquele dia (por exemplo, 14h) — e nada mais: não guardo o seu IP junto dessa contagem, nem as páginas que você viu. Esses registros são apagados depois de 14 dias e não são compartilhados com ninguém, nem com o Google. Desligar “Estatísticas” também desliga essa contagem e apaga o código do seu navegador; limpar os dados do site no navegador tem o mesmo efeito.'

/**
 * A presença na loja: o parágrafo que diz o que o pulso de cada minuto guarda, por quanto tempo, e
 * que o código é diário e não se liga ao da contagem de visitas. A contagem de visitas passou a
 * dizer 14 dias (a retenção nova de `store_visits`).
 */
const PARAGRAFO_DA_PRESENCA =
  'Enquanto a loja está aberta na tela, o seu navegador também avisa ao meu servidor, a cada minuto, que você está na loja. Por até 30 minutos fica registrado só o tipo de página que você vê (uma joia, uma lista de joias, a sacola, o pagamento ou o guia de como mandar o material), qual joia, quantos itens há na sacola, de que tipo de lugar você veio (Instagram, Google, WhatsApp, direto ou outros) e se você usa celular, computador ou tablet — nunca o seu IP, o endereço completo da página nem o endereço de onde você veio. Depois disso, por até 1 hora fica o registro de quem estava na loja em cada minuto e, por até 14 dias, a marca de que aquele navegador pôs uma joia na sacola naquele dia e a hora em que pôs; as duas coisas ficam ligadas só a um código aleatório que troca todo dia e não se liga ao código da contagem de visitas. Desligar “Estatísticas” também desliga esse aviso e apaga esse código do seu navegador.'

/** O JSX quebra o texto em linhas: o React junta com UM espaço. A régua faz o mesmo. */
const normalizar = (fonte: string): string => fonte.replace(/\s+/g, ' ')

/** A invariante da presença: o módulo existe ⇒ o parágrafo dela está na política. */
const presencaViolada = (existe: boolean, fontePolitica: string): boolean =>
  existe && !normalizar(fontePolitica).includes(PARAGRAFO_DA_PRESENCA)

/** `true` quando a política, lida do disco, contém o parágrafo inteiro. */
const declaraOContador = (fontePolitica: string): boolean =>
  normalizar(fontePolitica).includes(PARAGRAFO)

/** A invariante: contador presente ⇒ parágrafo presente. */
const violada = (contadorExiste: boolean, fontePolitica: string): boolean =>
  contadorExiste && !declaraOContador(fontePolitica)

describe('VIS-37 — o contador só existe com o parágrafo da política', () => {
  const contadorExiste = existsSync(CONTADOR)
  const politica = readFileSync(POLITICA, 'utf8')

  it('os dois arquivos foram lidos — âncora', () => {
    expect(contadorExiste).toBe(true)
    expect(politica).toContain('Medição de audiência')
    expect(readFileSync(CONTADOR, 'utf8')).toContain('VISITOR_KEY')
  })

  it('a política declara o contador, palavra por palavra', () => {
    expect(violada(contadorExiste, politica)).toBe(false)
  })

  it('a política declara a presença na loja, palavra por palavra', () => {
    expect(existsSync(PRESENCA)).toBe(true)
    expect(presencaViolada(true, politica)).toBe(false)
  })

  describe('sensores', () => {
    it('o parágrafo apagado da política reprova', () => {
      const semParagrafo = normalizar(politica).replace(PARAGRAFO, '')
      expect(semParagrafo).not.toBe(normalizar(politica))
      expect(violada(true, semParagrafo)).toBe(true)
    })

    it('uma palavra trocada reprova', () => {
      const trocada = normalizar(politica).replace('apagados depois de 14 dias', 'apagados depois de 8 dias')
      expect(trocada).not.toBe(normalizar(politica))
      expect(violada(true, trocada)).toBe(true)
    })

    it('"anônimo" no lugar de "aleatório" reprova', () => {
      const trocada = normalizar(politica).replace('um código aleatório', 'um código anônimo')
      expect(trocada).not.toBe(normalizar(politica))
      expect(violada(true, trocada)).toBe(true)
    })

    it('LAV-66 — sem a hora cheia (o texto da `71`) reprova', () => {
      const semAHora = normalizar(politica).replace(
        'registra esse código, a data e a hora cheia da sua primeira visita naquele dia (por exemplo, 14h) — e nada mais',
        'registra esse código e a data — e nada mais',
      )
      expect(semAHora).not.toBe(normalizar(politica))
      expect(violada(true, semAHora)).toBe(true)
    })

    it('LAV-66 — a hora sem o exemplo reprova (palavra por palavra)', () => {
      const semExemplo = normalizar(politica).replace(' (por exemplo, 14h)', '')
      expect(semExemplo).not.toBe(normalizar(politica))
      expect(violada(true, semExemplo)).toBe(true)
    })

    it('a presença: o parágrafo apagado, ou um prazo trocado, reprova', () => {
      expect(presencaViolada(true, normalizar(politica).replace(PARAGRAFO_DA_PRESENCA, ''))).toBe(true)
      const trocada = normalizar(politica).replace('Por até 30 minutos', 'Por até 30 dias')
      expect(trocada).not.toBe(normalizar(politica))
      expect(presencaViolada(true, trocada)).toBe(true)
    })

    it('sem o contador, a invariante não cobra nada (o guarda não vale antes do módulo)', () => {
      expect(violada(false, '')).toBe(false)
    })
  })
})
