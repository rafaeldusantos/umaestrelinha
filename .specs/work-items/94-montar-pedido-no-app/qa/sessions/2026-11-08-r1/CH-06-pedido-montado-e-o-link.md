# Sessão CH-06 · O pedido montado e o link que a cliente recebe

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-pedido-montado-e-o-link.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-02 Adri interrompida · conta: `admin-atelie` (arquivo local de credenciais; as `QA_*` não existem nesta máquina) · loja: `anonima` (contexto isolado do browser) |
| Tour · modo | Feature · por cenário (J-04) |
| Rodada      | exploração |
| Orçamento   | 50 ações de browser de 50 (mais o "Sair" e o fechamento do browser) |
| Ambiente    | app `http://localhost:8084` · loja `http://localhost:8082` · build não exposto · Chromium (Playwright MCP, headless) · viewport 390 × 844 nos dois |
| Paridade    | Supabase local (54441), requisições a `*.supabase.co` abortadas nos dois contextos; `PROPOSAL_TOKEN_KEY` presente nas functions locais; Mercado Pago não configurado (concluir o PIX impossível); massa sintética |

## Missão

Confirmar que, dias depois, a Adri acha o pedido montado, copia o MESMO link que a cliente tem e que ele abre
na loja com os preços travados — e que nenhuma ação (Editar, Renovar, Cancelar) mata o link sem ela saber.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou e abriu Pedidos | Chips na ordem de antes e "Montados · 1 aberto" por último | — |
| 02 | Tocou em "Montados" | `/pedidos?visao=montados`, "14 pedidos montados · os mais recentes primeiro"; cartões com número, selo, cliente, meta e total: P-0033 Aberta "Montado há 3 min · vale até 15/11" R$ 413,82; Concluídas "Virou o pedido #NNNN"; Canceladas "Cancelado · montado há 7 dias"; P-0009 Expirada "Venceu em 07/11"; peças "Nome · variação" juntas por " · " (o nome longo inteiro no cartão) | — |
| 03 | Abriu P-0033 | "Pedido montado P-0033", "Montado há 4 min · vale até 15/11", selo Aberta; "Link para Marta" com `…/pedido-montado#<token>`; "Enviar pelo WhatsApp"; "Copiar link"; "Vale até 15/11. Quem tem o link pode pagar este pedido — não pode ver a conta dela."; "Mensagem do WhatsApp" escrita; Cliente com e-mail, telefone **`51988887777` sem máscara** e endereço; "2 peças" com "nome · variação · 1 un.", Subtotal, Desconto combinado, "Total dos itens" R$ 413,82, "Frete: a cliente escolhe no link."; "Editar" e "Cancelar este pedido", **sem** "Renovar" | — |
| 04 | Tocou duas vezes rápido em "Copiar link" | "Link copiado." / "Cole na conversa com Marta."; **uma** linha "Link enviado · copiado" no histórico; a área de transferência tem exatamente o link mostrado | — |
| 05 | Saiu para Montados recarregando a página (navegação nova) e reabriu P-0033 | O **mesmo** link (mesmo token), sem "Gerar link novo"; "Link enviado · copiado" segue no histórico | `screenshots/CH-06-04-mesmo-link-depois-do-f5.png` |
| 06 | Abriu o link numa aba anônima da loja, em 390 | "Seu pedido · Montado pela Adri para você…", "Este link vale até 15/11/2026.", as duas peças com os preços da revisão, Subtotal R$ 459,80, Desconto combinado −R$ 45,98; contato e entrega preenchidos; nenhuma observação nem motivo do desconto | `screenshots/CH-06-05-loja-abre-o-link.png` |
| 07 | No app, "Editar observação", escreveu uma nota e salvou | Folha "Adicionar observação · Só quem administra vê. A cliente não recebe." com contador 0/1000; "Observação salva." e a nota no lugar de "Nenhuma observação." | — |
| 08 | Tocou em "Editar", trocou o "Anel Afetivo Coração com Cabelo" pelo "Anel Afetivo com Leite materno · Folheado a prata" e salvou | A montagem reabriu ("Editar pedido montado", passo 1) com a cliente, o endereço, as peças, o desconto 10 % e o motivo, e na revisão a observação nova; o botão é "Salvar alterações" e a nota "Editar mantém o link que a cliente já recebeu."; salvo: "Alterações salvas. / O link continua o mesmo.", **o mesmo token**, peças novas, selo agora "Aberta — vista pela cliente", histórico "Editado" e "Visto pela cliente". Na reabertura, a cliente aparece com "· 0 pedidos" e a entrega como "Outro endereço" (preenchido com o mesmo endereço) | — |
| 09 | Reabriu o mesmo link na loja | A peça nova e o total novo (Subtotal R$ 471,90, −R$ 47,19); a observação e o motivo não aparecem. **O resumo cobra "Frete · Correios SEDEX R$ 17,91" enquanto a opção SEDEX marcada na lista diz R$ 18,03** | `screenshots/CH-06-08-loja-depois-de-editar.png` |
| 10 | Abriu a Expirada P-0009 e tocou em "Renovar prazo" | Faixa "O link venceu em 07/11. Renovar confere os preços de novo e gera um link novo."; só "Renovar prazo" (sem link, sem Editar/Cancelar). A folha: "Renovar o prazo de P-0009?" / "O link venceu em 07/11. Os preços são conferidos de novo e sai um link novo, que vale até 15/11. Mande o novo para Teste." com "Agora não" e "Renovar" | — |
| 11 | Confirmou "Renovar" | "Prazo renovado." / "O link antigo parou de funcionar. Mande o novo."; selo Aberta, "vale até 15/11"; "Link para Teste" com token novo; **"Sem telefone — copie o link."** no lugar do WhatsApp; "Editar" e "Cancelar este pedido" voltaram. No histórico a linha nova diz só **"Prazo renovado"** | `screenshots/CH-06-10-renovado.png` |
| 12 | Voltou a P-0033, tocou em "Cancelar este pedido" e depois duas vezes rápido em "Cancelar pedido" | Folha "Cancelar P-0033?" / "Quem abrir o link vai ler que este pedido não está mais disponível. Não dá para desfazer." com "Manter" e "Cancelar pedido"; confirmado: "Pedido montado cancelado." / "O link deixou de funcionar."; faixa "Cancelado. Quem abrir o link lê que este pedido não está mais disponível."; sem Editar/Cancelar; "Editar observação" segue disponível; **uma** linha nova no histórico, que diz só **"Cancelado"** | `screenshots/CH-06-12-cancelado.png` |
| 13 | Na loja, abriu o link de P-0033 (cancelado) | "Seu pedido · Este link não está mais disponível. Fale comigo pelo WhatsApp que eu mando um novo." com "Falar no WhatsApp" | `screenshots/CH-06-13-loja-link-cancelado.png` |
| 14 | Na loja, abriu o link novo de P-0009 | Abre: a peça (com "Gravação: …"), Subtotal R$ 866,00, Desconto combinado −R$ 20,00, "Frete a calcular", contato a preencher | `screenshots/CH-06-14-loja-link-renovado.png` |
| 15 | Saiu da conta no app e fechou o browser | Voltou a `/login` | — |

**Edge cases tentados:** duplo toque em "Copiar link" (passa: uma linha no histórico); duplo toque em "Cancelar pedido" (passa: um cancelamento); recarregar/reabrir antes de copiar (passa: mesmo link); pedido montado sem telefone (passa: "Sem telefone — copie o link."); nome de peça longo no cartão em 390 (o texto inteiro está no cartão; rolagem horizontal não medida); lista com os cinco estados (Aberta, vista pela cliente, Concluída, Expirada, Cancelada — vistos). Não tentados: voltar depois de cancelar e de renovar, app e painel ao mesmo tempo, estado vazio, quatro peças no cartão.

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-SMOKE-003 | pass | 03–04 | — | — |
| TC-JOURNEY-004 | pass | 01–06 | `screenshots/CH-06-04-mesmo-link-depois-do-f5.png`, `screenshots/CH-06-05-loja-abre-o-link.png` | o link anotado na criação não estava disponível; comparado o da 1.ª abertura com o da reabertura depois de recarregar: idênticos, e o da área de transferência também |
| TC-FUNC-001 | pass | 01–02 | — | os cinco selos vistos ("vista pela cliente" no detalhe de P-0033 depois de a loja abrir); a busca sumindo, F5 na visão e o estado vazio não exercitados |
| TC-FUNC-027 | pass | 03–05, 11 | `screenshots/CH-06-10-renovado.png` | passos 1, 2, 4 e 5 passam; o toque em "Enviar pelo WhatsApp" (passo 3) não foi feito — o `wa.me` com a mensagem está no link; fotos das peças não conferidas (snapshot de texto); telefone sem máscara no bloco Cliente (spec-gap) |
| TC-FUNC-028 | fail | 03, 10–12 | `screenshots/CH-06-10-renovado.png`, `screenshots/CH-06-12-cancelado.png` | ações por estado, folhas e toasts batem; o histórico diz "Prazo renovado" e "Cancelado" em vez de "Prazo renovado · link novo, o anterior parou de funcionar" e "Cancelado por você" (A-1); passo 6 (Concluída → "Ver o pedido #NNNN") não feito por orçamento |
| TC-FUNC-029 | pass | 08–09 | `screenshots/CH-06-08-loja-depois-de-editar.png` | mesmo link, peça e total novos na loja; F5 e "x" durante o Editar não exercitados |
| TC-FUNC-030 | pass | 07, 09, 12 | `screenshots/CH-06-08-loja-depois-de-editar.png` | editável na Aberta e na Cancelada; a loja não mostra; Expirada e Concluída não conferidas |
| TC-FUNC-031 | skip | 10 | — | a massa não tem pedido montado **Aberto** sem a cifra (o único sem chave é a Expirada, que mostra só "Renovar prazo", como o PRD manda); renovado, o link passou a aparecer guardado (passo 11) |
| TC-INT-002 | pass | 06, 11–14 | `screenshots/CH-06-13-loja-link-cancelado.png`, `screenshots/CH-06-14-loja-link-renovado.png` | o reaberto abre; o cancelado diz que não está mais disponível; o renovado abre. "O antigo não abre" da Expirada não foi conferido: o link antigo dela nunca foi mostrado (criado sem a chave) |
| TC-INT-003 | blocked | — | — | ambiente: Mercado Pago não configurado, concluir com PIX é impossível. A variação "cliente só abre o link" passa: "Aberta — vista pela cliente" e "Visto pela cliente" no histórico (passo 08) |
| TC-SEC-003 | skip | 03 | — | só o passo 1 visto (endereço no pedido montado; a cliente não tem CPF informado); Clientes e detalhe de pedido comum fora por orçamento |

Contagem: pass 7 · fail 1 · blocked 1 · skip 2

## Achados

### A-1 · [Pedido montado · Histórico] Renovar e cancelar gravam linhas curtas que não dizem que o link morreu — Adri

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-02 Adri interrompida |
| Jornada e passo     | J-04, ramos J-04a/J-04b · passos 11 e 12 do log |
| TC                  | TC-FUNC-028 (passos 3 e 5) |
| Gravidade proposta  | low — o toast avisa na hora, mas dias depois o histórico não lembra a Adri que o link anterior parou de funcionar nem quem cancelou |
| Reproduziu          | sim — renovar: 2 linhas "Prazo renovado" em P-0009 (31 out e a desta sessão); cancelar: 1 de 1 (P-0033) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. `admin-atelie` em `http://localhost:8084/pedidos?visao=montados`
2. Abra um pedido montado Expirado, "Renovar prazo" → "Renovar"; olhe o Histórico
3. Abra um Aberto, "Cancelar este pedido" → "Cancelar pedido"; olhe o Histórico

**Esperado:** "Prazo renovado · link novo, o anterior parou de funcionar" e "Cancelado por você" — **fonte:** TC-FUNC-028 passos 3 e 5 (PRD › Pedido montado; spec Design › Pedido montado (app))

**Observado:** as linhas dizem só "Prazo renovado" e "Cancelado".

**Evidência:**

- `screenshots/CH-06-10-renovado.png` — o histórico de P-0009 depois de renovar
- `screenshots/CH-06-12-cancelado.png` — o histórico de P-0033 depois de cancelar
- console: nada
- rede: nada

### A-2 · [Loja · /pedido-montado] O resumo cobra um frete diferente do da opção marcada depois de editar o pedido montado — cliente

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-02 Adri interrompida (vendo o link como a cliente veria) |
| Jornada e passo     | J-04, ramo J-04c (Editar → abrir o link) · passo 09 do log |
| TC                  | TC-FUNC-029 (passo 3) |
| Gravidade proposta  | medium — a cliente vê "SEDEX R$ 18,03" na escolha e "Frete · Correios SEDEX R$ 17,91" no total que vai pagar; se o valor cobrado for o errado, a loja perde ou cobra centavos a mais, e a divergência abala a confiança |
| Reproduziu          | intermitente (1 de 1 — orçamento acabou antes da segunda tentativa) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. Abra um pedido montado aberto com endereço no RS e copie o link; abra-o na loja (anônima) — SEDEX marcado, anote o valor
2. No app, "Editar", troque uma peça por outra de peso/preço diferente e "Salvar alterações"
3. Na loja, abra o mesmo link de novo e compare o valor da opção SEDEX marcada com a linha "Frete · Correios SEDEX" do Resumo

**Esperado:** a linha do Resumo e a opção marcada mostram o mesmo frete — **fonte:** sem régua escrita no WI; o checkout da 89 soma o frete escolhido ao total (comportamento implícito)

**Observado:** opção "Correios SEDEX · Chega entre 11 e 12 de novembro · R$ 18,03" marcada; Resumo "Frete · Correios SEDEX R$ 17,91" e Total R$ 412,89 (que fecha com 17,91). Na primeira abertura, antes do Editar, os dois diziam R$ 17,91.

**Evidência:**

- `screenshots/CH-06-08-loja-depois-de-editar.png` — a página do link depois de editar
- console: não lido
- rede: não lida

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| O bloco Cliente do pedido montado mostra o telefone cru (`51988887777`), enquanto a revisão e a loja mostram "(51) 98888-7777" | 03, 08 | polimento |
| Ao Editar, a cliente aparece com "· 0 pedidos" (no CH-01, "3 pedidos") e a entrega reabre como "Outro endereço" preenchido, não como o endereço salvo escolhido na criação | 08 | polimento |
| Na loja, a peça de P-0009 mostra "Gravação: 12345678901234567890"; no app o pedido montado mostra só "Prata 925 · Sim · 17 · 1 un.", sem o texto da gravação | 10, 14 | mudança |

## Fora da cobertura

- "Enviar pelo WhatsApp" tocado e a linha "Link enviado · WhatsApp" — orçamento
- Concluída → "Ver o pedido #NNNN" e o detalhe do pedido — orçamento
- O link **antigo** da Expirada deixando de abrir — o link antigo nunca foi exibido (criado sem a chave); sem ele, só o novo foi conferido
- "Gerar link novo" (TC-FUNC-031) — não há na massa pedido montado Aberto sem a cifra; mudar as functions para sem chave está fora desta sessão
- Concluir com PIX e a origem "Pedido montado" no painel (TC-INT-003) — Mercado Pago não configurado
- Voltar (`history.back`) depois de cancelar e de renovar; voltar com a folha aberta
- App e painel abertos ao mesmo tempo (renovar num, copiar no outro)
- Estado vazio de Montados; F5 na visão; cartão com quatro peças; rolagem horizontal medida em 390
- TC-SEC-003 passos 2–3 (Clientes e detalhe de pedido comum)
- F5 e "x" durante o Editar
- A segunda reprodução de A-2

## Debrief

- **Surpresas:** abrir o link na loja marca o pedido como "Aberta — vista pela cliente" (bom: a variação de TC-INT-003 passou sem esforço); a divergência de frete na loja depois do Editar (A-2)
- **Próximo charter:** reteste de A-2 com a segunda reprodução e o console/rede da loja; o painel com o mesmo pedido montado (CH-07) para a variação de TC-INT-002 e a observação editada no app
- **Padrão novo:** reabrir o link na loja depois de cada ação do app (editar, renovar, cancelar) achou A-2

### Efeitos colaterais na massa

- P-0033 (Marta Lúcia QA Oitenta e Nove): peças trocadas (o anel de cabelo saiu, "Anel Afetivo com Leite materno · Folheado a prata" entrou), observação "QA CH-06 nota interna: combinado gravar inicial M", **Cancelada**; histórico com copiado, visto, editado, cancelado
- P-0009 (Teste Recusa): **renovado**, agora Aberta até 15/11 com link guardado (novo token) e marcado como visto pela cliente
- O chip "Montados" passa a contar 1 aberto (P-0009), não mais P-0033
