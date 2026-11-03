## 07 · [apps/backoffice, apps/store, packages/core] A dona escolhe a forma do bloco na loja

**Status:** done

`UC-09` — WI-01

**Objetivo.** A dona escolhe no menu Compre Junto como o bloco abre as escolhas na loja — "Na linha", "Em folha" ou "Com fórmula" — e a loja passa a desenhar a forma escolhida, com "Na linha" como padrão.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy, › Feature-Sliced Design; `apps/store/CLAUDE.md` › Página do produto, › Carrinho, chrome e checkout, › Material afetivo e Gaveta de material, › A home não salta; `apps/backoffice/CLAUDE.md` › O fornecedor da peça, › `/admin/perguntas`, › O editor de Produtos em destaque, › A busca de produto, › O movimento do painel; `packages/core/CLAUDE.md` › Quando um código pertence ao pacote, › Pureza, › Os módulos. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Loja, formas do bloco; Painel — forma do bloco), §7 — Decisões

**Depende de.** as tarefas 01 (página do menu Compre Junto) e 03 (bloco da loja) deixaram o que você consome. Confira que existem.
**Habilita.** 06 (a nota da forma do bloco na documentação da loja).

### Critérios de aceite

**UC-09 · A dona escolhe a forma do bloco na loja**
No menu Compre Junto do painel, a dona escolhe como o bloco abre as escolhas de cada adicional na página do produto.
- CA-09.1 O menu Compre Junto do painel tem a escolha entre três formas — "Na linha" (marcar a peça abre as escolhas ali mesmo), "Em folha" (as escolhas abrem numa folha no celular e num diálogo no computador, com o botão "Incluir no conjunto") e "Com fórmula" (a forma "Na linha" com uma faixa "Esta joia + <adicional> + …" acima da lista) — e a escolha vale para a loja inteira [gate principal 2026-11-02 · forma-do-bloco; premissa: uma configuração só, para todos os produtos]
- CA-09.2 Sem escolha gravada, a loja usa "Na linha" [gate principal 2026-11-02 · forma-do-bloco]
- CA-09.3 Trocar a forma muda só a apresentação das escolhas: as regras de UC-03 e UC-04 valem iguais nas três [gate principal 2026-11-02 · forma-do-bloco]
- CA-09.4 Um valor gravado que não seja uma das três formas é tratado como "Na linha", e a página não quebra [conhecimento]
- CA-09.5 Em "Em folha", o foco vai ao título da folha ao abrir, Esc fecha e o foco volta ao controle que a abriu; em "Com fórmula", a faixa não traz informação que a lista não tenha e fica fora do leitor de tela [protótipo do Claude Design (Loja); conhecimento]


### Design — o que a tela faz

### Loja — Página do produto com o bloco Compre Junto (UC-03, UC-04, UC-07)

- **Função:** a cliente monta o conjunto (principal mais até três adicionais) na coluna de informação e o leva por um botão único.
- **Esqueleto da coluna de informação, em ordem:** categoria e nome; preço da variação do principal; linhas do PIX e das parcelas; seletores de variação do principal; campo de gravação do principal (com "Com gravação = Sim"); **bloco Compre Junto**; linha de estoque; botão de compra (a partir de 1024 px, ao lado do seletor de quantidade); aviso de erro do botão; nota "A joia e N peças marcadas · total" (só no computador e só com conjunto); linha "Como enviar seu material de DNA" e o acordeão.
- **Bloco:** cabeçalho "Compre junto" e a frase de abertura (CA-03.14); uma linha por adicional (caixa de marcar, foto, nome — da lista ou do produto, sem título próprio —, resumo da escolha com partes separadas por "·", preço, link de abrir quando há escolha); painel de escolhas quando a linha está marcada ou aberta; rodapé de total, só com ao menos um adicional marcado.
- **Dados:** nome do adicional; foto (no tipo lista, da peça selecionada); preço da variação escolhida (nunca "a partir de"); resumo ("Levar junto: <nome>, <resumo>" é o nome acessível da caixa); rótulo "Escolha a corrente · N modelos" e link "Ver os N modelos"; opção esgotada desabilitada, peça sem combinação vendável omitida; total = principal × quantidade + adicionais marcados (1 cada); PIX = total × (1 − percentual do PIX), ao lado do total; contador do campo de gravação "n / limite" contando o texto aparado.
- **Campos:** caixa de marcar do adicional (checkbox, não); escolha da peça (grupo de rádio com cartões, obrigatória se marcado; a primeira já vem em foco, desmarcada); variação (obrigatória se a peça tem eixo; eixo com uma única opção vendável já nasce escolhido); gravação do adicional (opcional, limite por peça; excedeu: "Cabem até N caracteres nesta peça. Tire X para continuar."; dentro: "Opcional. Deixe em branco se preferir a peça sem gravação."); mensagens de falta: "Escolha a corrente." e "Escolha o <eixo> da <primeira palavra do nome da peça>."
- **Ações:** caixa "Levar junto: <nome>…" marca/desmarca; "Ver os N modelos" / "Ver opções" / "Esconder opções" expande sem marcar; cartão de peça troca a peça; botão único "Adicionar à sacola" / "Levar o conjunto" / "Esgotado" (valida; se faltar escolha, foca e rola até o primeiro adicional incompleto e não adiciona; se completo, adiciona principal e cada adicional como linhas próprias, adicional com quantidade 1, e abre a gaveta); desabilitado com principal esgotado, combinação indisponível ou gravação do principal acima do limite.
- **Estados:** nada marcado ao abrir (total oculto, botão "Adicionar à sacola"); carregando (`aria-busy`, altura mínima reservada de 320 px, esqueleto de título, linha e três cartões); leitura falhou (bloco some); nenhum disponível (bloco some); peça fora do ar (some só ela); peça sem combinação vendável (omitida); peça igual ao principal ou repetida em outro adicional (pulada); variação do principal "Chaveiro" (o adicional com `someCom` some e perde a marca; os outros mantêm a escolha); principal com combinação indisponível ("Essa combinação está indisponível no momento.", botão bloqueado, bloco visível); principal esgotado (bloco não renderiza, botão "Esgotado"); gravação do principal acima do limite ("A gravação passou do limite. Ajuste o texto para continuar."); tentativa com escolha faltando ("Falta uma escolha em 1 peça. Ela está marcada acima." / "… em N peças.").
- **Barra fixa do celular:** sem conjunto, preço do principal e "X no PIX"; com conjunto, total e "Conjunto · N peças" (CA-04.9); mesmo botão único, mesmo rótulo e mesma condição de bloqueio.
- **Gaveta da sacola:** cabeçalho "Sacola · N peça(s)"; cada linha com foto, nome, preço × quantidade, "Acompanha o <nomes>" (vários nomes juntados por vírgulas e "e") enquanto o principal estiver na sacola, chips das opções, `Gravação: “X”`, quantidade e "Remover"; rodapé com subtotal, "ou X no PIX · frete calculado no checkout", "Finalizar compra", "Continuar comprando"; vazia: "Sua sacola está vazia". A frase é recalculada na renderização: removido o principal, some das linhas adicionais; remover uma linha não remove as outras; a mesma peça (id, opções, gravação) soma a quantidade e acumula os principais.
- **Formas do bloco (UC-09):** A "Abre na linha" (marcar abre as escolhas); B "Folha" (celular) / diálogo (computador): cabeçalho com o nome do adicional, mesmo painel de escolhas, rodapé com a frase do que falta e "Incluir no conjunto" (desabilitado enquanto faltar escolha), foco inicial no título, Esc e clique fora fecham; C "Fórmula": faixa decorativa (`aria-hidden`) "Esta joia + <adicional> + …" acima da lista, cada adicional alternável nela.
- **Não mostra:** confirmação do pedido, Minha Conta e painel (CA-05.2); adicional que exige material; recusa de gravação vinda do servidor; GA4; rolagem horizontal, alvos de 44 px e fonte a 200 %; `prefers-reduced-motion`.

### Painel — forma do bloco (UC-09)

Não está desenhada em nenhuma das duas fontes: a escolha entre as três formas no menu Compre Junto é pedido do humano no gate principal. O lugar (a tela de Listas/Adesão do menu, ou um cartão próprio) e o desenho do controle ficam para a tarefa, pelo design system do painel.

Divergências entre fontes e o PRD (a resolução está ao lado):

| Divergência | O que valeu | Quem decidiu |
| ----------- | ----------- | ------------ |
| Três formas do bloco (A/B/C) × PRD sem forma | A é o padrão; as três são construídas e a dona escolhe (UC-09) | humano, gate principal · `forma-do-bloco` |
| Título e frase do bloco só no protótipo | ratificados (CA-03.14) | humano, gate principal · `texto-do-bloco` |
| "Acompanha o <nome curto>" no protótipo × `products.name` | nome completo, sem campo novo (CA-05.1) | humano, gate principal · `nome-do-principal-na-frase` |
| Barra fixa sem PIX com conjunto | como o protótipo (CA-04.9) | humano, gate principal · `barra-fixa-com-conjunto` |
| Seletor de quantidade só a partir de 1024 px | mantido (CA-03.15) | humano, gate principal · `quantidade-do-principal-no-celular` |
| Relatório: períodos fixos, indicadores extras, linha "direto no produto", "peça que mais sai" × PRD "período escolhido" | como o protótipo, mais o estado vazio escrito (CA-06.4) | humano, gate principal · `relatorio-recortes` |
| Nome da lista até 40, lista vazia salvável × PRD sem limite | como o protótipo (CA-01.1) | humano, gate principal · `lista-nome-e-lista-vazia` |
| Teto de 12 peças por lista no protótipo; PRD sem número | 12 (D-teto-de-pecas-por-lista) | humano, gate do PRD Tech Review · `teto-de-pecas-por-lista` |
| Campo de desconto no protótipo do painel | fora (WI 92) | PRD › Fora |
| Selo "saiu do ar" em adicional de produto ausente no desenho | CA-02.7 vale; a tarefa o desenha | a conferência de cobertura |
| O protótipo já está alinhado ao PRD r1 (botão único, sem título próprio, `someCom`, sem acabamento) — o briefing supunha uma versão anterior | o lido vale; não há divergência a resolver nesses pontos | o lookup |

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| a pasta do bloco e o estado do conjunto da página | JÁ EXISTE (tarefa 03). Você **acrescenta** arquivos nessa pasta e troca a forma no componente raiz do bloco; não altere o estado do conjunto nem a lógica de compra | — | — |
| configuração da forma do bloco em `store_settings` (chave própria, sem migration: a tabela e o padrão `value ||` já existem), valor padrão `Na linha` e normalização em `core/buy-together/settings.ts` (valor desconhecido ⇒ padrão) | VOCÊ CRIA | forma | forma normalizada |
| leitura do setting na loja (hook à parte) e as formas "Em folha" (folha no celular / diálogo no computador) e "Com fórmula" (faixa decorativa) | VOCÊ CRIA | forma | bloco na forma escolhida |
| cartão de escolha da forma na página do menu Compre Junto do painel e a gravação | VOCÊ ALTERA a página da tarefa 01 | forma | setting gravado |
| `ProductInfo`, `ProductPage`, `ProductBuyBar`, `cartStore`, `useProductPurchase`, `core/analytics`, `apps/store/CLAUDE.md` | NÃO TOQUE (tarefa 04 e 06) | — | — |

### Decisões já tomadas

- (#1, `forma-do-bloco` — como o bloco abre as escolhas) escolha "A — abre na linha, sem a faixa de fórmula"; ressalva verbatim: "Adicionar no menu Compre Junto a opção do usuário admin configurar como ele quer que aparece na Loja. Adicione esses 3 modos". Aplicação: A é o padrão; as três formas são construídas; a dona escolhe no menu Compre Junto (UC-09). A ressalva estende a escolha; não a nega. **Premissa:** uma configuração só, para a loja inteira (a ressalva não fala de por produto)
- (#21, Onde mora a configuração da forma do bloco) `store_settings` (chave `buy_together`, sem migration: a tabela e o padrão `value ||` já existem), valor padrão e normalização em `core/buy-together`; lida na loja por hook à parte

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| setting com padrão no TypeScript e leitura | `packages/core/src/shipping` (frete grátis: `freeShippingState`) e `apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts` (defaults do TS = o que o banco grava) |
| folha / diálogo acessível | `packages/ui/src/dialog.tsx` e `sheet` (alvo `dialogGridTrack.test.ts`: o `grid` precisa de trilha de piso zero) |
| escolha de uma entre três no painel | `apps/backoffice/src/features/settings` (cartões de seção e `SettingsSaveButton`) |

### Testes

- `core/buy-together/settings.ts`: valor desconhecido ou ausente vira "Na linha" (nível: unidade); o default do TypeScript bate com o que o banco grava (nível: guarda `storeSettingsDefaults`).
- Painel: a dona escolhe uma das três formas, grava e relê (nível: página real do menu Compre Junto).
- Loja: cada forma desenha as escolhas; "Em folha" com foco no título, Esc e foco de volta; "Com fórmula" com a faixa fora do leitor de tela; as regras de compra (total, variação faltando, o que vai à sacola) iguais nas três (nível: página real do produto).
- Em 390 e 1440, as três formas sem rolagem horizontal e com alvos ≥ 44 px (nível: prova em navegador).

### Obrigações

- A regra é só de apresentação (CA-09.3): as regras de UC-03 e UC-04 valem iguais nas três formas; a forma não muda preço, total nem o que vai à sacola.
- O padrão de `store_settings` é aditivo e idempotente; o default do TypeScript tem que bater com o que o banco grava (`storeSettingsDefaults.test.ts`).
- "Em folha": foco no título ao abrir, Esc fecha, foco volta ao controle que abriu (use o `Dialog`/`Sheet` do `packages/ui`); "Com fórmula": `aria-hidden`, sem informação nova.
- Par `motion-reduce:`, alvos de 44 px, sem rolagem horizontal; **prova em navegador a 390×844 e 1440** das três formas.
- `semMaterialNaPaginaDoProduto` (escopo literal): inclua os arquivos novos; o `copyInstitucional`/tom memorial valem.
- Esta tarefa **não edita** `apps/store/CLAUDE.md` (é da 06); documente no `apps/backoffice/CLAUDE.md` o cartão e deixe a nota da loja para o retorno.

### Não faça

- Configuração por produto (a premissa é uma só para a loja inteira).
- Mexer em compra, carrinho, barra fixa ou GA4.
- Desconto, combinar o acabamento.
- Editar `ProductInfo.tsx`, `ProductPage.tsx`, `ProductBuyBar.tsx`, `cartStore.ts` ou `apps/store/CLAUDE.md`.

### Pronto quando

- [ ] a dona escolhe a forma, grava e relê; sem escolha a loja usa "Na linha"; valor desconhecido cai em "Na linha" sem quebrar
- [ ] "Em folha": foco no título, Esc fecha, foco volta; "Com fórmula": faixa fora do leitor de tela; as regras de compra iguais nas três (teste pela página real)
- [ ] prova em navegador das três formas em 390 e 1440
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
