import { QueryClient } from '@tanstack/react-query'

/**
 * O `QueryClient` da loja — `PRF-07`.
 *
 * Mora em arquivo próprio, e não dentro do `App.tsx`, por uma razão só: para ser mensurável. O
 * `App.tsx` importa as catorze páginas da loja, e um teste que quisesse conferir uma opção de cache
 * teria de montar o aplicativo inteiro (e dublar meia dúzia de hooks de dado) para ler um número.
 *
 * ---------------------------------------------------------------------------------------------
 * POR QUE 5 MINUTOS, E POR QUE ISTO NÃO ERA O PADRÃO
 * ---------------------------------------------------------------------------------------------
 * O padrão do React Query é `staleTime: 0`: **toda** consulta é considerada velha assim que
 * responde. Voltar da home para uma categoria já visitada refazia a consulta inteira — e a da
 * categoria custava 307 KB comprimidos, medidos em 2026-09-05. O dado não muda em segundos: o
 * catálogo é editado por uma pessoa, algumas vezes por semana.
 *
 * Cinco minutos não é número escolhido agora: é o que `store_settings` e `usePromotions` já
 * praticavam desde antes desta feature, cada um declarando o seu. Este padrão os alcança, em vez de
 * inventar um terceiro valor — e `PROMOTIONS_STALE_TIME` continua sendo o dono do valor daquela
 * consulta, porque lá ele tem uma razão própria (o total do carrinho sai daquela lista).
 *
 * **Consulta que declara `staleTime` próprio continua mandando**: o React Query resolve opção por
 * opção, e a da chamada vence a do cliente. É o que preserva quem já tinha decidido.
 *
 * Só `queries`. Mutação não tem cache a herdar, e declarar default para ela seria dizer algo que
 * este arquivo não tem como sustentar.
 */
export const STORE_STALE_TIME = 1000 * 60 * 5

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STORE_STALE_TIME,
      },
    },
  })
