# Sessão CH-05 · Levar pedidos não pagos adiante sem nenhum virar "Pago" sem registro

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-caminhos-ate-pago.md` · exploratório · P1   |
| Status      | done                                                                   |
| Persona     | PER-02 Adri no computador · conta: `admin` — `QA_ADMIN_*`              |
| Tour · modo | Back-Button · com tour                                                 |
| Rodada      | exploração                                                             |
| Orçamento   | 50 ações de browser de 50 (+3 de limpeza: menu da conta, Sair, fechar) |
| Ambiente    | http://localhost:8083 (painel) · Supabase local · build não exposto · Chromium (Playwright MCP, headless) · viewport 1440×900 |
| Paridade    | dado sintético (massa QA98); `*.supabase.co` e `**/g/collect*` bloqueados; edge functions com chaves externas inválidas |

## Missão

Usar todo atalho de status do painel — e o voltar do navegador no meio deles — procurando o pedido não
pago que chega a Pago (ou além) sem passar pelo registro, o lote que avança em silêncio só uma parte, e o
link de cartão oferecido onde não devia.

## Passos

Pedidos tocados: **#0568** (M6e, PIX vencido — registrado nesta sessão), **#0566** (M6c, espera material — só no lote, continua Pendente), **#0574** (M9b) e **#0561** (M9a) avançados pelo lote, **#0552** (M3a — link de cartão gerado). Nenhum dos pedidos reservados a outros charters foi tocado.

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel como admin | Dashboard | — |
| 02 | Abrir #0568 (Pendente, PIX vencido) | "Próximo passo: Pago", texto "O pagamento ainda não foi aprovado pelo Mercado Pago. Marcar como pago aqui não cobra ninguém.", "Outro status" e "Avançar mesmo assim"; bloco Pagamento com "Registrar pagamento", **sem** "Gerar link de cartão" (PIX) | — |
| 03 | "Avançar mesmo assim" | Abriu `/pagamento?para=paid`, tela "Registrar pagamento · Pedido #0568" | `screenshots/CH-05-03-avancar-mesmo-assim-registrar.png` |
| 04 | Voltar do navegador | De volta ao pedido, ainda **Pendente**, nada gravado | — |
| 05 | "Outro status" → Pago | Opções: Pago, Em Separação, Enviado, Entregue, Cancelado. Pago abriu `/pagamento?para=paid`; voltar → Pendente | — |
| 06 | "Outro status" → Em Separação | Abriu `/pagamento?para=separating`, com a linha "Depois de registrar, você volta ao pedido para levar o pedido a Em Separação." | — |
| 07 | Recarregar (F5) na tela de registrar | A tela volta igual, com a mesma linha do destino | — |
| 08 | Voltar; "Outro status" → Entregue | Abriu `/pagamento?para=delivered`; voltar → Pendente | — |
| 09 | "Outro status" → Enviado, escolher PIX direto, "Registrar pagamento" | Diálogo "Registrar o pagamento": "O pedido #0568 passa a constar como pago e vai para **Pago**." com "Avisar a cliente por e-mail" marcado por padrão | — |
| 10 | Desmarcar o aviso e confirmar | Volta ao pedido | — |
| 11 | Ler o pedido | **Pago**, "Próximo passo: Em Separação" (botão direto), histórico "Pendente → Pago · Pagamento registrado manualmente", bloco "Registrado à mão · PIX direto · por admin" e "Desfazer registro". O destino pedido (Enviado) não foi aplicado — o pedido parou em Pago, como o diálogo anunciou | `screenshots/CH-05-11-registrado-vindo-de-enviado.png` |
| 12 | Na lista, marcar #0574 (Pago), #0561 (Pago) e #0566 (Pendente) | Barra "3 selecionados" (o #0564 não está na primeira página da lista; ficou fora) | — |
| 13 | Duplo clique em "Avançar status" | Resumo do lote: "2 avançaram · 1 não pago ficou de fora (registre o pagamento no pedido) · nenhum aviso sai nestas mudanças"; #0566 segue Pendente na lista | — |
| 14 | Dispensar o resumo; marcar só #0566 e "Avançar status" | Seleção tinha sido limpa ao dispensar | — |
| 15 | Ler o resumo | "1 não pago ficou de fora (registre o pagamento no pedido)"; #0566 continua Pendente | `screenshots/CH-05-15-lote-so-nao-pagos.png` |
| 16 | Abrir #0574 | **Em Separação**, histórico com um único "Pago → Em Separação" — o duplo clique avançou uma vez só; "Próximo passo: Enviado" direto, sem "mesmo assim" | — |
| 17 | Usar o próximo passo "Enviado" em #0574 | Foi a **Enviado** direto, sem tela de registrar | — |
| 18 | Abrir #0552 (cartão recusado, sem link) | Bloco Pagamento: Método "card", Situação "Recusado", "Registrar pagamento" e "Gerar link de cartão" | — |
| 19 | Duplo clique em "Gerar link de cartão" | Aparece "Link de pagamento com cartão" com o endereço `http://localhost:8082/pagar-com-cartao#<código>`, botão "Copiar link", a linha "Gerar outro link faz o anterior parar de funcionar." e "Gerar outro link de cartão". Um link só na tela | — |
| 20 | (orçamento atingido) Sair da conta e fechar | Tela de login | — |

**Edge cases tentados:** voltar e avançar repetido (pedido → registrar → voltar, quatro vezes); recarregar na tela de registrar; duplo clique em "Avançar status" do lote (sem avanço duplo); duplo clique em "Gerar link de cartão" (um link na tela — qual dos dois vale no servidor não foi conferido).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-010 | pass | 03–11 | `screenshots/CH-05-03-avancar-mesmo-assim-registrar.png`, `screenshots/CH-05-11-registrado-vindo-de-enviado.png` | os 5 caminhos abrem o registro, o voltar não grava; registrado vindo de "Enviado" fica em Pago. Variação "Cancelado" não tentada |
| TC-FUNC-011 | pass | 12–16 | `screenshots/CH-05-15-lote-so-nao-pagos.png` | com 2 pagos + 1 não pago (não 2+2: o #0564 não estava na página); depois só o não pago. Duplo clique avançou uma vez |
| TC-FUNC-012 | skip | — | — | orçamento: M10 (#0557) não foi aberto |
| TC-FUNC-014 | skip | 02, 16, 18 | — | parcial: aparece em M3 (#0552); ausente em PIX pendente (#0568) e em pago (#0574). M4, M12, cartão vencido e M1 não abertos (orçamento) |
| TC-FUNC-015 | skip | 19 | — | parcial: o link aparece no formato `…/pagar-com-cartao#<código>` com "Copiar link"; copiar, abrir anônimo e "gerar de novo" não feitos (orçamento) |
| TC-REG-001 | pass | 13, 16, 17 | — | os dois pagos avançaram no lote sem ficar de fora; próximo passo de pago (Em Separação → Enviado) direto. "Outro status" num pago não aberto |
| TC-INT-004 | skip | — | — | orçamento: cancelar M1 (#0547/#0548) e Mailpit não feitos |

Contagem: pass 3 · fail 0 · blocked 0 · skip 4

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Acima de "Avançar mesmo assim" o texto diz "Marcar como pago aqui não cobra ninguém.", mas o botão não marca mais como pago: leva à tela de registrar | 02 | polimento |
| Registrar vindo de "Outro status → Enviado/Entregue/Em Separação" leva só a Pago; a tela de registrar avisa ("você volta ao pedido para levar o pedido a …"), mas de volta ao pedido nada lembra o destino que ela escolheu | 06, 11 | polimento |
| O bloco Pagamento mostra o método cru ("card", "pix") | 02, 18 | pré-existente |

## Fora da cobertura

- Cancelar M1 com a caixa de aviso desmarcada e marcada, e o Mailpit (TC-INT-004) — orçamento esgotado
- "Gerar link de cartão" em M4, M12, cartão vencido e M1; copiar o link, abrir em janela anônima, gerar de novo, mesma URL em duas abas (TC-FUNC-014/015) — orçamento
- Qual dos dois links do duplo clique em "Gerar link de cartão" vale — exigiria abrir os dois na loja
- "Pagamento não registrado" em M10 (TC-FUNC-012) — orçamento
- Deep link `/admin/pedidos/:id/pagamento` de pedido pago ou cancelado — orçamento
- Lote com 2 não pagos (só 1 estava visível na primeira página da lista)

## Debrief

- **Surpresas:** dispensar o resumo do lote limpa a seleção — quem quiser repetir com outros pedidos marca de novo. O lote diz quantos ficaram de fora, mas não quais.
- **Próximo charter:** o resto deste charter (cancelar pelo painel + Mailpit; link de cartão em M4/M12/vencido, copiar e gerar de novo; M10) merece outra sessão de ~30 ações.
- **Padrão novo:** nada
