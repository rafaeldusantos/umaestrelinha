# 35 · A medição dos dois arquivos

Tudo aqui foi **medido** em 2026-08-30 contra os dois CSV exportados do painel da Nuvemshop, e
contra o catálogo real (692 produtos lidos da API, que o token alcança). Nenhum número desta página
é estimativa. A spec se apoia nesta página; se um número mudar, a spec muda junto.

Arquivos: `Vendas-3bbbadc0…csv` · `clientes-4f7c0f81…csv`

---

## Por que CSV e não API

O plano original lia `/orders` e `/customers`. **Não vai acontecer**: o plano da loja é o
**Essencial**, e "Aplicativos sob medida" — que é onde se marcam os escopos `read_orders` e
`read_customers` — é recurso dos planos Escala e Next. O token existente segue valendo para
`/products` e `/categories`, que é o que o casamento de item precisa.

**Consequência boa**: a feature deixa de ter bloqueio externo. **Consequência ruim**: o CSV não tem
`product_id` nem id de item, e é aí que mora quase todo o custo desta feature.

---

## O arquivo de vendas

| Medida | Valor |
| --- | --- |
| Colunas | 60 |
| Linhas de dados | 243 |
| **Pedidos** (linhas com `Data` preenchida) | **70** |
| Linhas de continuação (itens 2..n) | 173 |
| Encoding | **Latin-1**, não UTF-8 — `Não está embalado` chega como `N\xE3o est\xE1` se lido como UTF-8 |
| BOM | **não** — o arquivo abre em `22 4e fa` (`"Núm` em Latin-1). E decodificando Latin-1 um `U+FEFF` é **inalcançável por construção**, então o parser não corta BOM: quem protege é a conferência de cabeçalho |
| Delimitador | `;` · decimal `.` · datas `dd/mm/yyyy hh:mm:ss` |

**A linha não é o pedido — o pedido são N linhas.** A primeira carrega tudo; as seguintes têm
**só** `Número do Pedido`, `E-mail`, `Nome do Produto`, `Valor do Produto`, `Quantidade Comprada`,
`SKU` e `Produto Fisico`. Ler o arquivo linha a linha produz 243 pedidos em vez de 70.

**`Código de rastreio do envio` vem escapado para Excel**: `="AD779152389BR"`, e vazio é `=""`.
Gravar cru põe uma fórmula de planilha no campo que o painel mostra para a cliente.

---

## Os dois negócios no mesmo arquivo

| Faixa | Período | O que é | Pedidos |
| --- | --- | --- | --- |
| **#100–134** | abr–jun/2025 | Loja de **artigos religiosos** — quartinhas, velas votivas, guias, ferramentas de assentamento, imagens de orixás, charutos | 35 |
| **#135–169** | jul/2025–ago/2026 | **Uma Estrelinha** — joias afetivas em resina | 35 |

O corte é exato entre `#134` (30/06/2025, "Bala de revolver para ferramenta assentamento") e `#135`
(03/07/2025, "Joia afetiva árvore da vida com leite materno, cabelo e coto umbilical").

**Zero e-mail em comum entre os dois lados** — 33 clientes de um, 33 de outro, interseção vazia. São
duas bases de clientes distintas na mesma loja Nuvemshop, exatamente como este repositório foi uma
loja anterior antes da `20`.

> **Decisão do usuário (2026-08-30): importar só `#135–169`.** Os 35 da loja anterior e os 32
> clientes exclusivos dela ficam de fora. Os 4 PIX que expiraram **entram**, porque aconteceram.

---

## O recorte importado — #135 a #169

| Medida | Valor |
| --- | --- |
| Pedidos | **35** |
| Itens | **59** |
| Clientes distintos (por e-mail) | **33** |
| Período | 03/07/2025 a 20/08/2026 |
| Faturamento somado | **R$ 15.282,90** |
| Pedidos sem e-mail | **0** |
| Pedidos sem telefone | **0** |
| Pedidos com rastreio | 23 de 35 |
| `Subtotal` que **não** fecha com a soma dos itens | **0** |
| Pedidos cancelados | **0** — os 4 do arquivo estão todos na faixa da loja anterior |

---

## O de-para, aplicado ao dado real

O CSV traz os três eixos **em português**, e o vocabulário observado é fechado:

- `Status do Pedido`: `Aberto` · `Arquivado` · `Cancelado`
- `Status do Pagamento`: `Confirmado` · `Recusado` · `Pendente`
- `Status do Envio`: `Não está embalado` · `Pronto para enviar` · `Enviado` · `Entregue`

**Só 5 triplas aparecem** nos 35 pedidos importados:

| n | `Status do Pedido` | `Status do Pagamento` | `Status do Envio` | → `status` | → `payment_status` |
| --: | --- | --- | --- | --- | --- |
| 22 | Aberto | Confirmado | Entregue | `delivered` | `approved` |
| 4 | Aberto | Confirmado | Não está embalado | `paid` | `approved` |
| 4 | Aberto | Confirmado | Enviado | `shipped` | `approved` |
| 4 | Arquivado | **Recusado** | Não está embalado | `pending` | **`expired`** |
| 1 | Arquivado | Confirmado | Entregue | `delivered` | `approved` |

**Distribuição de destino**: `delivered` 23 · `paid` 4 · `shipped` 4 · `pending` 4 —
`approved` 31 · `expired` 4.

### `Recusado` é ambíguo, e o próprio arquivo desfaz a ambiguidade

`Recusado` aparece 6× no arquivo inteiro e cobre **duas** coisas diferentes:

| Caso | Como se distingue | Destino |
| --- | --- | --- |
| PIX que expirou (4 no arquivo, os 4 na faixa importada) | `Meio de pagamento = Pix`, `Vencimento do pagamento` preenchido, `Data de pagamento` **vazia** | `expired` |
| Cartão recusado (2, ambos na faixa descartada) | `Meio de pagamento = Cartão de crédito`, `Parcelas` preenchido, sem `Vencimento` | `rejected` |

Mapear os dois para o mesmo estado apagaria a diferença entre "ninguém pagou o boleto" e "o cartão
foi negado" — e as duas pedem ação diferente da Adri. **Ambos os destinos ficam na tabela**, mesmo
que `rejected` não seja produzido por este recorte: o mapeamento tem de continuar certo se o arquivo
for reexportado.

### `separating` continua sem ser produzido

Nenhuma das quatro formas de `Status do Envio` significa "estou montando agora". `Pronto para
enviar` chega perto, mas aparece **1×** e na faixa descartada.

---

## O casamento de item com o catálogo — o custo real do CSV

**O arquivo não tem `product_id`.** Só `Nome do Produto` (com a variação entre parênteses, às vezes
aninhados) e `SKU`. Medido contra os 692 produtos reais:

| Como casou | Itens | % |
| --- | --: | --: |
| Nome completo, exato | 7 | 11,9% |
| Nome **sem o grupo de parênteses final balanceado** | 17 | 28,8% |
| SKU **único** no catálogo | 6 | 10,2% |
| **SKU ambíguo** (aponta para >1 produto) | 14 | 23,7% |
| Órfão | 15 | 25,4% |

**`SKU` não é chave nesta loja**: 939 SKUs distintos, **61 deles apontam para mais de um produto**.
Aceitar SKU ambíguo daria 74,5% de casamento — e **23,7% dos itens ficariam ligados ao produto
errado**, em silêncio. Vínculo errado é pior que vínculo nenhum: o snapshot do item continua certo
de qualquer jeito, e é ele que a tela mostra.

**Regra adotada: casa por nome exato → nome sem a variação → SKU único. SKU ambíguo é órfão.**
Taxa confiável: **50,8%** (30 de 59).

### A taxa depende da idade do pedido, e isso importa mais que a média

| Período | Casam |
| --- | --- |
| 2025 (jul–dez) | 9 de 27 — **33%** |
| 2026 (jan–ago) | 21 de 32 — **66%** |
| **Os 4 pedidos que entram na fila de material** | **13 de 13 — 100%** |

A causa é conhecida: os produtos foram **renomeados** no rebranding. "Joia afetiva com cinzas de
cremação coração" (2025) é hoje "Joia Afetiva Coração Encapsulado com Cinzas de Cremação". Pedido
velho carrega o nome velho, e nenhuma chave sobreviveu à renomeação.

**A consequência é boa**: o histórico antigo perde o vínculo (mas mantém nome, preço e quantidade —
que é o que se olha num pedido de 2025), e **o trabalho em aberto casa inteiro**.

---

## A fila de material — 4 pedidos, e por quê

`initialMaterialStatus` sozinho poria **8** pedidos na fila: os 4 pagos em aberto **e** os 4 PIX
expirados, porque todos têm item que exige material. Os expirados nunca foram pagos — cobrar
material deles seria a Adri esperando um envelope de quem não comprou.

**Regra: só entra na fila quem tem `payment_status = 'approved'` e `status` não terminal.** Sobram
exatamente 4:

| Pedido | Data | Itens | Cliente |
| --- | --- | --: | --- |
| #169 | 20/08/2026 | 1 | Lucas Consença |
| #166 | 15/07/2026 | 4 | Aline Cardoso |
| #165 | 14/07/2026 | 3 | Rachel da Silva |
| #163 | 13/07/2026 | 6 | Viviane Santos |

---

## O arquivo de clientes

| Medida | Valor |
| --- | --- |
| Colunas | 23 |
| Linhas | 79 |
| Com ao menos uma compra | 63 |
| **Sem compra nenhuma** | **16** — cadastro de newsletter, contas internas |
| Aparecem em pedido #135–169 | **33** |
| Aparecem só em #100–134 | 32 |
| Não aparecem em pedido algum | 14 |
| Contas internas/teste | 6 (`@aproximma.com.br` ×3, `@anon.com`, `naoinformado`, `sarakalifloraoficial`) |
| **E-mails de pedido #135–169 ausentes do arquivo de clientes** | **0** |

**Os pedidos bastam.** Todo cliente do recorte já aparece no arquivo de vendas, com nome, CPF,
telefone e endereço. Por `AD-023`, nada é escrito em `public.customers`: a pessoa é **derivada** dos
pedidos pela view `customer_directory`. O arquivo de clientes entra como **conferência** (provar que
os 33 fecham) e como fonte da seção `clientes sem pedido` do relatório.
