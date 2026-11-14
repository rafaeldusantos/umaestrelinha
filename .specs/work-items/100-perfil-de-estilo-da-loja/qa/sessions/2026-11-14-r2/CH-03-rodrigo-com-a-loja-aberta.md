# Sessão CH-03 · Rodrigo com a loja aberta de antes da troca: a cor não muda diante dele

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-rodrigo-com-a-loja-aberta.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-03 Rodrigo · conta: anonima                                        |
| Tour · modo | Interrupt · por técnica (transição de estado: atributo da carga × perfil salvo) |
| Rodada      | confirmação (rodada 2) — só TC-FUNC-008                                |
| Orçamento   | 24 ações de browser de 25                                              |
| Ambiente    | http://localhost:8182 · build não exposto · Chromium (playwright-cli 0.1.24, headless) · viewport 390 × 844 |
| Paridade    | driver `cli` no lugar do `agent-browser`: o agent-browser 0.39.1 não tem como conceder permissão ao contexto, e o briefing pedia `local-network-access` concedida. No contexto: `grantPermissions(['local-network-access'], origin http://localhost:8182)`; documento (só `resourceType === 'document'`) de `http://localhost:8182/` servido com `doc/home.html` e de `/produtos/colar-coracao-dois-meninos` com `doc/produto.html` (ambos `data-perfil="padrao"`, o "HTML do cache"); módulos JS não interceptados; `*.supabase.co` e `**/g/collect*` abortados. Perfil salvo = Black Friday (S1, deixado pela thread; não conferido no painel — persona anônima) |

## Missão

Como quem deixou a aba da loja aberta antes de a dona ligar o Black Friday, achar qualquer jeito de a página mudar de
cor sem ele trocar de página — e confirmar que, ao trocar, ela passa ao perfil salvo de uma vez e fica nele.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Sonda: abre a Home com o documento interceptado e a permissão concedida | página `text/html`, `data-perfil="padrao"`, cabeçalho `rgb(40, 58, 74)` = #283A4A; **os dados chegaram**: 26 links de produto e as categorias no menu (a pendência de ambiente da rodada 1 está resolvida) | `screenshots/2026-11-14-r2/CH-03-01-sonda-home-padrao-com-dados.png` |
| 02 | Abre o menu ("Abrir menu") | gaveta "Menu" com Joias afetivas, Colar e correntes, Personalizados, Sobre, Conta, Favoritos, Pedidos; página segue `padrao` com o menu aberto | — |
| 03 | Toca em "Colar e correntes" (`/` → `/joias-e-acessorios/colar-e-correntes`) | `data-perfil="black-friday"`, cabeçalho `rgb(13, 12, 11)` = #0D0C0B, 24 produtos na categoria | `screenshots/2026-11-14-r2/CH-03-02-categoria-black-friday.png` |
| 04 | Abre o produto "Colar personalizado com nome do gato" | `/produtos/colar-personalizado-com-nome-do-gato`, h1 do produto, `black-friday`, #0D0C0B. Um observador de atributo (só leitura) posto no `<html>` depois do passo 03 não registrou nenhuma mudança de `data-perfil` | `screenshots/2026-11-14-r2/CH-03-03-produto-black-friday.png` |
| 05 | Volta com o botão do navegador duas vezes (produto → categoria → Home, a página da carga) | `/`, produtos na tela, `black-friday`, #0D0C0B; o observador seguiu sem nenhuma mudança (mesmo documento, sem alternar entre os perfis) | `screenshots/2026-11-14-r2/CH-03-04-voltou-home-black-friday.png` |

**Edge cases tentados:** nada (rodada de confirmação: sem edge case novo)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-008 | pass | 03–05 | `screenshots/2026-11-14-r2/CH-03-02-categoria-black-friday.png`, `screenshots/2026-11-14-r2/CH-03-03-produto-black-friday.png`, `screenshots/2026-11-14-r2/CH-03-04-voltou-home-black-friday.png` | Passo 1 (menu → categoria): `black-friday` / #0D0C0B. Passo 2 (produto): `black-friday`. Passo 3 (voltar até a Home): continua `black-friday`, sem nenhuma troca de atributo entre o passo 03 e o 05. Variações (query, F5) não rodadas — fora do foco da confirmação |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- TC-FUNC-007 — já passou na rodada 1; o briefing manda não refazer
- Variações do TC-FUNC-008 (troca só de query, F5 na página da carga) e "Deve tentar" 4 (partir do produto interceptado `/produtos/colar-coracao-dois-meninos`) — fora do foco da confirmação; a rota do produto ficou ativa, mas não foi usada
- Viewport 1440 × 900 — orçamento (24 de 25)
- O instante exato da troca na primeira navegação (padrao → black-friday) não foi observado com o observador: ele foi posto depois do passo 03. A mudança aconteceu com a troca de rota; o que se provou é que, dali em diante, não houve volta nem alternância
- Conferir o perfil salvo pela tela do painel — fora da conta da persona (anônima)

## Debrief

- **Surpresas:** com a permissão `local-network-access` concedida os dados do Supabase local chegam com o documento interceptado; o menu, que na rodada 1 vinha sem categorias, agora as lista — o spec-gap da rodada 1 era do ambiente. O "não troca ao navegar" da rodada 1 não se repetiu
- **Próximo charter:** nada
- **Padrão novo:** observador de `data-perfil` (só leitura) para provar "sem alternar" entre navegações
