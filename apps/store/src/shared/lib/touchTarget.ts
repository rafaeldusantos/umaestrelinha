/**
 * Alvo de toque de 44×44 — `IDN-10`.
 *
 * O `CLAUDE.md` lista "alvo de toque abaixo de 44px" entre as cinco coisas que
 * quebram primeiro no celular, e ~90% dos acessos da loja vêm de lá. O problema
 * é que **44px raramente é o tamanho que o desenho pede**: um disco de ícone da
 * board tem 36 ou 38, um chip de filtro tem 24 de altura, e um link de rodapé
 * tem a altura da própria linha.
 *
 * Em vez de inflar o desenho, o alvo cresce por **pseudo-elemento**: a caixa
 * pintada continua com o tamanho da board e o retângulo que recebe o toque tem
 * 44×44. É o mesmo recurso que o `Header` já usava nos ícones da faixa escura,
 * promovido a constante porque agora ele vale para a loja inteira — e dois
 * lugares declarando a mesma medida é como uma delas fica para trás.
 *
 * **`TAP_44` é para controle centrado** (ícone em disco, botão quadrado): o
 * pseudo é ancorado no centro e vale nas duas direções.
 *
 * **`TAP_ROW` é para texto em fluxo** (link de rodapé, trilha, "Ver todos"): o
 * pseudo cobre a linha inteira do rótulo, esticando só na vertical — um
 * quadrado de 44 centrado num link de 130px não cobriria as pontas.
 *
 * Os dois exigem `position: relative` no elemento, que já vem no par de classes.
 * O `pointer-events` não muda: o pseudo é filho do próprio controle, então o
 * clique nele é clique nele.
 */

/** Alvo de 44×44 centrado, para ícone e botão pequeno. */
export const TAP_44 =
  "relative before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']"

/** Alvo de 44px de altura na largura do próprio rótulo, para texto em fluxo. */
export const TAP_ROW =
  "relative inline-flex items-center before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']"
