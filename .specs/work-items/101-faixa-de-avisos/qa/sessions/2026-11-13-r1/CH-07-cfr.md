# Sessão CH-07 · CFR — a faixa na loja, pelo teclado, com fonte grande e rede lenta

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-07-cfr.md` · cfr · P1 |
| Status      | done |
| Persona     | PER-03 Marta · conta: anonima |
| Tour · modo | — · — |
| Rodada      | exploração |
| Orçamento   | 35 ações de browser de 35 |
| Ambiente    | http://localhost:4173 (build servido, `vite preview`) · build não exposto · Chromium (playwright-cli 0.1.24, headless) · viewports 390 × 844 e 1440 × 900 |
| Paridade    | (1) a função `api/page` substituída por `page.route` da URL exata do documento + `route.fetch()` + `route.fulfill` com `data-faixa` escrito no `<html>` (Q-02); (2) o documento vem pelo Playwright, então a limitação de rede do CDP (Slow 4G: 562,5 ms, 188 743 B/s ↓, 86 400 B/s ↑) e a CPU 4× valem para os recursos e a API, não para o HTML; (3) o documento entregue pelo `route.fulfill` faz o Chromium tratar a página como de outro espaço de endereço e bloquear a API local (`127.0.0.1:54441`, "Permission was denied for this request to access the `loopback` address space") — artefato de ambiente, contornado com a permissão `local-network-access` para `http://localhost:4173`; as medidas antes disso (sem dados da loja, faixa vazia) foram descartadas; (4) Supabase local, `*.supabase.co` e `**/g/collect*` abortados por rota; (5) uma medida por condição, não a mediana de três (orçamento) |

## Missão

Refazer a leitura dos avisos como a Marta (teclado, fonte grande, movimento reduzido) e a chegada da Bia em rede lenta, auditando se a faixa pula, anuncia, some do foco ou corta o link.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Chegar à Home e ao produto em rede lenta, com o documento marcado — primeira bateria (390 e 1440) | A faixa tinha a vaga (52 px em 390, 48 px em 1440) mas sem texto; o console mostrou a API local bloqueada pela política de rede local do Chromium (o documento vinha do `route.fulfill`). Medidas descartadas | console: `Access to fetch at 'http://127.0.0.1:54441/rest/v1/store_settings…' … blocked by CORS policy: Permission was denied … loopback address space` |
| 02 | Liberar a rede local para a origem da loja (`local-network-access`) e medir de novo | A faixa chega com o A1 "Black Friday · novembro inteiro com joias em oferta · Ver ofertas"; nenhum bloqueio novo no console | — |
| 03 | Home em 390 × 844, Slow 4G + CPU 4×, `data-faixa="1"` e `"0"` | `"1"`: CLS 0,0749, FCP 2684 ms, faixa 52 px com o A1; única fonte de deslocamento: `footer`. `"0"`: CLS 0,0995, FCP 2748 ms, sem faixa; fonte: `footer` | — |
| 04 | Produto `/produtos/pingente-olho-grego-folheado-a-ouro` em 390, as duas marcas | `"1"`: CLS 0,8423 (0,2451 `footer` + logo do rodapé; 0,5972 `footer`). `"0"`: CLS 0,9292 (0,2704 `footer` + logo; 0,6588 `footer`). Nenhuma fonte na faixa nem no cabeçalho | — |
| 05 | Home em 1440 × 900, as duas marcas | `"1"`: CLS 0,0647 (0,0303 `main`+`footer`; 0,0033 link "Sobre" do menu do cabeçalho; 0,0311 `footer`), faixa 48 px com o A1. `"0"`: CLS 0,0800 (0,0323 `main`+`footer`; 0,0033 o mesmo link "Sobre"; 0,0444 `footer`). O deslocamento do "Sobre" acontece igual sem faixa | — |
| 06 | Ler a árvore de acessibilidade da Home em 1440 | region "Avisos da loja" antes do `banner`, com button "Aviso anterior" → link "Black Friday · novembro inteiro com joias em oferta · Ver ofertas" (`/joias-afetivas`) → button "Próximo aviso". Nenhum `aria-live` nem `role` `status`/`alert`/`log`/`timer` na faixa ou dentro dela. Antes da faixa, a região "Notifications alt+T" (o aviso de toasts da loja, pré-existente) | snapshot |
| 07 | Percorrer com Tab desde o topo (sem foco) | 1º Tab: "Aviso anterior"; 2º Tab: **"Próximo aviso"** — o link do aviso foi pulado; 3º: logo do cabeçalho; 4º: busca. Anel das setas: `box-shadow` 2 px `rgb(35, 48, 58)` (ink) sobre o ouro, só em `:focus-visible` | `screenshots/CH-07-05-foco-link-1440.png` (foco em "Próximo aviso", não no link) |
| 08 | Repetir: foco em "Aviso anterior" e Tab | O foco foi para o link do aviso (A1), como esperado. O link não tem `tabindex`, `inert` nem `aria-hidden`. Não reproduziu | — |
| 09 | Conferir o contraste do texto da faixa | Texto `rgb(35, 48, 58)` (ink), 14 px, peso 500, sobre `rgb(184, 148, 95)` (accent): 4,78:1 | — |

**Edge cases tentados:** só teclado (Tab desde o topo, duas vezes); rede lenta + CPU 4× nas duas marcas e nos dois viewports; documento sem atributo (medido só antes da liberação da rede local — descartado, ver Fora da cobertura)

## Casos

| TC         | Veredito | Passo  | Evidência | Nota |
| ---------- | -------- | ------ | --------- | ---- |
| TC-CFR-001 | pass     | 03–05  | — (números no passo) | Home 390: 0,0749 ("1") ≤ 0,0995 ("0"); produto 390: 0,8423 ≤ 0,9292; Home 1440: 0,0647 ≤ 0,0800. Nenhuma entrada com a faixa entre as fontes. O link "Sobre" do cabeçalho desloca 0,0033 nas duas marcas — independe da faixa, pré-existente. Uma medida por condição, não mediana de três. Variação sem atributo não medida validamente |
| TC-CFR-002 | pass     | 06–09  | `screenshots/CH-07-05-foco-link-1440.png` | região com nome, antes do cabeçalho, sem anúncio; setas com nome; anel ink nas setas; contraste 4,78:1. A ordem do Tab pulou o link uma vez (A-1, intermitente, 1 de 2). Não conferidos: o anel sobre o link, o nome da imagem do A4 e a variação 390 — orçamento |
| TC-CFR-003 | skip     | —      | — | orçamento esgotado no CLS (a primeira bateria foi perdida para o bloqueio de rede local) |
| TC-CFR-004 | skip     | —      | — | orçamento |

Contagem: pass 2 · fail 0 · blocked 0 · skip 2

## Achados

### A-1 · [Faixa de avisos, 1440] O Tab pulou o link do aviso, indo de "Aviso anterior" direto a "Próximo aviso" — para quem navega só pelo teclado

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-03 Marta |
| Jornada e passo     | J-04, passo 2 (percorrer os avisos com Tab) · passo 07 do log |
| TC                  | TC-CFR-002 |
| Gravidade proposta  | medium — a Marta não chega ao "Ver ofertas" naquela volta e precisa voltar com Shift+Tab ou dar a volta na página; se acontecer com frequência, ela desiste da campanha |
| Reproduziu          | intermitente (1 de 2) |
| Viewport            | 1440 × 900 |

**Passos para reproduzir** — de um estado limpo:

1. Conta anônima, `http://localhost:4173/` em 1440 × 900, documento marcado `data-faixa="1"`, faixa ligada com A1–A4, sem movimento reduzido (a faixa girando)
2. Sem nada focado, aperta Tab: o foco vai a "Aviso anterior"
3. Aperta Tab de novo

**Esperado:** seta anterior → link do aviso → seta próximo — **fonte:** TC-CFR-002 (meta "ordem do Tab"), PRD RN-04

**Observado:** o segundo Tab foi para "Próximo aviso"; o link do aviso não recebeu foco. Na repetição (foco em "Aviso anterior" e Tab), o foco foi ao link. A faixa estava girando entre as duas tentativas (a ref do link na árvore mudou entre leituras), então a troca de aviso entre um Tab e outro é a condição provável — não confirmada

**Evidência:**

- `screenshots/CH-07-05-foco-link-1440.png` — o foco em "Próximo aviso" depois de dois Tabs
- console: nada novo
- rede: nada

## CFR

| Jornada | Categoria             | Marca    | Itens que não passaram | Achado |
| ------- | --------------------- | -------- | ---------------------- | ------ |
| J-02    | Performance percebida | pass     | — (CLS com faixa ≤ sem faixa no produto; FCP ~2,7 s em Slow 4G, dentro do aceitável de 4 s) | — |
| J-04    | Performance percebida | pass     | — (Home 390 e 1440) | — |
| J-04    | Acessibilidade        | friction | ordem do Tab pulou o link uma vez (intermitente) | A-1 |
| J-04    | Usabilidade           | não conferida | o tempo para ler antes de trocar — orçamento | — |
| J-04    | Compatibilidade       | não conferida | movimento reduzido, raiz a 130/200 %, tema escuro, zoom 200 % — orçamento | — |
| J-02    | Paridade com produção | registrada no cabeçalho | build servido; função substituída pela rota; HTML fora da limitação de rede | — |

**Categorias fora:** Recuperação de erro — cortada pelo charter (a leitura que falha é o estado "sem atributo", TC-FUNC-010)

**Pré-existentes (sem achado):** o rodapé desloca a página na carga em rede lenta — CLS 0,93 no produto e 0,10 na Home em 390, com ou sem faixa; o link "Sobre" do menu do cabeçalho desloca 0,0033 em 1440, com ou sem faixa; a região "Notifications alt+T" vem antes da faixa na árvore.

## Spec-gaps

nada

## Fora da cobertura

- TC-CFR-003 (movimento reduzido, 20 s sem troca, entrada sem opacidade 0, troca da preferência com a página aberta) — orçamento: 14 ações foram para a primeira bateria de CLS, invalidada pelo bloqueio de rede local
- TC-CFR-004 (raiz a 130 % e 200 % em 390, zoom 200 % em 1440) — orçamento
- TC-CFR-002: anel de foco sobre o link do aviso, nome da imagem do A4, variação 390 com teclado externo — orçamento
- TC-CFR-001: mediana de três medidas por condição (uma por condição); a variação "sem atributo" só foi medida antes de liberar a rede local (sem dados), então não há número válido; a limitação de rede não se aplica ao HTML entregue pela rota
- Tema escuro do sistema — orçamento
- Safari, Firefox, Safari iOS, Chrome Android — só o Chromium do driver
- Leitor de tela real — fora do browser da sessão (charter)

## Debrief

- **Surpresas:** o `route.fulfill` do documento faz o Chromium tratar a loja como de fora da rede local e bloquear a API do Supabase local; sem a permissão `local-network-access`, a faixa ocupa a vaga mas fica vazia e o CLS sai de uma página sem dados. Quem repetir a medida precisa conceder a permissão antes do primeiro `goto` (ou servir a marca de outro jeito)
- **Próximo charter:** uma sessão curta só para TC-CFR-003 e TC-CFR-004 (movimento reduzido e fonte a 130/200 %), com a permissão já no setup; e repetir o Tab pela faixa várias vezes com ela girando, para confirmar ou descartar A-1
- **Padrão novo:** registrar os `focusin` num array antes de apertar Tab — mostra a ordem real do foco sem um snapshot por tecla
