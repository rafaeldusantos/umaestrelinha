# Sessão CH-06 · Conferência contra o protótipo — a faixa da loja e a tela do painel

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-design-check.md` · design-check · P2        |
| Status      | not-run (design — MCP do Claude Design sem acesso: o token da sessão não tem os escopos `user:design:read`/`user:design:write`) |
| Persona     | PER-01 Adri · conta: `admin-loja` — `QA_ADMIN_LOJA_*` (não usada: a sessão não chegou ao login) |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | 0 ações de browser de 50                                               |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083/admin · build não exposto · Chromium (agent-browser, não aberto) · viewports — |
| Paridade    | nenhum (a sessão não chegou ao app)                                    |

## Missão

Conferir, valor a valor, que a faixa da loja e a tela do painel entregam o que o protótipo aprovado desenha — e separar o que é diferença do que a costura já decidiu diferente.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Listar os arquivos do projeto `4abe021d-d77e-4fe7-affd-524180315fa3` no Claude Design (`list_files`) | Erro `needs_design_scopes`: "This token doesn't include Claude Design access. In Claude Code, run /design-login and retry. [...] Retrying or refreshing the current sign-in won't fix this." | — |

Sem a fonte de design, a regra 1 do guia de conferência visual manda encerrar como `not-run` — não conferir de memória. O browser não foi aberto, não houve login, e nada foi gravado na massa.

**Edge cases tentados:** nada

## Casos

| TC        | Veredito | Passo | Evidência | Nota |
| --------- | -------- | ----- | --------- | ---- |
| TC-UI-004 | skip     | 01    | —         | not-run: o protótipo `Black Friday - Home.html` não pôde ser lido (MCP do Claude Design sem escopo de design) |
| TC-UI-005 | skip     | 01    | —         | not-run: o protótipo `Painel - Campanhas, faixa e perfil.html` não pôde ser lido (mesmo motivo) |

Contagem: pass 0 · fail 0 · blocked 0 · skip 2

## Achados

nada

## Design

**Protótipo:** `4abe021d-d77e-4fe7-affd-524180315fa3` · Uma Estrelinha - Black Friday · `claude_design` · não lido (MCP sem acesso)

| #  | Tela · frame | Elemento | Propriedade | Design | Observado | Evidência | Achado |
| -- | ------------ | -------- | ----------- | ------ | --------- | --------- | ------ |

nada

**Telas não conferidas:** loja `/` — a faixa (`Black Friday - Home.html`, estados Textos · Imagens · Desligada) e painel `/admin/faixa-de-avisos` (`Painel - Campanhas, faixa e perfil.html`, estados padrão · aviso aberto texto/imagem · desligada · "Destino externo") — fonte ilegível nesta sessão

## Spec-gaps

nada

## Fora da cobertura

- O charter inteiro (TC-UI-004, TC-UI-005, os três "Deve tentar" e os edge cases: foco nas setas, 768 na loja, grade do aviso abaixo de 1024) — o MCP do Claude Design recusou a leitura por falta de escopo do token. Para destravar: rodar `/design-login` no Claude Code da sessão orquestradora e repetir o charter.

## Debrief

- **Surpresas:** o MCP do Claude Design está registrado na sessão, mas o token não tem os escopos de design.
- **Próximo charter:** repetir o CH-06 depois do `/design-login`.
- **Padrão novo:** nada
