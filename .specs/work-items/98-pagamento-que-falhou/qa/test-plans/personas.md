# Personas — 98 · O pagamento que falhou

| ID     | Nome   | Arquétipo   | Conta                         | Jornadas   | Charters   |
| ------ | ------ | ----------- | ----------------------------- | ---------- | ---------- |
| PER-01 | Adri no celular | usuário mobile | `admin` | J-01, J-07 | CH-01, CH-06, CH-07 |
| PER-02 | Adri no computador | usuário avançado | `admin` | J-02, J-03, J-04 (gera o link) | CH-03, CH-05 |
| PER-03 | Cliente que voltou ao pedido | usuário em recuperação | `cliente` | J-05, J-06 | CH-04 |
| PER-04 | Cliente que recebeu o link pelo WhatsApp | novo usuário | `anonima` | J-04 | CH-02 |

**Não cobertas:** usuário de tecnologia assistiva como persona própria — a tela nova é de uso da dona, e a
checagem de teclado e de nomes acessíveis vai no CFR (CH-07), sem leitor de tela real. Usuário ocasional
— a dona usa o painel todo dia; a cliente que volta de vez em quando é a PER-03.

As duas primeiras são a mesma pessoa em dois modos de uso: a loja tem ~90 % de acesso pelo celular e a
dona registra pagamento de onde estiver (PER-01), mas confere, desfaz e opera em lote no computador
(PER-02). Mesma conta, sessões separadas.

---

## PER-01 · Adri no celular — usuário mobile

**Objetivo:** registrar, de onde estiver, o PIX que a cliente mandou direto para a conta dela, com a foto
do comprovante tirada ali mesmo, e ver o pedido seguir como pago.

**Contexto:** no ateliê ou na rua, com o celular numa mão; a cliente acabou de mandar pelo WhatsApp o
print do PIX. Quer resolver em menos de dois minutos e voltar à bancada. Usa o painel todo dia e o app do
ateliê para acompanhar pedidos.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | diária                                                    |
| Dispositivo   | celular (390 × 844 — o alvo do projeto)                   |
| Rede          | instável (4G no trajeto)                                  |
| Modalidade    | toque                                                     |
| Locale        | pt-BR, fuso de Brasília                                   |
| Paciência     | 90 s até desistir e deixar "para depois"                  |
| Conta         | `admin` · credencial `QA_ADMIN_USUARIO` / `QA_ADMIN_SENHA` |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. O campo de comprovante não oferece a câmera, ou a foto do celular (HEIC, ou grande) é recusada sem dizer por quê
2. O seletor de data e hora no celular é difícil de acertar, ou a hora aparece em outro fuso
3. O botão de confirmar fica abaixo da dobra, ou o portão do e-mail cobre a tela, e ela não sabe se gravou

**Superfícies:** `/admin/pedidos/:id`, `/admin/pedidos/:id/pagamento`, Configurações › Notificações (painel, 390); app do ateliê `/pedidos/:id` e Início (:8084).

## PER-02 · Adri no computador — usuário avançado

**Objetivo:** conferir os pagamentos registrados, desfazer o que foi registrado no pedido errado, gerar o
link de cartão para a cliente e destravar pedidos em lote sem marcar nenhum como pago por engano.

**Contexto:** fim do dia, no notebook, com a lista de pedidos numa aba e dois ou três pedidos abertos em
outras. Opera rápido e confia no que o painel diz; um "Pago" que não é pago vira estoque e venda errados.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | diária                                                    |
| Dispositivo   | desktop (1440 px)                                         |
| Rede          | rápida                                                    |
| Modalidade    | mouse-teclado                                             |
| Locale        | pt-BR                                                     |
| Paciência     | 20 s para lentidão; alta para tela feia                   |
| Conta         | `admin` · credencial `QA_ADMIN_USUARIO` / `QA_ADMIN_SENHA` |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. Duas abas do mesmo pedido: uma registra, a outra mostra estado velho e deixa registrar de novo
2. O lote "Avançar status" pula pedidos sem dizer quais nem por quê
3. "Desfazer" some sem explicação quando o pedido já avançou, ou o motivo é esquecido e ela não sabe o que faltou

**Superfícies:** `/admin/pedidos`, `/admin/pedidos/:id` (bloco Pagamento, próximo passo, "Outro status", histórico, link de cartão, cancelar), `/admin/pedidos/:id/pagamento`, Dashboard.

## PER-03 · Cliente que voltou ao pedido — usuário em recuperação

**Objetivo:** pagar o pedido cujo PIX venceu ou cujo cartão falhou — ou, se já não dá, saber o que
aconteceu com ele e com quem falar.

**Contexto:** encomendou uma joia com material de alguém que perdeu; o pagamento não passou e ela volta
dias depois, pelo celular, em `/conta`. Qualquer sinal de cobrança ou de falha repetida a faz desistir.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | ocasional                                                 |
| Dispositivo   | celular (390 × 844)                                       |
| Rede          | lenta                                                     |
| Modalidade    | toque                                                     |
| Locale        | pt-BR                                                     |
| Paciência     | 45 s até fechar e mandar mensagem                         |
| Conta         | `cliente` · credencial `QA_CLIENTE_USUARIO` / `QA_CLIENTE_SENHA` |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. Não acha onde pagar de novo, ou acha uma oferta que não serve (pagar por cartão sozinha, trocar para PIX)
2. A frase soa como cobrança ("último aviso", prazo em destaque) num momento de luto
3. O pedido aparece cancelado sem dizer por quê nem o que fazer agora

**Superfícies:** loja `/conta`, `/pedido/:id`, `/pedido/:id/pagamento` (só a chegada).

## PER-04 · Cliente que recebeu o link pelo WhatsApp — novo usuário

**Objetivo:** pagar com outro cartão o pedido cujo cartão foi recusado, abrindo o link que a Adri mandou,
sem criar conta nem refazer a compra.

**Contexto:** comprou como convidada; o cartão foi recusado e ela pediu ajuda pelo WhatsApp. Abre o link
dentro do próprio WhatsApp, no celular, sem nunca ter entrado na loja logada. Desconfia de link de
pagamento: precisa reconhecer o pedido (peça e valor) antes de digitar o cartão.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | nenhuma                                                   |
| Dispositivo   | celular (390 × 844), navegador do WhatsApp                |
| Rede          | lenta                                                     |
| Modalidade    | toque                                                     |
| Locale        | pt-BR                                                     |
| Paciência     | 60 s confusa, e volta ao WhatsApp                         |
| Conta         | `anonima`                                                 |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. O link pede login ou cadastro, ou mostra outra compra
2. Não reconhece o pedido (sem peça, sem valor) e não confia em digitar o cartão
3. Abre um link antigo e vê um erro técnico em vez de "fale com a loja"

**Superfícies:** loja `/pagar-com-cartao#<código>`.
