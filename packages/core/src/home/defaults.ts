import type { HomeSection } from './types'

/**
 * A Home de hoje, como dado — **e ela tem dois papéis, não um**.
 *
 * 1. **A semente** (`HOME-04`): a migration insere estas sete linhas, e é isso que faz a página não
 *    mudar de aparência no dia da virada. O guarda `homeSections.test.ts` compara o `insert` do disco
 *    com esta constante, para as duas não divergirem em silêncio.
 * 2. **O piso** (`HOME-07`): quando a leitura das seções falha, a loja renderiza isto. Nunca página
 *    em branco — é o mesmo instinto do `mapCategory`, que faz `active` cair em `true`: sumir da
 *    vitrine é pior que aparecer.
 *
 * **Os `id` são o próprio tipo, e isso é deliberado.** Linha de verdade tem uuid; esta constante só
 * vira DOM quando o banco não respondeu, e nada daqui é gravado. Um id legível e estável também dá
 * desempate determinístico em `orderSections` (`position`, depois `id`), em vez de depender da ordem
 * do array.
 *
 * **Os literais são os do disco.** `defaults.test.ts` lê `HeroBanner`, `BrandStatement`,
 * `TrendingTags` e `NewsletterBanner` e confere cada string — sem isso a constante nasceria com um
 * texto quase igual, a Home semeada mostraria outra coisa, e nada acusaria.
 */
export const DEFAULT_HOME_COMPOSITION: readonly HomeSection[] = [
  {
    id: 'hero',
    type: 'hero',
    position: 1,
    active: true,
    config: {
      eyebrow: 'Joias afetivas artesanais',
      // Duas linhas e duas cores (`ink` e `primary`) — `HOME-16`. É o que dá o pico de contraste do
      // hero sem precisar de um terceiro tamanho de fonte.
      title_line1: 'O que você ama,',
      title_line2: 'eternizado em joia.',
      paragraph:
        'Peças feitas à mão em resina com o seu material — leite materno, cabelos, pelos de pet, dentinhos ou cinzas. Cada joia é única, porque cada história é.',
      cta_label: 'Explorar coleções',
      cta_href: '/busca',
    },
  },
  {
    id: 'trust_bar',
    type: 'trust_bar',
    position: 2,
    active: true,
    // Config vazia, e é `HOME-44`: os números da faixa de vantagens saem de `store_settings`, a mesma
    // fonte que o caixa cobra. Dar campo de texto aqui reintroduziria o defeito da `MarqueeBar`, que
    // prometia "Parcele em 12×" enquanto `max_installments` já era 6 — com a dona digitando o número
    // em vez do programador.
    config: {},
  },
  {
    id: 'banner_grid',
    type: 'banner_grid',
    position: 3,
    active: true,
    // `hero_pair` é a grade de hoje: um grande à esquerda e dois empilhados à direita.
    config: { layout: 'hero_pair' },
  },
  {
    id: 'collection_rows',
    type: 'collection_rows',
    position: 4,
    active: true,
    config: { limit: 4 },
  },
  {
    id: 'brand_statement',
    type: 'brand_statement',
    position: 5,
    active: true,
    config: {
      eyebrow: 'Feito à mão, uma por vez',
      title: 'Cada joia é uma memória eternizada à mão',
      paragraph:
        'Trabalhamos com leite materno, cinzas de cremação, coto umbilical, cabelo, pelo de pet, dente de leite e flores para criar peças únicas em resina, prata 925 e aço inoxidável. Nada é produzido em série: cada história que chega até o ateliê vira uma peça só sua.',
      author_name: 'Adri Muniz',
      author_role: 'artesã · Porto Alegre/RS',
      link_label: 'Conheça o ateliê',
      link_href: '/sobre',
      // Entra DENTRO das fileiras, depois da de índice 0 — onde a Home de hoje a põe. No rodapé ela
      // viraria texto de rodapé, que ninguém lê.
      interlude_after: 0,
    },
  },
  {
    id: 'trending_tags',
    type: 'trending_tags',
    position: 6,
    active: true,
    config: {
      title: 'Explore por tema',
      subtitle: 'As linhas mais procuradas, direto ao ponto',
      // Acima de 12 a nuvem de chips vira parede.
      limit: 12,
    },
  },
  {
    id: 'newsletter',
    type: 'newsletter',
    position: 7,
    active: true,
    config: {
      title: 'Quer saber das novidades?',
      subtitle: 'Cadastre-se e fique por dentro das novidades da loja.',
      cta_label: 'Me cadastrar',
    },
  },
]
