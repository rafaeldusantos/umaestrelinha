# Sessão CH-03 · Rodrigo com a loja aberta de antes da troca: a cor não muda diante dele

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-rodrigo-com-a-loja-aberta.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-03 Rodrigo · conta: anonima                                        |
| Tour · modo | Interrupt · por técnica (transição de estado: atributo da carga × perfil salvo) |
| Rodada      | exploração                                                             |
| Orçamento   | 52 ações de browser de 50 (a última reprodução do A-1 passou 2 do teto) |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports 390 × 844 · 844 × 390 |
| Paridade    | documento HTML da Home interceptado (`network route` na URL exata `http://localhost:8082/`, corpo = `doc/home.html` da thread, `data-perfil="padrao"`) simulando o HTML do cache; `*.supabase.co` e `**/g/collect*` abortados; perfil salvo = Black Friday (S1, deixado pela thread, não conferido na tela nesta sessão) |

## Missão

Como quem deixou a aba da loja aberta antes de a dona ligar o Black Friday, achar qualquer jeito de a página mudar de
cor sem ele trocar de página — e confirmar que, ao trocar, ela passa ao perfil salvo de uma vez e fica nele.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Sonda: abre a Home com o documento interceptado | página como `text/html`, `data-perfil="padrao"`, cabeçalho `rgb(40, 58, 74)` = #283A4A. Sonda ok | `screenshots/2026-11-14-r1/CH-03-01-sonda-home-padrao.png` |
| 02 | Abre outra aba (about:blank) e volta à loja | `padrao`, #283A4A, `visibilityState` visible | — |
| 03 | Deixa a página parada 60 s | `padrao`, #283A4A | — |
| 04 | Rola até o rodapé | `padrao`, #283A4A | — |
| 05 | Abre a sacola (gaveta "Sua sacola", vazia), sem trocar de rota | `padrao`, #283A4A | `screenshots/2026-11-14-r1/CH-03-02-sacola-parada-padrao.png` |
| 06 | Fecha a sacola; rede cortada 10 s e devolvida, parado | `padrao`, #283A4A | — |
| 07 | Gira a tela (844 × 390) e volta a 390 × 844 | `padrao`, #283A4A nos dois | — |
| 08 | Abre o menu para ir a uma categoria | o menu ("Menu") só traz busca, Conta, Favoritos, Pedidos — nenhuma categoria; a seção "Categorias" do rodapé também vem vazia. Fecha o menu | — |
| 09 | Toca no link interno "Novidades" do rodapé (troca de página `/` → `/busca?sort=novidades`) | URL trocou, mas segue `padrao` e cabeçalho #283A4A. Rede mostra `GET /rest/v1/store_settings` respondido (a configuração carregou) | `screenshots/2026-11-14-r1/CH-03-03-novidades-segue-padrao.png` |
| 10 | Reproduz: toca em "Coleções" (troca para `/busca`) | segue `padrao`, #283A4A | `screenshots/2026-11-14-r1/CH-03-04-colecoes-segue-padrao.png` |

**Edge cases tentados:** abrir a sacola sem trocar de rota (sem mudança); rede cortada e devolvida com a página parada
(sem mudança); girar 390 → 844 × 390 e voltar (sem mudança); trocar de aba e voltar (sem mudança).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-007 | pass | 02–07 | `screenshots/2026-11-14-r1/CH-03-01-sonda-home-padrao.png`, `screenshots/2026-11-14-r1/CH-03-02-sacola-parada-padrao.png` | 60 s parado, troca de aba, rodapé, sacola, offline 10 s, giro: sempre `padrao` / #283A4A. Variação "começar num produto" não rodada (orçamento). Como a página não troca de cor nem ao trocar de rota (A-1), o pass aqui não distingue "segura a cor parada" de "nunca troca" |
| TC-FUNC-008 | fail | 09–10 | `screenshots/2026-11-14-r1/CH-03-03-novidades-segue-padrao.png`, `screenshots/2026-11-14-r1/CH-03-04-colecoes-segue-padrao.png` | A-1. Passo 1 falha (a troca de página não aplica `black-friday`); passos 2–3 (produto, voltar) e as variações (query, F5) não rodados — orçamento |

Contagem: pass 1 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Loja · troca de página] Quem abriu a loja antes do Black Friday nunca passa ao perfil salvo ao navegar — Rodrigo

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Rodrigo                                                        |
| Jornada e passo     | J-03 (ramo J-03a), troca de página depois da carga · passos 09–10 do log |
| TC                  | TC-FUNC-008                                                           |
| Gravidade proposta  | high — a loja dele fica no perfil anterior enquanto navega: a regra de carga da Mudança não se cumpre e a campanha não chega a quem tinha a aba aberta |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônimo, perfil salvo = Black Friday (S1). Rotear o documento da URL exata `http://localhost:8082/` para o HTML com
   `<html data-perfil="padrao">` (o `doc/home.html` da thread); bloquear `*.supabase.co` e `**/g/collect*`
2. Abrir `http://localhost:8082/` a 390 × 844: `data-perfil="padrao"`, cabeçalho #283A4A (correto)
3. Tocar em "Novidades" no rodapé (vai a `/busca?sort=novidades`): segue `padrao`, cabeçalho #283A4A
4. Tocar em "Coleções" (vai a `/busca`): segue `padrao`, cabeçalho #283A4A

**Esperado:** a partir da primeira troca de página vale o perfil salvo — `data-perfil="black-friday"`, cabeçalho
#0D0C0B — **fonte:** PRD RN-04, UC-01 (segundo item); spec R2, H6; TC-FUNC-008 passo 1; charter CH-03 "Deve tentar" 3

**Observado:** depois de duas trocas de rota a página continua em `padrao` com o cabeçalho ardósia #283A4A. A
configuração foi buscada (`GET /rest/v1/store_settings?select=key,value` aparece na rede, várias vezes).

**Evidência:**

- `screenshots/2026-11-14-r1/CH-03-03-novidades-segue-padrao.png` — `/busca?sort=novidades` ainda em Padrão
- `screenshots/2026-11-14-r1/CH-03-04-colecoes-segue-padrao.png` — `/busca` ainda em Padrão
- console: não lido (orçamento)
- rede: `GET /rest/v1/store_settings` → respondido (status não lido); nenhuma falha vista

**Ressalva para a triagem:** a sessão não conferiu na tela que o salvo é Black Friday (a massa diz S1, deixado pela
thread). As duas trocas foram de `/` para `/busca` (mesma página de busca); não se tentou uma rota de categoria nem
de produto, porque o menu não ofereceu categoria (passo 08) e o orçamento acabou. Vale conferir o salvo no painel e
repetir com `/produtos/<slug>` antes de abrir o bug.

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O menu (gaveta "Menu") não lista categorias e a seção "Categorias" do rodapé vem vazia — não há "menu → categoria" para a persona tocar | 08 | pré-existente |

## Fora da cobertura

- Abrir um produto e voltar com o botão do navegador até a Home (TC-FUNC-008 passos 2–3) — orçamento esgotado
- Repetir a partir do produto interceptado (`/produtos/colar-coracao-dois-meninos`, "Deve tentar" 4 e variação do TC-FUNC-007) — orçamento
- Voltar com o botão do sistema logo depois da primeira troca; troca só de query (`/busca?q=pingente` → `/busca?q=anel`); recarregar a página da carga — orçamento
- Console de erros depois do A-1 — orçamento
- Se a troca de aba no headless dispara `visibilitychange`/foco como no celular real: `visibilityState` leu `visible` ao voltar, mas o evento não foi observado
- Conferir o perfil salvo pela tela do painel — fora da conta da persona (anônima)

## Debrief

- **Surpresas:** a troca de página não aplicou o perfil salvo (A-1) — o charter esperava a passagem para Black Friday e ela não aconteceu em duas trocas
- **Próximo charter:** repetir CH-03 a partir do produto interceptado, com rota de categoria/produto e o botão voltar, depois de conferir S1 no painel
- **Padrão novo:** nada
