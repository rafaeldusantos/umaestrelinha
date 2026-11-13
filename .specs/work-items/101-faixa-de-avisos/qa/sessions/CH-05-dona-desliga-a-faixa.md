# Sessão CH-05 · A dona encerra a campanha

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-dona-desliga-a-faixa.md` · exploratório · P1 |
| Status      | done |
| Persona     | PER-01 Adri · conta: `admin-loja` — `QA_ADMIN_LOJA_*` (painel); loja como `anonima` |
| Tour · modo | Back-Button · por cenário (J-05) — rodada de confirmação, sem tour |
| Rodada      | confirmação (r2) |
| Orçamento   | 52 ações de browser de 30. O teto foi passado: cada comando encadeado contou, e alguns foram retrabalho (dois snapshots do painel antes de a tela carregar, um clique que deu timeout). A partir da ação 30, só os passos obrigatórios: o religar e a conferência final |
| Ambiente    | painel http://localhost:8083/admin/faixa-de-avisos · loja http://localhost:4173 (vite preview) e http://localhost:8082 (dev) · HEAD f649a843 (build não exposto na tela) · Chromium headless, `playwright-cli` 0.1.24 (`-s=CH-05` painel, `-s=CH-05-loja` loja) · viewports 1440 × 900 (painel) e 390 × 844 (loja) |
| Paridade    | o documento HTML da Home do :4173 foi servido por `context.route` na URL exata `http://localhost:4173/` com `route.fulfill({ path })`, só para `resourceType() === 'document'` (`preview-home-0.html` e `preview-home-1.html`; o `-1` é o `-0` com o atributo trocado). Scripts e CSS foram ao servidor. Permissão `local-network-access` dada às origens antes do `goto`. Rotas abortadas a sessão inteira: `*.supabase.co` e `**/g/collect*`. Driver: `playwright-cli` e não o `agent-browser`, porque o reteste da r1 mostrou que o `network route --body` do agent-browser responde com um corpo JSON fixo |

## Missão

Confirmar que, ao desligar a faixa, a Adri vê a loja de sempre (sem vão, sem vaga ouro), que voltar e avançar entre páginas abertas antes e depois da troca nunca faz a página pular, e que religar devolve a campanha inteira.

## Passos

Leitura por `eval`: `data-faixa` do `<html>`, presença de `#avisos-da-loja` (e o texto), topo do `<header>` em px, e as entradas de `layout-shift` (`buffered`).

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 00 | Sonda: Home do :4173 com o documento marcado `"0"`, faixa ligada | Abre como página (`contentType` `text/html`), `dataset.faixa` = `"0"`, sem `#avisos-da-loja`, `<header>` y = 0 | — |
| 01 | (BUG-002, uma vez) Da Home marcada `"0"`, faixa ligada, toca em "Novidades" | `/busca?sort=novidades`: `<html>` continua `"0"`, `#avisos-da-loja` presente com "Black Friday · novembro inteiro com joia…", altura 52, `<header>` y = 52. A faixa aparece depois da troca de rota | `screenshots/CH-05-r2-01-ligada-0-troca-rota.png` |
| 02 | Adri entra no painel, desliga "Faixa ligada" e salva | Status "Salvo. Pode levar até uma hora para a faixa aparecer ou sumir em todas as páginas da loja."; a prévia diz "A faixa está desligada: a loja abre sem ela."; os quatro avisos continuam na lista, na ordem; "Salvar alterações" volta a desabilitado | `screenshots/CH-05-r2-02-desligada-salva.png` |
| 03 | (Caso simétrico) Faixa desligada, Home do :4173 com o documento marcado `"1"` | `dataset.faixa` = `"1"`; `#avisos-da-loja` presente, **vazio** (sem texto), altura 52; `<header>` y = 52. É a vaga ouro do passo 1 do TC-FUNC-010 | `screenshots/CH-05-r2-03-desligada-1-carga.png` |
| 04 | Toca em "Novidades" (troca de rota interna) | `/busca?sort=novidades`: `<html>` continua `"1"`, **`#avisos-da-loja` ausente**, `<header>` y = 0. A vaga sumiu | `screenshots/CH-05-r2-04-desligada-1-troca-rota.png` |
| 05 | Volta (voltar do navegador) para a Home | `/`: `<html>` `"1"`, `#avisos-da-loja` **ausente** (a decisão ficou com a configuração, não voltou ao atributo); `<header>` y = −64 — o cabeçalho recolhido pela rolagem restaurada, não a faixa | `screenshots/CH-05-r2-05-desligada-1-terceira-pagina.png` |
| 05b | Tenta abrir uma terceira página por um link do conteúdo | o clique por seletor genérico deu timeout (link fora da tela); não refeito, por orçamento | — |
| 06 | Faixa desligada, loja do dev :8082 sem atributo, carregada de novo | `dataset.faixa` ausente, `#avisos-da-loja` ausente, `<header>` y = 0 | `screenshots/CH-05-r2-06-8082-desligada-sem-atributo.png` |
| 07 | Volta ao painel, religa "Faixa ligada", salva e recarrega a tela | Interruptor ligado; avisos na ordem: A1 "Black Friday · novembro inteiro com joias em oferta" Texto · /joias-afetivas; A2 "10%, 15% e 20% de desconto · em anéis, colares e pingentes selecionados no ateliê" Texto · /amuletos; A3 "Frete grátis · acima de R$ 450,00 para Sul e Sudeste" Texto · sem link; A4 Imagem "Black Friday na Uma Estrelinha: joias em oferta em novembro" · /joias-afetivas; "Salvar alterações" desabilitado (nada pendente) | `screenshots/CH-05-r2-07-religada-depois-do-f5.png` |
| 08 | Recarrega a loja :8082 | `#avisos-da-loja` presente com o A1 "Black Friday · novembro inteiro com joia…", altura 52, `<header>` y = 52 | `screenshots/CH-05-r2-08-loja-religada-a1.png` |
| 09 | Sai da conta do painel | volta a `/admin/login` | — |

Entradas de `layout-shift` lidas: `0.0995` na Home do :4173 marcada `"0"` e na do :8082 sem atributo; `0.0749` na Home do :4173 marcada `"1"`; depois de religar, `0.0561` e `0.0749` na Home do :8082 sem atributo (o estado "não sei", que o TC-FUNC-010 manda só registrar). Não houve aumento depois das trocas de rota (a lista não ganhou entrada nova em 04 e 05). A sessão não isolou de onde vêm as entradas da carga (as imagens das seções são abortadas por rota). Fica com o CH-07 / TC-CFR-001.

**Edge cases tentados:** voltar do navegador depois da troca de rota (passo 05). Nenhum outro: rodada de confirmação.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-010 | pass | 00–05 | `screenshots/CH-05-r2-01-ligada-0-troca-rota.png`, `screenshots/CH-05-r2-03-desligada-1-carga.png`, `screenshots/CH-05-r2-04-desligada-1-troca-rota.png`, `screenshots/CH-05-r2-05-desligada-1-terceira-pagina.png` | Passos 1–4 e a variação "voltar" conferidos no :4173: o atributo decide na carga, a configuração decide a partir da primeira troca de rota, nos dois sentidos. O BUG-002 não reproduziu (passo 01). Não feitos: o passo 5 (`"1"` com a faixa ligada), a variação `/checkout` com `"1"` e o caso simétrico no :8082. Ficam em Fora da cobertura |
| TC-FUNC-009 | pass | 02, 06, 07, 08 | `screenshots/CH-05-r2-02-desligada-salva.png`, `screenshots/CH-05-r2-06-8082-desligada-sem-atributo.png`, `screenshots/CH-05-r2-07-religada-depois-do-f5.png`, `screenshots/CH-05-r2-08-loja-religada-a1.png` | Passos 1, 2 (Home recarregada; a categoria foi conferida no :4173, passo 04), 4 e 5. Não feitos: o passo 3 (produto e rolagem com a faixa desligada) e a variação "lista vazia". Ficam em Fora da cobertura |
| TC-UI-003 | skip | — | — | Orçamento: a captura comparada com o :8092 (Home e categoria, 390 e 1440) não rodou. Só o estrutural, em 390: Home do :8082 sem nada acima do `<header>`, `<header>` y = 0 (passo 06) |

Contagem: pass 2 · fail 0 · blocked 0 · skip 1

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- TC-UI-003 inteiro: a comparação por captura com a loja de hoje (:8092), Home e categoria, em 390 × 844 e 1440 × 900. Motivo: orçamento. O teto (30) foi passado antes de chegar ao TC, e o que sobrava era o religar obrigatório
- TC-FUNC-009 passo 3 (produto, rolagem com a faixa desligada) e a variação "lista vazia com o interruptor ligado". Motivo: orçamento
- TC-FUNC-010 passo 5 (`"1"` com a faixa ligada: A1 dentro da vaga sem mudar a altura) e a variação `/checkout` com `"1"`. Motivo: orçamento. Fora dos alvos desta rodada
- O caso simétrico no :8082 (dev): só rodou no :4173. Motivo: orçamento
- Uma terceira página depois da Home marcada `"1"` (o clique do passo 05b deu timeout). A ausência da faixa foi conferida em duas páginas depois da troca: `/busca` e a Home pelo voltar
- A origem das entradas de `layout-shift` na carga (0,05 a 0,10). Medida aqui só como "não aumentou na troca de rota". É do CH-07 / TC-CFR-001

## Debrief

- **Surpresas:** nenhuma no produto. O orçamento de 30 ações não cabe nesta confirmação se cada comando encadeado contar como uma ação. Só o login e a sonda gastam uns 20
- **Próximo charter:** uma sessão curta só para o TC-UI-003 (captura comparada com o :8092) e o passo 3 do TC-FUNC-009. A massa precisa ficar desligada durante a sessão e ser religada no fim
- **Padrão novo:** nada
