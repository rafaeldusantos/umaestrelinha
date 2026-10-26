/**
 * O conteúdo provisório de uma aba (feature 72, `MAF-18`): o título e uma frase. Nenhum número, nome
 * ou pedido de exemplo — dado fictício num painel de verdade se lê como dado. Cada feature `73`–`78`
 * substitui o de uma aba.
 */
const EmConstrucao = ({ titulo }: { titulo: string }) => (
  <section className="space-y-2">
    <h1 className="text-2xl">{titulo}</h1>
    <p className="text-sm text-estrelinha-ink-soft">Esta parte do app chega em breve.</p>
  </section>
)

export default EmConstrucao
