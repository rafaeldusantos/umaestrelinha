import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda do passo 6 do `Sitemap check` — feature `68`, SVR-34, SVR-35, SVR-36 e SVR-41.
 *
 * Lê o `.yml` **do disco**, no molde de `emailCheckWorkflow.test.ts`. O motivo é o de sempre:
 * **afrouxar este workflow não quebra nada**. Ele continua verde todo dia, continua parecendo um
 * sensor — e passa a medir menos, ou a medir a si mesmo.
 *
 * O que o passo 6 compra, e que nenhum teste do repositório alcança: a canônica que a página de
 * produto SERVE em produção. A origem dela tem dois donos — o secret `STORE_PUBLIC_URL` da edge
 * function e o domínio que de fato serve a loja —, e no dia do domínio próprio um secret esquecido
 * faria o HTML servido declarar o endereço antigo como canônico. Os testes da function medem o
 * `Response` que ela CONSTRÓI com a origem que o teste lhe dá; só a produção sabe qual origem ela tem.
 *
 * As decisões que este arquivo protege são as que alguém desfaz com boa intenção:
 *
 * 1. **Nenhum endereço, slug ou id escrito no passo** (SVR-36, `AD-037`): tudo vem do documento
 *    entregue. Cravar "a página da Pata" como amostra mediria uma peça que um dia sai do ar.
 * 2. **A origem da canônica é comparada com a origem de onde o sitemap veio** (SVR-41), para a peça
 *    E para a opção — não só para a opção.
 * 3. **A página de opção é canônica de si mesma** (SVR-34): igualdade exata com a `<loc>`.
 * 4. **Zero `<loc>` de opção não falha** (SVR-35): é o estado legítimo antes da curadoria. Um sensor
 *    que reprovasse ali seria desligado na primeira semana.
 * 5. **Ausência de canônica falha**: um `grep` que não acha nada devolve vazio, e vazio comparado
 *    com qualquer coisa tem de ser erro — senão a página sem canônica passaria como "origem certa".
 *
 * Cada régua é um **predicado**, para asserção e sensor chamarem a mesma função. Não há remoção de
 * comentário: o recorte é por marcador, e o marcador mora em comentário.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, '.github/workflows/sitemap-check.yml')

/** `L-031`: CRLF normalizado antes de qualquer régua. */
const yml = readFileSync(CAMINHO, 'utf8').replace(/\r\n/g, '\n')

const INICIO_DO_PASSO = '# 6. Feature 68'
const FIM_DO_PASSO = 'echo "OK —'

/**
 * O recorte do passo 6: do marcador até o `echo "OK —` final. **Recorte que falha devolve `null` e
 * REPROVA**, em vez de virar bloco vazio que aprova tudo (molde de `rotasSobGuarda.test.ts`).
 */
function blocoDoPasso6(texto: string): string | null {
  const inicio = texto.indexOf(INICIO_DO_PASSO)
  if (inicio < 0) return null
  const fim = texto.indexOf(FIM_DO_PASSO, inicio)
  if (fim < 0) return null
  const trecho = texto.slice(inicio, fim)
  return trecho.trim() === '' ? null : trecho
}

/** Um predicado sobre o bloco; sem bloco, reprova. */
const noBloco = (regua: (bloco: string) => boolean) => (texto: string): boolean => {
  const bloco = blocoDoPasso6(texto)
  return bloco !== null && regua(bloco)
}

// -------------------------------------------------------------------------------------------
// As réguas
// -------------------------------------------------------------------------------------------

/** O passo vem DEPOIS da contagem (passo 3): ele usa o documento já conferido. */
const depoisDaContagem = (texto: string): boolean => {
  const contagem = texto.indexOf('# 3. Contagem')
  const passo6 = texto.indexOf(INICIO_DO_PASSO)
  return contagem >= 0 && passo6 > contagem
}

/** (1) SVR-36 — nenhum endereço, slug de produto ou id de variação literal no passo. */
const semLiteralNoPasso = noBloco(
  bloco =>
    !/https?:\/\//.test(bloco) &&
    !/\/produtos\/[a-z0-9]/i.test(bloco) &&
    !/variant=[0-9a-f]/i.test(bloco),
)

/**
 * (1b) E o arquivo inteiro não ganhou endereço novo: a ÚNICA URL literal é o default da origem na
 * linha `ORIGEM:` (decisão da `33`, anterior a esta feature). Contar, em vez de escrever o domínio
 * aqui, mantém este guarda sem conhecer endereço nenhum.
 */
const umaUrlSoNaOrigem = (texto: string): boolean => {
  const linhas = texto.split('\n').filter(l => /https?:\/\//.test(l))
  return linhas.length === 1 && /^\s*ORIGEM:/.test(linhas[0])
}

/** (2) SVR-41 — a origem vem de `$ORIGEM` e a da canônica é comparada a ela, com falha. */
const comparaAOrigem = noBloco(
  bloco =>
    /origem_do_sitemap=\$\(origem_de "\$ORIGEM"\)/.test(bloco) &&
    /\[ "\$\(origem_de "\$canonica"\)" = "\$origem_do_sitemap" \][\s\S]{0,20}\|\|[^\n]*exit 1/.test(bloco) &&
    // origem = esquema + host + porta: os dois primeiros campos separados por barra.
    /awk -F\/ '\{print \$1 "\/\/" \$3\}'/.test(bloco),
)

/** (2b) A comparação de origem vale para a PEÇA (sem query) também, não só para a opção. */
const confereAPeca = noBloco(
  bloco =>
    /peca=\$\([^\n]*grep '\/produtos\/'[^\n]*grep -v '\?'/.test(bloco) && /conferir_canonica "\$peca" nao/.test(bloco),
)

/** (3) SVR-34 — a canônica da opção é IGUAL à `<loc>`, com falha. */
const opcaoCanonicaDeSi = noBloco(
  bloco =>
    /conferir_canonica "\$opcao" sim/.test(bloco) &&
    /\[ "\$canonica" = "\$url" \][\s\S]{0,20}\|\|[^\n]*exit 1/.test(bloco),
)

/** (4) SVR-35 — a contagem é impressa, e a conferência da opção só roda com ao menos uma. */
const zeroNaoFalha = noBloco(
  bloco =>
    /de_opcao=\$\([^\n]*grep -c '\?variant='[^\n]*\|\| true\)/.test(bloco) &&
    /echo "[^"\n]*\$de_opcao"/.test(bloco) &&
    /if \[ "\$de_opcao" -gt 0 \]; then\s*\n[^\n]*\n\s*conferir_canonica "\$opcao" sim\s*\n\s*fi/.test(bloco) &&
    // Nenhuma saída de erro condicionada a "zero".
    !/de_opcao"? -(eq|le|lt) /.test(bloco),
)

/** (5) Página sem canônica falha — vazio nunca passa por "origem certa". */
const ausenciaFalha = noBloco(bloco => /\[ -n "\$canonica" \][\s\S]{0,20}\|\|[^\n]*exit 1/.test(bloco))

/** Aplica uma mutação e LANÇA se ela não mudou nada — mutação no-op passaria por morte (`mutar()` da `52`). */
const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const novo = texto.replace(de, para)
  if (novo === texto) throw new Error(`mutação sem alvo: ${String(de)}`)
  return novo
}

const REGUAS: [string, (t: string) => boolean][] = [
  ['depois da contagem', depoisDaContagem],
  ['sem literal no passo (SVR-36)', semLiteralNoPasso],
  ['uma URL só, na origem', umaUrlSoNaOrigem],
  ['compara a origem (SVR-41)', comparaAOrigem],
  ['confere a peça', confereAPeca],
  ['opção canônica de si (SVR-34)', opcaoCanonicaDeSi],
  ['zero não falha (SVR-35)', zeroNaoFalha],
  ['ausência falha', ausenciaFalha],
]

// -------------------------------------------------------------------------------------------

describe('o passo 6 do `Sitemap check` — a canônica servida', () => {
  it('âncora: o arquivo foi lido e o passo foi recortado', () => {
    expect(yml).toContain('name: Sitemap check')
    const bloco = blocoDoPasso6(yml)
    expect(bloco).not.toBeNull()
    // O recorte tem massa: a função de conferência inteira está dentro dele.
    expect(bloco).toContain('conferir_canonica() {')
  })

  it.each(REGUAS)('%s', (_, regua) => {
    expect(regua(yml)).toBe(true)
  })
})

describe('sensores — cada régua reprova a mutação que ela existe para pegar', () => {
  it('sem o marcador do passo, TODAS as réguas de bloco reprovam (recorte nulo nunca aprova)', () => {
    const semMarcador = mutar(yml, INICIO_DO_PASSO, '# 6. outra coisa')
    expect(blocoDoPasso6(semMarcador)).toBeNull()
    for (const [nome, regua] of REGUAS.filter(([n]) => !['depois da contagem', 'uma URL só, na origem'].includes(n))) {
      expect([nome, regua(semMarcador)]).toEqual([nome, false])
    }
  })

  it('SVR-36 — um endereço, um slug ou um id escrito no passo reprova', () => {
    const conferir = 'conferir_canonica "$peca" nao'
    expect(semLiteralNoPasso(mutar(yml, conferir, `${conferir}\n          curl -s https://exemplo.invalid/x`))).toBe(false)
    expect(semLiteralNoPasso(mutar(yml, conferir, `conferir_canonica "$ORIGEM/produtos/pingente-pata" nao`))).toBe(false)
    expect(semLiteralNoPasso(mutar(yml, conferir, `conferir_canonica "$ORIGEM/x?variant=1004" sim`))).toBe(false)
  })

  it('uma segunda URL literal no arquivo reprova; a do default da origem sozinha passa', () => {
    expect(umaUrlSoNaOrigem(mutar(yml, '# 6. Feature 68', '# veja https://exemplo.invalid\n          # 6. Feature 68'))).toBe(false)
  })

  it('SVR-41 — sem a comparação de origem, ou comparando o host só, reprova', () => {
    expect(comparaAOrigem(mutar(yml, /\[ "\$\(origem_de "\$canonica"\)" = "\$origem_do_sitemap" \]/, 'true'))).toBe(false)
    expect(comparaAOrigem(mutar(yml, `awk -F/ '{print $1 "//" $3}'`, `awk -F/ '{print $3}'`))).toBe(false)
    expect(comparaAOrigem(mutar(yml, 'origem_do_sitemap=$(origem_de "$ORIGEM")', 'origem_do_sitemap=$(origem_de "$peca")'))).toBe(false)
  })

  it('a conferência da PEÇA apagada reprova — origem só na opção não basta', () => {
    expect(confereAPeca(mutar(yml, 'conferir_canonica "$peca" nao', 'true'))).toBe(false)
  })

  it('SVR-34 — conferir a opção sem exigir igualdade, ou sem falhar, reprova', () => {
    expect(opcaoCanonicaDeSi(mutar(yml, 'conferir_canonica "$opcao" sim', 'conferir_canonica "$opcao" nao'))).toBe(false)
    expect(opcaoCanonicaDeSi(mutar(yml, /\[ "\$canonica" = "\$url" \]/, 'true'))).toBe(false)
  })

  it('SVR-35 — falhar com zero, ou conferir a opção sem o portão, reprova', () => {
    expect(
      zeroNaoFalha(mutar(yml, 'if [ "$de_opcao" -gt 0 ]; then', '[ "$de_opcao" -eq 0 ] && exit 1\n          if true; then')),
    ).toBe(false)
    expect(zeroNaoFalha(mutar(yml, "grep -c '?variant=' || true", "grep -c '?variant='"))).toBe(false)
  })

  it('a ausência de canônica deixando de falhar reprova', () => {
    expect(ausenciaFalha(mutar(yml, /\[ -n "\$canonica" \]/, 'true'))).toBe(false)
  })

  it('o passo antes da contagem reprova', () => {
    const passo6 = blocoDoPasso6(yml)!
    const semPasso = yml.replace(passo6, '')
    const antes = mutar(semPasso, '# 3. Contagem', `${passo6}\n          # 3. Contagem`)
    expect(depoisDaContagem(antes)).toBe(false)
  })

  it('o `mutar` lança quando a mutação não acha o alvo', () => {
    expect(() => mutar(yml, 'texto-que-não-existe-no-arquivo', 'x')).toThrow(/sem alvo/)
  })

  it('CRLF — o mesmo arquivo com quebras do Windows mede o mesmo depois de normalizado', () => {
    const crlf = yml.replace(/\n/g, '\r\n').replace(/\r\n/g, '\n')
    for (const [, regua] of REGUAS) expect(regua(crlf)).toBe(true)
  })
})
