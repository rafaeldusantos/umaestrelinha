/**
 * O que aparece enquanto o chunk da rota baixa — `PRF-10`.
 *
 * **Não pode deslocar layout.** Um spinner centralizado, ou nada, faria o rodapé subir até o topo e
 * descer de volta quando a página chegasse: no celular isso é a página inteira pulando. O que este
 * componente faz é **reservar altura**, e só.
 *
 * `min-h-[60vh]` é a mesma faixa que a página vazia da loja já ocupa entre o header e o rodapé, e
 * `aria-busy` é o que o `ProductPage` já usa enquanto a consulta corre — leitor de tela ouve "ocupado"
 * em vez de "vazio".
 *
 * Sem texto de propósito: "carregando" apareceria e sumiria em 40 ms numa rede boa, e piscar palavra
 * numa loja memorial é ruído.
 */
const RouteFallback = () => <div aria-busy="true" className="min-h-[60vh]" />

export default RouteFallback
