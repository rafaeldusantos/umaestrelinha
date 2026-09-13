# Perguntas frequentes da loja — Validação

**Spec**: `spec.md` · **Design**: `design.md` · **Tasks**: `tasks.md`
**Data**: 2026-09-12 · **Intervalo**: `bd35225..HEAD` (23 commits)

> ⚠️ **O autor é o verificador.** A execução foi inline, depois que o worker do lote 1 morreu por
> limite de sessão da API. Não houve olhos frescos sobre a feature contra a spec — o que reduz o
> valor deste relatório, e está declarado aqui em vez de escondido. É a mesma pendência da `32`,
> `33`, `34`, `35`, `37`, `39`, `41`, `44` e `45`. Entra na fila.

---

## Gate — medido, não somado

Um workspace por vez, com exit code capturado **fora de pipe**.

| Workspace | Entrada | Saída | Delta |
| --- | --- | --- | --- |
| store | 2955/189 | **3087/200** | +132/+11 |
| backoffice | 2023/119 | **2073/123** | +50/+4 |
| core | 2128/80 | **2186/84** | +58/+4 |
| functions | 436/8 | **436/8** | 0 (um número mudou dentro de um caso) |
| catalog-import | 512/23 | **512/23** | 0 — não tocado, remedido |

**Total: 8294 em 438 arquivos** (+240). Lint **27/6** (baseline). Tipos **0 · 0 · 0**.
`packages/core/src/payment/**` e `supabase/functions/mercado-pago/**` sem uma linha alterada —
conferido por `git diff --name-only bd35225..HEAD`.

> **A suíte do backoffice exige `--testTimeout=20000` para ser medida.** Os guardas que varrem disco
> cruzam o teto padrão de 5s sob contenção e reprovam por **timeout, nunca por asserção** — com o
> arquivo reprovado **mudando a cada execução**. Medido três vezes; com o teto maior, 123/123.
> Registrado no `CLAUDE.md`.

---

## Prova em navegador — o que jsdom não mede

Chrome real, contra o Supabase local com as 26 perguntas semeadas.
Telas em `evidencia/faq-390.png` e `evidencia/faq-1440.png`.

### 390 × 844

| Medida | Valor | AC |
| --- | --- | --- |
| `body.scrollWidth` × viewport | **390 × 390** — zero rolagem horizontal | `FAQL-11` |
| Perguntas renderizadas | **26**, em **6** assuntos | `FAQL-02` |
| `<details>` fechados | **26 de 26** | `FAQL-03` |
| **Resposta no DOM com o acordeão FECHADO** | **sim** | `FAQL-03` |
| Alvo de toque da pergunta | **54px** (mínimo), **0 abaixo de 44** | `FAQL-11` |
| Alvo de toque do chip | visual 22px, **alvo real 44px** por pseudo-elemento (`TAP_ROW`) | `FAQL-11` |
| Afordância de rolagem | seta **só à direita** — há conteúdo além da dobra de um lado só | `FAQL-06` |
| Coluna de assuntos do computador | **oculta** | `FAQL-06` |

### 1440 × 900

| Medida | Valor | AC |
| --- | --- | --- |
| Coluna de assuntos | visível, **248px**, 6 itens | `FAQL-06` |
| Faixa de chips do celular | **oculta** | `FAQL-06` |
| Largura da coluna de leitura | **720px** — exatamente `--container-prose` | design |
| Rolagem horizontal | **nenhuma** (1440 × 1440) | `FAQL-11` |

### Dado estruturado e cabeça do documento

| Medida | Valor | AC |
| --- | --- | --- |
| `FAQPage` no `<head>` | presente, **26 entradas**, com `url` absoluta | `FAQL-13` |
| Depois de navegar para `/` (SPA) | **JSON-LD ausente**, título restaurado ao padrão da loja | `FAQL-13`, `FAQL-15` |

### Contraste computado (medido, não deduzido do token)

| Elemento | Cor | Razão sobre `ground` |
| --- | --- | --- |
| Pergunta e `<h2>` | `#23303A` (`ink`) | **12,73:1** |
| Intro, resposta e contagem | `#54616B` (`ink-soft`) | **6,00:1** |

Medido porque a captura *parecia* ter texto amarronzado. Era a renderização do PNG — as cores são os
tokens certos. A lição é o método: **a dúvida sobre cor se resolve medindo, não olhando**.

---

## Probe contra o banco (`AD-012`)

Nove medições por HTTP e SQL, registradas por extenso no rodapé da migration. As duas que decidem:

- **A semeadura reexecutada inteira devolveu `INSERT 0 0`** — contagens (92 na biblioteca, 26
  colocações) e md5 do conjunto das respostas **idênticos**. Idempotência provada, não afirmada.
- **Uma das 26 REUSOU entrada que já existia**: a biblioteca foi de 67 para **92**, não 93. O `join`
  por `question_key` fez a página apontar para a pergunta que os produtos já usam — a propriedade
  central do desenho, exercida contra dado real.

---

## Sensibilidade dos guardas novos — provada por injeção

Não por sensor inline: a mutação foi escrita **no arquivo real**, o guarda reprovou, e a árvore
voltou limpa (`git status` vazio).

| Guarda | Mutação injetada | Resultado |
| --- | --- | --- |
| `faqPageSingleOwner` | `supabase.from('faq_page_items')` em `FaqAnswer.tsx` | **reprovou** |
| `faqCorpusUnico` | `const PERGUNTAS = [{ question: …, answer: … }]` no mesmo arquivo | **reprovou** |

Os demais guardas novos (`faqPageSchema`, `faqJsonLdParity`, `purity`) carregam sensor embutido.

---

## Achados durante a execução

Registrados porque cada um é reutilizável, e nenhum foi pego por revisão — todos por teste ou por
medição.

1. **Mudança em `packages/core` tem gate de TRÊS workspaces.** O gate que subiu `FAQ_ANSWER_MAX`
   rodou core e store; o `FaqEditorDialog` do painel lê a mesma constante e seguiu dizendo "0 / 600".
2. **Rota nova em `SITEMAP_STATIC_PATHS` muda a saída da edge function do sitemap**, e o teste dela
   conta `<loc>`. Consequência a um workspace de distância, pega pelo guarda bidirecional.
3. **Seis âncoras de contagem dispararam** ao declarar a rota. Todas atualizadas para o número
   verdadeiro; nenhuma afrouxada.
4. **O guarda de `dangerouslySetInnerHTML` acusou o comentário que explica a regra** — a armadilha do
   `semMaterialNaPaginaDoProduto`. Removedor de comentário com sensor de LF e CRLF entrou junto.
5. **A régua de paridade estava errada e reprovava a maior das 26 respostas.** "Nenhuma resposta leva
   `- ` ao JSON-LD" é falso: *"Prata 925 - banho de ouro"* é prosa da dona. A régua certa é o
   marcador no **começo da linha**.
6. **O arraste se comportava diferente conforme a direção.** Medir o índice do alvo depois de remover
   a origem fazia o item cair uma casa acima do lugar em que foi solto — só descendo. O teste pegou.
7. **`sed` come a barra invertida de regex**, e produziu duas réguas inertes
   (`/p{Extended_Pictographic}/` e `/-s/`) que teriam dito "nenhum emoji" para sempre. As duas foram
   pegas na hora porque o teste falhou; parei de usar `sed` para isso.

---

## O que NÃO foi verificado

- **Olhos frescos contra a spec.** Autor = verificador (declarado no topo).
- **Sensor de mutação nas ACs de comportamento** além dos dois guardas acima. As mutações
  sistemáticas (inverter condição, trocar retorno) não foram rodadas.
- **A tela do painel em navegador.** Todas as medições de navegador foram na loja. O painel foi
  exercitado só em jsdom — e o arraste, que é gesto, é exatamente o que jsdom não mede.
- **Comportamento com JavaScript desligado.** O `<details>` foi escolhido para funcionar sem JS, mas
  a loja é SPA: sem JS não há página nenhuma. A escolha protege o rastreador que não renderiza, e
  isso **não foi medido** — exigiria um rastreador real ou o prerender que a spec deixou fora.
- **`/perguntas-frequentes` em produção.** A migration está aplicada só no banco **local**; nada foi
  empurrado.

---

## Veredito

**PASS**, com as ressalvas acima — em especial a de autor = verificador.

As 36 ACs têm implementação e teste; as que jsdom não alcança (`FAQL-03`, `FAQL-06`, `FAQL-11`,
`FAQL-13`) foram medidas em navegador real e estão na tabela acima.
