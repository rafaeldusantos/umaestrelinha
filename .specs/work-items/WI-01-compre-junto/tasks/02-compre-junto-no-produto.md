## 02 · [apps/backoffice, supabase] Compre junto no formulário do produto (aba "Compre junto")

**Status:** done

`UC-02` — WI-01

**Objetivo.** A dona configura, na tela do produto, até três adicionais (peça só ou lista), com variações liberadas, ordem e as variações do principal em que cada um some, e o Compre Junto antigo é convertido.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy, › Feature-Sliced Design; `packages/core/CLAUDE.md` › Quando um código pertence ao pacote, › Pureza, › Os módulos; `apps/backoffice/CLAUDE.md` › O fornecedor da peça, › `/admin/perguntas`, › O editor de Produtos em destaque, › A busca de produto, › O movimento do painel; `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram (e, na tarefa do pedido, › `checkout`). Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Painel — aba "Compre junto"), §4 — Código, §7 — Decisões

**Depende de.** a tarefa 01 deixou pronto o schema dos adicionais, os tipos e `core/buy-together` (recusas). Confira que existem.
**Habilita.** nada na fila; o `drop column` fica para depois do deploy.

### Critérios de aceite

**UC-02 · A dona monta o Compre Junto de um produto**
Na tela do produto no painel, a dona acrescenta até três adicionais. Para cada um ela escolhe um produto (e quais variações dele valem) ou uma lista do Compre Junto e grava.
- CA-02.1 O painel permite no máximo 3 adicionais por produto. A 4ª tentativa é recusada com o motivo escrito, não com um botão apagado [pedido; código: `packages/core/src/home/featured.ts:46-62` como molde de recusa]
- CA-02.2 Um adicional do tipo "produto" guarda um produto e as variações dele que a dona liberou; nenhuma marcada vale todas as ativas [pedido; gate Q-07]
- CA-02.3 Um adicional do tipo "lista" aponta para uma lista do Compre Junto [gate Q-02]
- CA-02.4 A dona ordena os adicionais do produto [pedido]
- CA-02.5 O próprio produto principal não pode ser escolhido como adicional; um produto já escolhido aparece desabilitado com o motivo [código: `apps/backoffice/src/features/product-form/ui/RelatedProductsSelect.tsx:42-46`]
- CA-02.6 Gravar o produto não apaga nem altera o Compre Junto de outro produto [conhecimento]
- CA-02.7 Um adicional que aponta para produto inativo ou apagado aparece marcado no painel ("saiu do ar") e é pulado pela loja [código: `apps/backoffice/CLAUDE.md` › "A vaga que sobra fica VAZIA, e o painel AVISA"]
- CA-02.8 O Compre Junto antigo do produto (a lista simples que o painel grava hoje) é convertido: cada peça vira um adicional do tipo "produto", até 3, antes de a forma antiga deixar de existir [gate Q-03; código: `AdminProductFormPage.tsx:1052-1054`]
- CA-02.9 Em cada adicional, a dona pode marcar em quais variações do principal ele some (ex.: some quando a cliente escolhe "Chaveiro") [PRD Tech Review r1]


### Design — o que a tela faz

### Painel — aba "Compre junto" do produto (UC-02)

- **Esqueleto:** migalha "Produtos › <nome>"; cabeçalho com foto, nome, selo "Ativo", subtítulo "R$ 189,00 · Tipo de elo: …", "Ver na loja"; aba "Compre junto" (marca "novo") ao lado de Geral, Perguntas, Preços & variações, SEO, Relacionados; faixa de conversão (opcional); coluna principal: cartão com "n de 3 adicionais", texto de apoio, lista numerada de adicionais, "Acrescentar um adicional" e a recusa; lateral "Na loja" e "Quando a peça sai do ar"; barra de salvar.
- **Cada adicional:** número, nome como a loja mostra ("Adicional N" enquanto nada foi escolhido), Subir/Descer/Tirar; alternador "O que a cliente escolhe": "Uma peça de uma lista" (padrão ao acrescentar) ou "Uma peça só"; tipo lista: rádio entre as listas (fotos até 3, nome, "N peça(s) · em uso em N joia(s)" ou "em nenhuma joia"; "Lista sem peças" desabilitada), com "Editar a lista “X”" e "Criar uma lista nova"; tipo produto: busca de produto (mín. 2 caracteres, até 8 resultados; resultado desabilitado com "É esta joia", "Já está em outro adicional", "Fora do ar") ou a peça escolhida com "Trocar" (desfaz a escolha e zera as variações) e as variações oferecidas; "Some quando a cliente escolhe": marcadores das variações do principal (com seleção: "Com X ou Y escolhido nesta joia, este adicional sai do bloco."; sem: "Nenhuma marcada: o adicional aparece em todas as variações desta joia. Marque, por exemplo, Chaveiro numa oferta de corrente.").
- **Recusas e avisos:** 4ª tentativa — "Cada joia leva até 3 adicionais. Tire um para acrescentar outro." (some ao tirar um); adicional incompleto — a barra diz "1 adicional está sem lista ou peça." (ou "N adicionais estão sem lista ou peça.") e o Salvar fica desabilitado; lista que contém o principal — "Esta joia está na lista e é pulada aqui: ela nunca é oferecida junto de si mesma."; sem adicionais — "Sem Compre Junto. A página desta joia fica como hoje, sem o bloco."; convertido do antigo — faixa "O Compre Junto antigo desta joia foi trazido para cá: as 2 peças viraram adicionais de uma peça só. Confira as variações oferecidas e salve." (os convertidos vêm como tipo produto, sem variações marcadas, sem "some com"); lateral "Quando a peça sai do ar": a loja pula o adicional sem quebrar a página, o painel o marca, e se todas as variações escolhidas deixarem de existir ele também sai, nunca passa a oferecer todas. Toast "Compre Junto salvo.".
- **Não mostra:** o selo "saiu do ar" em adicional de produto na aba (só aparece no editor de lista e no índice; CA-02.7 exige — a tarefa o desenha pelo design system); estados de carregando e de erro; destino dos links "Editar a lista" e "Criar uma lista nova" e o que fazem com alterações não salvas do produto; o campo "Desconto ao levar junto" do protótipo ("WI 92 · depois") **não** entra.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| tabela de adicionais por produto, tabelas de listas e peças, tipos do banco, `core/buy-together` (tetos e recusas) | JÁ EXISTE (tarefa 01). Consuma; não altere. | — | — |
| migration de conversão de `products.buy_together_ids` em adicionais (até 3, na ordem do array, tipo produto, ids inexistentes descartados, idempotente) | VOCÊ CRIA | array antigo | linhas de adicionais |
| editor de adicionais na aba "Compre junto" do formulário do produto; carga, snapshot e gravação depois do produto | VOCÊ CRIA | adicionais do formulário | linhas gravadas por produto |
| card e campo `buy_together_ids` no painel (`AdminProductFormPage.tsx`, `useProductForm.ts`, `useAdminProducts.ts`, fixture `useProductForm.test.ts`) | VOCÊ REMOVE do painel — a coluna **continua no banco** | — | — |

### Decisões já tomadas

- (#11, `variacoes-liberadas-que-deixam-de-existir`) **D-variacoes-liberadas-que-deixam-de-existir** — "nenhuma marcada vale todas" só quando a dona não marcou nenhuma; se todas as liberadas deixarem de existir, o adicional (ou a peça da lista) sai da loja e o painel avisa; nunca passa a valer todas. **Consequência de modelagem:** variações liberadas guardadas como lista de ids sem FK com cascata (um `on delete cascade` deixaria zero linhas e seria lido como "todas") — inferência do code lookup, a confirmar na tarefa
- (#13, `marca-acompanha-carrinho-e-order-items`) **D-marca-acompanha** — campo opcional no item do carrinho (`estrelinha-cart` v3→v4 preservando; chave inalterada), frase derivada na renderização; `create-order` grava `order_items` por lista explícita de colunas (molde `COLUNAS_DO_PEDIDO`) e descarta a marca cujo principal não está no pedido; a marca guarda principal e lista (CA-06.1). Preço segue recalculado no servidor
- (#16, `estado-de-compra-por-adicional-e-gravacao`) **D-estado-de-compra** — regra pura "o conjunto pode ser levado?" em `entities/product/lib` (ou `core` se o painel validar); `EngravingField` parametrizado por id; `add_to_cart` com vários itens em `core/analytics`. O botão único faz a barra fixa conhecer o conjunto
- (#17, `guardas-que-a-feature-toca`) **D-guardas** — por tarefa: `semMaterialNaPaginaDoProduto` (escopo literal, incluir o widget novo), `marcacaoSoPorAcao` (RPC nova), `animacaoRespeitaMovimento`, `rotasSobGuarda`/`navItems`/`focusRoutes`, `buscaDeProdutoComDonoUnico`, fixtures com `buy_together_ids`, e o guarda de schema novo (uma régua por comando, `mutar()` que lança)
- (#18, `conversao-e-queda-de-buy-together-ids`) **D-buy-together-ids** — duas etapas: (1) tabelas novas + conversão idempotente (até 3, na ordem do array) + painel sem a coluna; (2) depois do deploy do painel, `drop column`. O usuário confere a contagem em produção antes do deploy (banco local: 0 de 734)
- (#19, `gravacao-do-compre-junto-no-formulario-do-produto`) **D-gravacao-no-formulario** — recusas puras em `core/buy-together` (retorno `string \| null`); adicionais gravados recortados pelo principal; probe HTTP contra o banco local (`AD-012`)

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| gravar relação depois do produto, sem transação, upsert antes de apagar | `apps/backoffice/src/features/product-form/model/persistSupplier.ts` › o upsert antes do apagar (90); `persistProduct.ts` › `persistProductRelations` (200); chamada em `pages/admin/AdminProductFormPage.tsx` (449-493) |
| aba nova no formulário do produto | `AdminProductFormPage.tsx` — o card "Compre junto" e a aba "Relacionados" (1047-1055); carga e snapshot em `features/product-form/model/useProductForm.ts` (144, 155, 213, 404-412) e `markSaved` (`AdminProductFormPage.tsx` 501-509) |
| escolha de produto desabilitado com motivo | `features/product-form/ui/RelatedProductsSelect.tsx` (35-48) e `entities/product/ui/ProductSearchField.tsx` |
| recusa pura | `packages/core/src/home/featured.ts` › `featuredProductsRefusal` |
| migration idempotente com backfill declarado | `menuSchema.test.ts` (o molde do guarda: `NOT value ?` / `do nothing`) e o precedente da migration da feature 39 |

### Testes

- Recusa do 4º adicional e produto principal não escolhível, com o motivo escrito, vinda de `core/buy-together` (nível: unidade e componente).
- Gravar um produto grava só os adicionais dele e não altera os de outro; falha no meio não deixa o produto sem nenhum (nível: unidade do `persist…`, no molde de `persistSupplier`).
- Aba "Compre junto" pela página real do produto: acrescentar, ordenar, escolher lista ou peça, liberar variações, marcar onde some, "saiu do ar" no adicional de produto, adicional incompleto desabilita o Salvar (nível: página real).
- Conversão de `buy_together_ids`: até 3 na ordem, ids inexistentes descartados, idempotente (nível: probe `psql` no banco local, mais guarda de schema da migration com uma régua por comando).
- Nenhum envio do painel nomeia `buy_together_ids` (nível: guarda que lê disco, âncora de arquivos).
- Gravação provada por probe HTTP contra `:54441` (nível: integração no banco local, `AD-012`).

### Obrigações

- **A coluna `buy_together_ids` sai do painel, não do banco**: depois desta tarefa nenhum `insert`/`update` do painel a manda (senão `PGRST204` depois do `drop column`, que é uma migration futura e **não** nasce aqui). Limpe o fixture do painel que a nomeia (`useProductForm.test.ts`); o fixture da loja (`cardSelect.test.ts`) é da tarefa 03, na mesma onda.
- Aplique a migration só no local e prove a conversão por probe `psql`: até 3, ordem, ids inexistentes descartados, segunda execução sem efeito. A contagem de produção é conferida pelo usuário antes do deploy; **não** consulte produção.
- Gravar um produto grava só os adicionais **dele** (CA-02.6); falha no meio não deixa o produto sem nenhum (upsert antes de apagar).
- A recusa do 4º adicional e a validação da peça saem de `core/buy-together`, antes de qualquer escrita; probe HTTP contra `:54441` para a gravação (`AD-012`).
- O selo "saiu do ar" em adicional de produto não está desenhado: faça pelo design system, no molde do editor de lista (tarefa 01).
- `animacaoRespeitaMovimento` (escopo literal) e `buscaDeProdutoComDonoUnico` valem; e a suíte da loja entra na medição (os guardas dela varrem `apps/**`).
- Documente em `apps/backoffice/CLAUDE.md` a aba e a gravação.

### Não faça

- A tela de Listas e as tabelas (tarefa 01); o bloco da loja (03).
- O campo de desconto do protótipo ("WI 92 · depois").
- `drop column buy_together_ids`.
- O aviso de "corrente já é variação do principal" (fora do PRD).

### Pronto quando

- [ ] a dona acrescenta até 3 adicionais, ordena, escolhe lista ou peça, libera variações, marca onde o adicional some, e grava; a 4ª tentativa é recusada com o motivo escrito
- [ ] o principal não é escolhível como adicional; peça já escolhida aparece desabilitada com o motivo
- [ ] gravar um produto não altera o Compre Junto de outro (teste)
- [ ] conversão provada por probe no banco local, idempotente
- [ ] nenhum arquivo do painel manda `buy_together_ids`
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório tocado (tipos do workspace e a suíte do workspace com `--testTimeout=20000` sem o `--`; e a suíte da loja quando o painel mudou), sem comandos copiados aqui: estão em `CLAUDE.md` › Comandos e › Baselines e em `.specs/project/PROJECT.md` › Comandos de verificação


---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
