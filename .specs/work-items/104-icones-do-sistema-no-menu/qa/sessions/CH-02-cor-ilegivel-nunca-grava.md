# Sessão CH-02 · Cor ilegível ou malformada nunca chega a gravar

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-cor-ilegivel-nunca-grava.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri, a dona · conta: `admin` — `QA_ADMIN_*`                    |
| Tour · modo | Garbage · por técnica (valor limite e transição de estado)            |
| Rodada      | confirmação (rodada 2) — o log da rodada 1 está em `sessions/2026-11-17-r1/` |
| Orçamento   | ~38 ações de browser de 25 — 5 se perderam na sessão `CH-02`, que passou a mostrar outra aplicação (`http://127.0.0.1:4802/`) logo depois do login; a sessão recomeçou como `CH-02r2`. As últimas ~10 (recarregar e conferir o item C restaurado, sair da conta) passaram do teto para devolver a massa |
| Ambiente    | painel http://localhost:8083 · build não exposto (correção citada: 86452bf6) · Chromium (agent-browser 0.39.1, headless) · viewport 1440 × 900 |
| Paridade    | Supabase local; perfil de estilo em Black Friday (não foi alterado). Rotas `**/*.supabase.co/**` e `**/g/collect*` abortadas antes do primeiro `open` |

## Missão

Achar qualquer jeito de uma cor ilegível, um código malformado ou um item de submenu chegar a gravar cor no menu — e confirmar que a dona, ao ser recusada, entende por quê e não perde o que digitou.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou como admin, /admin/menu › Ações de "Personalizados" › Editar nome, ícone e banners | Editor do item C: barra e lista vazias, "Usar a cor padrão" desabilitado nas duas | — |
| 02 | Barra `E8C77A` (sem #), lista `#12`, saiu do campo com Tab | Nenhuma frase sob nenhum dos campos ao sair do campo; os códigos continuam lá | — |
| 03 | Salvar | `alert` no editor: "Use o formato #RRGGBB na cor do texto, ou toque em “Usar a cor padrão”."; editor aberto, códigos mantidos, nada gravado | `screenshots/CH-02r2-01-formato-salvar.png` |
| 04 | Barra `#8A5A2B`; lista `#8A5A2B` e depois apagou a lista; Salvar | Lista fica vazia (seletor `#000000`, "Usar a cor padrão" desabilitado) — não volta a cor anterior; recusa só da barra, sob o campo e no `alert`: "A cor do texto na barra do computador mede 1,6:1 sobre a barra no perfil Padrão: o nome fica difícil de ler. Escolha uma cor mais clara (o mínimo é 4,5:1)." | `screenshots/CH-02r2-02-contraste-e-lista-vazia.png` |
| 05 | Barra `#E8C77A` com a lista ainda vazia; Salvar | "Salvo" | — |
| 06 | Recarregou e reabriu C | Barra `#E8C77A` com "5,7:1 Contraste bom para ler o nome na barra do computador."; lista vazia, sem cor — a barra gravou sozinha | `screenshots/CH-02r2-03-so-barra-gravada.png` |
| 07 | "Usar a cor padrão" na barra; Salvar | Campo esvaziado; "Salvo" | — |
| 08 | Recarregou e reabriu C | Barra e lista vazias, seletores `#ffffff`/`#000000`, os dois "Usar a cor padrão" desabilitados — C sem cor. Ícone não foi tocado (Gravação). Cancelou e saiu da conta | `screenshots/CH-02r2-04-c-restaurado.png` |

**Edge cases tentados:** nada novo (rodada de confirmação) — só o entorno da correção pedido no briefing.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-006 | pass | 02–08 | `screenshots/CH-02r2-01-formato-salvar.png` · `screenshots/CH-02r2-02-contraste-e-lista-vazia.png` · `screenshots/CH-02r2-03-so-barra-gravada.png` | Formato: `E8C77A` e `#12` recusados ao Salvar com a frase de formato, códigos mantidos, nada gravado. Campo vazio = sem cor: a lista apagada fica vazia e não volta a cor anterior; gravou barra com lista vazia e, depois do "Usar a cor padrão", as duas vazias (conferido após recarregar). `#GGGGGG`, `#E8C77AFF` e minúsculas não foram repetidos (passaram ou não mudaram na rodada 1; orçamento) |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

Entorno da correção: campo apagado não impede o outro de gravar (passos 05–06) · código inválido recusado ao Salvar (03) · "Usar a cor padrão" funciona (07–08) · `#8A5A2B` na barra (1,6:1) continua recusado (04).

## Achados

nada

Observação (não é regressão nem critical/high — sugestão de backlog): ao **sair do campo** com um código fora do formato, nenhuma frase aparece; a recusa de formato só surge ao Salvar, num `alert` genérico que não diz qual dos dois campos está errado. Na rodada 1 não havia frase alguma, então não é regressão.

## Spec-gaps

nada

## Fora da cobertura

- `#GGGGGG`, `#E8C77AFF` e o código colado com espaço não foram repetidos nesta rodada — orçamento estourado pela sessão perdida
- Recusa de contraste na lista (`#E8C77A` na lista) não repetida; só a da barra
- Efeito na loja (8082) não conferido; o estado gravado foi conferido no editor depois de recarregar
- A sessão `CH-02` do agent-browser foi tomada por outra aplicação (`127.0.0.1:4802`) e não foi fechada por este agente, para não derrubar quem a usa agora; ela ainda guarda o login do admin no painel
