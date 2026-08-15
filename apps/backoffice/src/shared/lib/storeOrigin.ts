// A loja, vista do painel — **um leitor só de `VITE_STORE_URL`** (feature 25).
//
// A env já era lida em `features/product-form/lib/storeUrl.ts`, para o link "Abrir ↗" do produto. A
// prévia real precisa dela também, e para uma coisa diferente: a **origem** exata, que é o
// `targetOrigin` do `postMessage` do rascunho. Dois `import.meta.env.VITE_STORE_URL` em arquivos
// diferentes seriam dois leitores do mesmo valor — e o dia em que um deles ganhasse normalização
// (barra final, protocolo ausente) e o outro não, os dois discordariam sem nada quebrar.
//
// Mora em `shared/` porque duas features a consomem, e `features/` não importa de `features/`.

/** A loja em que o painel toca. Sem env, `undefined` — e cada consumidor decide o que fazer. */
export const STORE_URL: string | undefined = import.meta.env.VITE_STORE_URL

/**
 * A origem da loja — `https://host[:porta]`, sem caminho.
 *
 * É o que vai como `targetOrigin` do `postMessage` (`PRV-07`). **Nunca `'*'`**: o rascunho leva
 * conteúdo que a dona ainda não publicou, e `'*'` o entregaria a qualquer documento que tivesse
 * conseguido tomar o lugar do iframe.
 *
 * Devolve `null` — e não lança — quando a env falta ou é lixo: o painel precisa **continuar
 * funcionando** sem a loja configurada, mostrando o estado vazio declarado (`PRV-17`). Uma exceção
 * aqui derrubaria a tela inteira de `/admin/home` por causa de uma variável de ambiente.
 */
export const storeOrigin = (base = STORE_URL): string | null => {
  if (!base) return null
  try {
    return new URL(base).origin
  } catch {
    return null
  }
}
