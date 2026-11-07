# Personas — 92 · Desconto da compra casada (Compre Junto)

| ID     | Nome   | Arquétipo   | Conta                         | Jornadas   | Charters   |
| ------ | ------ | ----------- | ----------------------------- | ---------- | ---------- |
| PER-01 | Marina | Usuário mobile (primeira compra) | `anonima` | J-01 | CH-01, CH-02, CH-09 |
| PER-02 | Adri (painel) | Usuário avançado (dona do ateliê) | `admin-painel` | J-02, J-05 | CH-05, CH-06 |
| PER-03 | Adri (ateliê) | Usuário mobile | `admin-painel` | J-06 | CH-07 |
| PER-04 | Helena | Usuário em recuperação | `cliente-loja` | J-03, J-04 | CH-03, CH-04 |
| PER-05 | Sônia | Usuário de tecnologia assistiva | `anonima` | J-01 (secundária), J-03 (secundária) | CH-08 |

**Não cobertas:** usuário novo em desktop (a loja é ~90 % celular; o desktop entra como segunda medida em toda
sessão da loja); locale diferente de pt-BR (a loja só vende no Brasil, em reais). Leitor de tela real (VoiceOver,
TalkBack) fica fora da sessão: a PER-05 é simulada por teclado e pela árvore de acessibilidade.

---

## PER-01 · Marina — Usuário mobile (primeira compra)

**Objetivo:** levar o pingente com a corrente que combina com ele, pagando menos pela corrente, e fechar o pedido
pelo celular sem criar conta.

**Contexto:** abre a loja à noite, pelo celular, a partir de um link do Instagram. Nunca comprou aqui. Perdeu
alguém há pouco tempo, está cansada e quer resolver em poucos toques. Compra como convidada e paga com PIX.
Confere o valor duas vezes antes de pagar.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | nenhuma                                                   |
| Dispositivo   | celular (390 × 844)                                       |
| Rede          | lenta                                                     |
| Modalidade    | toque                                                     |
| Locale        | pt-BR                                                     |
| Paciência     | 60 s confusa numa tela, até desistir                      |
| Conta         | `anonima` — compra como convidada; não precisa de credencial |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. O "de/por" e o "10% a menos levando junto" quebram a linha da peça em 390 e ela não sabe qual é o preço que vai
   pagar.
2. O total da barra fixa, o da sacola e o do checkout não batem — ela desconfia e abandona.
3. Ao tirar a joia da sacola, a corrente continua barata (ou fica cara sem explicação) e ela não entende por quê.

**Superfícies:** `/produtos/:slug` (bloco Compre Junto, barra fixa), gaveta da sacola, `/carrinho`, `/checkout`,
`/pedido/:id/pagamento`, `/pedido/:id`.

## PER-02 · Adri (painel) — Usuário avançado (dona do ateliê)

**Objetivo:** dar um percentual de desconto às correntes de um pingente, ver na hora por quanto elas saem, e depois
conferir quanto cada pedido teve de desconto e o que o desconto custou no relatório de Adesão.

**Contexto:** usa o painel todo dia, no notebook, com a loja aberta em outra aba. Edita vários produtos em sequência
e confia no que a prévia mostra. Não quer que mexer num pingente mude outro.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | diária                                                    |
| Dispositivo   | desktop (1440 × 900)                                      |
| Rede          | rápida                                                    |
| Modalidade    | mouse-teclado                                             |
| Locale        | pt-BR                                                     |
| Paciência     | zero para lentidão; alta para retrabalho que ela mesma causou |
| Conta         | `admin-painel` — papel `admin` do painel · credencial `QA_ADMIN_PAINEL_USUARIO` / `QA_ADMIN_PAINEL_SENHA` (o usuário de desenvolvimento do `supabase/seed.sql` do worktree, só no Supabase local) |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. Digita "10%" ou "10,5" no campo e não entende a recusa, ou o valor some ao salvar.
2. A prévia mostra um preço e a loja outro (a variação escolhida, a faixa da lista).
3. No pedido e na Adesão, os números do desconto não fecham com o total, ou a ordem das linhas é diferente da que
   a cliente vê.

**Superfícies:** `/admin/produtos/:id/editar` (aba "Compre junto"), a página do pedido no painel,
`/admin/compre-junto/adesao`, a loja em outra aba.

## PER-03 · Adri (ateliê) — Usuário mobile

**Objetivo:** antes de separar o pedido, ver no celular que ele teve desconto do Compre Junto e quanto, para a conta
bater com o que a cliente pagou.

**Contexto:** no ateliê, com a mão ocupada, abre o app do ateliê no celular entre uma peça e outra. Olha rápido o
valor e os itens.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | diária                                                    |
| Dispositivo   | celular (390 × 844)                                       |
| Rede          | instável                                                  |
| Modalidade    | toque                                                     |
| Locale        | pt-BR                                                     |
| Paciência     | 20 s por tela                                             |
| Conta         | `admin-painel` — o acesso do app é o mesmo do painel · credencial `QA_ADMIN_PAINEL_USUARIO` / `QA_ADMIN_PAINEL_SENHA` |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. A linha "Desconto do Compre Junto" estoura a largura com a fonte do sistema grande.
2. A corrente aparece duas vezes (com desconto e a preço cheio) e ela acha que o pedido tem uma peça a mais.
3. O valor do app não é o mesmo do painel.

**Superfícies:** `/pedidos` e `/pedidos/:id` no app do ateliê (:8084).

## PER-04 · Helena — Usuário em recuperação

**Objetivo:** comprar dois pingentes para a família com cupom e, quando o valor do pedido mudar no caminho,
entender o que aconteceu e terminar a compra sem pagar a mais.

**Contexto:** já comprou na loja (tem conta criada na primeira compra) e entra por código de e-mail. Monta a sacola
num dia e paga no outro, pelo link do pedido ou por Minha conta. Alterna celular e notebook. Já teve um pagamento
que deu errado em outra loja e desiste ao primeiro sinal de cobrança estranha.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | ocasional                                                 |
| Dispositivo   | celular (390 × 844) e notebook (1440 × 900)               |
| Rede          | rápida                                                    |
| Modalidade    | toque e mouse-teclado                                     |
| Locale        | pt-BR                                                     |
| Paciência     | muito baixa diante de cobrança: qualquer valor que não bate, sai |
| Conta         | `cliente-loja` — cliente sem papel no painel; entra por código de 6 dígitos que cai no Mailpit (:54444) · credencial `QA_CLIENTE_LOJA_USUARIO` (o e-mail; não há senha) |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. Com cupom e promoção, a loja diz que um desconto "ficou de fora" quando não ficou, ou soma os dois.
2. O aviso "o valor mudou" não diz se ela foi cobrada, ou não dá caminho para seguir.
3. Em Minha conta, o resumo do pedido não fecha (Subtotal − descontos + frete ≠ Total).

**Superfícies:** `/produtos/:slug`, gaveta da sacola, `/checkout`, `/pedido/:id/pagamento`, `/pedido/:id`, `/conta`,
o e-mail do pedido no Mailpit.

## PER-05 · Sônia — Usuário de tecnologia assistiva

**Objetivo:** montar o pingente com a corrente e chegar ao checkout só pelo teclado, com a fonte grande, sabendo
quanto vai pagar por cada peça.

**Contexto:** tem baixa visão; usa o notebook com zoom do sistema e navega pelo teclado. Precisa que o preço com
desconto seja dito, não só mostrado riscado.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | nenhuma                                                   |
| Dispositivo   | celular (390 × 844) com fonte a 200 %, e desktop (1440) só teclado |
| Rede          | rápida                                                    |
| Modalidade    | só-teclado                                                |
| Locale        | pt-BR                                                     |
| Paciência     | presa à tarefa; sai se o anúncio é incompreensível        |
| Conta         | `anonima` — não precisa de credencial                     |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. O preço riscado e o preço com desconto são lidos como dois números soltos, sem "de … por …".
2. O aviso "o valor do seu pedido mudou" aparece sem ser anunciado e o foco fica perdido.
3. Com fonte a 200 %, a linha do desconto empurra o total para fora da tela ou o corta.

**Superfícies:** `/produtos/:slug` (bloco), gaveta da sacola, `/checkout`, a tela "o valor do seu pedido mudou".
