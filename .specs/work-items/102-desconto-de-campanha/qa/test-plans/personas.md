# Personas — 102 · Campanhas de desconto

| ID     | Nome   | Arquétipo                       | Conta        | Jornadas               | Charters                        |
| ------ | ------ | ------------------------------- | ------------ | ---------------------- | ------------------------------- |
| PER-01 | Adri   | usuário avançado                | `admin-loja` | J-01, J-02, J-05, J-06 | CH-01, CH-02, CH-05, CH-06, CH-07 |
| PER-02 | Marina | usuário mobile                  | `anonima`    | J-03                   | CH-03                           |
| PER-03 | Helena | usuário ocasional               | `anonima`    | J-04                   | CH-04                           |
| PER-04 | Rosa   | usuário de tecnologia assistiva | `anonima`    | J-03, J-04             | CH-08                           |

**Não cobertas:** usuário em recuperação (feature nova, sem falha anterior); novo usuário no painel (só a dona
administra, e todo dia).

**Conta `admin-loja`:** a conta com papel de admin do Supabase local (a do `seed.sql`), a mesma no painel e no app
do ateliê. Credencial `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA` — a thread diz onde está.

---

## PER-01 · Adri — usuário avançado (dona do ateliê)

**Objetivo:** pôr a Black Friday no ar com 10, 15 e 20 % nas peças que ela escolheu, montar pedidos de WhatsApp
com o preço da campanha e, no fim, encerrar sem ter mexido em nenhum preço cadastrado.

**Contexto:** faz tudo sozinha, entre uma peça e outra no ateliê em Porto Alegre. Usa o painel todo dia no
notebook e, fora do ateliê, o celular. Conhece Cupons e Promoções; é a primeira vez que vê Campanhas. Quer
preparar a campanha antes do dia e não quer descobrir na véspera que uma peça ficou com o preço errado.

| Atributo      | Valor |
| ------------- | ----- |
| Familiaridade | diária |
| Dispositivo   | desktop (1440 × 900) no ateliê; celular (390 × 844) para conferir e no app do ateliê |
| Rede          | rápida |
| Modalidade    | mouse-teclado; toque no app |
| Locale        | pt-BR, horário de Brasília |
| Paciência     | 30 s para uma gravação; zero para "salvou?" sem resposta |
| Conta         | `admin-loja` · credencial `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA` |

**O que pode atrapalhá-la:**

1. A vigência em data **e** hora: digitar "30/11" e a campanha acabar às 00:00 do dia 30 em vez de 23:59
2. Marcar dezenas de peças uma a uma, ou marcar em lote o percentual errado e não ter como voltar
3. Não saber, pela tela, se a campanha já está valendo na loja ou só "agendada"

**Superfícies:** `/admin/campanhas` (lista, nova, editar), aba **Preço e estoque** do produto, `/admin/produtos`
(filtro e edição em massa), `/admin/home`, montagem do pedido no painel e no app do ateliê, `/admin/pedidos/:id`,
e a própria loja para conferir.

## PER-02 · Marina — usuário mobile (primeira visita)

**Objetivo:** achar uma joia com leite materno em oferta e entender quanto vai pagar antes de decidir.

**Contexto:** viu a Black Friday da loja num story do Instagram, à noite, com o bebê no colo. Nunca abriu a
loja. Celular, uma mão, rede de casa razoável. Não tem pressa para comprar, mas tem pouca paciência para preço
confuso.

| Atributo      | Valor |
| ------------- | ----- |
| Familiaridade | nenhuma |
| Dispositivo   | celular (390 × 844) |
| Rede          | rápida, às vezes lenta |
| Modalidade    | toque |
| Locale        | pt-BR |
| Paciência     | 60 s confusa, sai |
| Conta         | `anonima` |

**O que pode atrapalhá-la:**

1. Faixa da campanha cobrindo as miniaturas de cor, ou tocar na cor e ir parar na página do produto
2. Não entender qual é o preço que vale (o riscado e o novo lado a lado num cartão estreito)
3. Chips de percentual que rolam de lado sem ela perceber que há mais

**Superfícies:** Home (bloco "Joias em oferta"), `/ofertas`, cartões, página do produto.

## PER-03 · Helena — usuário ocasional

**Objetivo:** comprar um pingente em oferta para a irmã e um anel comum para si, usando o cupom de 10 % que
recebeu.

**Contexto:** já comprou uma vez na loja, há meses, sem conta. Alterna celular e notebook — monta a sacola no
celular e fecha no notebook. Confere o total antes de pagar e desconfia de desconto que some.

| Atributo      | Valor |
| ------------- | ----- |
| Familiaridade | ocasional |
| Dispositivo   | celular (390 × 844) para montar a sacola; desktop (1440 × 900) para fechar |
| Rede          | rápida |
| Modalidade    | toque e mouse-teclado |
| Locale        | pt-BR |
| Paciência     | moderada — 90 s num total que não fecha |
| Conta         | `anonima` (compra como convidada) |

**O que pode atrapalhá-la:**

1. O cupom "sumir" ou descontar menos do que ela esperava, sem dizer por quê
2. O total do checkout diferente do total da sacola
3. O preço mudar entre a sacola e o pagamento sem aviso

**Superfícies:** sacola, checkout, cupom, página do pedido (`/pedido/:id`).

## PER-04 · Rosa — usuário de tecnologia assistiva

**Objetivo:** escolher uma joia com as cinzas do marido, numa campanha, entendendo pelo leitor de tela e com a
fonte grande qual é o desconto e o preço final.

**Contexto:** 67 anos, enxerga pouco; usa o celular com a fonte do sistema no máximo e, no computador, navega
pelo teclado. Está de luto — qualquer tom festivo ou de pressa a afasta.

| Atributo      | Valor |
| ------------- | ----- |
| Familiaridade | nenhuma |
| Dispositivo   | celular (390 × 844) com fonte a 200 %; desktop (1440 × 900) só teclado |
| Rede          | rápida |
| Modalidade    | só-teclado · leitor-de-tela (simulado pela árvore de acessibilidade) |
| Locale        | pt-BR |
| Paciência     | presa à tarefa — sai se o anúncio do preço é incompreensível |
| Conta         | `anonima` |

**O que pode atrapalhá-la:**

1. O percentual da faixa cortado com a fonte grande, ou o selo lido como "BLACK FRIDAY menos 20" sem "de desconto"
2. O preço riscado lido sem o "De", parecendo o preço a pagar
3. Chips de percentual sem estado anunciado (qual filtro está ligado)

**Superfícies:** cartões, página do produto, `/ofertas`, sacola e checkout — sempre na campanha em vigência
naquele momento.
