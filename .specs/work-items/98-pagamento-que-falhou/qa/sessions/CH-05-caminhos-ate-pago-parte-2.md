# Sessão CH-05 (parte 2) · Levar pedidos não pagos adiante sem nenhum virar "Pago" sem registro

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-caminhos-ate-pago.md` · exploratório · P1 — continuação; só os TC que ficaram `skip` na parte 1 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri no computador · conta: `admin` — `QA_ADMIN_*` (e `cliente` — `QA_CLIENTE_*` — no passo 31) |
| Tour · modo | Back-Button · com tour                                                 |
| Rodada      | exploração                                                             |
| Orçamento   | 35 ações de browser de 35 (contando 3 de preparação/login, 1 que falhou por erro meu e 3 de limpeza) |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · Supabase local · Chromium (Playwright MCP, headless) · 1440×900 |
| Paridade    | massa QA98; `*.supabase.co` e `**/g/collect*` bloqueados; edge functions com chaves externas inválidas; Mailpit vazio do começo ao fim |

## Missão

Usar todo atalho de status do painel — e o voltar do navegador no meio deles — procurando o pedido não
pago que chega a Pago (ou além) sem passar pelo registro, o lote que avança em silêncio só uma parte, e o
link de cartão oferecido onde não devia. Nesta parte: TC-FUNC-012, TC-FUNC-014, TC-FUNC-015, TC-INT-004.

## Pedidos usados e estado final

| Pedido | Massa | O que foi feito | Estado final |
| --- | --- | --- | --- |
| #0557 | M10 | registrado à mão (Transferência, sem aviso à cliente) | Em Separação · pagamento Aprovado · "Registrado à mão" |
| #0552 | M3a | link de cartão gerado **duas vezes** nesta sessão (o da parte 1 também morreu) | Pendente · cartão Recusado · link vivo = o último (`…CUDHGg`) |
| #0548 | M1c | cancelado pelo painel, motivo "QA98 CH-05b — teste de cancelamento pelo painel" | Cancelado |
| #0553, #0562, #0558, #0561, #0580, #0581 | M4, M3v, M12, M9a, M14p, M14c | só lidos | inalterados |
| #0546 | M1a | **não** tocado (o segundo cancelamento não foi feito, ver TC-INT-004) | inalterado |

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel como admin e abrir #0557 (M10) | Painel saiu da sessão anterior deslogado; login feito; pedido aberto | — |
| 02 | Ler o bloco Pagamento de #0557 | Status "Em Separação"; Pagamento: Situação "Expirado", item de lista **"Pagamento não registrado"** e o link "Registrar pagamento" | `screenshots/CH-05b-02-m10-nao-registrado.png` |
| 03 | "Registrar pagamento" | Tela "Registrar pagamento · Pedido #0557" | — |
| 04 | Escolher Transferência e "Registrar pagamento" | Diálogo "O pedido #0557 passa a constar como pago." (sem anunciar ida a Pago), com "Avisar a cliente por e-mail" marcado | — |
| 05 | Desmarcar o aviso e confirmar | Volta ao pedido | — |
| 06 | Ler o pedido | Continua **Em Separação**, "Próximo passo: Enviado"; o aviso sumiu; bloco "Registrado à mão · Transferência · 10/11/2026 às 05h46 · admin@…"; Situação "Aprovado"; histórico novo "Em Separação → Em Separação · Pagamento registrado manualmente" e o botão "Enviar agora o e-mail 'Pagamento aprovado' para a cliente" | `screenshots/CH-05b-06-m10-registrado-segue-separando.png` |
| 07 | Abrir em sequência M4 #0553, cartão vencido #0562, M1 #0548, M12 #0558, M9a #0561, cartão registrado à mão #0580 e procurar "Gerar link de cartão" | Presente em #0553 e #0562; ausente em #0548 (PIX), #0558 (cancelado), #0561 (pago, hoje Em Separação), #0580 (cartão pago à mão) | — |
| 08 | Abrir #0581 (cartão, cancelado com link) e voltar a #0553 | Sem o botão no cancelado de cartão; presente em #0553 | `screenshots/CH-05b-08-m4-gerar-link-presente.png` |
| 15 | Reabrir #0552 (link gerado na parte 1) | O painel não mostra o código antigo: só "Registrar pagamento" e "Gerar link de cartão" | — |
| 17 | "Gerar link de cartão" | Caixa "Link de pagamento com cartão" com `http://localhost:8082/pagar-com-cartao#<código>`, "Copiar link", "Gerar outro link faz o anterior parar de funcionar." e "Gerar outro link de cartão" | — |
| 19 | "Copiar link" | O botão vira **"Link copiado"**; a área de transferência tem exatamente o link mostrado | — |
| 21 | "Gerar outro link de cartão" | O endereço da caixa muda; continua uma caixa só | — |
| 22 | Abrir uma janela anônima (contexto isolado) | — | — |
| 23 | Abrir o link **antigo** e o **novo** na janela anônima | Antigo: "Pagamento com cartão · Este link não está mais disponível. Fale comigo pelo WhatsApp que eu mando um novo." Novo: "Pedido #0552 · Pingente Pata × 2 · Total no cartão R$ 65,80 · Em quantas vezes? · Pagar R$ 65,80 no cartão" (cartão não digitado). A 1ª abertura deu tela em branco por bloqueio de rota meu (casou o pacote local do SDK); refeita com o bloqueio só nos hosts externos | `screenshots/CH-05b-23-link-antigo-anonima.png`, `screenshots/CH-05b-23-link-novo-anonima.png` |
| 26 | Conferir o Mailpit antes de cancelar | Vazio (total 0) | — |
| 28 | Abrir #0548 (M1c) e "Cancelar pedido" | Diálogo: "…não estorna no Mercado Pago… não repõe o estoque", campo de motivo e a linha **"Nenhum e-mail sai: 'Pedido cancelado' está desligado em Configurações → Notificações."** — **não há caixa de aviso** para marcar ou desmarcar | `screenshots/CH-05b-28-cancelar-0548-aviso-desmarcado.png` |
| 29 | Informar o motivo e "Confirmar cancelamento" | **Cancelado**; anúncio "Pedido cancelado · nenhum aviso sai nesta mudança"; histórico "Pendente → Cancelado · Cancelado: QA98 CH-05b…"; sem "Registrar pagamento" nem "Gerar link de cartão". Nada na tela fala da cobrança do Mercado Pago (fechada ou não) | `screenshots/CH-05b-29-0548-cancelado.png` |
| 30 | Mailpit de novo | Vazio (total 0) | — |
| 31 | Como cliente, numa janela anônima, abrir `/pedido/<#0548>` | Sem sessão: "Pedido não encontrado · O acesso a este pedido pode ter expirado. Entre com o código enviado para o seu e-mail…" e "Entrar com código". A entrada da loja é por código de e-mail, não por senha — o script de login acabou caindo no botão do Google (tela de login do Google aberta; nenhum envio feito, nenhuma senha digitada). Não cheguei ao pedido como cliente. Sem "Pagar", sem "falta de pagamento" na tela vista | `screenshots/CH-05b-31-cliente-0548-cancelado.png` |
| 33 | Sair da conta admin, fechar abas e o browser | Tela de login | — |

**Edge cases tentados:** reabrir o pedido depois de gerar o link (o código antigo não volta); gerar de novo e abrir o antigo e o novo numa janela anônima (só o último vale); janela anônima como contexto limpo.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-012 | pass | 02–06 | `screenshots/CH-05b-02-m10-nao-registrado.png`, `screenshots/CH-05b-06-m10-registrado-segue-separando.png` | "Pagamento não registrado" + "Registrar pagamento"; depois do registro o aviso some, o bloco mostra o registro e o status fica em Em Separação. Variações Enviado/Entregue não feitas (não há massa M10 nesses status livre) |
| TC-FUNC-014 | pass | 07–08 | `screenshots/CH-05b-08-m4-gerar-link-presente.png` | presente: M3 (parte 1), M4, cartão vencido. Ausente: M1 PIX, M12 (PIX cancelado), M14c (cartão cancelado), M9 pago, cartão registrado à mão |
| TC-FUNC-015 | pass | 15–23 | `screenshots/CH-05b-23-link-antigo-anonima.png`, `screenshots/CH-05b-23-link-novo-anonima.png` | formato `…/pagar-com-cartao#<código>`; "Link copiado"; área de transferência = link inteiro; anônimo abre o #0552 com R$ 65,80; o anterior diz "não está mais disponível"; reabrir o pedido não mostra o código antigo |
| TC-INT-004 | blocked | 28–31 | `screenshots/CH-05b-28-cancelar-0548-aviso-desmarcado.png`, `screenshots/CH-05b-29-0548-cancelado.png` | por `massa`/config: "Pedido cancelado" está desligado no ambiente, então o diálogo não tem a caixa de aviso — o par desmarcada/marcada não existe; e a pré-condição de ligar "cancelado por falta de pagamento" não foi feita (orçamento). Do que deu para ver: cancelamento sem e-mail (Mailpit 0) e sem oferta de pagamento no painel. A tentativa de fechar a cobrança não é visível na tela. O passo 3 (pedido como cliente) não foi alcançado — login da loja é por código de e-mail |

Contagem: pass 3 · fail 0 · blocked 1 · skip 0

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O histórico do registro num pedido já em Separação diz "Em Separação → Em Separação · Pagamento registrado manualmente" — uma "transição" para o mesmo status | 06 | polimento |
| O cancelamento pelo painel não diz à dona que a cobrança aberta foi (ou não) fechada no Mercado Pago; só lista o que **não** faz (estorno, estoque) | 29 | polimento |
| Ao lado do status no cabeçalho do pedido aparece um "—" solto em todos os pedidos abertos | 02, 07 | pré-existente |

## Fora da cobertura

- TC-INT-004 com a caixa de aviso marcada e desmarcada: o evento "Pedido cancelado" está desligado no ambiente (sem caixa no diálogo) e ligar os eventos em Configurações → Notificações não coube no orçamento. #0546 ficou intocado para essa rodada
- TC-INT-004 passo 3 (o pedido cancelado visto pela cliente): a loja entra por código de e-mail, e os e-mails do local não chegam ao Mailpit (vazio a sessão inteira) — sem como pegar o código
- Se a cobrança aberta do #0548 foi fechada (ou tentada) no Mercado Pago: não aparece na tela da persona
- Variação do TC-FUNC-012 em Enviado e Entregue (não há pedido livre desses na massa)
- Variação do TC-INT-004 com cartão e link vivo (TC-FUNC-017) — fora desta continuação
- Mesma URL em duas abas gerando link de cartão

## Debrief

- **Surpresas:** o painel não reapresenta o link gerado antes (reabrir o pedido mostra só "Gerar link de cartão"), então a única cópia válida é a da tela no momento em que foi gerada. O diálogo de cancelar troca a caixa de aviso por uma frase quando o evento está desligado — o TC-INT-004 depende de ligar os eventos antes.
- **Próximo charter:** uma rodada curta de TC-INT-004 com "Pedido cancelado" e "Pedido cancelado por falta de pagamento" ligados, usando #0546 e outro M1 livre; e um jeito de ver o pedido como cliente (código do e-mail ou sessão já aberta).
- **Padrão novo:** nada
- **Nota de método:** o login foi feito lendo o arquivo de credenciais pelo próprio browser, servido por 2 minutos em `127.0.0.1` a partir de uma cópia no scratchpad (apagada no fim); nenhum valor passou pelo log. No passo 31 o script de login da cliente abriu a tela do Google (o primeiro botão "Entrar…" da loja) e pode ter preenchido nela o e-mail de teste `@exemplo.invalid` (não confirmei se algum botão do Google foi acionado); nenhuma senha foi digitada fora da loja.
