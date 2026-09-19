import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda do `Email check` — a rotina da feature `52` que prova que o e-mail ainda pode sair.
 *
 * Lê o `.yml` **do disco**, como `vercelRedirects` lê o `vercel.json`. O motivo é o de sempre:
 * **afrouxar este workflow não quebra nada**. Ele continua verde, continua rodando todo dia, e
 * continua parecendo um sensor — medindo menos, ou medindo a si mesmo.
 *
 * As três decisões que este arquivo protege são exatamente as que alguém desfaz com boa intenção:
 *
 * 1. **Nenhum literal do domínio verificado.** O domínio é DERIVADO do que a produção reporta e
 *    conferido contra o que o Resend reporta. Cravá-lo aqui "para ficar mais claro" cria o terceiro
 *    dono, e no cutover alguém troca dois dos três.
 * 2. **A cegueira declarada.** O workflow diz por extenso que NÃO prova o SMTP nem os templates do
 *    GoTrue. Apagar esse parágrafo é pior que não tê-lo escrito: o próximo leitor conclui que o auth
 *    está coberto e para de conferir o dashboard. É a lição do `BUS-26` da `51` — comentário que
 *    afirma sensibilidade inexistente encerra a investigação.
 * 3. **O passo 1 exige 200 E a chave `from`.** Um bundle velho em produção responde **400** com a
 *    lista de actions, que é JSON válido. Uma régua de "parseou?" leria esse 400 como resposta boa,
 *    e os passos seguintes acusariam "configuração errada" com o defeito sendo DEPLOY VELHO —
 *    mandando quem for consertar procurar no lugar errado.
 *
 * Cada régua é um **predicado**, para a asserção e o sensor chamarem a mesma função. Sem esse par,
 * uma asserção que sempre passa é indistinguível de uma que funciona.
 *
 * Não há remoção de comentário aqui, e isso é deliberado: **metade do que este guarda mede VIVE em
 * comentário** (a declaração de cegueira). Um stripper apagaria o objeto medido.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, '.github/workflows/email-check.yml')
/** O outro workflow que esta feature toca: o passo de divergência da T4 (`DLV-25`/`DLV-26`). */
const CAMINHO_DEPLOY = resolve(ROOT, '.github/workflows/supabase-deploy.yml')

/** `L-031`: normalizar CRLF antes de qualquer régua com âncora de linha. */
const yml = readFileSync(CAMINHO, 'utf8').replace(/\r\n/g, '\n')
const deployYml = readFileSync(CAMINHO_DEPLOY, 'utf8').replace(/\r\n/g, '\n')

/**
 * O domínio verificado da conta Resend. Ele está escrito AQUI de propósito — este é o único lugar
 * do repositório que precisa conhecê-lo, e precisa para provar que o workflow **não** o conhece.
 */
const DOMINIO_VERIFICADO = 'loja.umaestrelinha.com.br'

// -------------------------------------------------------------------------------------------
// As réguas, como predicados
// -------------------------------------------------------------------------------------------

/** Os marcadores de passo que o log imprime: `[1/7]` .. `[7/7]`. */
const passosEncontrados = (texto: string): number[] =>
  [...texto.matchAll(/\[(\d)\/7\]/g)].map((m) => Number(m[1])).sort((a, b) => a - b)

/** (1) Nenhum literal do domínio verificado, em lugar nenhum — nem em comentário. */
const semDominioLiteral = (texto: string): boolean => !texto.includes(DOMINIO_VERIFICADO)

/** (1b) O domínio é derivado do `from` reportado e conferido contra a lista de `verified`. */
const dominioDerivado = (texto: string): boolean =>
  /DOMINIO=\$\(printf[^\n]*\bsed\b/.test(texto) && /status\s*==\s*"verified"/.test(texto)

/**
 * (2) A cegueira está declarada: o workflow nomeia o que NÃO prova, e por quê. As três partes têm
 * de estar juntas — só "não prova" sem o motivo vira frase que alguém apaga por parecer vaga.
 */
const cegueiraDeclarada = (texto: string): boolean =>
  /N[ÃA]O prova/i.test(texto) && /config pull/i.test(texto) && /template/i.test(texto)

/**
 * O recorte de um passo: o texto entre `[n/7]` e o marcador seguinte.
 *
 * **Recorte que falha devolve `null` e REPROVA**, em vez de virar bloco vazio que aprova tudo — é o
 * molde de `rotasSobGuarda.test.ts`. E o recorte é necessário, não zelo: a primeira escrita deste
 * guarda usava `/\[1\/7\][\s\S]*?"\$COD" != "200"/` sobre o arquivo inteiro, e o `[\s\S]*?` atravessa
 * passos. Com a ocorrência do passo 1 mutada, a régua casava a do **passo 5** e continuava verde —
 * ela media "existe um `!= 200` em algum lugar depois do passo 1", que não é o que o nome diz.
 */
function blocoDoPasso(texto: string, n: number): string | null {
  const inicio = texto.indexOf(`[${n}/7]`)
  if (inicio < 0) return null
  const fim = texto.indexOf(`[${n + 1}/7]`, inicio)
  const trecho = fim < 0 ? texto.slice(inicio) : texto.slice(inicio, fim)
  return trecho.trim() === '' ? null : trecho
}

/** (3) O passo 1 exige 200 **e** a presença de `from`. As duas condições, não uma. */
const passo1ExigeDuasCoisas = (texto: string): boolean => {
  const bloco = blocoDoPasso(texto, 1)
  if (bloco === null) return false
  return /"\$COD"\s*!=\s*"200"/.test(bloco) && /has\("from"\)/.test(bloco)
}

/** (3b) E a mensagem do 400 manda procurar no lugar certo: bundle velho, não configuração. */
const passo1NomeiaBundleVelho = (texto: string): boolean => {
  const bloco = blocoDoPasso(texto, 1)
  return bloco !== null && /::error::[^\n]*BUNDLE VELHO/i.test(bloco)
}

/**
 * (4) O remetente do auth vem de `supabase/config.toml`, nunca escrito no workflow.
 *
 * A janela é de 600 porque a extração é um `awk` de várias linhas. Ela já esteve em 200 e reprovou
 * o arquivo CERTO quando o `grep` de uma linha virou o `awk` recortado — régua calibrada pela forma
 * que o código tinha no dia em que ela foi escrita, que é o defeito que este repositório persegue.
 */
const authLidoDoConfigToml = (texto: string): boolean =>
  /AUTH_FROM=\$\([\s\S]{0,600}?supabase\/config\.toml/.test(texto)

/**
 * (4b) E a extração é RECORTADA pelo bloco `[auth.email.smtp]`, não um `grep | head -1`.
 *
 * Obrigatório, e não estilo: o `config.toml` tem um **segundo** `admin_email`, na seção
 * `[inbucket]`, com o placeholder `admin@email.com` — e ele vem **antes** no arquivo. Uma régua que
 * apenas tolerasse o `#` pegaria o placeholder, e o passo 7 passaria a provar um endereço que não é
 * de ninguém: 200 do Resend sobre um domínio que não é nosso, sensor verde sobre nada.
 *
 * O `#?` é deliberado: o bloco fica **comentado** (o local usa Mailpit), e o que interessa é a
 * declaração versionada do endereço — produção é configurada no dashboard, não por este arquivo.
 */
const authRecortaPeloBloco = (texto: string): boolean =>
  /awk\s+'[\s\S]{0,400}?\[auth\\\.email\\\.smtp\\\][\s\S]{0,400}?admin_email/.test(texto)

/** (4c) E o extraído é validado como endereço — extração vazia não pode virar probe silencioso. */
const authValidaOExtraido = (texto: string): boolean =>
  /case "\$AUTH_FROM" in[\s\S]{0,200}?\*@\*\.\*\)/.test(texto)

/**
 * (5) A classificação separa CONFIGURAÇÃO de INDISPONIBILIDADE. É o produto deste workflow: sem
 * ela, um teto de envio manda alguém procurar defeito na configuração, que é o lugar errado.
 */
const classificaIndisponibilidade = (texto: string): boolean =>
  /429\)\s*echo\s*"indisp:/.test(texto) &&
  /000\)\s*echo\s*"indisp:/.test(texto) &&
  /5\*\)\s*echo\s*"indisp:/.test(texto)

const classificaConfiguracao = (texto: string): boolean =>
  /403\)\s*echo\s*"config:/.test(texto) && /401\)\s*echo\s*"config:/.test(texto)

/** (6) A chave sai de `secrets`, e o corpo da resposta do Resend nunca chega ao log. */
const chaveDeSecrets = (texto: string): boolean =>
  /RESEND_API_KEY:\s*\$\{\{\s*secrets\.RESEND_API_KEY\s*\}\}/.test(texto)

const corpoDoResendNaoVaiAoLog = (texto: string): boolean =>
  /-o \/dev\/null[^\n]*-w '%\{http_code\}'[\s\S]{0,400}?api\.resend\.com\/emails/.test(texto)

/**
 * (7) `admin_public_url` NÃO é conferida, e isso é decisão. Ela é o default de desenvolvimento em
 * produção porque os dois eventos que a usam nascem desligados (Out of Scope da `52`). Uma régua
 * genérica sobre "as duas URLs são https" faria o sensor nascer VERMELHO todo dia — e sensor que
 * nasce vermelho é sensor que alguém desliga.
 */
const naoConfereAdminUrl = (texto: string): boolean => !/admin_public_url/.test(texto.replace(/#[^\n]*/g, ''))

/** (8) Diário e disparável à mão. */
const agendadoEDisparavel = (texto: string): boolean =>
  /schedule:/.test(texto) && /cron:\s*'[^']+'/.test(texto) && /workflow_dispatch:/.test(texto)

// -------------------------------------------------------------------------------------------
// A régua que FALTAVA — e a lacuna que ela fecha é o motivo de este guarda existir
// -------------------------------------------------------------------------------------------
//
// A primeira escrita deste arquivo ancorava nos marcadores `[n/7]` que cada passo IMPRIME, e
// media invariantes de TEXTO: sem literal de domínio, a cegueira declarada, 429 como
// indisponibilidade. Verificação independente provou o buraco: **esvaziar o corpo de um passo
// mantendo o `echo` deixava os 39 casos verdes**, em CINCO dos sete passos. Entre os removíveis
// estavam o `exit 1` que faz o passo 5 falhar quando o domínio sai de `verified` e o probe inteiro
// do remetente do auth — ou seja, `DLV-05` e `DLV-06` negadas ao pé da letra, com a suíte verde.
//
// Num workflow cujo **produto é falhar**, medir o rótulo do passo é medir a porta e não a
// fechadura. As duas réguas abaixo recortam o bloco de cada passo e exigem, DENTRO dele, o
// predicado que ele verifica **e** o ramo que aborta.

/**
 * Régua de COMPORTAMENTO roda sobre o bloco **sem comentário** — e régua de TEXTO, não.
 *
 * O cabeçalho deste arquivo explica por que não há stripper global: metade do que ele mede (a
 * declaração de cegueira) **vive** em comentário. Essa escolha é certa para as réguas de texto e
 * foi herdada, sem revisão, pelas de comportamento — onde ela abre um buraco: a palavra `localhost`
 * migrada do `case` para um comentário do mesmo bloco satisfazia "o passo 4 recusa localhost".
 * Medido na rodada 2 da verificação, com 59/59 verde.
 */
const semComentarioDeLinha = (bloco: string): string =>
  bloco.replace(/\r\n/g, '\n').replace(/^[ \t]*#[^\n]*$/gm, '')

/** Todo passo tem um ramo de falha visível no próprio bloco: `::error::` **e** `exit 1`. */
const passoFalhaAoQuebrar = (texto: string, n: number): boolean => {
  const bloco = blocoDoPasso(texto, n)
  if (bloco === null) return false
  const codigo = semComentarioDeLinha(bloco)
  return /::error::/.test(codigo) && /\bexit 1\b/.test(codigo)
}

/**
 * E o aborto está LIGADO ao predicado, não apenas presente no bloco.
 *
 * `passoFalhaAoQuebrar` pergunta "existe algum `exit 1` aqui?", e o bloco 5 tem três — um para o
 * domínio vazio, um para o `GET /domains` que não volta 200, e um para o domínio fora de
 * `verified`. Remover **só o terceiro** deixava a régua verde e a `DLV-05` falsa: o domínio sai de
 * `verified`, o `::error::` é impresso, e o passo **continua**. Medido na rodada 2.
 *
 * Esta régua exige o `exit 1` na vizinhança imediata do predicado — a mesma sentença `|| { …; exit
 * 1; }` ou `|| exit 1`. 400 caracteres cobrem a forma quebrada em linhas que o `yamlfmt` produz.
 */
const predicadoAbortaJunto = (texto: string, n: number, predicado: RegExp): boolean => {
  const bloco = blocoDoPasso(texto, n)
  if (bloco === null) return false
  const codigo = semComentarioDeLinha(bloco)
  const achado = codigo.match(predicado)
  if (!achado || achado.index === undefined) return false
  return /\bexit 1\b/.test(codigo.slice(achado.index, achado.index + 400))
}

/** O predicado de cada passo que, quebrando, TEM de abortar. */
const ABORTO_DO_PASSO: Record<number, RegExp> = {
  2: /from_is_default == false/,
  3: /dev_redirect_active == false/,
  4: /localhost/,
  5: /status\s*==\s*"verified"/,
}

/**
 * O que cada passo tem de verificar, ancorado DENTRO do bloco dele.
 *
 * O passo 1 fica de fora porque já tem régua própria (`passo1ExigeDuasCoisas`), mais estrita.
 */
const VERIFICACAO_DO_PASSO: Record<number, readonly RegExp[]> = {
  2: [/from_valid\s*==\s*true/, /from_is_default\s*==\s*false/],
  3: [/dev_redirect_active\s*==\s*false/],
  4: [/store_public_url/, /localhost/],
  5: [/status\s*==\s*"verified"/],
  6: [/provar_remetente\s+"\$FROM"/],
  7: [/provar_remetente\s+"\$AUTH_FROM"/],
}

const passoVerificaOQueDeve = (texto: string, n: number): boolean => {
  const bloco = blocoDoPasso(texto, n)
  if (bloco === null) return false
  const codigo = semComentarioDeLinha(bloco)
  return VERIFICACAO_DO_PASSO[n].every((regra) => regra.test(codigo))
}

// -------------------------------------------------------------------------------------------
// O classificador — medido por ALCANCE, não por presença do rótulo
// -------------------------------------------------------------------------------------------
//
// `classificaIndisponibilidade` confere que o ramo `000)` **existe** no `case`. Ele existia — e
// era **inalcançável**: os três `curl` usavam `|| echo 000`, e o curl já imprime `000` na falha de
// rede, então a variável chegava como `000000`, caía no `*)` e a queda do Resend era classificada
// como **configuração**. O oposto do que `DLV-09` manda. Medido em 2026-09-19 contra uma porta
// morta, e verde nos 59 casos do guarda.
//
// A régua abaixo **executa** o `case` do arquivo: extrai os ramos na ordem, e casa o valor como o
// shell casaria (glob, primeiro que bate vence). É comportamento, não texto.

type Ramo = { padrao: string; veredito: string }

/** Os ramos do `case` do `classificar`, na ordem em que o shell os avalia. */
function ramosDoClassificador(texto: string): Ramo[] {
  const corpo = texto.match(/classificar\(\)\s*\{([\s\S]*?)\n\s*\}/)
  if (!corpo) return []
  // `([a-z]+):?` — o ramo de sucesso imprime `"ok"` SEM dois-pontos, e uma régua que exigisse o
  // separador deixaria `2*` de fora do mapa: `200` cairia no `*)` e seria lido como configuração.
  return [...corpo[1].matchAll(/^\s*([^\s)]+)\)\s*echo\s*"([a-z]+):?/gm)].map((m) => ({
    padrao: m[1],
    veredito: m[2],
  }))
}

/** Casa como o `case` do shell: `*` é curinga, e o primeiro ramo que bate vence. */
function classificarComo(texto: string, codigo: string): string | null {
  for (const { padrao, veredito } of ramosDoClassificador(texto)) {
    const re = new RegExp(`^${padrao.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
    if (re.test(codigo)) return veredito
  }
  return null
}

/**
 * Nenhum `curl` usa o fallback que concatena.
 *
 * Roda **sem comentário**: o próprio workflow explica a armadilha citando a forma proibida, e a
 * primeira escrita desta régua acusou essa prosa. É a terceira vez nesta feature que o texto que
 * descreve o defeito aciona a régua que o proíbe — daí a regra do `CLAUDE.md`: descreva a forma,
 * não a escreva; e régua de comportamento não lê comentário.
 */
const curlNaoConcatenaCodigo = (texto: string): boolean =>
  !/\|\|\s*echo\s+000/.test(semComentarioDeLinha(texto))

// -------------------------------------------------------------------------------------------
// `DLV-25`/`DLV-26` — o passo de divergência no `Supabase Deploy`, que é da mesma feature
// -------------------------------------------------------------------------------------------

/**
 * O recorte do passo de divergência: do `- name:` dele até o próximo `- name:` de mesma indentação,
 * ou o fim do arquivo (ele é o último passo hoje).
 *
 * **Recorte que falha devolve `null` e REPROVA.** Se virasse string vazia, as réguas "não tem
 * `exit 1`" e "não tem `::error::`" passariam **por ausência de texto** — verdes sobre nada, que é
 * exatamente o modo de falha que este repositório persegue em guarda de varredura.
 */
function blocoDaDivergencia(texto: string): string | null {
  const inicio = texto.search(/^ {6}- name: divergencia entre o remoto e o repositorio$/m)
  if (inicio < 0) return null
  const resto = texto.slice(inicio)
  const proximo = resto.slice(1).search(/^ {6}- name:/m)
  const trecho = proximo < 0 ? resto : resto.slice(0, proximo + 1)
  return trecho.trim() === '' ? null : trecho
}

/** O passo existe e AVISA por slug — os dois sentidos da divergência. */
const passoDeDivergenciaAvisa = (texto: string): boolean => {
  const bloco = blocoDaDivergencia(texto)
  if (bloco === null) return false
  return /::warning::[^\n]*ZUMBI/i.test(bloco) && /::warning::[^\n]*N[ÃA]O está publicada/i.test(bloco)
}

/**
 * E NUNCA falha o job (`DLV-26`). Function zumbi é dívida, não incidente: um `exit 1` aqui pararia
 * a loja por um problema que não é dela, e é a troca que alguém faz "para dar mais visibilidade".
 * As três garantias juntas — sem `exit 1`, sem `::error::`, e `continue-on-error` — porque cada uma
 * sozinha tem um jeito de ser contornada.
 */
const passoDeDivergenciaNaoFalha = (texto: string): boolean => {
  const bloco = blocoDaDivergencia(texto)
  if (bloco === null) return false
  return !/exit 1/.test(bloco) && !/::error::/.test(bloco) && /continue-on-error:\s*true/.test(bloco)
}

/** Roda sempre — condicioná-lo ao diff esconderia a divergência em todo push que não a causou. */
const passoDeDivergenciaRodaSempre = (texto: string): boolean => {
  const bloco = blocoDaDivergencia(texto)
  return bloco !== null && /if:\s*\$\{\{\s*always\(\)\s*\}\}/.test(bloco)
}

// -------------------------------------------------------------------------------------------
// Âncoras — sem elas, um caminho errado varre o vazio e o guarda fica verde sobre nada (`L-021`)
// -------------------------------------------------------------------------------------------

describe('Email check — âncoras de leitura', () => {
  it('o workflow foi lido do disco', () => {
    expect(yml.length).toBeGreaterThan(2000)
  })

  it('os SETE passos foram encontrados, e são exatamente 1..7', () => {
    expect(passosEncontrados(yml)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('Email check — o sensor pergunta à produção, não a si mesmo', () => {
  it('não carrega o literal do domínio verificado', () => {
    expect(semDominioLiteral(yml)).toBe(true)
  })

  it('deriva o domínio do remetente reportado e o confere contra os verificados', () => {
    expect(dominioDerivado(yml)).toBe(true)
  })

  it('lê o remetente do auth de supabase/config.toml', () => {
    expect(authLidoDoConfigToml(yml)).toBe(true)
  })

  it('recorta a extração pelo bloco [auth.email.smtp] — o config.toml tem outro admin_email', () => {
    expect(authRecortaPeloBloco(yml)).toBe(true)
  })

  it('valida que o extraído é um endereço', () => {
    expect(authValidaOExtraido(yml)).toBe(true)
  })
})

describe('Email check — o passo 1 distingue deploy velho de configuração errada', () => {
  it('exige 200 E a chave from', () => {
    expect(passo1ExigeDuasCoisas(yml)).toBe(true)
  })

  it('a mensagem do 400 nomeia bundle velho', () => {
    expect(passo1NomeiaBundleVelho(yml)).toBe(true)
  })
})

describe('Email check — indisponibilidade não é configuração', () => {
  it('429, timeout e 5xx são classificados como indisponibilidade', () => {
    expect(classificaIndisponibilidade(yml)).toBe(true)
  })

  it('401 e 403 são classificados como configuração', () => {
    expect(classificaConfiguracao(yml)).toBe(true)
  })
})

describe('Email check — o que ele declara não cobrir, e o que não expõe', () => {
  it('declara por extenso que não prova o SMTP nem os templates do GoTrue', () => {
    expect(cegueiraDeclarada(yml)).toBe(true)
  })

  it('a chave vem de secrets', () => {
    expect(chaveDeSecrets(yml)).toBe(true)
  })

  it('o corpo da resposta do Resend não chega ao log', () => {
    expect(corpoDoResendNaoVaiAoLog(yml)).toBe(true)
  })

  it('NÃO confere admin_public_url — seria vermelho todo dia', () => {
    expect(naoConfereAdminUrl(yml)).toBe(true)
  })

  it('roda diariamente e aceita disparo manual', () => {
    expect(agendadoEDisparavel(yml)).toBe(true)
  })
})

describe('Email check — cada passo FALHA quando o elo dele quebra', () => {
  it.each([1, 2, 3, 4, 5, 6, 7])('o passo %i tem ramo de falha no próprio bloco', (n) => {
    expect(passoFalhaAoQuebrar(yml, n)).toBe(true)
  })

  it.each([2, 3, 4, 5, 6, 7])('o passo %i verifica o que a AC manda, dentro do bloco', (n) => {
    expect(passoVerificaOQueDeve(yml, n)).toBe(true)
  })

  it.each([2, 3, 4, 5])('no passo %i o aborto está LIGADO ao predicado, não só presente', (n) => {
    expect(predicadoAbortaJunto(yml, n, ABORTO_DO_PASSO[n])).toBe(true)
  })
})

describe('Email check — o classificador é ALCANÇÁVEL, não só escrito', () => {
  it('os ramos do case foram extraídos', () => {
    const ramos = ramosDoClassificador(yml)
    expect(ramos.length).toBeGreaterThanOrEqual(6)
    expect(ramos.map((r) => r.padrao)).toContain('000')
  })

  it('o código que o curl emite na falha de rede cai em INDISPONIBILIDADE', () => {
    // `000` é o que `-w '%{http_code}'` imprime quando a conexão não acontece.
    expect(classificarComo(yml, '000')).toBe('indisp')
  })

  it.each([
    ['429', 'indisp'],
    ['503', 'indisp'],
    ['200', 'ok'],
    ['403', 'config'],
    ['401', 'config'],
  ])('o código %s classifica como %s', (codigo, esperado) => {
    expect(classificarComo(yml, codigo)).toBe(esperado)
  })

  it('nenhum curl usa `|| echo 000`, que era o que tornava o ramo 000 inalcançável', () => {
    expect(curlNaoConcatenaCodigo(yml)).toBe(true)
  })

  it('o SENSOR do defeito real: `000000` NÃO é indisponibilidade — vira configuração', () => {
    // É a prova de por que o `|| echo 000` era fatal, e não estilo: o valor concatenado escapa de
    // todos os ramos nomeados e cai no `*)`, que diz "resposta inesperada" — configuração.
    expect(classificarComo(yml, '000000')).not.toBe('indisp')
    expect(classificarComo(yml, '000000')).toBe('config')
  })
})

describe('Supabase Deploy — function zumbi vira visível, e nunca derruba o deploy', () => {
  it('o passo de divergência foi encontrado no arquivo', () => {
    expect(deployYml.length).toBeGreaterThan(2000)
    expect(blocoDaDivergencia(deployYml)).not.toBeNull()
  })

  it('avisa nos dois sentidos: slug sobrando e slug faltando', () => {
    expect(passoDeDivergenciaAvisa(deployYml)).toBe(true)
  })

  it('NUNCA falha o job — sem exit 1, sem ::error::, com continue-on-error', () => {
    expect(passoDeDivergenciaNaoFalha(deployYml)).toBe(true)
  })

  it('roda sempre, não só quando as functions mudaram', () => {
    expect(passoDeDivergenciaRodaSempre(deployYml)).toBe(true)
  })
})

// -------------------------------------------------------------------------------------------
// Sensores — cada régua exercida contra texto mutado. Uma asserção que sempre passa é
// indistinguível de uma que funciona.
// -------------------------------------------------------------------------------------------

describe('Email check — sensores por mutação', () => {
  it('o domínio literal reaparecendo REPROVA', () => {
    const mutado = yml.replace('echo "domínio do remetente: ${DOMINIO}"', `DOMINIO=${DOMINIO_VERIFICADO}`)
    expect(mutado).not.toBe(yml)
    expect(semDominioLiteral(mutado)).toBe(false)
  })

  it('o domínio literal escondido em COMENTÁRIO também REPROVA', () => {
    expect(semDominioLiteral(`${yml}\n# exemplo: ${DOMINIO_VERIFICADO}\n`)).toBe(false)
  })

  it('a declaração de cegueira sumindo REPROVA', () => {
    const mutado = yml.replace(/config pull/g, 'algum comando')
    expect(mutado).not.toBe(yml)
    expect(cegueiraDeclarada(mutado)).toBe(false)
  })

  it('o passo 1 aceitando só "parseou como JSON" REPROVA', () => {
    const mutado = yml.replace('has("from")', 'type == "object"')
    expect(mutado).not.toBe(yml)
    expect(passo1ExigeDuasCoisas(mutado)).toBe(false)
  })

  it('o passo 1 largando a exigência de 200 REPROVA', () => {
    // `.replace` com string troca só a PRIMEIRA ocorrência — a do passo 1. A do passo 5 fica de
    // pé de propósito: é ela que provava que a régua antiga media o arquivo, e não o passo.
    const mutado = yml.replace('"$COD" != "200"', '"$COD" = ""')
    expect(mutado).not.toBe(yml)
    expect(mutado).toContain('"$COD" != "200"') // a do passo 5 continua lá
    expect(passo1ExigeDuasCoisas(mutado)).toBe(false)
  })

  it('o recorte do passo falhando REPROVA, em vez de aprovar sobre bloco vazio', () => {
    const semMarcador = yml.replace('[1/7]', '[um/7]')
    expect(blocoDoPasso(semMarcador, 1)).toBeNull()
    expect(passo1ExigeDuasCoisas(semMarcador)).toBe(false)
    expect(passo1NomeiaBundleVelho(semMarcador)).toBe(false)
  })

  it('o remetente do auth virando literal no workflow REPROVA', () => {
    const mutado = yml.replace(/AUTH_FROM=\$\([\s\S]*?\)\n/, 'AUTH_FROM=acesso@exemplo.invalid\n')
    expect(mutado).not.toBe(yml)
    expect(authLidoDoConfigToml(mutado)).toBe(false)
  })

  it('trocar o recorte por um grep|head REPROVA — pegaria o placeholder do [inbucket]', () => {
    const mutado = yml.replace(
      /AUTH_FROM=\$\(awk '[\s\S]*?' supabase\/config\.toml\)/,
      "AUTH_FROM=$(grep -E '#?[[:space:]]*admin_email' supabase/config.toml | head -1)",
    )
    expect(mutado).not.toBe(yml)
    expect(authRecortaPeloBloco(mutado)).toBe(false)
  })

  it('429 reclassificado como configuração REPROVA', () => {
    const mutado = yml.replace('429) echo "indisp:', '429) echo "config:')
    expect(mutado).not.toBe(yml)
    expect(classificaIndisponibilidade(mutado)).toBe(false)
  })

  it('o corpo do Resend indo ao log REPROVA', () => {
    const mutado = yml.replace("-o /dev/null -w '%{http_code}' -m 30 -X POST", "-w '%{http_code}' -m 30 -X POST")
    expect(mutado).not.toBe(yml)
    expect(corpoDoResendNaoVaiAoLog(mutado)).toBe(false)
  })

  it('conferir admin_public_url REPROVA — a régua que nasceria vermelha', () => {
    const mutado = yml.replace('LOJA=$(jq -r \'.store_public_url\' cfg.json)', "ADMIN=$(jq -r '.admin_public_url' cfg.json)")
    expect(mutado).not.toBe(yml)
    expect(naoConfereAdminUrl(mutado)).toBe(false)
  })

  it('um passo sumindo derruba a ÂNCORA, não só a régua', () => {
    const mutado = yml.replace('[7/7]', '[x/7]')
    expect(passosEncontrados(mutado)).not.toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  // ---------------------------------------------------------------------------------------
  // Os SEIS mutantes que a verificação independente viu SOBREVIVER. Cada um é um passo
  // neutralizado com o `echo` no lugar — o modo de falha que a âncora de marcador não alcança.
  // ---------------------------------------------------------------------------------------

  /** Muta só dentro do bloco de um passo, e recoloca — a mutação não pode vazar para os vizinhos. */
  const mutarNoBloco = (n: number, de: RegExp | string, para: string): string => {
    const bloco = blocoDoPasso(yml, n)
    if (bloco === null) throw new Error(`bloco ${n} não recortado`)
    const mutado = bloco.replace(de as RegExp, para)
    if (mutado === bloco) throw new Error(`a mutação do bloco ${n} não mudou nada`)
    return yml.replace(bloco, mutado)
  }

  it('M26 — o passo 5 AVISANDO em vez de falhar REPROVA (o DNS cai e o e-mail para em silêncio)', () => {
    const mutado = mutarNoBloco(5, /exit 1/g, 'echo "::warning::segue"')
    expect(passoFalhaAoQuebrar(mutado, 5)).toBe(false)
  })

  it('M11 — apagar o probe do remetente do AUTH REPROVA (some a cobertura do BUG-20260728)', () => {
    const mutado = mutarNoBloco(7, /provar_remetente\s+"\$AUTH_FROM"[^\n]*/, 'true')
    expect(passoVerificaOQueDeve(mutado, 7)).toBe(false)
  })

  it('M10 — apagar a checagem de from_is_default REPROVA (o default entrega só ao dono da conta)', () => {
    const mutado = mutarNoBloco(2, /\.from_is_default == false/, '.from_valid == true')
    expect(passoVerificaOQueDeve(mutado, 2)).toBe(false)
  })

  it('M12 — apagar a checagem de dev_redirect_active REPROVA (todo transacional desviado)', () => {
    const mutado = mutarNoBloco(3, /dev_redirect_active == false/, 'from_valid == true')
    expect(passoVerificaOQueDeve(mutado, 3)).toBe(false)
  })

  it('M15 — o passo 4 deixando de recusar localhost REPROVA (já aconteceu em 2026-09-19)', () => {
    const mutado = mutarNoBloco(4, /localhost/g, 'exemplo-invalido')
    expect(passoVerificaOQueDeve(mutado, 4)).toBe(false)
  })

  it('M14 — o passo 6 provando um literal em vez de $FROM REPROVA (o sensor volta a se medir)', () => {
    const mutado = mutarNoBloco(6, /provar_remetente\s+"\$FROM"/, 'provar_remetente "algo@exemplo.invalid"')
    expect(passoVerificaOQueDeve(mutado, 6)).toBe(false)
  })

  it('M26b — tirar SÓ o exit 1 que defende a DLV-05 REPROVA (o bloco 5 tem outros dois)', () => {
    const mutado = mutarNoBloco(
      5,
      /(o e-mail parou\."; )exit 1; \}/,
      '$1}',
    )
    expect(passoFalhaAoQuebrar(mutado, 5)).toBe(true) // os outros `exit 1` seguem lá…
    expect(predicadoAbortaJunto(mutado, 5, ABORTO_DO_PASSO[5])).toBe(false) // …e é isto que pega
  })

  it('M15b — `localhost` migrado do case para um COMENTÁRIO do mesmo bloco REPROVA', () => {
    const bloco = blocoDoPasso(yml, 4)!
    const semRecusa = bloco.replace(
      'https://*localhost*|https://*127.0.0.1*|http://*)',
      'http://*)',
    )
    expect(semRecusa).not.toBe(bloco) // a mutação pegou o alvo
    // A palavra migra para um COMENTÁRIO dentro do mesmo bloco — que é a forma que sobrevivia.
    const mutado = yml.replace(
      bloco,
      semRecusa.replace('\n', '\n          # o passo recusa localhost também\n'),
    )
    expect(blocoDoPasso(mutado, 4)).toContain('# o passo recusa localhost') // o comentário está lá…
    expect(passoVerificaOQueDeve(mutado, 4)).toBe(false) // …e não conta
  })

  it('M13 — esvaziar o corpo do passo 4 REPROVA por RÉGUA, não por acidente de sensor', () => {
    // O mutante original morreu só porque o `.replace()` de OUTRO sensor perdeu o alvo. Agora há
    // régua: sem corpo, o passo não verifica nada e não tem ramo de falha.
    const bloco = blocoDoPasso(yml, 4)!
    const mutado = yml.replace(bloco, 'echo "[4/7] os links dos e-mails apontam para a loja"\n')
    expect(passoVerificaOQueDeve(mutado, 4)).toBe(false)
    expect(passoFalhaAoQuebrar(mutado, 4)).toBe(false)
  })

  it('um exit 1 no passo de divergência REPROVA — a troca que pararia a loja por dívida', () => {
    const mutado = deployYml.replace(
      'echo "OK — o hospedado e o repositório listam as mesmas functions."',
      'exit 1',
    )
    expect(mutado).not.toBe(deployYml)
    expect(passoDeDivergenciaNaoFalha(mutado)).toBe(false)
  })

  it('trocar ::warning:: por ::error:: REPROVA', () => {
    const mutado = deployYml.replace('::warning::function ZUMBI', '::error::function ZUMBI')
    expect(mutado).not.toBe(deployYml)
    expect(passoDeDivergenciaNaoFalha(mutado)).toBe(false)
    expect(passoDeDivergenciaAvisa(mutado)).toBe(false)
  })

  it('perder o continue-on-error REPROVA', () => {
    const mutado = deployYml.replace('        continue-on-error: true\n', '')
    expect(mutado).not.toBe(deployYml)
    expect(passoDeDivergenciaNaoFalha(mutado)).toBe(false)
  })

  it('condicionar o passo ao diff REPROVA', () => {
    const mutado = deployYml.replace(
      '        if: ${{ always() }}\n        continue-on-error: true',
      "        if: ${{ steps.mudou.outputs.functions == 'true' }}\n        continue-on-error: true",
    )
    expect(mutado).not.toBe(deployYml)
    expect(passoDeDivergenciaRodaSempre(mutado)).toBe(false)
  })

  it('o recorte do passo de divergência falhando REPROVA as três réguas', () => {
    const semPasso = deployYml.replace('- name: divergencia entre o remoto e o repositorio', '- name: outro passo')
    expect(blocoDaDivergencia(semPasso)).toBeNull()
    expect(passoDeDivergenciaAvisa(semPasso)).toBe(false)
    expect(passoDeDivergenciaNaoFalha(semPasso)).toBe(false)
    expect(passoDeDivergenciaRodaSempre(semPasso)).toBe(false)
  })

  it('o inverso do guarda do deploy: o passo como está passa nas três réguas', () => {
    expect(passoDeDivergenciaAvisa(deployYml)).toBe(true)
    expect(passoDeDivergenciaNaoFalha(deployYml)).toBe(true)
    expect(passoDeDivergenciaRodaSempre(deployYml)).toBe(true)
  })

  it('o inverso: o workflow como está passa em TODAS as réguas', () => {
    const todas = [
      semDominioLiteral, dominioDerivado, cegueiraDeclarada, passo1ExigeDuasCoisas,
      passo1NomeiaBundleVelho, authLidoDoConfigToml, authRecortaPeloBloco, authValidaOExtraido,
      classificaIndisponibilidade, classificaConfiguracao, chaveDeSecrets,
      corpoDoResendNaoVaiAoLog, naoConfereAdminUrl, agendadoEDisparavel,
    ]
    expect(todas.filter((regra) => !regra(yml))).toEqual([])
  })
})
