import { useSyncExternalStore } from 'react'

/**
 * "Uma nova tentativa de conferir o acesso está em curso?" — fora do React de propósito.
 *
 * O "Tentar de novo" põe o `loading` do `AuthProvider` em `true`, e o `RequireAdmin` troca a tela
 * pelo `fallback` enquanto isso. A tela que tinha o botão desmonta, e um estado local morreria com
 * ela: era o paper cut do reteste de QA da `72` (a splash por 7 a 8 s, e o "Conferindo…" nunca
 * aparecia). Com a marca aqui, o fallback sabe que é uma nova tentativa, e não a abertura, e desenha
 * a mesma tela com o botão ocupado.
 */
let emCurso = false
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())

export const tentarDeNovo = async (refazer: () => Promise<void>) => {
  if (emCurso) return
  emCurso = true
  avisar()
  try {
    await refazer()
  } finally {
    emCurso = false
    avisar()
  }
}

export const useTentativaEmCurso = () =>
  useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => emCurso,
  )
