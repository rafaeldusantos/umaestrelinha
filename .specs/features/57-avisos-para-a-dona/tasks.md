# 57 — Tasks

Commits completos ao final, não atômicos por task (`BL-012`, decisão do usuário). As tasks são a
unidade de gate.

| # | Task | ACs | Done when |
| --- | --- | --- | --- |
| T01 | `core`: `owner.ts` — `resolveOwnerEmail`/`ownerContactMissing`, com teste | `AVD-08` `AVD-09` | a queda vale nas quatro formas (preenchido, vazio, ausente, só espaço); devolve `''` e nunca `null`; `ownerContactMissing` é a MESMA régua, provado por comparação sobre uma tabela de casos |
| T02 | `core`: os dois eventos — lista, audiência, rótulo, nome, descrição, ícone, texto padrão, gatilho, pré-condição | `AVD-01` `AVD-02` `AVD-04` `AVD-05` | os `Record` compilam completos; os gatilhos devolvem cliente **antes** da dona, medido por igualdade de array (um `toContain` passaria com a ordem invertida); as pré-condições recusam por estado **e** por falta de destinatário, com o estado conferido primeiro |
| T03 | `packages/supabase`: `general.notifications_email`, default `''` | `AVD-07` `AVD-08` | o tipo compila; o default é vazio, e o comentário diz por que não é cópia de `email` |
| T04 | Migration aditiva: `check` com 17, os dois textos, o campo de `general` | `AVD-03` `AVD-06` | nenhuma migration aplicada reescrita; os três comandos guardados por "só se ainda não existe"; nada de `delete`, `insert` em `orders`, `create policy` ou `grant` |
| T05 | Os dois guardas que mudam de endereço | `AVD-06` | `orderNotificationsSchema` lê a **vigente** e prova que a da 42 não é mais; `storeSettingsDefaults` compara a **composição** e prova que a semente da 42 sozinha não cobre mais os 17 |
| T06 | `dispatch.ts` passa pelo dono único | `AVD-09` `AVD-10` | as duas leituras (`recipientFor` e o contexto da pré-condição) chamam `resolveOwnerEmail`; nenhum valor de e-mail em env ou bundle |
| T07 | Painel: o campo em Dados da loja, e o aviso pelo dono único | `AVD-07` `AVD-09` `AVD-11` | o campo é um nó distinto do de contato, a dica explica o vazio, editá-lo não mexe no outro, e o valor chega ao `upsert`; o aviso some com o campo de avisos preenchido e o de contato vazio |
| T08 | `ownerEmailComDonoUnico.test.ts` | `AVD-09` | allowlist de UM (o formulário que edita), âncora dupla, **e a metade positiva**: os três consumidores chamam o dono |
| T09 | Âncoras de contagem: 15 → 17 em nove arquivos | `AVD-12` | os 15 de hoje seguem com o mesmo texto, estado e gatilho |
| T10 | Fecho: medição, `CLAUDE.md`, `STATE.md`, `validation.md`, commits, push | todas | cinco workspaces exit 0 um por vez; lint e tipos sem regressão; `payment/**` intocado |

## Ordem

`T01 → T06`, `T01 → T07` (os dois consumidores precisam do dono).
`T02 → T04 → T05` (a migration copia a lista; os guardas medem a migration).
`T03 → T04`, `T03 → T07`. `T09` em paralelo com tudo. `T10` por último.
