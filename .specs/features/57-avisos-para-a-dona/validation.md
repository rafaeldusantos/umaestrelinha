# 57 — Validation

**Data**: 2026-09-20 · **Veredito**: PASS

> **Autor = verificador**, como na `56`. O que reduz o viés são os guardas escritos com âncora dupla
> e metade positiva, e a checagem contra a **produção de verdade** — que nesta feature achou um
> defeito que nenhum teste pegaria.

---

## Baseline

Medida um workspace por vez, com `--testTimeout=20000` e exit code fora de pipe.

| Workspace | Entrada (fecho da `56`) | Saída | Δ |
| --- | --- | --- | --- |
| store | 3517/221 | **3535/222** | +18/+1 |
| backoffice | 3008/166 | **3017/166** | +9 |
| core | 2395/94 | **2420/95** | +25/+1 |
| functions | 652/14 | 652/14 | 0 |
| catalog-import | 512/23 | 512/23 | 0 |
| **Total** | 10084/518 | **10136/520** | **+52/+2** |

Lint **26/6**, tipos **0 · 0**, `pnpm build` verde, `packages/core/src/payment/**` com zero arquivos
alterados.

---

## Evidência por AC

| AC | Como foi provado |
| --- | --- |
| `AVD-01` `AVD-02` | `eventsForTrigger` devolve cliente **antes** da dona, medido por **igualdade de array** — um `toContain` nos dois passaria com a ordem invertida, e a ordem é regra (o orçamento de tempo do caixa é compartilhado) |
| `AVD-03` | os dois entram em `LEGACY_ENABLED_EVENTS`? não — `defaults.test.ts` conta 13 desligados; a migration guarda os três comandos por "só se ainda não existe", e `storeSettingsDefaults` assere as três formas |
| `AVD-04` | texto padrão, nome, descrição e ícone próprios; `catalog.test.ts` recusa nome igual ao rótulo de histórico, descrição fora do padrão "Enviado…" e ícone repetido |
| `AVD-05` | pré-condição por estado **e** por destinatário, com o **estado conferido primeiro** — caso próprio para a ordem, porque com os dois errados o slug do log tem de nomear o defeito mais grave |
| `AVD-06` | `orderNotificationsSchema` lê a migration **vigente** e prova que a da 42 **não é mais** (15 ≠ 17) |
| `AVD-07` | o campo é um nó distinto do de contato (`expect(contato).not.toBe(avisos)`), e editá-lo não mexe no outro |
| `AVD-08` | quatro formas de queda em `owner.test.ts`, incluindo a chave **ausente** (banco anterior à migration) e o campo só com espaço |
| `AVD-09` | `ownerEmailComDonoUnico.test.ts`: allowlist de UM, **mais a metade positiva** — os três consumidores chamam o dono — e a recusa da forma exata que a feature removeu |
| `AVD-10` | nenhum valor de e-mail em env; o dono é chamado dentro de `recipientFor`, por requisição |
| `AVD-11` | a régua do guarda é o nome do campo, e o inverso prova que `general.email` (o público, lido por `PolicyContact`) **não** é acusado |
| `AVD-12` | os 15 de hoje: `storeSettingsDefaults` compara a composição com `DEFAULT_NOTIFICATIONS` byte a byte |
| `AVD-13` | **não medido em navegador** — ver abaixo |

---

## O que a checagem contra PRODUÇÃO achou

Três consultas ao projeto hospedado, antes de decidir o que subir:

1. **`ADMIN_PUBLIC_URL` não existia nos secrets.** `envOr("ADMIN_PUBLIC_URL", "http://localhost:8083")`
   — os **quatro** avisos para a dona usam `{{link_pedido_admin}}`, então eles sairiam com link para
   `localhost`. **Nenhum teste pegaria**: o default é sintaticamente válido, a function sobe, o
   e-mail é enviado, e o defeito só existe no corpo da mensagem que chega. Gravado em 2026-09-20,
   com a URL **verificada** (`https://umaestrelinha-backoffice.vercel.app` responde 200).
2. **Nenhum aviso para a dona estava ligado.** Só os quatro legados da cliente. Os dois que já
   existiam desde a `42` nunca foram ativados — então a feature não "acrescenta dois a dois": ela
   leva de **zero em uso** a quatro disponíveis.
3. **`general.email` é `adri@umaestrelinha.com.br`.** A queda funciona sem nenhuma configuração, e o
   campo novo é opcional de verdade — não uma pendência disfarçada.

### E uma armadilha evitada, com prova

`MELHOR_ENVIO_SENDER_JSON` foi restaurado no mesmo movimento. O procedimento seguro (`BL-044`) é
arquivo com **só** as chaves pretendidas, e `secrets set --env-file` rodado de um diretório **sem
`.env`**. O retorno da CLI disse `{"count":2}` — **é essa a prova de que a mescla não aconteceu**:
da raiz do projeto teriam sido oito, que é exatamente como sete secrets de produção foram
sobrescritos com valores de dev em 2026-09-19. O conteúdo foi conferido antes de subir (endereço
real do ateliê, não placeholder).

---

## A ordem do deploy, e por que ela está certa

`supabase-deploy.yml` roda **`db push` antes de `functions deploy`**. Para um acréscimo é a ordem
necessária: a constraint aceita os eventos novos antes de a function poder emiti-los.

E a janela entre a Vercel (que publica o painel em ~1 min) e o `db push` é segura por duas
propriedades que já existiam:

- `fetchAllSettings` faz `{ ...DEFAULT, ...row.value }`, então `notifications_email` ausente vira
  `''` — nenhum input não-controlado.
- `resolveEventSettings` cai no default **por evento**, então um painel que conhece 17 contra uma
  linha de 15 mostra os dois novos desligados, em vez de quebrar.

---

## O que NÃO foi provado

- **`AVD-13` — a seção com 17 cards abaixo de 2.500px.** A `56` mediu 1.693px (1440) e 1.833px (390)
  com 15. Dois cards recolhidos somam ~168px, o que projeta ~1.860 e ~2.000 — dentro do teto, mas
  **projeção não é medida**, e o navegador não foi aberto nesta feature.
- **O percurso de ponta a ponta em produção.** Criar um pedido, ver o aviso chegar em
  `adri@umaestrelinha.com.br` com o link do painel funcionando. É o teste que o usuário vai fazer, e
  é o único que prova o conjunto.
- **Verificador independente.** Ver o aviso no topo.
