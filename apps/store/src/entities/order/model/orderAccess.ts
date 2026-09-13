// O token de posse do pedido, no navegador de quem comprou sem conta (feature `49`, `PED-05`).
//
// **Este arquivo é o único lugar do app que toca a chave.** `orderAccessSingleOwner.test.ts`
// recusa qualquer outro — não por estética: o token é a ÚNICA credencial de um pedido de
// convidada, e uma segunda leitura escrita à mão (chave com erro de digitação, `sessionStorage` em
// vez de `localStorage`) faria a confirmação abrir vazia sem nada quebrar.
//
// **`localStorage`, não `sessionStorage`.** O rascunho do checkout é da sessão e morre com a aba,
// de propósito; o acesso ao pedido, não — fechar a aba depois de pagar não pode apagar o único
// caminho de volta. É chave NOVA, então a regra que proíbe renomear chave de `localStorage` (ela
// protege carrinho de cliente real) não é despertada.

const KEY = 'estrelinha-order-access'

type Mapa = Record<string, string>

/**
 * Toda leitura é defensiva.
 *
 * `localStorage` **lança** em aba privada de alguns navegadores e com cookies de terceiros
 * bloqueados. Um throw aqui derrubaria a página de confirmação logo depois de a cliente pagar —
 * que é o pior momento possível para uma tela branca.
 */
function ler(): Mapa {
  try {
    const cru = globalThis.localStorage?.getItem(KEY)
    if (!cru) return {}
    const valor = JSON.parse(cru)
    // Lixo no storage não vira um terceiro estado: ou é um mapa, ou não existe.
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Mapa) : {}
  } catch {
    return {}
  }
}

function gravar(mapa: Mapa): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(mapa))
  } catch {
    /* storage indisponível: a compra segue, só não sobrevive ao recarregamento */
  }
}

/** Guarda o acesso devolvido pela criação do pedido. */
export function rememberAccess(orderId: string, token: string): void {
  if (!orderId || !token) return
  gravar({ ...ler(), [orderId]: token })
}

/** O acesso daquele pedido, ou `null`. */
export function accessFor(orderId: string): string | null {
  if (!orderId) return null
  const valor = ler()[orderId]
  return typeof valor === 'string' && valor ? valor : null
}

/** Esquece o acesso — usado quando o servidor o recusa, para não insistir num token morto. */
export function forgetAccess(orderId: string): void {
  const mapa = ler()
  if (!(orderId in mapa)) return
  delete mapa[orderId]
  gravar(mapa)
}
