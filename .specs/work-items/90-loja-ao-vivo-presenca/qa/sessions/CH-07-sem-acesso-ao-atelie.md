# Sessão CH-07 · Sem acesso ao ateliê, nenhum número da loja

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-sem-acesso-ao-atelie.md` · exploratório · P0 |
| Status      | done (TC-SEC-007 blocked por massa/ambiente) |
| Persona     | PER-05 Marina · conta: `qa.semacesso` (conta local sem papel admin, no papel de `admin-secundaria` já removida) |
| Tour · modo | Back-Button · com tour |
| Rodada      | exploração |
| Orçamento   | 16 ações de browser de 25 |
| Ambiente    | app do ateliê http://localhost:8084 (dev) · loja http://localhost:8082 (build) · build não exposto · Chromium headless (Playwright MCP) · viewport 390 × 844 |
| Paridade    | banco local; `*.supabase.co` e `**/g/collect*` bloqueados; a cliente na loja roda num segundo contexto do browser com `navigator.webdriver` neutralizado e o UA sem `HeadlessChrome`; a conta da Marina nunca teve papel admin (não foi "removida" pelo painel, que não está servido) |

## Missão

Confirmar que a Marina, sem acesso, nunca vê o número de pessoas na loja — nem por um instante, nem pelo voltar
do navegador.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | (preparo) uma cliente abre a loja e fica na página de um produto (`/produtos/joia-afetiva-arvore-da-vida-flores-com-leite-materno-e-cabelo`), num contexto separado, para haver presença a vazar | a página do produto carregou | — |
| 02 | Abrir o app em `/` | redireciona para `/login`, "Entrar no ateliê" | — |
| 03 | Entrar com e-mail e senha | logo depois do toque, a tela de login troca para a recusa: alerta "Esta conta não tem acesso ao painel." e botão "Sair". Texto da página lido a cada 100 ms nos primeiros 3 s: só "ATELIÊ · PAINEL" e depois a recusa; nenhum número, nenhum cartão "Agora na loja" | `screenshots/CH-07-03-login-recusa.png` |
| 04 | Abrir `http://localhost:8084/ao-vivo` direto pela URL (deep link) | durante a carga, só "ATELIÊ · PAINEL" em `/ao-vivo`; depois redireciona para `/login` com a mesma recusa. Lido a cada 100 ms por 3 s: dois estados, nenhum com número | `screenshots/CH-07-04-ao-vivo-primeiros-instantes.png` |
| 05 | Abrir o Início `/` direto pela URL | o mesmo: casca "ATELIÊ · PAINEL" e depois a recusa em `/login`; nenhum número | `screenshots/CH-07-05-inicio-deep-primeiros-instantes.png` |
| 06 | Rede: conferir se o app chegou a pedir a leitura ao vivo | nas cargas só aparecem `GET user_roles … role=eq.admin → 200` e `GET customers → 200`; **zero** chamadas `rpc/` ou `functions/v1` saindo do app durante a sessão inteira — a leitura ao vivo nunca é pedida por essa conta | rede: `nada` além das duas leituras |
| 07 | Voltar duas vezes e avançar duas vezes pelo navegador; recarregar na tela de recusa | em todos os casos, só a casca e depois "Esta conta não tem acesso ao painel."; nenhum número | `screenshots/CH-07-06-voltar.png` · `screenshots/CH-07-07-recarregar.png` |
| 08 | Rede cai e volta: offline, abrir `/ao-vivo`; online, abrir `/ao-vivo` de novo | offline: a página de erro do próprio navegador (`ERR_INTERNET_DISCONNECTED`), sem app; ao voltar a rede, a recusa outra vez — falha de rede não virou acesso, e ao voltar não virou "Não consegui carregar." | `screenshots/CH-07-08-offline.png` · `screenshots/CH-07-09-rede-volta.png` |
| 09 | Tocar em "Sair" | volta ao formulário "Entrar no ateliê" | — |

**Edge cases tentados:**

- Deep link em `/ao-vivo` sem acesso (passo 04)
- Deep link no Início (passo 05)
- Voltar e avançar depois da recusa (passo 07)
- Recarregar na tela de recusa (passo 07)
- Rede caindo e voltando sem acesso (passo 08) — só por navegação completa; ver Fora da cobertura

## Casos

| TC         | Veredito | Passo | Evidência                 | Nota                        |
| ---------- | -------- | ----- | ------------------------- | --------------------------- |
| TC-SEC-006 | pass     | 03–08 | `screenshots/CH-07-03-login-recusa.png` · `screenshots/CH-07-04-ao-vivo-primeiros-instantes.png` · `screenshots/CH-07-07-recarregar.png` | a recusa aparece já no login; nem o Início nem `/ao-vivo` chegam a montar, e a leitura ao vivo nunca é pedida. Variação "rede cai na recusa": recusa ao voltar. Ressalva: a presença da cliente do passo 01 não foi conferida por uma conta admin (conferir usaria a conta de outra persona) — mas, sem requisição nenhuma de leitura, não há número a vazar com ou sem presença |
| TC-SEC-007 | blocked  | —     | —                         | massa/ambiente: a conta disponível nunca teve papel admin, então não há "Marina na Loja ao vivo com os números" para começar; e o painel :8083 (onde fica "Remover do painel") não está servido. A variação "app em segundo plano" fica junto |

Contagem: pass 1 · fail 0 · blocked 1 · skip 0

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| Sem acesso, a recusa não é uma tela dentro do Início ou da Loja ao vivo: o app redireciona para `/login` e mostra lá "Esta conta não tem acesso ao painel." com "Sair". Visto pela Marina, é coerente (nenhum número), mas o TC-SEC-006 descreve "a mesma tela de 'sem acesso' das outras abas" — a recusa que se vê é a do login | 03–05 | pré-existente |

## Fora da cobertura

- TC-SEC-007 inteiro (acesso retirado com a Loja ao vivo aberta, a leitura seguinte em até 15 s, voltar ao Início, e a variação com o app em segundo plano) — sem conta com acesso para retirar e sem o painel :8083 servido
- Rede caindo **dentro** do app já carregado (sem navegação completa): em dev não há service worker, então a única forma de cortar a rede sem alterar a página foi a navegação completa, que cai na página de erro do Chromium; a tela "Sem conexão" do app não foi exercitada nesta conta
- A conferência de que a cliente do passo 01 estava contada como presença — exigiria entrar com a conta da Adri

## Debrief

- **Surpresas:** a recusa acontece já no login, antes de qualquer rota com dado; o app não chega a pedir a leitura ao vivo para essa conta
- **Próximo charter:** TC-SEC-007 merece uma sessão com uma conta admin descartável e o painel :8083 servido (ou a remoção feita pela tela do painel), com o app da Marina aberto em `/ao-vivo` durante a remoção
- **Padrão novo:** ler o texto da página a cada 100 ms nos primeiros segundos de cada carga como prova de "nem por um instante" — mais forte que uma screenshot isolada
