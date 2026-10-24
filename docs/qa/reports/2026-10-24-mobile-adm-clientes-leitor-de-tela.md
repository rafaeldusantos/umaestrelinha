# QA Run Report — 2026-10-24 — mobile-adm-clientes-leitor-de-tela (rodada 1, CH-clientes-com-leitor-de-tela)

> Outra sessão da mesma rodada registrou `CH-clientes-conta-sem-acesso` em `2026-10-24-mobile-adm-clientes.md`; este arquivo é o da sessão do leitor de tela (mesmo sufixo `mobile-adm-clientes`, nome próprio para não sobrescrever).

- **Scope:** feature `76`: lista `/clientes`, ficha `/clientes/:id`, "Ver cliente" no pedido, vistos pela árvore de acessibilidade.
- **Cadence tier:** targeted
- **Build:** branch `feat/76-mobile-adm-clientes` (sem commit), bundle `index-DjYbbA3P.js` servido por `vite preview` na :4376 · **Environment:** Supabase local :54441 real (sem interceptação do banco), `*.supabase.co` e `**/g/collect*` bloqueados por rota, service worker bloqueado, falhas forçadas por `route.abort()`.
- **Started:** 2026-10-24 · **Status:** closed (sem fix loop)

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Equipe com TalkBack | admin do `seed.sql` | 390x844 / wifi-fast / pt-BR | CH-clientes-com-leitor-de-tela |

## Session Matrix & Results

| # | Charter | Scenario | Tour | Status | Issue |
|---|---|---|---|---|---|
| 1 | CH-clientes-com-leitor-de-tela | MAD-clientes-com-leitor-de-tela | Feature | Fail | BUG-20261024-linha-do-cliente-so-diz-o-nome; BUG-20261024-vazio-da-busca-nao-e-anunciado |
| 2 | CH-clientes-com-leitor-de-tela | MAD-cliente-com-leitor-de-tela | Feature | Fail | BUG-20261024-ver-mais-pedidos-foco-cai-no-body; BUG-20261024-whatsapp-da-ficha-nao-avisa-nova-aba |
| 3 | CH-clientes-com-leitor-de-tela | MAD-clientes-tom-memorial | Feature | Pass | |
| 4 | CH-clientes-com-leitor-de-tela | MAD-cliente-tom-memorial | Feature | Fail | BUG-20261024-ficha-nomeia-o-material-pelo-item |

TalkBack real: `Blocked (needs human verify)`.

## Session Debriefs

### CH-clientes-com-leitor-de-tela, Equipe com TalkBack

- **Ran:** 2026-10-24, ~60 min (caixa respeitada: sim). Chromium 390x844 com a árvore de acessibilidade (`ariaSnapshot`), ordem de Tab, `document.activeElement` e regiões vivas; sem Docker nem interceptação do banco (Supabase local :54441 de pé), falhas forçadas por `route.abort()` em `customer_list` e `customer_directory`. Bundle servido conferido (`index-DjYbbA3P.js` contém "Não encontrei esta cliente"). TalkBack real: `Blocked (needs human verify)`, nenhum veredito aqui o substitui.
- **Passou:** campo "Buscar cliente" rotulado; chips em `group "Recortes das clientes"` com `[pressed]`; contagem em região `polite` (muda com busca e chip); falha da lista em `role="alert"` com "Tentar de novo"; foco no `h1` ao abrir a ficha e ao voltar à lista (mesma busca e recorte); aba Clientes com `aria-current="page"` na lista e na ficha; "Ver cliente" mostra "Abrindo…" com `aria-disabled`, e a falha vira `role="alert"` com o foco no botão; id inexistente ou malformado diz "Não encontrei esta cliente." em `role="status"`; ordem de Tab coerente (busca, chips, linhas, rodapé); números lidos como rótulo seguido de valor; legenda "Contam só os pedidos pagos."; "Ver cliente" no pedido e voltar com foco no `h1` do pedido.
- **Findings:**
  - Linha da lista lê só o nome (`aria-label` esconde compras, total e "Em aberto"): Friction, Medium.
  - Vazio da busca/recorte não anunciado: Friction, Low.
  - Foco cai no `body` depois de "Ver mais pedidos", sem anúncio do que chegou: Friction, Low.
  - "Conversar no WhatsApp" não avisa que abre outra aba: Friction, Low (o link do pedido da `74` tem o mesmo padrão).
  - Itens dos pedidos da ficha nomeiam o material ("com Cinzas de Cremação", "com Leite Materno"), contra MAC-35: Trust-Damage, Medium, decisão humana.
- **Bugs filed/updated:** BUG-20261024-linha-do-cliente-so-diz-o-nome, BUG-20261024-vazio-da-busca-nao-e-anunciado, BUG-20261024-ver-mais-pedidos-foco-cai-no-body, BUG-20261024-whatsapp-da-ficha-nao-avisa-nova-aba, BUG-20261024-ficha-nomeia-o-material-pelo-item
- **Scenarios settled:** MAD-clientes-com-leitor-de-tela fail; MAD-cliente-com-leitor-de-tela fail; MAD-clientes-tom-memorial pass; MAD-cliente-tom-memorial fail
- **Paper cuts:** ver abaixo.
- **Surprises:** a contagem de clientes subiu de 54 para 63 durante a sessão (outras sessões semeiam o mesmo banco); a lista rolada por sentinela carregou 63 linhas sem "Carregar mais" (o spec fala em botão; a prova da `76` já descreve a sentinela).
- **Suggested next charter:** `CH-clientes-com-fonte-grande` e `CH-clientes-conta-sem-acesso` (a recusa com o supabase-js real); TalkBack no Android real.

## What Was Fixed

Nada nesta rodada. O fix loop não correu: os quatro primeiros bugs são mudanças pequenas de marcação, mas pedem decisão sobre a regra de nome acessível (um dono, molde `nomeDaLinha`), e o quinto contradiz a spec.

## Paper Cuts

| Persona | Where | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| TalkBack | ficha, ao abrir | o foco vai ao `h1` genérico "Cliente"; o nome da pessoa é um `<p>` duas linhas abaixo | média | registrado, sem bug |
| TalkBack | ficha, Contato | e-mail e telefone sem rótulo ("E-mail", "Telefone") | baixa | registrado |
| TalkBack | lista | a contagem repete a frase longa "das atividades mais recentes para as mais antigas" a cada tecla, e "Atualizado às" (polite) é relido a cada releitura | média | registrado |
| TalkBack | lista com rede ruim | 4 tentativas, ~16 s de esqueleto mudo antes da falha (`retryUnlessDenied`); "Ver cliente" ~7 s em "Abrindo…" | média, herdado do padrão do app | registrado |

## Decisions for a Human

1. **Nome do item na ficha (MAC-18) × "não nomear o material" (MAC-35).** Opções: (a) tirar o item da linha do pedido na ficha; (b) manter e reescrever MAC-35, aceitando que o catálogo diz o material; (c) mostrar só o tipo da peça. Recomendação: (a), a mais barata e a mais fiel ao tom memorial; a Adri ainda vê o pedido por inteiro ao tocá-lo.
2. **Nome acessível da linha.** Recomendo tirar o `aria-label` (ou compô-lo com as frases fixas) num dono só e acrescentar um guarda; é a única opção compatível com o `expected` do cenário.

## Final Status

Rodada 1, uma sessão: 4 cenários, 1 pass, 3 fail. Bugs por impacto: Trust-Damage 1, Friction 4, Blocks-Completion 0, Data-Loss 0, Cosmetic 0. Nenhum bloqueia a jornada; o Trust-Damage depende da decisão 1. Pendente: TalkBack real e as outras 7 charters da `76`. Suíte automatizada não executada nesta rodada (precondição declarada pela feature: store 5885/320, mobile-adm 1102/76 antes da `76`; medição da `76` em `baseline.md`).
