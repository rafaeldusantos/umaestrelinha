# Escrever o bug

O bug fica em `qa/issues/` e volta ao Dev como fix task, pela `wi-workflow`. Quem o lê não estava na sessão: o arquivo
precisa bastar para reproduzir, entender quem é atingido e saber quando está corrigido. O formato está em
[bug.md](../../templates/triage/bug.md); aqui, como preencher.

---

## O que não é bug

Antes de escrever, o achado passa por este filtro. O que sai daqui vai a **Achados que não viraram bug** no
relatório, com o motivo.

| O achado                                                               | Vai para                                                                |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| o esperado não tem fonte — nenhum PRD, costura, TC ou protótipo define | `spec-gap`, classificado pelo escopo: **pergunta ao produto** ou **sugestão de backlog** ([triage.md](triage.md#perguntas-ao-produto-e-sugestões-de-backlog)) — nunca bug nem aprovação |
| o defeito existia antes da mudança, ou mora em superfície que a costura não toca | **sugestão de backlog** (`pré-existente`) — vira bug só se for `critical` ou `high` |
| `friction` de CFR fora da superfície que o Work Item muda              | **sugestão de backlog** — o CFR confere a mudança, não audita o app     |
| o observado é o que a fonte pede, só que a sessão esperava outra coisa | `conforme a fonte` — se a fonte parece errada, é `spec-gap`             |
| `intermitente` com uma ocorrência só e sem evidência clara             | risco residual, com a sessão e o passo                                  |
| já registrado no Work Item                                             | `duplicado de BUG-N` ([severity.md](severity.md#deduplicação))          |
| ambiente fora, massa ausente, credencial que não resolveu              | charter ou TC `blocked` — é pendência da rodada, não defeito do produto |

Intermitente vira bug com **duas ocorrências** (em sessões diferentes, ou a segunda reprodução da mesma)
ou com evidência que mostra o defeito sem ambiguidade.

## Título

O título é a identidade do bug, junto com o `id`: depois do Gate 3 que o registrou, **não muda** — reteste
e reabertura mexem no `status` e no **Histórico**, nunca no título.

**Forma:** `[Superfície] o que quebra — para quem`, em até ~90 caracteres.

| Bom                                                                       | Ruim                           |
| ------------------------------------------------------------------------- | ------------------------------ |
| `[Cadastro] E-mail apagado após erro no código — usuário novo no celular` | `Bug no cadastro`              |
| `[Checkout] Total zera ao aplicar o cupom duas vezes`                     | `Não funciona`                 |
| `[Configurações] Leitor de tela não anuncia "salvo"`                      | `URGENTE corrigir o salvar!!!` |
| `[Botão primário] Cor e peso da fonte fora do protótipo`                  | `TC-UI-003 falhou`             |

1. **Observável, não suposto.** "Total zera", não "erro de cálculo no serviço de cupom"
2. **Sem ID de processo** no título (`TC-…`, `P1-AC01`, `CH-02`, `BUG-…`) — eles vão no envelope e em
   **Relacionados**
3. "Para quem" quando a persona importa; quando atinge todo mundo, omita

## As partes do corpo

| Parte            | Como escrever                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resumo**       | um parágrafo do ponto de vista da persona: o que ela tentou, o que viu, o que esperava                                                                                                                                          |
| **Impacto**      | o nível ([severity.md](severity.md)), a persona mais atingida, a jornada e o passo, a frequência (`sempre` · `às vezes` · `rara`), o contorno ou `nenhum`, e — quando divergiu da gravidade proposta pelo explorer — por quê    |
| **Ambiente**     | URL, tela e componente, branch e build testados, browser, viewport, rede, idioma — o que a sessão registrou                                                                                                                     |
| **Passos**       | numerados, em linguagem de usuário, **a partir de um estado limpo**: o primeiro passo diz com qual persona, em qual conta e de onde se parte. O último é onde quebra. Nada de "como antes" nem de passo que só a sessão conhece |
| **Esperado**     | o comportamento certo, **com a fonte**: `PRD §…`, o critério (`P1-AC03`, `C-02`), o `TC-…`, a tela do protótipo. Sem fonte, não é bug                                                                                           |
| **Observado**    | o que a persona viu, ouviu ou deixou de ver — fato, não interpretação. Mensagem de erro copiada exata                                                                                                                           |
| **Evidência**    | as screenshots, relativas a `qa_dir` (`screenshots/CH-02-passo-4.png`), do arquivo que existe. O nome do arquivo é o `label` dele no `evidence[]` do `qa-result`                                                                |
| **Ocorrências**  | cada sessão ou tela onde aconteceu — `CH-NN · persona · passo` — quando houve mais de uma                                                                                                                                       |
| **Relacionados** | o `TC-…`, o charter, a jornada, o critério, o protótipo, os bugs ligados                                                                                                                                                        |

Não escreva causa no código nem a correção: o triager não leu o código, e o Dev parte do observado. A
exceção é o bug com `**Origem:** e2e`, escrito pela automação E2E: ele pode trazer `**Indício no
código:** caminho:linha` numa seção própria — nunca no título nem nos passos.

## Variações

### Funcional

O corpo padrão. Atenção ao **Esperado**: no bug funcional ele quase sempre tem um critério ou um TC.

### UI / visual — do `design-check`

Some ao corpo a tabela **Design × implementado**, uma linha por propriedade conferida, com o valor do
protótipo e o observado:

| Propriedade   | Protótipo | Observado | Confere |
| ------------- | --------- | --------- | ------- |
| Fundo         | `#0066FF` | `#0052CC` | não     |
| Peso da fonte | 600       | 400       | não     |
| Padding       | 12px 24px | 12px 24px | sim     |

- O **Esperado** cita o protótipo: a fonte (Figma, Claude Design), o frame ou a tela
- **Tela e componente** no Ambiente são o que o Dev usa para corrigir bugs vizinhos numa tarefa só
  ([lotes de correção](triage.md#lotes-de-correção)). Nomeie pelo que se vê — "formulário de endereço",
  não `AddressForm.tsx`: você não leu o código. Use o mesmo nome para a mesma parte em todos os bugs
- **Viewport** no Ambiente é obrigatório; diferença que só aparece numa largura diz qual
- Um bug por componente divergente, não um por propriedade
- Nível: em geral Cosmético; Dano à confiança quando quebra a consistência numa superfície de primeira
  impressão; Fricção quando atrapalha entender o que fazer ([severity.md](severity.md#regras-de-desempate))

### Fricção de usuário

Some ao corpo **Perspectiva da persona**: por que essa fricção custa caro para ela — paciência, dispositivo,
momento da jornada (o passo de maior ansiedade, o de pagamento) — e o **risco de abandono** (`alto` ·
`médio` · `baixo`), com a razão. É o que separa Fricção de Bloqueia a conclusão: se a persona abandonaria,
é bloqueio.

## `type` do `qa-issue`

`type` diz **o que quebrou**, não como foi achado.

| O bug                                                                     | `type`        |
| ------------------------------------------------------------------------- | ------------- |
| comportamento errado: regra, fluxo, dado, mensagem                        | `functional`  |
| diferença visual contra o protótipo, layout quebrado                      | `ui`          |
| algo que funcionava e parou — TC de regressão, fluxo fora do escopo do WI | `regression`  |
| a jornada custa mais do que deveria (fricção num passo)                   | `journey`     |
| acessibilidade, responsividade, performance percebida, usabilidade (CFR)  | `cfr`         |
| exposição visível: dado de outro usuário, permissão que não barra         | `security`    |
| falha numa integração que a persona vê: e-mail não chega, SSO não volta   | `integration` |

`persona`, `charter`, `tour` e `smoke` existem no enum porque são tipos de **caso**; dizem como se testou, e
num bug quase nunca são a melhor resposta. Com `tc_ref`, o `type` do caso é um ponto de partida, não a regra.

`tc_ref` só com um `cases[].id` do `qa-plan` — o TC que falhou por causa deste bug. Achado de exploração
livre, fora de qualquer TC, vai sem `tc_ref`.
