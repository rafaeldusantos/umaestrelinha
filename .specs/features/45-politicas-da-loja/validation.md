# 45 — Validação

> **Autor = verificador.** Esta execução foi inline, na mesma sessão que implementou. É a mesma
> limitação que a `33`, a `34`, a `35` e a `37` declararam: os sensores de mutação reduzem o viés,
> não o eliminam. Entra na fila de verificação independente junto com a `32`, `33`, `34`, `35`, `37`,
> `39` e `41`.

> **Esta feature foi executada em uma working tree COMPARTILHADA com outra sessão.** Uma segunda
> sessão (`store-0e`) entregou, ao mesmo tempo e na mesma árvore, a página
> `/cuidados-com-sua-joia-afetiva` — construída sobre o `PolicyDocument` desta feature — e **removeu
> `/politicas`** por instrução direta do usuário dela. Toda medição abaixo é da **árvore combinada**,
> e está anotada como tal. As duas sessões trocaram mensagens para não se sobrescreverem; a divisão
> acordada está no fim deste documento.

## Veredito

**PASS, com três pendências declaradas** (prova em navegador, verificador independente, e a dívida
que a remoção de `/politicas` deixou).

---

## Evidência por requisito

| AC | Como foi provado | Resultado |
| --- | --- | --- |
| `POL-01` | `routing.test.tsx` monta o **`App` real** e navega até os dois endereços; `routes.test.ts` (core) trava as duas grafias, plural e singular, e recusa as duas formas "padronizadas" | ✅ |
| `POL-02` | `reservedSlugs.test.ts` passou **sem edição** — ele deriva as duas listas do disco e compara nos dois sentidos. Passar sem ser tocado é a contraprova de que `ROUTE_SLUGS` e o `App.tsx` concordam de verdade | ✅ |
| `POL-03` | `sitemapRoutes.test.ts` (classificação obrigatória, bidirecional) + um caso por caminho em `routes.test.ts` + a contagem de `<loc>` em `functions/sitemap` | ✅ |
| `POL-04` | `useCanonical` em cada página; `routeSplitting.test.ts` cobra `lazy` nas duas direções | ✅ |
| `POL-05` | Uma asserção por seção, com o **título inteiro**, mais um caso de **ordem** (`toEqual` da lista completa) e um dos dois `<h3>` aninhados | ✅ |
| `POL-06` | A frase inteira do art. 49 com os 7 dias, e a citação da Lei nº 8.078/1990 | ✅ |
| `POL-07` | Ausência de emoji medida no DOM renderizado + presença do SVG da estrela (as duas metades) | ✅ |
| `POL-08` | `getByTestId('policy-note')` + fundo `ground-deep` + fio ouro + **um só aviso** | ✅ — **corrigido após mutante sobrevivente**, ver abaixo |
| `POL-09` | WhatsApp nos dois estados (com número, sem número, e **número curto**), `mailto:` das settings, e o caso que prova que nada fica cravado no JSX | ✅ |
| `POL-10` | Sete frases do site em produção asseridas **inteiras** | ✅ |
| `POL-11` | Lei nº 13.709/2018 + **um caso por direito** (seis) + o caso de que o canal aparece na mesma seção | ✅ |
| `POL-12` | Um caso por compartilhamento (três) + a asserção de **ausência** de encarregado/perfilamento/remarketing | ✅ |
| `POL-13` | A página **cita a constante** `MARKETING_CONSENT_LABEL` que o checkout renderiza; provado por mutante | ✅ |
| `POL-14` | Seção própria, materiais nomeados, e a promessa sobre o que sobra **idêntica** à do guia, com link para ele | ✅ |
| ~~`POL-15`~~ ~~`POL-16`~~ | **SUPERSEDED** — `/politicas` foi removida. Ver `spec.md` | ⊘ |
| `POL-17` | `Footer.test.tsx` (três `href`) + `politicaComDonoUnico` (nenhum link para `/politicas`) | ✅ |
| `POL-18` | `queryByRole('link', { name: 'Termos de uso' })` é `null` | ✅ |
| `POL-19` | Guarda com âncora dupla e 7 sensores; **estreitado** de 3 réguas para 2 quando o índice sumiu | ✅ |
| `POL-20` | `PolicyDocument.test.tsx`, 13 casos | ✅ |
| `POL-21` | `AboutPage.test.tsx` passou **sem uma linha de edição** — 22/22 | ✅ |
| `POL-22` | ❌ **NÃO PROVADO.** jsdom devolve 0 para toda medida de layout | ⚠️ |

---

## Sensor de discriminação — 11 mutantes

Injetados nos **arquivos reais**, um por vez, cada um revertido em seguida. Backups byte-a-byte, e
`diff` contra eles no fim: **os três arquivos voltaram limpos**.

| # | Mutação | Veredito |
| --- | --- | --- |
| M1 | `<PolicyContact />` apagado da política de trocas | ☠️ 4 falhas |
| M2 | portão do WhatsApp `>= 10` vira `!== ''` | ☠️ 1 falha (o caso do número curto) |
| M3 | `PolicyNote` rebaixado a `<p>` comum | **🐛 SOBREVIVEU** → corrigido → ☠️ 2 falhas |
| M4 | a política reescreve o consentimento à mão em vez de citar o dono único | ☠️ 1 falha |
| M5 | um dos seis direitos da LGPD some da lista | ☠️ 1 falha |
| M6 | `PolicyDocument` perde a `Trilha` | ☠️ 2 falhas |
| M7 | `policySectionId` para de descascar acento | ☠️ 3 falhas |
| M8 | a privacidade passa a afirmar que há encarregado de dados | ☠️ 1 falha |
| M9 | a privacidade reescreve a promessa do material afetivo | ☠️ 1 falha |
| M10 | título de seção **duplicado** entre duas páginas | ☠️ 1 falha |
| M11 | `to="/politicas"` volta a existir numa página | ☠️ 1 falha — **com ressalva**, ver abaixo |
| M12 | as seções da política de trocas saem fora de ordem | ☠️ 2 falhas |

### M3 — o mutante que sobreviveu, e o que ele ensina

`PolicyNote` rebaixado a `<p>` comum passou nos **26 testes**. A asserção de `POL-08` subia do texto
até `closest('div')` e procurava um fio ouro ali — e encontrava o **marcador de um `PolicyList`
vizinho**, que é ouro pelo mesmo motivo. Asserção ao lado do ponto, exatamente a assinatura dos
quatro mutantes da `44`.

O aviso destacado é a **única** coisa que `POL-08` pede, e ele podia sumir com a suíte verde.
Consertado com `data-testid="policy-note"` — o componente precisa de nome próprio — mais a asserção
de que o destaque **é um só**, porque destaque repetido deixa de destacar.

### M11 — a ressalva honesta

M11 reportou **SOBREVIVEU** dentro do script de lote e **MORREU** quando reexecutado sozinho
(`ofensores: ['pages/PrivacyPolicyPage.tsx']`). Não consegui reproduzir a sobrevivência; a hipótese é
corrida no meu próprio harness entre o `cp` de restauração do mutante anterior e o `node` de mutação
do seguinte — não um furo no guarda. **Fica registrado como morto-com-ressalva, e não como passe
limpo**: "passou quando rodei de novo" é precisamente a forma que esconde um furo real.

---

## Medição

**Baseline de entrada, medida do disco em 2026-09-12** com a árvore limpa em `3fe19b1`, um workspace
por vez e exit code capturado **fora de pipe**:

| Workspace | `CLAUDE.md` dizia | **Medido** |
| --- | --- | --- |
| store | 2853 / 184 | **2853 / 184** ✅ |
| core | 1811 / 70 | **2121 / 80** ❌ — a baseline do arquivo estava **+310/+10 desatualizada** |
| functions | 370 / 7 | **436 / 8** ❌ — **+66/+1** desatualizada |

**As duas baselines desatualizadas são achado desta feature**, não erro dela: alguma feature anterior
(pelos números, a `42`/`43`) fechou sem atualizar a tabela. É a própria lição que o `CLAUDE.md`
repete — *"baseline anotada de memória mente sem quebrar nada"* — e a razão de medir na hora.

**Saída**: ver a seção final, medida na árvore combinada depois de as duas sessões pararem de
escrever.

---

## O que NÃO foi provado

1. **Prova em navegador (`POL-22`)** — 390×844 e 1440. Nenhuma asserção desta feature encosta em
   largura, rolagem ou sobreposição, porque **jsdom devolve 0 para toda medida de layout**. Falta
   conferir: a medida de leitura de 720px, os chips de contato empilhando no celular, o alvo de 44px
   nos dois botões, e **zero rolagem horizontal do body** nas três páginas. Entra na fila da `32`,
   `33`, `34`, `35`, `37`, `39` e `41`.
2. **Verificador independente** — autor = verificador, declarado no topo.
3. **A dívida que a remoção de `/politicas` deixou** — Envio e Pagamento não existem mais em página
   nenhuma, e a rota saiu sem 301 estando em `SITEMAP_STATIC_PATHS`. Registrado em `spec.md` e no
   `apps/store/CLAUDE.md`.
4. **O texto jurídico não foi revisado por advogado.** Ele é da dona; esta feature o transportou sem
   reescrevê-lo, e o que acrescentou (LGPD, compartilhamento, consentimento) foi checado contra o que
   o **código faz**, não contra a lei.

## Divisão com a sessão `store-0e`

| Quem | O quê |
| --- | --- |
| esta sessão (`store-bf`) | as duas páginas de política, `PolicyDocument`, `PolicyContact`, `Trilha`, `consent.ts`, `politicaComDonoUnico.test.ts`, `routing.test.tsx`, `accentText.test.ts`, `apps/store/CLAUDE.md` |
| `store-0e` | `JewelryCarePage`, a remoção de `/politicas`, `routes.ts` + `routes.test.ts`, `App.tsx`, `Footer.tsx`, `copyInstitucional.test.tsx`, `ScrollToTop.tsx` |

As seis âncoras de contagem compartilhadas (`ROUTE_SLUGS`, `RESERVED_SLUGS`, `SITEMAP_STATIC_PATHS`,
`declaredRoutes()`, páginas em `lazy`, `<loc>` do sitemap) ficaram com `store-0e`, porque a remoção de
`/politicas` e a adição da página de cuidados se **cancelam**: o efeito líquido nas seis é **zero**.
