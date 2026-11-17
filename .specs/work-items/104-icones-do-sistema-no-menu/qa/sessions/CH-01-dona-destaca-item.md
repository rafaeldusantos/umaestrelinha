# Sessão CH-01 · A dona destaca o item com ícone do sistema e cor

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-dona-destaca-item.md` · exploratório · P0   |
| Status      | done                                                                   |
| Persona     | PER-01 Adri, a dona · conta: admin — `QA_ADMIN_*`                      |
| Tour · modo | Feature · por cenário (J-01) — na confirmação, só TC-FUNC-004 e o entorno da correção |
| Rodada      | confirmação (rodada 2; a rodada 1 está em `sessions/2026-11-17-r1/`)   |
| Orçamento   | 26 ações de browser de 25 (contadas: open, click, fill, reload; leituras — snapshot, get, wait, screenshot — fora). A 26ª foi o reload da conferência obrigatória do estado final da massa |
| Ambiente    | painel http://localhost:8083/admin/menu · prévia = loja http://localhost:8082/?preview=1 em iframe · build não exposto (correção citada: f3571f6b) · Chromium (agent-browser 0.39.1, headless, sessão `CH-01`) · viewport 1440 × 900; prévia em Computador e Celular |
| Paridade    | nenhum. Rotas `**/*.supabase.co/**` e `**/g/collect*` abortadas antes do primeiro `open` |

## Missão

Confirmar que a dona acha o ícone de etiqueta entre os dois grupos do seletor, dá ao item uma cor para cada fundo vendo o efeito na prévia, e encontra tudo gravado — no painel recarregado e na loja — sem que nada mais mude.

Nesta rodada: conferir TC-FUNC-004 (BUG-001) e o entorno da correção — Cancelar devolve a prévia ao gravado, Salvar grava o que a prévia mostrava, mudar só o nome mantém a cor.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 00 | Entrar como admin e abrir `/admin/menu` | Lista com Joias afetivas, Coleção Amuletos, Colar e correntes, Personalizados, Sobre; prévia com Computador, Celular, Tela cheia, Recarregar visíveis ao lado. Primeira tentativa de entrar não saiu do login (refs envelheceram); a segunda entrou | — |
| 01 | No "Sobre" (A), Ações › "Editar nome, ícone e banners" | Editor à esquerda com o estado gravado: Etiqueta, barra `#E8C77A`, lista `#8A5A2B`. A prévia continua visível e operável ao lado | — |
| 02 | Sem salvar: escolher Coração, barra `#F2E1B6`, lista `#1F5F3A` (valores fora da massa); olhar a prévia em Computador | Barra da prévia: "SOBRE" com o Coração e o rótulo em `rgb(242, 225, 182)` = `#F2E1B6`; os outros itens no tom padrão | `screenshots/CH-01r2-01-previa-computador-rascunho.png` |
| 03 | Trocar a prévia para Celular, ainda sem salvar | Folha aberta, "Sobre" com o Coração e o rótulo em `rgb(31, 95, 58)` = `#1F5F3A` | `screenshots/CH-01r2-02-previa-celular-rascunho.png` |
| 04 | Cancelar | O editor fecha; em menos de um segundo a prévia volta ao gravado: Etiqueta e `rgb(138, 90, 43)` = `#8A5A2B` na folha. Uma leitura imediata ainda pegou o rascunho — o atraso curto já descrito no reteste do BUG-001 | `screenshots/CH-01r2-03-cancelar-volta-gravado.png` |
| 05 | Reabrir o editor do "Sobre" | Campos no gravado: `#E8C77A` e `#8A5A2B` — o Cancelar não gravou o rascunho | — |
| 06 | Mudar só o nome para "Sobre a marca", sem salvar | Prévia (Celular) mostra "Sobre a marca" com a Etiqueta, em `#8A5A2B` | `screenshots/CH-01r2-04-so-nome-previa.png` |
| 07 | Salvar | O editor fecha; a lista passa a "Sobre a marca"; a prévia segue igual ao que mostrava antes de Salvar (nome novo, `#8A5A2B`) | — |
| 08 | Reabrir o editor | "Sobre a marca", Etiqueta, barra `#E8C77A`, lista `#8A5A2B`: mudar só o nome manteve as duas cores e o ícone | `screenshots/CH-01r2-05-so-nome-cores-mantidas.png` |
| 09 | Devolver o nome a "Sobre" e Salvar | Lista e prévia com "Sobre", Etiqueta, `#8A5A2B` na folha | — |
| 10 | Recarregar o painel (conferência do estado final) | Prévia Computador: "SOBRE" com a Etiqueta em `rgb(232, 199, 122)` = `#E8C77A`; "JOIAS AFETIVAS" com o Presente e sem cor na barra | — |
| 11 | Sair da conta | Volta a `/admin/login` | — |

**Edge cases tentados:** nada novo (rodada de confirmação). Entorno da correção: Cancelar com rascunho (04–05), Salvar depois de olhar a prévia (06–07), só o nome com cor gravada (06–08).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-004 | pass | 02–04 | `screenshots/CH-01r2-01-previa-computador-rascunho.png` · `screenshots/CH-01r2-02-previa-celular-rascunho.png` · `screenshots/CH-01r2-03-cancelar-volta-gravado.png` | Antes de Salvar, a prévia mostra ícone e cor nos dois modos e acompanha a troca de valores sem recarregar o quadro; o passo 3 do TC foi feito com outros valores (Coração, `#F2E1B6`, `#1F5F3A`) e Cancelar, para não regravar a massa. BUG-001 segue resolvido |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

Os outros TC do charter (TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-UI-001) passaram na rodada 1 e não foram reexecutados, por instrução da rodada.

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- A gravação do nome "Sobre a marca" não foi conferida por recarga entre os passos 07 e 09 — orçamento; a persistência ficou provada pela recarga final (passo 10) e por TC-FUNC-003 na rodada 1
- A loja (8082) a 390 e a 1440 não foi aberta nesta rodada — fora do escopo da confirmação; a massa foi conferida pela prévia e pelos campos do editor
- Variação "tela cheia" de TC-FUNC-004 — orçamento
- O item B não foi aberto no editor: só lido na prévia recarregada (Presente, sem cor na barra); a cor da lista de B não foi relida — B não foi alterado nesta sessão

## Debrief

- **Surpresas:** a prévia leva menos de um segundo para acompanhar Cancelar e a digitação do nome; uma leitura imediata ainda mostra o valor anterior. Já registrado no reteste do BUG-001; não é achado
- **Próximo charter:** nada
- **Padrão novo:** nada

Estado final da massa: A "Sobre" = Etiqueta, barra `#E8C77A`, lista `#8A5A2B` (campos do editor no passo 08, nome devolvido no 09, barra e ícone conferidos após recarga no 10). B "Joias afetivas" não alterado (Presente, sem cor na barra, conferido no 10). C e D só lidos; perfil de estilo não tocado.
