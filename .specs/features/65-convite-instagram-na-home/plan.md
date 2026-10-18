# 65 · Convite para o Instagram na Home

Costura de 2026-10-17. Rota rápida — um comportamento novo de tela numa unidade só (`apps/store`), sem contrato público, sem migration e sem regra de negócio além da que o card declara ("primeira visita, uma vez só").

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Convenção de cada repositório: o arquivo de instruções dele.

## Diagnóstico

Passa a existir um convite, por cima da Home, para conhecer o trabalho da Adri e seguir o perfil no Instagram. Hoje a loja só aponta para o Instagram no rodapé (`apps/store/src/widgets/footer/ui/InstagramStrip.tsx:4-5` › `INSTAGRAM_HANDLE`, `INSTAGRAM_URL`, consumidos em `widgets/footer/ui/Footer.tsx:15` e `:47`). Nenhum modal existe na Home (`pages/HomePage.tsx:58-60` monta só o esqueleto ou o renderizador).

Cabe sem `spec.md` aprovado à parte porque é uma sobreposição de uma tela só, com copy e desenho já fechados no Paper, persistida em `localStorage` do navegador — sem banco, sem painel, sem rota nova.

## Comportamentos

| # | O que precisa passar a ser verdade |
|---|---|
| C-01 | Na primeira visita à Home, aparece um convite para conhecer o trabalho e seguir a Uma Estrelinha no Instagram — folha presa ao rodapé no celular, cartão central de 480px no computador, sobre um véu que escurece a Home. |
| C-02 | O convite aparece uma vez só por navegador: depois de aberto uma vez, não volta nas visitas seguintes, nem ao recarregar. Sem `localStorage` disponível (aba privada, bloqueio), nada quebra e o convite não se repete na mesma sessão. |
| C-03 | O botão "Ver o perfil no Instagram" abre https://www.instagram.com/umaestrelinha.adri numa nova aba (`target="_blank"`, `rel` com `noopener`) e fecha o convite. |
| C-04 | O convite fecha pelo X, por "Agora não", pela tecla Esc e pelo toque no véu. X, "Agora não" e o botão primário têm alvo de toque ≥44px. O diálogo tem nome acessível (o título) e descrição (o texto), e o foco entra nele ao abrir. |
| C-05 | O convite mostra, literalmente: o rótulo "NO INSTAGRAM" com o ícone colorido do Instagram, o título "Acompanhe de perto o meu trabalho", o texto "Lá eu mostro cada joia sendo feita, do material que chega até a peça pronta. Se quiser acompanhar, vai ser um carinho ter você por lá.", o "@umaestrelinha.adri" com o avatar no anel de story e a linha "Adri Muniz · joias afetivas", e as duas ações. |
| C-06 | O convite não aparece fora da Home, nem na prévia da Home do painel (modo prévia / iframe). |
| C-07 | O convite não atrapalha o carregamento da Home nem briga com outros avisos: só abre depois de a Home resolver (fora do esqueleto), só quando o aviso de cookies não está pendente, e não entra no chunk inicial da Home. |
| C-08 | V2 (aprovado em 2026-10-18): a identidade do Instagram aparece em três pontos e só neles — o ícone colorido no rótulo, o anel de story no avatar e o botão "Ver o perfil no Instagram" com o gradiente magenta → roxo → azul e texto branco. O texto branco passa de 4,5:1 contra cada cor do gradiente do botão. Título, texto, fundo e "Agora não" seguem da loja. |

## Fora do escopo

- As três fotos da prévia do perfil (ver pergunta 3): não há asset, e o desenho as traz como placeholder.
- Ler o handle de `store_settings.general.instagram`, que o painel edita e a loja não lê (ver pergunta 2).
- Evento GA4 de clique no convite. A medição otimizada do GA4 já conta clique de saída (`shared/lib/analytics/index.ts:163-164`).
- Arrastar a folha para fechar.
- Qualquer alteração em `packages/ui` (véu, `DialogContent`).
- O convite fora da Home, ou em qualquer outra plataforma (e-mail, conta).

## Design

Fontes: Paper por feature (tipo `paper`, MCP) — arquivo "Uma Estrelinha", página "Home · Convite para o Instagram", artboards **"IG A V2 · Loja 390 — com identidade do Instagram"** e **"IG B V2 · Loja 1440 — com identidade do Instagram"** (aprovados em 2026-10-18; as V1 "IG A · Loja 390 — convite em folha" e "IG B · Loja 1440 — convite em cartão central" ficam ao lado, como histórico). A "Home ao fundo" das duas artboards é placeholder de contexto.

### Convite para o Instagram (390 e 1440) → C-01, C-03, C-04, C-05, C-08

Mesmo conteúdo, mesma ordem, nas duas larguras:

1. **Véu** cobrindo a Home inteira (inclusive o header), em `ink` a 55%.
2. **Contêiner** — em 390, folha presa à borda de baixo, largura toda, raio 20 só no topo, padding 12/24/32, gap 24, sombra soft para cima; em 1440 (a partir de `md`), cartão de 480px centralizado nos dois eixos, raio 20 em todos os cantos, padding 40, sombra `shadow-estrelinha-lift`.
3. **Puxador** — traço de 40×4, `line`, raio pílula, centralizado no topo. Só na folha do celular.
4. **X** — canto superior direito, alvo 44×44, ícone 20px em traço `ink`.
5. **Bloco de texto** (com folga à direita para não colidir com o X): rótulo "NO INSTAGRAM" Outfit 12px medium, tracking 0.18em, `ink-soft`, precedido do **ícone do Instagram** de 28px com o gradiente oficial (V2 — antes, um fio `accent` de 24×1); título Libre Baskerville 700, 28/34 no celular e 32/40 no computador, tracking −0.02em, `ink`, em duas linhas ("…de perto / o meu trabalho"); corpo Outfit 17/27 `ink-soft`.
6. **Prévia do perfil** — no desenho, três quadrados de foto (106px em 390, ~124px em 1440, raio 6, gap 8) e, abaixo, "@umaestrelinha.adri" Outfit 14 medium `ink`. **Por premissa (pergunta 3), as fotos não entram — e desde 2026-10-18 também saíram das artboards V2, que deixaram de desenhá-las.** V2: o @ sobe para uma linha de perfil — avatar de 48px no anel de story (gradiente oficial a 45°), "@umaestrelinha.adri" Outfit 15 semibold `ink` e "Adri Muniz · joias afetivas" Outfit 14 `ink-soft`. Dentro do anel vai o símbolo da loja (pergunta 10).
7. **Ações** — botão primário de largura toda, 52px, raio 6, V2: **gradiente do Instagram** `#C13584 → #833AB4 → #405DE6` com texto branco (antes, `primary` com texto `on-primary`), Outfit 17 medium e ícone do Instagram em traço à esquerda: "Ver o perfil no Instagram". Abaixo, "Agora não", texto `primary` 15 medium, centralizado, área de 44px.

Estados: só o aberto está desenhado. Entrada/saída, foco, Esc, véu, momento de entrada e o tamanho intermediário (768/1024) não estão no desenho e são resolvidos por premissa (perguntas 4–8). A folha vira cartão no breakpoint `md` (768), como `CookiePreferencesSheet`.

## Código — apps/store

- **Instruções** — `CLAUDE.md` (raiz) › Convenções que valem em todo o repositório (mobile primeiro; chaves de `localStorage`), › Os guardas — o que trava o quê, › Baselines — o gate de qualquer feature, › O "defeito 01", › Feature-Sliced Design; `apps/store/CLAUDE.md` › Design system, › Mobile — o que quebra e não grita, › Ícones e marca, › A home não salta enquanto carrega (feature 40), › A Home é dado (feature 24), › Modo prévia (feature 25), › Carrinho, chrome e checkout; `DESIGN.md` (inteiro); `packages/ui/CLAUDE.md` (inteiro).
- **Recorte** — C-01, C-02, C-03, C-04, C-05, C-06, C-07, C-08.
- **O que já serve**
  - Detecção de prévia na Home: `pages/HomePage.tsx:30` (`useHomePreview()` › `preview`), regra em `entities/home/model/useHomePreview.ts:44` (`isPreviewWindow`).
  - Home resolvida: `pages/HomePage.tsx:58-60` (`isLoading` → `HomeSkeleton`).
  - Persistência com `try/catch` e chave `estrelinha-*`: `entities/cookie-consent/model/cookieConsentStore.ts:19-49` (`ler`/`gravar`; o comentário de `:12-14` explica por que não usar o `persist` do zustand).
  - Estado do aviso de cookies (zustand, assinável): `entities/cookie-consent/model/cookieConsentStore.ts`; o aviso é portal `z-50` em `widgets/cookie-notice/ui/CookieNotice.tsx:59`.
  - Folha que vira cartão em `md`, com X próprio, puxador, `SheetTitle`/`SheetDescription`: `widgets/cookie-notice/ui/CookiePreferencesSheet.tsx:57-76`, sobre `@estrelinha/ui/sheet` (`packages/ui/src/sheet.tsx:57-71` › `SheetContent side="bottom" hideClose`; `SheetPortal` e `SheetOverlay` exportados em `sheet.tsx:104-115`).
  - Botão com piso de 44px: `shared/ui/Button.tsx`. Alvos: `shared/lib/touchTarget` › `TAP_44`, `TAP_ROW`.
  - Ícone: `lucide-react` › `Instagram`, já em `widgets/footer/ui/Footer.tsx:2` e `InstagramStrip.tsx:1`.
  - Tokens: `tailwind.config.ts:110-116` (raios), `:122` (`shadow-estrelinha-lift`), `:37-39` (`font-display`, `font-body`).
  - Overlay preguiçoso fora do chunk inicial: `widgets/store-layout/ui/StoreLayout.tsx:27-43` (`lazy` + latch `useAbertoAlgumaVez`).
- **O que muda**
  - `widgets/footer/ui/InstagramStrip.tsx:4-5` — `INSTAGRAM_HANDLE` e `INSTAGRAM_URL` saem do widget para uma camada abaixo (`shared/config/instagram.ts`, premissa da pergunta 2), e footer e convite importam de lá. Um segundo widget lendo do footer seria import lateral (`CLAUDE.md › Feature-Sliced Design`, `AD-033`). A URL passa a `https://www.instagram.com/umaestrelinha.adri` (pergunta 1).
  - `widgets/footer/ui/__tests__/Footer.test.tsx:93` — assere a URL sem `www`; passa a assertar a nova.
  - `pages/HomePage.tsx` — monta o convite (preguiçoso) no ramo `!preview`, depois de `isLoading` virar falso. É sobreposição, não seção: a regra "a Home não conhece seção nenhuma" (`HomePage.tsx:9`) continua valendo para o renderizador (pergunta 6).
  - `CLAUDE.md` › Convenções… › "Chaves em uso hoje" — acrescentar `estrelinha-instagram-invite`; `apps/store/CLAUDE.md` — uma seção curta sobre o convite.
- **O que nasce**
  - `widgets/instagram-invite/` (`ui/`, `model/`, `index.ts`), no molde de `widgets/cookie-notice`: o componente do convite e o "já visto" persistido em `estrelinha-instagram-invite`, com `ler`/`gravar` em `try/catch` e fallback em memória para a sessão.
  - `shared/config/instagram.ts` com o handle e a URL.
- **Exemplares**
  - Folha que vira cartão: `widgets/cookie-notice/ui/CookiePreferencesSheet.tsx:57-76`.
  - Persistência: `entities/cookie-consent/model/cookieConsentStore.ts:19-49`.
  - Overlay preguiçoso: `widgets/store-layout/ui/StoreLayout.tsx:27-43`, `:95-100`.
  - Link externo com o ícone: `widgets/footer/ui/InstagramStrip.tsx:19-33`.
  - Testes do aviso: `widgets/cookie-notice/ui/__tests__/CookieNotice.test.tsx`; persistência com storage que lança: `cookieConsentStore.test.ts`.
  - Simular prévia (iframe + `?preview=1`): `pages/__tests__/homePreview.test.tsx:43-77`.
- **Obrigações transversais**
  - `touchTarget.test.ts`: o X é `h-11 w-11` direto; "Agora não" com `TAP_ROW`.
  - `alvoDeToqueNaoRoubaPosicao.test.ts`: nunca `TAP_44`/`TAP_ROW` junto com `absolute` (o `relative` apaga a posição). O X posicionado usa `h-11 w-11` sem auxiliar, ou fica em fluxo como em `CookiePreferencesSheet.tsx:65-76`.
  - `accentText.test.ts`: o fio é `bg-estrelinha-accent`, nunca texto ouro.
  - `buttonShape.test.ts`: as ações em `rounded-sm`.
  - `arbitraryTextColor.test.ts`: só tokens de cor. O véu é `bg-estrelinha-ink/55` (fundo, não texto).
  - `toasterUnico.test.ts`: nada de `useToast`/`<Toaster>`.
  - `brandScan.test.ts`: nenhuma ocorrência da marca anterior, nem em fixture.
  - `homeComposition.test.tsx` não pode ser editado (`:20-21`) e renderiza a `HomePage` real com consultas por papel: o convite aberto poria `aria-hidden` no resto. Nesse arquivo o aviso de cookies está pendente (store vazio), e a premissa da pergunta 4 mantém o convite fechado. Isso tem de continuar verdadeiro **sem editar** o arquivo.
  - `homePreview.test.tsx`: o dublê de `useStoreSettings` não fornece `useGeneralSettings`. O convite não lê settings (pergunta 2), e o arquivo segue verde.
  - Copy: sem exclamação, sem urgência, na primeira pessoa da Adri (conforme).
  - No fecho: remedir lint, tipos e a suíte do store contra as baselines do `CLAUDE.md`.
- **Testes** — no ponto do ajuste existem `Footer.test.tsx` (ajustar a URL), `homeComposition.test.tsx` (intocável, precisa seguir verde), `homePreview.test.tsx` (seguir verde) e `CookieNotice.test.tsx` (molde). Decisão: **ambos**, ajustar `Footer.test.tsx` e criar os testes do widget e da fiação. Unidade (jsdom):
  - abre na Home, com o storage vazio e sem aviso de cookies pendente, depois de a Home resolver;
  - não abre com a marca gravada; grava a marca ao abrir; não reabre ao remontar;
  - fecha pelo X, por "Agora não", por Esc e pelo véu;
  - o botão aponta para a URL com `www`, `target="_blank"` e `rel` com `noopener`, e fecha;
  - com `localStorage` lançando, não quebra e não reabre na mesma sessão;
  - nome acessível = título, descrição = texto, foco dentro;
  - copy literal (C-05);
  - não abre em modo prévia, não abre no esqueleto, não abre com o aviso de cookies pendente e abre quando ele é respondido;
  - fiação pela `HomePage` real, num arquivo próprio;
  - footer e convite leem a mesma constante.

  Navegador (fora da tarefa, registro do que jsdom não mede): a folha em 390×844 com `MobileNav`, bolha do WhatsApp e aviso de cookies; o cartão em 1440; nenhuma rolagem horizontal; LCP/CLS da Home com o convite.

## Fronteira entre unidades
nada

## Cobertura
| # | Reivindicado por |
|---|---|
| C-01 | apps/store |
| C-02 | apps/store |
| C-03 | apps/store |
| C-04 | apps/store |
| C-05 | apps/store |
| C-06 | apps/store |
| C-07 | apps/store |
| C-08 | apps/store |

## Perguntas e respostas
| # | A pergunta | A recomendação (premissa do plano) | A resposta |
|---|---|---|---|
| 1 | A URL do perfil: o card pede `https://www.instagram.com/umaestrelinha.adri`; o rodapé publica `https://instagram.com/…` (`InstagramStrip.tsx:5`, assertada em `Footer.test.tsx:93`). | Uma grafia só, a do card (`www`), para o rodapé e o convite. O rodapé muda junto e o teste dele é ajustado. | ratificada na aprovação |
| 2 | De onde vem o handle: da constante do rodapé ou de `store_settings.general.instagram`, que o painel edita e a loja não lê? | Da constante, movida para `shared/config/instagram.ts` e lida pelo rodapé e pelo convite. Ler a configuração é outra mudança (também do rodapé) e quebraria o dublê de `homePreview.test.tsx`. | ratificada na aprovação |
| 3 | As três fotos da prévia do perfil: o desenho as traz como placeholder, e não existe asset. | Não entram nesta feature: o convite mostra o @ sem a fileira de fotos. Placeholder não vai para produção, e um feed vivo exigiria a API do Instagram. Quando a Adri escolher três imagens, a fileira volta como ajuste. | ratificada na aprovação |
| 4 | O convite e o aviso de cookies disputam a primeira visita, os dois no rodapé do celular. | O convite só abre quando o aviso de cookies não está pendente. Assina o store do consentimento: respondido o aviso, o convite abre (se a pessoa ainda estiver na Home). | ratificada na aprovação |
| 5 | Quando o convite entra. | Depois de a Home resolver (fora do esqueleto) e de um atraso curto, de cerca de 3 s, para não disputar o LCP nem cobrir a Home no primeiro quadro. Carregado com `lazy`, fora do chunk inicial. | ratificada na aprovação |
| 6 | Onde ele é montado. | Na `HomePage`, no ramo `!preview`, como sobreposição. Não vira tipo de seção, o que exigiria migration no `check` de `home_sections`. | ratificada na aprovação |
| 7 | Primitivo e véu: o pacote fixa `bg-black/80`, e o `DialogContent` impõe um X padrão sem como removê-lo. | Um primitivo só, o `Sheet`: compor `SheetPortal` + `SheetOverlay className="bg-estrelinha-ink/55"` + o conteúdo, na forma de `CookiePreferencesSheet` (rodapé no celular, cartão centralizado a partir de `md`). `packages/ui` não muda. | ratificada na aprovação |
| 8 | O que conta como "visto". | Gravar a marca **ao abrir**: o convite aparece uma vez só, mesmo que a pessoa recarregue ou saia sem fechar. | ratificada na aprovação |
| 9 | O puxador da folha sugere arrastar. | Fica decorativo, como no `CookiePreferencesSheet`. Fecha por X, "Agora não", Esc e véu. Sem arrastar. | ratificada na aprovação |
| 10 | V2: o avatar do perfil — o desenho traz um círculo de foto, e não há foto da Adri no repositório. | O símbolo da loja (`EstrelinhaSymbol`) dentro do anel: é a arte que o board da marca indica para avatar, e foto inventada não entra. As cores do Instagram moram em `shared/config/instagram.ts`, junto do @ e da URL, e **não** na paleta `estrelinha` — são a marca de terceiro, usadas só aqui (precedente do WhatsApp). | decidida na implementação do V2, 2026-10-18 |

## Riscos

- **`homeComposition.test.tsx` intocável**: se o convite abrir nesse arquivo, as consultas por papel deixam de achar a Home (o Radix põe `aria-hidden`). A premissa 4 o mantém fechado ali. Se a premissa mudar, o risco volta.
- **O rodapé muda de URL** (premissa 1). É mudança visível fora do convite, coberta pelo ajuste de `Footer.test.tsx`.
- **Sobreposição no celular**: `MobileNav` (`StoreLayout.tsx:84`), bolha do WhatsApp (`WhatsAppFloat.tsx:71`, `z-50`) e aviso de cookies (`CookieNotice.tsx:59`, `z-50`). O véu modal os cobre; a ordem de camadas só se prova em navegador.
- **LCP**: o título do convite pode virar candidato a LCP se abrir cedo demais. A premissa 5 mitiga, e só o navegador mede.
- **Interstitial intrusivo**: cobrir a página no celular logo na entrada pesa na busca do Google. O atraso e a folha parcial mitigam.

## Não resolvido

- As fotos da prévia do perfil, até haver asset (premissa 3).
- Se o handle deve passar a vir de `store_settings.general.instagram`. Hoje há um campo no painel que ninguém lê, e isso é dívida anterior a esta feature.
- A lista de chaves do `CLAUDE.md` não traz `estrelinha_wa_seen_v1` (`WhatsAppFloat.tsx:7`). É registro, não é desta feature.
- A prova em navegador (390 e 1440, convivência com os avisos, LCP/CLS) fica fora da tarefa.
