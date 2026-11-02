# Sessão CH-04 · O que estão olhando, de onde vieram e em que aparelho

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-o-que-olham-e-de-onde-vieram.md` · exploratório · P1 |
| Status      | done |
| Persona     | PER-01 Adri · conta: `admin-atelie` (credencial do arquivo de credenciais do QA local, nunca o valor) · clientes `anonima` em contextos isolados · uma cliente logada (a conta sem papel admin do arquivo de credenciais, nome de exibição "QA") |
| Tour · modo | Feature · por técnica (partição de joias, origem e aparelho) |
| Rodada      | exploração |
| Orçamento   | 37 ações de browser de 50 |
| Ambiente    | app http://localhost:8084/ao-vivo (dev) · loja http://localhost:8082 (build, `vite preview`) · build não exposto · Chromium headless (Playwright MCP) · app em 390 × 844; loja em 390 × 844 (iPhone, Android), 768 × 1024 (iPad), 1280 × 800 (computador) |
| Paridade    | banco local com `production_host = localhost`; cada cliente num contexto novo com UA trocado (iPhone, Android Chrome, iPad, Mac sem HeadlessChrome), `navigator.webdriver` neutralizado, `*.supabase.co` e `**/g/collect*` bloqueados; cookies aceitos em cada contexto; a origem simulada no pouso por `?utm_source=` e pelo `referer` do `goto`; contextos criados e conduzidos por `browser_run_code_unsafe` (vários clientes por chamada); alguns cliques na loja por `dispatchEvent` (o aviso de cookies interceptava o toque a 390) |

## Missão

Confirmar que a Adri vê quais joias estão sendo vistas (com foto, nome e quantas pessoas), o Guia quando alguém
está nele, de onde cada pessoa veio e quantas estão no celular — e nada que diga quem é a pessoa.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | entrar no app como a Adri e abrir a Loja ao vivo (390) | já havia 1 pessoa de uma sessão anterior (computador, Direto, na joia "Joia Afetiva Árvore da Vida Flores…"); C com essa joia, D "Direto 1", E "0 de 1" + "o resto pelo computador ou tablet" | — |
| 02 | sete clientes entram: duas no "Memorial Afetivo Pet Pata" (iPhone, `utm_source=instagram`; iPhone, referer google.com), uma no "Berloque…" (computador, referer wa.me), uma no "Pingente Afetivo Dois Corações" (iPad, referer de outro site), uma na "Pirâmide Afetiva Pet" (Android, sem referência), uma na "Joia Afetiva com Dente de Leite" (iPhone, `utm_source=whatsapp` com referer google.com), e a cliente da Home vai à "Placa Afetiva…" | — (preparo) | — |
| 03 | a Adri espera ~25 s e lê a tela | Agora na loja 8. C: Memorial "2 pessoas"; depois Berloque, Joia Afetiva Árvore da Vida Flores, Joia Afetiva com Dente de Leite, Pingente Dois Corações, "1 pessoa" cada — 5 linhas, por nome no empate; Pirâmide e Placa (as últimas pelo nome) de fora. Cada linha com foto 40 px carregada. D: Instagram 1 · Google 1 · WhatsApp 2 · Direto 3 · Outros 1 (= 8), com a nota do Direto; legenda em duas colunas, a quinta faixa com a largura inteira (324 px contra 156). E: "5 de 8" + "o resto pelo computador ou tablet", bloco com a largura inteira (358 px). Página sem rolagem lateral (scrollWidth 390) com nomes longos quebrando | `screenshots/CH-04-03-oito-pessoas-cinco-joias.png` |
| 04 | a cliente do Instagram navega por três páginas (categoria, Sobre, outra joia) por clique; a do Android vai ao Guia de envio do material | — (preparo) | — |
| 05 | a Adri lê de novo | total 7 (a pessoa da sessão anterior saiu). C: Berloque · **Guia de envio do material** (com ícone, "1 pessoa") · Joia com Dente de Leite · Memorial · Pingente Dois Corações · Pingente Gota — cinco joias + o Guia, ordenados juntos (empate por nome); a Placa, última pelo nome, de fora. D: Instagram continua 1 depois da navegação (a origem guardada na aba ficou "instagram") | — |
| 06 | todos os clientes fecham; a Adri espera | em 220 s: "Ninguém na loja agora." em A, D e E; "Ninguém olhando uma joia agora." em C | `screenshots/CH-04-06-ninguem-na-loja.png` |
| 07 | três clientes de iPhone: uma numa categoria, uma na busca, uma na sacola (`/carrinho` leva à Home, a sacola é gaveta) | total 3; C "Ninguém olhando uma joia agora."; D Direto 3; E "3 de 3", sem a linha "o resto…". O bloco B ao lado diz "Olhando joias 3" (ver Spec-gaps) | `screenshots/CH-04-07-categoria-busca-home-sem-joia.png` |
| 08 | a cliente da categoria abre uma joia; a cliente logada (nome "QA", e-mail conhecido) entra pela senha e abre a "Joia Afetiva Pirâmide com Leite Materno" | C passa a mostrar "Joia Afetiva Pirâmide com Leite Materno · 1 pessoa" e "Pingente Afetivo Barquinho com Cabelo · 1 pessoa"; a frase de vazio sumiu. Nenhum e-mail, nome ou trecho do e-mail no texto, nos nomes acessíveis, no título nem na URL | — |
| 09 | a cliente logada põe a joia na sacola e vai ao checkout (sem preencher dados) | — (preparo) | — |
| 10 | a Adri abre o Início | cartão "Agora na loja, 4 pessoas. Abrir loja ao vivo" · "4 · pessoas · 1 no checkout"; nada da cliente logada. As únicas ocorrências de "QA" na tela são nomes de clientes nos Pedidos recentes (pedidos #0268–#0270 de outras contas de teste, superfície anterior, não presença) | `screenshots/CH-04-10-inicio-cliente-logada-no-checkout.png` |
| 11 | entram uma cliente de computador com referer `l.instagram.com` no Barquinho e uma de iPad com referer `api.whatsapp.com` no Guia; a Adri volta à Loja ao vivo | total 6; C: Barquinho "2 pessoas" acima do Guia "1 pessoa" (a Pirâmide saiu de C porque a cliente logada está no checkout); D: Instagram 1 · WhatsApp 1 · Direto 4; E: "4 de 6" + "o resto…"; B com "No checkout 1" e a nota. Varredura de texto, nomes acessíveis, título e URL: nada da cliente | `screenshots/CH-04-11-guia-abaixo-da-joia-logada-no-checkout.png` |
| 12 | fecha os contextos das clientes e sai da conta do app ("Sua conta" › "Sair") | volta ao login | — |

**Edge cases tentados:**

- Seis/sete joias com gente e empates: só cinco linhas, empate pelo nome (passos 03, 05)
- Guia sozinho com joias de 1 pessoa e Guia abaixo de joia com 2 (passos 05, 11)
- Navegar depois do pouso: a faixa fica a do pouso (passo 05)
- `utm_source=whatsapp` com referer do Google ⇒ WhatsApp; `l.instagram.com` ⇒ Instagram; `api.whatsapp.com` ⇒ WhatsApp; referer de outro site ⇒ Outros (passos 03, 11)
- Android Chrome conta celular; iPad conta como "o resto" (passos 03, 11)
- Todos no celular: "o resto…" some (passo 07)
- Ninguém na loja: C, D e E com as frases de vazio (passo 06)
- Categoria, busca e Home não entram em C; cliente no checkout sai de C (passos 07, 11)
- Nomes longos a 390: quebram, sem rolagem lateral (passo 03)
- Cliente logada com nome e e-mail: nada dela no app (passos 08, 10, 11)

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-009 | pass | 03, 05 | `screenshots/CH-04-03-oito-pessoas-cinco-joias.png` | ordem por pessoas, empate por nome, corte em 5, foto + nome + "{n} pessoa(s)"; nome longo sem rolagem lateral. Variação "joia sem foto" não testada (sem massa conhecida) |
| TC-FUNC-010 | pass | 05, 11 | `screenshots/CH-04-11-guia-abaixo-da-joia-logada-no-checkout.png` | o Guia como linha própria com ícone, além das cinco joias (6 linhas), ordenado junto; joia com 2 acima do Guia com 1. O passo 1 (Guia sozinho) não foi isolado |
| TC-FUNC-011 | pass | 06, 07, 08 | `screenshots/CH-04-07-categoria-busca-home-sem-joia.png` | categoria, busca e Home (a "sacola" `/carrinho` leva à Home) não entram; a frase some quando uma abre joia. Variação `/conta` não testada à parte |
| TC-FUNC-012 | pass | 03, 05, 11 | `screenshots/CH-04-03-oito-pessoas-cinco-joias.png` | cinco faixas somando o total; quinta faixa em linha inteira; nota do Direto; faixa do pouso mantida; as três variações conferidas; vazio com a frase (passo 06) |
| TC-FUNC-013 | pass | 03, 07, 11 | `screenshots/CH-04-07-categoria-busca-home-sem-joia.png` | "3 de 3" sem a segunda linha; "5 de 8" e "4 de 6" com ela; bloco em linha inteira; Android conta celular; vazio com a frase |
| TC-SEC-005 | pass | 08, 10, 11 | `screenshots/CH-04-10-inicio-cliente-logada-no-checkout.png` | cartão do Início, blocos A–E, Acessos, título e URL sem nome nem e-mail da cliente; ela aparece só nos números (inclusive "1 no checkout"). Ela foi ao checkout sem preencher telefone ou cidade |

Contagem: pass 6 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Com três clientes numa categoria, na busca e na Home, o bloco B diz "Olhando joias 3" logo acima de C dizendo "Ninguém olhando uma joia agora." As duas frases usam "olhando joia(s)" para coisas diferentes (B conta quem navega na loja; C só quem está numa página de joia), e lidas juntas parecem se contradizer. Nenhuma fonte lida define o rótulo de B para quem está fora de uma página de joia | 07 | polimento |

## Fora da cobertura

- Joia sem foto (variação de TC-FUNC-009) — nenhuma joia sem foto conhecida na massa, e procurá-la fugiria da Entrada do charter
- Guia de envio do material com uma pessoa só e mais ninguém em joia (TC-FUNC-010 passo 1) — o Guia foi visto com joias de 1 e de 2 pessoas, não sozinho
- Cliente em `/conta` (variação de TC-FUNC-011) — orçamento
- Cliente logada preenchendo telefone e endereço no checkout (TC-SEC-005 passo 1) — ela chegou ao checkout com a sessão e a sacola, sem preencher campos; telefone e cidade dela não foram postos em jogo
- O passo exato "2 de 2 → 2 de 4" de TC-FUNC-013 com só duas iPhones — conferido por partições equivalentes ("3 de 3", "5 de 8", "4 de 6")
- O instante da saída de cada cliente (≤ 5 min) — medido só que o vazio chegou em 220 s após fechar todas

## Debrief

- **Surpresas:** `/carrinho` não é página (a sacola é gaveta, a rota leva à Home); a pessoa no checkout sai da lista de joias, o que é coerente mas não está escrito no TC
- **Próximo charter:** a leitura conjunta de B e C (spec-gap acima) merece um olhar no CH de privacidade/tom ou uma pergunta ao PRD
- **Padrão novo:** um helper de contexto (UA, `webdriver`, bloqueios, cookies, `referer` do `goto`) repetido dentro de `browser_run_code_unsafe` permite montar até sete clientes numa ação; o estado do servidor de MCP não persiste entre chamadas (`globalThis` some), mas os contextos sim — reencontrá-los por `browser.contexts()` e pela URL
