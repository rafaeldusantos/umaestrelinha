# HomePage v3 — Pop Culture Redesign — Specification

## Problem Statement

A HomePage atual (v2) tem estética lavanda/cool que não transmite a energia vibrante da cultura pop. O redesign v3 traz uma paleta warm cream, tipografia display (Lilita One), e novas seções de social proof e tags temáticos para aumentar engajamento e conversão.

## Goals

- [ ] Implementar design system v3 globalmente (cores, fontes, gradientes)
- [ ] Redesenhar todas as seções da HomePage conforme Paper v3
- [ ] Adicionar 2 novas seções: Trending Tags e Social Proof
- [ ] Manter responsividade mobile-first conforme artboard mobile v3
- [ ] Preservar funcionalidades existentes (data fetching, navegação, cart)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Redesign de páginas internas (PDP, Category, Checkout) | Serão features separadas |
| Header/Footer redesign | Serão features separadas, embora tokens globais já afetem |
| Dark mode v3 | Será ajustado em feature separada após tokens light estabilizarem |
| Backend changes | Nenhuma mudança de API necessária |

---

## User Stories

### P1: Design System v3 — Tokens Globais ⭐ MVP

**User Story**: Como usuário, quero que a loja tenha a nova identidade visual warm/pop culture para que a experiência seja vibrante e coerente.

**Why P1**: Base para todos os componentes — sem tokens, nada funciona.

**Acceptance Criteria**:

1. WHEN a página carrega THEN background SHALL ser `#FFF9F5` (warm cream)
2. WHEN texto primário renderiza THEN cor SHALL ser `#1A0F2E`
3. WHEN heading display renderiza THEN font SHALL ser `Lilita One`
4. WHEN heading de seção renderiza THEN font SHALL ser `Lilita One` com 26px
5. WHEN gradiente CTA renderiza THEN SHALL usar novo gradiente pink→purple
6. WHEN bordas renderizam THEN cor SHALL ser `#F0EAF5`

**Independent Test**: Abrir qualquer página — fundo warm cream, fontes corretas, cores atualizadas.

---

### P1: Hero Banner Redesign ⭐ MVP

**User Story**: Como visitante, quero ver um hero impactante com tipografia display e imagens de produto para entender imediatamente o que a loja vende.

**Why P1**: Primeiro ponto de contato — define primeira impressão.

**Acceptance Criteria**:

1. WHEN hero renderiza THEN layout SHALL ser split (texto esquerda, imagens direita)
2. WHEN título renderiza THEN SHALL exibir "Cole no peito," (dark) + "carrega no" (pink) + "coração." (purple) em Lilita One 64px
3. WHEN mobile THEN layout SHALL empilhar verticalmente
4. WHEN CTA primário clicado THEN SHALL navegar para coleções
5. WHEN CTA secundário clicado THEN SHALL navegar para "Crie o Seu"
6. WHEN social proof renderiza THEN SHALL mostrar avatares + "+2.000 colecionadores felizes"

**Independent Test**: Visitar `/` — hero com texto multicolorido, 2 CTAs, grid de imagens.

---

### P1: Marquee Trust Bar ⭐ MVP

**User Story**: Como visitante, quero ver benefícios da loja em barra animada para construir confiança rapidamente.

**Why P1**: Substitui TrustBar estática — melhora percepção de confiança.

**Acceptance Criteria**:

1. WHEN barra renderiza THEN background SHALL ser `#1A0F2E` (dark)
2. WHEN barra renderiza THEN texto SHALL ser branco com ✦ separadores
3. WHEN barra está visível THEN itens SHALL animar em marquee contínuo
4. WHEN mobile THEN barra SHALL manter mesmo comportamento marquee

**Independent Test**: Barra escura abaixo do hero com texto scrollando horizontalmente.

---

### P1: Drop + Categories Combinados ⭐ MVP

**User Story**: Como visitante, quero ver o countdown do próximo drop ao lado das categorias para navegar rapidamente.

**Why P1**: Seções core de navegação e urgência.

**Acceptance Criteria**:

1. WHEN desktop THEN drop countdown e categories SHALL renderizar lado a lado
2. WHEN mobile THEN SHALL empilhar verticalmente (drop primeiro, depois categories)
3. WHEN countdown renderiza THEN card SHALL ter gradient escuro com timer
4. WHEN category cards renderizam THEN SHALL ter gradient colorido com nome e contagem
5. WHEN "Ver todas →" clicado THEN SHALL navegar para lista de categorias

**Independent Test**: Seção com countdown à esquerda e grid 3×2 de categorias à direita.

---

### P1: Product Sections (Trending + Fan Picks) ⭐ MVP

**User Story**: Como visitante, quero ver produtos em destaque com carrossel e badges para descobrir novidades.

**Why P1**: Core de discovery de produtos.

**Acceptance Criteria**:

1. WHEN "Tá Bombando" renderiza THEN título SHALL ter badge "HOT" em pink
2. WHEN product card renderiza THEN SHALL mostrar imagem, categoria, nome, preço, botão add
3. WHEN produto é novo THEN SHALL exibir badge "NEW"
4. WHEN "A Galera Ama" renderiza THEN título SHALL ter 5 estrelas
5. WHEN setas de navegação clicadas THEN carrossel SHALL scrollar suavemente
6. WHEN mobile THEN cards SHALL ter scroll horizontal snap

**Independent Test**: Duas seções de produtos com carrossel, badges, e setas.

---

### P1: Monte Seu Kit Redesign ⭐ MVP

**User Story**: Como visitante, quero ver os preços de kit em cards visuais para entender a economia.

**Why P1**: Principal driver de AOV (average order value).

**Acceptance Criteria**:

1. WHEN seção renderiza THEN SHALL mostrar 3 tier cards (3/5/10 bottons)
2. WHEN tier 5 renderiza THEN SHALL ter badge "MAIS POPULAR" amarelo e gradiente roxo
3. WHEN preço por unidade renderiza THEN SHALL mostrar valor (R$ 5,00/un, R$ 4,60/un, R$ 4,20/un)
4. WHEN "Montar Kit" clicado THEN SHALL navegar para kit builder
5. WHEN mobile THEN layout SHALL ser horizontal scrollável ou compacto

**Independent Test**: 3 cards de preço com destaque no tier 5.

---

### P2: Trending Tags

**User Story**: Como visitante, quero explorar por temas/hashtags para descobrir produtos do meu fandom.

**Why P2**: Engajamento adicional, não bloqueia compra.

**Acceptance Criteria**:

1. WHEN seção renderiza THEN SHALL mostrar "Explore por Tema" com pills de tags
2. WHEN tag clicada THEN SHALL navegar para busca com tag como query
3. WHEN desktop THEN SHALL renderizar ao lado de Social Proof
4. WHEN mobile THEN SHALL renderizar acima de Social Proof

**Independent Test**: Grid de pills clicáveis com hashtags temáticas.

---

### P2: Social Proof

**User Story**: Como visitante, quero ver depoimentos de clientes para ganhar confiança na compra.

**Why P2**: Complementa confiança, não bloqueia flow principal.

**Acceptance Criteria**:

1. WHEN seção renderiza THEN SHALL mostrar "O que a galera diz" com contagem
2. WHEN testimonial renderiza THEN SHALL mostrar estrelas, citação, avatar, nome e cidade
3. WHEN desktop THEN SHALL renderizar ao lado de Trending Tags
4. WHEN mobile THEN SHALL renderizar abaixo de Trending Tags em stack

**Independent Test**: Cards de depoimento com avatar e estrelas.

---

### P2: Newsletter CTA Redesign

**User Story**: Como visitante, quero entender claramente o benefício de assinar a newsletter.

**Why P2**: Importante para retenção mas não bloqueia compra.

**Acceptance Criteria**:

1. WHEN seção renderiza THEN SHALL ter card com gradient violet→pink
2. WHEN "10% OFF" renderiza THEN SHALL ser destaque visual prominente
3. WHEN email submetido THEN SHALL mostrar confirmação
4. WHEN mobile THEN layout SHALL adaptar verticalmente

**Independent Test**: Card gradient com destaque "10% OFF" e form de email.
