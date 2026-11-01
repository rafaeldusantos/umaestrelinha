# Conferência contra o design

O charter `design-check` compara as telas entregues com o protótipo do Work Item, tela a tela, e registra
cada diferença com o valor do design e o observado. A régua é a fonte de design do Work Item — nunca a
memória, nunca "parece certo".

---

## A fonte

As fontes de design vêm da Fase 0, no campo `design` do briefing: os links de `item.md` › Insumos, as de
`prd.md` › Expectativas de UI/UX e as `fixo` de `PROJECT.md` › Fontes de design — cada uma com a `tool` e o
link ou caminho. O charter diz **qual** fonte e **quais telas**.

| `tool`          | Como ler                                                                                             | Sem acesso ⇒                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `figma`         | **Figma MCP** — o nó vem do `node-id` da URL; leia metadados, variáveis (tokens) e a imagem do nó    | sessão `not-run` por `design`                                   |
| `claude_design` | **Claude Design MCP** — liste os arquivos do projeto, leia o da tela, use o preview renderizado      | sessão `not-run` por `design`                                   |
| `link`          | página publicada — abra a URL numa **aba separada** do browser da sessão e leia só o que ela entrega | link que exige sessão que você não tem ⇒ `not-run` por `design` |
| `arquivo`       | imagem ou PDF que o humano informou **como fonte de design** — leia o arquivo; só o que ele mostra é régua (sem token: estrutura, texto e o que a imagem fixa) | arquivo ausente ⇒ `not-run` por `design`                        |

Regras da fonte:

1. **Sem o MCP da fonte na sessão, a sessão é `not-run`** com o motivo. Não confira de memória, nem por
   screenshot antiga, nem por anexo que não foi informado como fonte de design
2. **Liste antes de ler.** O `node-id` ou o nome de arquivo na URL é dica, não caminho. Tela do charter que
   você não localiza na fonte — dois candidatos ou nenhum — vai ao log como `blocked` (design), e as demais
   seguem
3. Arquivo grande: leia em partes, só as telas do charter. Nunca peça o arquivo inteiro
4. Anexo de apoio dentro do projeto de design (cópia do PRD, rascunho) não é fonte
5. **Artifício de protótipo não é régua**: dado fictício (nomes, números), contador calculado sobre massa
   mockada, ordenação em memória

## O que comparar

| Grupo             | O quê                                                                                |
| ----------------- | ------------------------------------------------------------------------------------ |
| Estrutura         | os elementos existem, na ordem e na hierarquia do design; nada a mais, nada a menos  |
| Texto             | rótulo, título, mensagem, placeholder — literal                                      |
| Tipografia        | família, tamanho, peso, altura de linha, cor do texto                                |
| Cor               | fundo, borda, sombra, ícone                                                          |
| Dimensão e espaço | largura e altura fixadas no design, padding, gap, raio de borda                      |
| Componentes       | botão, campo, select, checkbox, cartão, ícone — a variante certa                       |
| Estados           | padrão, hover, foco, desabilitado, carregando, erro, vazio — os que o design desenha |
| Responsivo        | cada frame de breakpoint que o design traz                                           |

Valor observado: snapshot para estrutura e texto; `getComputedStyle` do elemento para o resto
([browser.md](browser.md#valores-computados)). Estado se provoca: hover com `browser_hover` / `hover`, foco com Tab,
erro enviando inválido.

## A regra de comparação

Não há tolerância: depois de normalizar, **igual ou diferente**.

1. **Só compare o que o design fixa.** Largura que se ajusta ao conteúdo ou ao contêiner, texto dinâmico,
   altura que depende do dado — não há valor de design, não há diferença
2. **Normalize antes de comparar:**

   | Propriedade           | Normalização                                                        |
   | --------------------- | ------------------------------------------------------------------- |
   | Cor                   | hex de 6 dígitos minúsculo; com transparência, hex + opacidade em % |
   | Tamanho, espaço, raio | px inteiro — subpixel arredonda para o inteiro mais próximo         |
   | Peso de fonte         | numérico: Regular 400 · Medium 500 · SemiBold 600 · Bold 700        |
   | Família               | a primeira fonte da pilha do app contra a do design                 |
   | Texto                 | literal, ignorando só espaço duplicado e quebra de linha automática |

3. **Token vence valor.** O design usa um token e o app usa outro token com o mesmo valor: não é diferença.
   Mesmo token com valor diferente é
4. **Viewport do frame.** Compare cada frame na largura dele (`browser_resize` / `resize`). Sem frame para um viewport,
   não há régua ali — registre "sem frame para 375", não compare
5. **PRD prevalece.** Protótipo e PRD dizem coisas diferentes: é `spec-gap`, não diferença de implementação

## Discrepâncias comuns

| Grupo      | O que costuma aparecer                                                            |
| ---------- | --------------------------------------------------------------------------------- |
| Tipografia | peso trocado (400 no lugar de 500), tamanho, altura de linha ausente              |
| Espaço     | padding diferente, gap inconsistente entre itens iguais, alinhamento de grade     |
| Cor        | tom vizinho (`#0052cc` no lugar de `#0066ff`), opacidade ausente, sombra          |
| Estados    | hover ou foco não desenhados no app, estado vazio ou de erro ausente              |
| Responsivo | breakpoint em outra largura, layout mobile diferente do frame                     |
| Texto      | copy reescrita, rótulo abreviado, mensagem de erro genérica no lugar da desenhada |

## Como registrar

Cada diferença é um **achado** do log, com o protótipo como fonte do esperado. A tabela de diferenças do
[log de sessão](../../templates/execution/session-log.md) registra:

| Campo       | O que vai                                                    |
| ----------- | ------------------------------------------------------------ |
| Tela        | a tela do app e o frame, nó ou arquivo do design             |
| Elemento    | o que é, pelo nome acessível ou texto                        |
| Propriedade | `font-weight`, `padding-left`, texto…                        |
| Design      | o valor normalizado, e o token quando houver                 |
| Observado   | o valor normalizado, e o viewport                            |
| Evidência   | screenshot do elemento: `CH-NN-<passo>-<slug>.png`           |
| Gravidade   | proposta pelo impacto ([severity.md](../triage/severity.md)) |

Agrupe: o mesmo token errado em vários elementos é **uma** diferença com as ocorrências listadas.

Gravidade pelo que muda para a persona: diferença puramente visual tende a `low`; texto que muda o sentido,
estado de erro ou vazio ausente, foco invisível sobem; elemento ou ação que falta e impede a jornada é o caso
mais alto. A decisão final é da triagem.
