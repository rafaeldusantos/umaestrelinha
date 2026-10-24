import { useSyncExternalStore } from 'react'

/**
 * A confirmação depois de uma ação (feature `75`, `MAA-02`, A11; design §3.6/§3.7).
 *
 * UMA confirmação por vez, em módulo: o host único (o componente `AvisoDaAcao`, no layout) a desenha mesmo depois
 * de o cartão que a pediu sair da lista. `mostrarAviso` SUBSTITUI a anterior — e a `chave` nova (um
 * contador) é o que faz o host reiniciar o prazo de 5 s (TQ9) mesmo com o mesmo texto.
 *
 * O texto vem PRONTO de `actionConfirmation` (`@estrelinha/core/orders`): o app não escreve frase de
 * confirmação (`fraseDaAcaoSoNoCore`, §8.4).
 */
export interface AvisoMostrado {
  titulo: string
  frase: string
  /** Muda a cada `mostrarAviso` — a mesma frase duas vezes ainda é um aviso NOVO. */
  chave: number
}

let atual: AvisoMostrado | null = null
let contador = 0
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())
const assinar = (f: () => void) => {
  ouvintes.add(f)
  return () => {
    ouvintes.delete(f)
  }
}

export const mostrarAviso = (aviso: { titulo: string; frase: string }): void => {
  contador += 1
  atual = { titulo: aviso.titulo, frase: aviso.frase, chave: contador }
  avisar()
}

/** Tira o aviso. Com `chave`, só tira se ainda for AQUELE aviso (o prazo de um velho não apaga um novo). */
export const limparAviso = (chave?: number): void => {
  if (atual === null) return
  if (chave !== undefined && atual.chave !== chave) return
  atual = null
  avisar()
}

export const useAviso = (): AvisoMostrado | null => useSyncExternalStore(assinar, () => atual)

/** Tira o aviso sem condição (troca de conta, testes). */
export const esquecerAvisos = (): void => limparAviso()
