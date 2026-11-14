# Reteste — WI 100 (Perfil de estilo da loja) · rodada 3 (confirmação)

| Campo      | Valor                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| Rodada     | 2026-11-14 · início 11:30 · fim 11:49 (relógio do shell, aproximado)                                     |
| Ambiente   | painel http://localhost:8183/admin · loja http://localhost:8182 · build `feature/100` @ `41f85963` (fix T10), dev server do worktree · Chromium (agent-browser 0.39.1, sessão `retest`) |
| Bugs lidos | 1 de `issues/` com status `open` (BUG-005); BUG-001..004 já `resolved`, fora deste reteste              |

Contagem: resolved 1 · still-open 0 · cannot-reproduce 0 · blocked 0

Ambiente aplicado antes do primeiro `open`: rotas abortadas `*.supabase.co`, `**/*.supabase.co/**` e `**/g/collect*`;
viewport 1440 × 900. Massa S1: Black Friday salvo e "Em uso" (conferido no card ao entrar). Nenhum Salvar foi clicado;
o perfil marcado foi trocado e destrocado sem salvar, e o card terminou com Black Friday marcado e "Salvar alterações"
desabilitado.

## BUG-005 · [Prévia do perfil] A prévia mostra a Home sem banners, vitrine nem produtos — a dona

| Campo      | Valor                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Resultado  | resolved                                                              |
| Persona    | PER-01 Adri (a dona) · conta: `admin-loja` (QA_ADMIN_LOJA_*)          |
| Passos de  | `issues/BUG-005.md`                                                   |
| Tentativas | 2 · 4 (BF em Computador ×2 — a 2ª após recarregar o painel —, Celular → Computador, BF de novo após trocar e destrocar o perfil) |
| Viewport   | 1440 × 900 (prévia em "Computador" 1024 × 768 a 60 % e em "Celular" 390 × 844 a 55 %) |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Login como `admin-loja` (Black Friday salvo) e abrir Configurações › Dados da loja
2. No card "Perfil de estilo da loja", com Black Friday marcado, clicar em "Ver a loja com este perfil"
3. No modal, clicar em "Computador" e esperar a rede do quadro assentar (`wait --load networkidle`)
4. Olhar o corpo da Home dentro do quadro (snapshot da árvore do iframe e screenshot rolando o quadro)

**Esperado:** a Home da loja, com os mesmos blocos que a cliente vê (banners, vitrines de produtos, a faixa de
declaração), nas cores do perfil marcado. Só as cores mudam.

**Observado:** o iframe agora carrega `http://localhost:8182/?preview=1&home=publicada`. Nas duas tentativas em
"Computador" o quadro mostra, entre o cabeçalho e o rodapé: a região "Banners da loja" (2 banners), a faixa de
vantagens (4x sem juros, WhatsApp, envio, 7 % no Pix), a navegação de categorias, as coleções em destaque e as
seções "Joias Árvore da Vida", "Linha Leite Materno", "Cada joia é uma memória eternizada à mão" (a faixa de
declaração), "Decorativos", "Linha Dente de Leite", "Linha Uma Estrelinha", "Dia das Mães" e "Algumas das peças em
oferta", com cartões de produto e preços. Faixa de avisos em ouro, cabeçalho e departamentos em preto, declaração em
preto e ouro — Black Friday. É o mesmo conjunto de 8 seções `h2` da Home publicada em http://localhost:8182/
(`data-perfil="black-friday"`), conferida ao fim na mesma sessão. As imagens dos banners e coleções aparecem com o
texto alternativo porque vêm de `*.supabase.co`, abortado por rota por regra do ambiente — igual na Home publicada
com a mesma rota; não é achado.

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok        | J-01 passo 3: o card abre com Black Friday "Em uso", "Ver a loja com este perfil" habilitado e "Salvar alterações" desabilitado sem mudança |
| Passo seguinte da jornada | ok        | Alternar para "Celular" (390 × 844 · 55 %): mesma Home, layout de celular com barra inferior (Início, Busca, Sacola, Conta), mesmas 8 seções; voltar a "Computador" mantém os blocos. "Fechar" fecha o modal sem mudar o card |
| Mesma ação com outro dado | ok        | Padrão marcado **sem salvar**: o modal vira "A loja com o perfil Padrão", o quadro mostra a mesma Home com cabeçalho e departamentos em ardósia (`?preview=1&home=publicada`). De volta a Black Friday sem salvar: título e quadro voltam a Black Friday, 9 `h2` no modal (título + 8 seções). E o /admin/home (editor da Home), sem salvar nada: a "Prévia da Home" segue em `http://localhost:8182/?preview=1` (rascunho, sem `home=publicada`) e mostra os banners e as mesmas 8 seções |

**Evidência:**

- `screenshots/retest-BUG-005-computador.png` — tentativa 1, "Computador": faixa de avisos, cabeçalho preto, banners, faixa de vantagens e categorias em Black Friday
- `screenshots/retest-BUG-005-computador-vitrine.png` — tentativa 1, o quadro rolado até a vitrine "Joias Árvore da Vida" com produtos
- `screenshots/retest-BUG-005-computador-declaracao.png` — tentativa 2 (após recarregar o painel), a faixa de declaração "Cada joia é uma memória eternizada à mão" em preto e ouro
- `screenshots/retest-BUG-005-celular.png` — "Celular": vitrine com preços, declaração e barra inferior
- `screenshots/retest-BUG-005-padrao-nao-salvo.png` — Padrão marcado sem salvar: a mesma Home em ardósia
- `screenshots/retest-BUG-005-admin-home-previa.png` — /admin/home: a prévia do editor da Home com os blocos
- console (painel + iframe da prévia — primeira leitura de console e rede do iframe nesta skill): nenhum `error` e
  `errors` vazio; só `info` do React DevTools e `warning` de "React Router Future Flag" (v7_startTransition,
  v7_relativeSplatPath), igual no painel e no /admin/home
- rede do iframe: `GET http://localhost:8182/ (Document) → 200`; `GET 127.0.0.1:54441/rest/v1/home_sections → 200`
  (a leitura que antes ficava desligada); `GET 127.0.0.1:54441/rest/v1/store_settings → 200`; 6 imagens
  `GET <projeto>.supabase.co/storage/v1/render/image/public/home-images/sections/… (Image)` sem status — abortadas
  pela rota do ambiente, como esperado; nenhuma requisição a `**/g/collect*`; nenhum 4xx/5xx. Requisições do
  dashboard do painel (`orders`, `products`, `customers`, `rpc/store_movement`) aparecem sem status por terem sido
  canceladas pela navegação para Configurações — não são do iframe

## Achados novos no entorno

nada
