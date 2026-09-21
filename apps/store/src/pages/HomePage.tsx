import { useHomePreview, useHomeSections } from '@/entities/home'
import { HomeRenderer, HomeSkeleton } from '@/widgets/home-renderer'
import { PREVIEW_SECTION_ATTR } from '@estrelinha/core/home'

/**
 * A home — e a partir da feature 24 ela **não conhece seção nenhuma**.
 *
 * A composição (quais seções existem, em que ordem, com que texto e com que limite) era a ordem do
 * JSX deste arquivo. Agora é dado: `home_sections` no banco, `DEFAULT_HOME_COMPOSITION` como piso
 * quando a leitura falha (`HOME-07`), e o registro `tipo → componente` do `HomeRenderer` como
 * desenho. Reordenar a home passa a ser arrastar em `/admin/home`, sem deploy.
 *
 * **O que a página já não decide, e é o ponto da feature:** quais coleções aparecem, quais banners,
 * quantos chips, onde a faixa institucional entra. Nada disso está escrito aqui — e o que prova que
 * a virada não mudou a página é `homeComposition.test.tsx`, que assere o **DOM renderizado**,
 * literal a literal, contra a Home de antes.
 *
 * A derivação de sempre continua viva: seção sem curadoria mostra as raízes por `sort_order`, a arte
 * de quem tem `banner_url` e os números de `store_settings` — o que a feature moveu foi a
 * composição, não a fonte do conteúdo.
 *
 * **Feature 25 — o modo prévia.** Dentro do iframe de `/admin/home` a mesma página desenha o rascunho
 * que o painel manda, em vez do que está no banco. É o que faz a prévia do painel ser a loja de
 * verdade em vez de um segundo desenho da Home: uma fonte diferente, o mesmo renderizador.
 */
const HomePage = () => {
  const { preview, sections: rascunho, highlightId, selectSection } = useHomePreview()

  // Em modo prévia a consulta é **desligada**, não filtrada depois (`PRV-02`): uma leitura viva em
  // paralelo daria à página duas fontes para a mesma pergunta, e a do banco chegaria depois,
  // sobrescrevendo o que a dona está digitando.
  //
  // **São TRÊS estados, e o terceiro nasceu de um defeito.** Erro de leitura e lista vazia caem em
  // `DEFAULT_HOME_COMPOSITION` (`HOME-07`, que fala de leitura que **falha**); o instante ANTES da
  // resposta cai no esqueleto. Até 2026-09-21 ele caía no piso também, por um `placeholderData` no
  // hook — e como a feature `41` tirou do banco a premissa que sustentava aquele piso (o hero
  // deixou de ser indelével, `AD-029`), a loja passou a **afirmar uma composição que ela não sabe
  // ser verdadeira**: com a "Chamada principal" desligada, a cliente a via por ~1s antes do
  // "Banner principal". O `?? []` é só a formalidade do tipo.
  //
  // **`isLoading`, nunca `isPending`** — a regra do módulo, que a `CategoryPage` e as fileiras da
  // home já seguem. **E aqui ela NÃO tem dente, o que precisa estar escrito**: o ramo da prévia
  // devolve antes de o esqueleto ser alcançado, então hoje as duas leituras se comportam igual e
  // **nenhum teste as distingue** — medido por mutação em 2026-09-21, e o mutante sobreviveu.
  // `isLoading` fica porque é a leitura que continua certa se a ordem dos ramos mudar: ela é
  // `isPending && isFetching`, e com `enabled: false` o `isPending` é verdadeiro para sempre —
  // o esqueleto nunca sairia da prévia. Afirmar sensibilidade que não existe encerra a
  // investigação de quem vier depois, e por isso o limite está declarado em vez de sugerido.
  const { data: sections, isLoading } = useHomeSections({ enabled: !preview })

  if (!preview) return isLoading ? <HomeSkeleton /> : <HomeRenderer sections={sections ?? []} />

  return (
    <div
      data-testid="home-previa"
      // **Captura, e não bolha.** O `<Link>` do router navega no handler dele; só a fase de captura
      // chega antes. Sem isto, clicar num produto na prévia tiraria o iframe da home — e a dona
      // perderia a tela que estava conferindo, sem entender por quê.
      onClickCapture={evento => {
        evento.preventDefault()
        evento.stopPropagation()
        const alvo = (evento.target as Element | null)?.closest?.(`[${PREVIEW_SECTION_ATTR}]`)
        const id = alvo?.getAttribute(PREVIEW_SECTION_ATTR)
        if (id) selectSection(id)
      }}
    >
      {/* `rascunho` começa `[]`, e `[]` aqui é "ainda não chegou" — não "Home vazia". O piso semeado
          não entra neste caminho: ele existe para erro de leitura, e em modo prévia não há leitura. */}
      <HomeRenderer sections={rascunho} preview={{ highlightId }} />
    </div>
  )
}

export default HomePage
