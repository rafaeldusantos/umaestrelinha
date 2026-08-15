import { useHomeSections } from '@/entities/home'
import { HomeRenderer } from '@/widgets/home-renderer'

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
 */
const HomePage = () => {
  // `useHomeSections` nunca devolve vazio por acidente: erro, lista vazia e o instante antes da
  // resposta caem todos em `DEFAULT_HOME_COMPOSITION` (`HOME-07`). O `?? []` é só a formalidade do
  // tipo — a Home em branco é o estado que aquele piso existe para tornar impossível.
  const { data: sections } = useHomeSections()

  return <HomeRenderer sections={sections ?? []} />
}

export default HomePage
