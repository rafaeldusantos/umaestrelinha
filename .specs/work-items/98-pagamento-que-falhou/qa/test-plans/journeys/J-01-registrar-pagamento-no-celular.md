# J-01 · Registrar pelo celular o pagamento que a cliente fez por fora, com o comprovante

**Valor:** o PIX que entrou direto na conta da Adri passa a contar como pagamento do pedido — selo da cliente, venda, estoque, cupom, e-mail — e a prova fica guardada.
**Persona:** PER-01 Adri no celular (principal) · —
**Prioridade:** P0
**Critérios de origem:** CA-03.1, CA-03.2, CA-03.2a, CA-03.2b, CA-03.3, CA-03.3a, CA-03.5, CA-03.6, CA-03.8, CA-03.10, RNF-01, RNF-04
**Charters:** CH-01 (CH-03 para o ramo J-01b) · **TC:** TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-FUNC-006, TC-INT-001, TC-UI-001

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| navegação interna (lista de pedidos → pedido)            | `http://localhost:8083/admin/pedidos/:id` (massa M6) | logada como `admin`, 390 × 844, pedido Pendente com pagamento pendente |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | abre o pedido e procura como dizer que a cliente pagou | a ação "Registrar pagamento" no bloco Pagamento ou no próximo passo | 10 s | ação abaixo da dobra | TC-FUNC-001 |
| 2  | toca em "Registrar pagamento" | a tela própria do pedido (`/admin/pedidos/:id/pagamento`), com meio, data e hora já preenchidas com agora, observação e comprovantes | 5 s | — | TC-FUNC-002, TC-UI-001 |
| 3  | escolhe "PIX direto" | lista fixa de cinco meios | 5 s | seletor nativo pequeno | TC-FUNC-002 |
| 4  | toca no campo de comprovante e escolhe a foto da galeria (ou tira com a câmera) | o arquivo listado com o nome, removível | 20 s | câmera não oferecida; HEIC recusado | TC-FUNC-004, TC-UI-001 |
| 5  | escreve uma observação curta ("pagou por PIX direto, combinado no WhatsApp") | o texto no campo | 15 s | teclado cobre o botão | — |
| 6  | confirma | o portão de aviso: mandar ou não o e-mail à cliente | 5 s | — | TC-INT-001 |
| 7  | escolhe mandar o e-mail e confirma | volta ao pedido; status "Pago"; bloco Pagamento com o registro; histórico "Pagamento registrado manualmente" com o nome dela e a hora | 10 s | não saber se gravou | TC-JOURNEY-001 |

**Tempo total esperado:** ~70 s — dentro da paciência da persona (90 s).

## Objetivo

- **Observável:** o pedido em "Pago", o pagamento aprovado com a data informada, o bloco Pagamento com meio, data, quem registrou, observação e o comprovante, e a linha do histórico.
- **Efeitos colaterais:** e-mail "pagamento confirmado" à cliente no Mailpit (ou "instruções do material", se o pedido espera material); nenhum aviso interno à dona; a venda no Dashboard e na Início; estoque e cupom baixados uma vez.

## Saída

- **Natural:** a página do pedido, com a próxima ação de sempre ("Separar").

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-01a | 4 | a foto tem mais de 10 MB, é GIF, ou ela anexa um quarto arquivo | tenta de novo com outro arquivo | recusa antes de gravar, com o motivo; o que já estava preenchido continua | TC-FUNC-004 |
| J-01b | 7 | o pedido foi pago (pela loja ou por outra aba) enquanto o formulário estava aberto | confirma mesmo assim | a tela diz que o pedido já está pago; nada é registrado nem guardado | TC-FUNC-006 |
| J-01c | 7 | a rede cai no envio, ou ela toca duas vezes | toca de novo / recarrega | um registro só; sem estoque ou cupom repetidos; retorno claro do que aconteceu | TC-FUNC-005, TC-CFR-001 |
| J-01d | 2 | põe uma data de amanhã, ou anterior à criação do pedido | confirma | recusa com o motivo, antes de gravar | TC-FUNC-003 |

## Fronteiras

Storage privado (os comprovantes), motor de e-mail (Mailpit), Mercado Pago (o registro fecha a cobrança em
aberto — no ambiente local responde "não fechada").

## Modos de falha

- O comprovante sobe e o registro falha (ou o contrário): prova sem pagamento, ou pagamento sem prova
- O pedido fica "Pago" sem o pagamento aprovado, ou aprovado sem a data
- O e-mail sai sem a Adri ter escolhido, ou o aviso interno sai para ela mesma
