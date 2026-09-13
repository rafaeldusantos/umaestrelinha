// As recusas de "quem entra no painel", num dono só.
//
// ---------------------------------------------------------------------------------------------
// Por que este módulo existe em `core` e não na tela (feature 48, `AD-033`):
//
// Dois consumidores leem estas réguas, e os dois existem desde o primeiro dia — o painel (Vite) e a
// edge function `admin-users` (Deno). Escrevê-las na tela obrigaria a function a ter a própria cópia,
// e é exatamente o "defeito 01" do projeto: duas escritas da mesma regra não quebram nada. Build,
// `tsc` e teste de componente passam com as duas cópias divergindo, e quem descobre é quem ficou de
// fora do painel.
//
// **A divisão de trabalho entre as duas pontas não é redundância:** a tela chama estas funções para
// a pessoa não perder o que digitou, a function as chama porque a escrita pode não vir da tela, e o
// banco tem o `guard_last_admin` porque é o único que requisição forjada não contorna.
//
// **Todo veredito é `string | null`, nunca união discriminada por literal booleano.** Com
// `strictNullChecks: false` aquela forma não estreita: ler `verdict.reason` no ramo do `else` é erro
// de compilação (TS2339). Mesmo formato de `menuTargetRefusal`, `reservedSlugRefusal` e
// `freeShippingRefusal`.
//
// **Extensão `.ts` explícita em todo import relativo, `import type` incluído.** É o que mantém o
// módulo alcançável pelo Deno — medido na feature 33, e guardado por `__tests__/purity.test.ts`.
// ---------------------------------------------------------------------------------------------

import { MIN_PASSWORD_LENGTH } from '../constants.ts'
import { SAME_PASSWORD } from '../auth/errors.ts'

/**
 * O mesmo formato que `AuthContext.resetPassword` já usa na loja. Deliberadamente frouxo: validar
 * e-mail por regex estrito recusa endereço válido, e quem decide de verdade é o GoTrue.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * `trim` + `toLowerCase`, num lugar só.
 *
 * O arquivo real da loja traz `VROSA_RJ@HOTMAIL.COM` em caixa alta (feature 35), e comparar cru
 * deixa a mesma pessoa como duas. Aqui o custo de errar é maior que na listagem de clientes: um
 * e-mail comparado cru deixaria `Ana@x.com` criar uma segunda conta ao lado de `ana@x.com`, e as
 * duas seriam admin.
 */
export const normalizeEmail = (raw: string): string => (raw ?? '').trim().toLowerCase()

export interface AdminUserInput {
  name: string
  email: string
  /**
   * Ausente ⇒ a senha não é validada.
   *
   * É o caso do `?action=update`, que troca nome e e-mail e **não** troca senha. Sem a
   * opcionalidade, ou a edição pediria uma senha que ela não usa, ou haveria uma segunda régua só
   * para ela — que é como o segundo dono nasce.
   */
  password?: string
}

/**
 * A régua de criação e de edição de um acesso ao painel (`USR-05`, `USR-06`, `USR-21`).
 *
 * A ordem é deliberada e testada: **nome → e-mail → senha**, na ordem em que os campos aparecem no
 * formulário. Quando duas recusas se aplicam, a que volta é a do campo de cima — senão a pessoa
 * conserta a senha e descobre só então que o nome também estava vazio.
 */
export const adminUserRefusal = (input: AdminUserInput): string | null => {
  const name = (input?.name ?? '').trim()
  if (name === '') return 'Informe o nome de quem vai acessar'

  if (!EMAIL_RE.test(normalizeEmail(input?.email ?? ''))) return 'E-mail inválido'

  // `undefined` é "não estou trocando a senha". String vazia NÃO é: quem mandou o campo vazio está
  // tentando criar acesso sem senha, e isso é recusa, não omissão.
  if (input?.password === undefined) return null
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`
  }

  return null
}

export interface PasswordChangeInput {
  current: string
  next: string
  confirm: string
}

/**
 * As três recusas que rodam **antes de qualquer chamada de rede** na troca da própria senha
 * (`USR-11`, `USR-12`, `USR-23`).
 *
 * "Antes da rede" é o requisito, não um detalhe: `changeOwnPassword` prova a senha atual com um
 * `signInWithPassword`, e mandar uma tentativa de login a cada tecla errada gasta o
 * `sign_in_sign_ups` do GoTrue — a pessoa acabaria bloqueada por rate limit enquanto tenta trocar a
 * própria senha.
 *
 * **A ordem é comprimento → confirmação → igualdade**, e é deliberada: comprimento é o único que a
 * pessoa conserta olhando um campo só. Se a confirmação viesse primeiro, quem digitasse `abc` /
 * `abd` leria "a confirmação não confere", corrigiria, e **só então** descobriria que a senha é
 * curta demais — dois vaivéns para um erro só.
 *
 * A igualdade com a atual vem por último porque é a única que depende de um campo que a pessoa não
 * está editando.
 */
export const passwordChangeRefusal = (input: PasswordChangeInput): string | null => {
  const next = input?.next ?? ''

  if (next.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`
  }

  if (next !== (input?.confirm ?? '')) return 'A confirmação não confere com a senha nova'

  // O texto vem de `core/auth`, que é o dono: o GoTrue devolve `same_password` quando a troca chega
  // ao servidor, e esta régua recusa antes. Duas frases diferentes para a mesma situação seriam o
  // defeito 01 aplicado a texto.
  if (next === (input?.current ?? '')) return SAME_PASSWORD

  return null
}

// ---------------------------------------------------------------------------------------------
// As recusas de ALVO — quem pode sofrer a ação, e não o que foi digitado.
// ---------------------------------------------------------------------------------------------

/** O que a ação faria, para a recusa poder falar a língua do botão que a pessoa apertou. */
export type AcaoSobreAdmin = 'remover' | 'apagar'

/**
 * Ninguém age sobre a própria conta pelo painel (`USR-14`, `USR-34`).
 *
 * Não é paternalismo: remover o próprio papel derruba o acesso **no meio da sessão**, e o desfecho
 * depende de haver outra pessoa com acesso — informação que quem clicou não tem à mão. A recusa
 * custa um clique; o engano custa uma loja sem painel.
 *
 * `lastAdminRefusal` **não** cobre este caso: com dois admins, remover a si mesma passa naquela
 * régua e ainda assim tranca quem clicou para fora.
 */
export const selfTargetRefusal = (
  actorId: string,
  targetId: string,
  acao: AcaoSobreAdmin,
): string | null => {
  if (!actorId || !targetId || actorId !== targetId) return null

  return acao === 'remover'
    ? 'Você não pode remover o seu próprio acesso. Peça a outra pessoa com acesso ao painel.'
    : 'Você não pode apagar a sua própria conta pelo painel.'
}

/**
 * O painel nunca fica sem ninguém (`USR-15`, `USR-34`).
 *
 * `total` é a contagem de admins **antes** da ação. Este é o **cinto**; o suspensório é o trigger
 * `guard_last_admin`, no banco — e é ele que vale contra requisição forjada, contra o Studio e
 * contra duas remoções simultâneas, porque conta no commit. Aqui a função existe para a recusa ter
 * motivo legível em vez de um erro de trigger cru.
 *
 * Contagem inválida (negativa, não finita) **recusa**. É a mesma régua do `requireAdmin` da edge
 * function: falha de verificação fecha, nunca abre.
 */
export const lastAdminRefusal = (total: number): string | null => {
  if (!Number.isFinite(total)) return 'Não foi possível confirmar quantos acessos existem. Tente de novo.'
  if (total > 1) return null

  return 'Este é o único acesso ao painel. Crie outro antes de remover este — sem nenhum, ninguém entra.'
}

/**
 * O que impede apagar a conta de vez.
 *
 * Cada campo é uma **chave estrangeira real**, medida no schema em 2026-09-13. As quatro apontam
 * para `auth.users` (direta ou indiretamente) **sem `ON DELETE`**, ou seja, com `NO ACTION`:
 *
 * | campo | FK |
 * | --- | --- |
 * | `pedidos` | `orders.customer_id` → `customers.id`, e `customers.user_id` é `ON DELETE CASCADE` |
 * | `notasDePedido` | `order_notes.created_by` |
 * | `mudancasDeStatus` | `order_status_history.created_by` |
 * | `notasDeCliente` | `customer_notes.created_by` |
 */
export interface AccountHistory {
  pedidos: number
  notasDePedido: number
  mudancasDeStatus: number
  notasDeCliente: number
}

const quantia = (n: number, singular: string, plural: string): string | null =>
  Number.isFinite(n) && n > 0 ? `${n} ${n === 1 ? singular : plural}` : null

/** `['a', 'b', 'c']` → `'a, b e c'`. */
const enumerar = (partes: string[]): string =>
  partes.length <= 1
    ? (partes[0] ?? '')
    : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`

/**
 * Recusa apagar uma conta que deixou rastro (`USR-32`, `USR-33`).
 *
 * **A recusa nomeia o que bloqueia e com quantos registros**, porque é a diferença entre uma tela
 * que explica e uma que só diz não: sem o número, a dona não sabe se o obstáculo é um pedido antigo
 * ou trezentos, nem qual das quatro coisas apagar primeiro — e a resposta é que **nenhuma** delas
 * deve ser apagada, o que só fica óbvio quando ela lê o que são.
 *
 * A mesma função traduz o `23503` que o banco devolve se alguém tentar assim mesmo: a tela explica,
 * o banco garante. Duas frases para a mesma parede seriam dois donos.
 */
export const accountHistoryRefusal = (counts: AccountHistory): string | null => {
  const partes = [
    quantia(counts?.pedidos, 'pedido', 'pedidos'),
    quantia(counts?.notasDePedido, 'nota em pedido', 'notas em pedidos'),
    quantia(counts?.mudancasDeStatus, 'mudança de status', 'mudanças de status'),
    quantia(counts?.notasDeCliente, 'nota sobre cliente', 'notas sobre clientes'),
  ].filter((p): p is string => p !== null)

  if (partes.length === 0) return null

  return `Esta conta tem ${enumerar(partes)} no histórico da loja, e apagá-la deixaria esses registros sem dono. Use “Remover do painel”: o acesso sai e o histórico fica.`
}
