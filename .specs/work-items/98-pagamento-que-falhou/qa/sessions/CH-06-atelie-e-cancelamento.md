# Sessão CH-06 · O que o registro e o cancelamento automático deixam no app e no painel

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-atelie-e-cancelamento.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri no celular · conta: admin — `QA_ADMIN_*`                   |
| Tour · modo | Feature · livre                                                        |
| Rodada      | exploração                                                             |
| Orçamento   | 25 ações de browser de 25                                              |
| Ambiente    | app http://localhost:8084 · painel http://localhost:8083 · build não exposto · Chromium headless (Playwright MCP) · viewports 390×844 (app) · 1280 (painel) |
| Paridade    | Supabase local; data de corte do job movida só no local (`unpaid_cancel_since` = 02/11 15:36 UTC, ver manifesto de massa); job executado pela thread contra a function servida (1ª `{"cancelled":2}`, 2ª `{"cancelled":0}`); `*.supabase.co` e `**/g/collect*` bloqueados; e-mails às clientes saem por Resend inválido (não chegam ao Mailpit) |

## Missão

Confirmar, no celular, que o app do ateliê conta que o pedido foi pago por fora sem expor o comprovante, e
que o cancelamento automático cancelou só quem devia e deixou a marca e o e-mail certos.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir #0555 (M7a) no app, a 390 — caiu no login, entrou como admin | voltou direto para o pedido #0555 depois do login | — |
| 02 | Ler o bloco de valores do #0555 | "Registrado à mão" · Meio: Transferência · Pago em: 09/11/2026 às 14h30 · a observação (`NOTA-INTERNA-QA`). Nenhum comprovante (nem link, nem nome de arquivo) e nenhuma ação de registrar/desfazer em toda a tela. Logo acima do bloco, o selo do pedido segue "PIX · Aprovado" | `screenshots/CH-06-02-app-registrado-a-mao.png` |
| 03 | Fonte a 200 % no app, no bloco de registro | sem rolagem horizontal (`scrollWidth` 390 = viewport); o bloco embrulha | `screenshots/CH-06-03-app-fonte-200.png` |
| 04 | Painel → Configurações → Notificações: procurar o evento novo | "Pedido cancelado por falta de pagamento", subtítulo "Enviado quando o pedido é cancelado sozinho, 7 dias sem pagamento", interruptor **desligado** | — |
| 05 | Abrir o card e "Ver prévia" | Assunto editável `Pedido {{numero_pedido}} cancelado por falta de pagamento` (57/120); título "Seu pedido foi cancelado"; texto "…O pedido #UE-0042 foi cancelado porque o pagamento não foi concluído em 7 dias. Se ainda quiser a peça, fale comigo pelo WhatsApp … e eu te ajudo a retomar." — tom da loja, sem urgência nem exclamação; observação "Status: cancelado por falta de pagamento"; botão "Acompanhar em Minha conta" | `screenshots/CH-06-04-previa-cancelado-sem-pagamento.png` |
| 06 | Abrir A (#0584) no painel | selo "Cancelado"; histórico com UMA linha: "Pendente → Cancelado · Cancelado automaticamente por falta de pagamento: 7 dias sem pagamento confirmado. · 10/11/2026, 03:23:23"; pagamento "Expirado". O cabeçalho ainda oferece "Cancelar pedido" | `screenshots/CH-06-06-painel-A-0584-cancelado-automatico.png` |
| 07 | Abrir H (#0592, link de cartão gerado ontem) no painel | "Cancelado", mesma linha única de histórico com a marca; pagamento card "Recusado" — o link não adiou | `screenshots/CH-06-07-painel-H-0592-cancelado-automatico.png` |
| 08 | Lista de pedidos, buscar "qa98-m18" (visão inicial "Precisa de ação") | só o C aparece (os outros não estão nessa visão) | `screenshots/CH-06-08-painel-lista-m18.png` |
| 09 | Mesma busca na visão "Tudo" | B #0585 Pendente · C #0586 Pago · D #0587 Em Separação · E #0588 Pendente "Material a caminho" · E2 #0589 Pendente "Material recebido" · F #0590 Pendente · G #0591 Pendente · A #0584 Cancelado · H #0592 Cancelado — só A e H cancelados | `screenshots/CH-06-09-painel-lista-m18-tudo.png` |
| 10 | Abrir A (#0584) no app, a 390 | "Cancelado / Pedido cancelado"; histórico "Pendente → Cancelado · Cancelado automaticamente por falta de pagamento: 7 dias sem pagamento confirmado."; sem rolagem horizontal | `screenshots/CH-06-10-app-A-0584-cancelado.png` |

**Edge cases tentados:** fonte a 200 % no app (passo 03, sem estouro); viewport 390 em todas as telas do app (sem rolagem horizontal); voltar ao destino depois do login (o app devolveu ao pedido pedido). Rede lenta, girar e movimento reduzido não couberam no orçamento.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-026 | pass | 02 | `screenshots/CH-06-02-app-registrado-a-mao.png` | passos 1 e 2 conferidos (registro, meio, data, observação; nenhum comprovante, nenhuma ação). O passo 3 (desfazer no painel e reler o app) não coube no orçamento — ver Fora da cobertura. Variação M9 não feita |
| TC-FUNC-025 | pass | 04–05 | `screenshots/CH-06-04-previa-cancelado-sem-pagamento.png` | listado, desligado, assunto/título/texto editáveis; o número aparece no corpo da prévia (#UE-0042). A linha de assunto renderizada não é exibida na moldura da prévia, só o campo com o placeholder |
| TC-INT-008 | pass | 06, 07, 09, 10 | `screenshots/CH-06-09-painel-lista-m18-tudo.png` | A e H cancelados com a marca; B, C, D, E, E2, F, G como estavam (inclui a variação "material recebido"). Depois da 2ª execução, A e H têm UMA linha de histórico (a aba "Tudo" não mostra linha de e-mail — evento desligado) |
| TC-INT-009 | blocked | — | — | massa: o par de pedidos não existe e ligar o evento é da thread; e o e-mail sai por Resend inválido, não chega ao Mailpit. Conferido só o lado de Notificações (o card existe e nasce desligado — ver TC-FUNC-025) |

Contagem: pass 3 · fail 0 · blocked 1 · skip 0

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| No app, o bloco de valores de #0555 mostra o selo "PIX · Aprovado" (o meio original do pedido) logo acima de "Registrado à mão · Meio: Transferência" — dois meios diferentes no mesmo bloco; nenhuma fonte diz qual prevalece na leitura da dona | 02 | polimento |
| Pedido já cancelado (#0584) no painel continua oferecendo o botão "Cancelar pedido" no cabeçalho | 06 | pré-existente |

## Fora da cobertura

- TC-FUNC-026 passo 3 (desfazer M7 no painel em outra aba e puxar para reler no app) — orçamento: as 25 ações foram para o TC-INT-008 (P1) e Notificações. Desfazer também alteraria a massa M7a que outras sessões usam
- TC-FUNC-026 variação M9 (pago pela loja, sem a marca) — orçamento
- TC-INT-009 inteiro — par de pedidos inexistente e envio pelo Resend inválido não chega ao Mailpit
- Conferência no Mailpit de que nenhum e-mail saiu para A e H — fora do alcance (envio não chega ao Mailpit no ambiente)
- Edge cases: rede lenta no app, girar no meio do fluxo, movimento reduzido — orçamento; rede lenta exigiria throttling fora do snapshot
- Painel em 390 (as telas do painel foram vistas a 1280)

## Debrief

- **Surpresas:** a lista de pedidos abre na visão "Precisa de ação", que esconde a maioria dos poupados; para conferir o recorte foi preciso trocar para "Tudo"
- **Próximo charter:** desfazer um registro com o app aberto em outra aba (TC-FUNC-026 passo 3) e a variação M9, numa sessão curta
- **Padrão novo:** nada
