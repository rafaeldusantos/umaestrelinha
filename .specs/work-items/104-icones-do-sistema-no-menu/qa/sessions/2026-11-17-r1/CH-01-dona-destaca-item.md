# Sessão CH-01 · A dona destaca o item com ícone do sistema e cor

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-dona-destaca-item.md` · exploratório · P0   |
| Status      | done (orçamento esgotado antes da gravação — ver Fora da cobertura)    |
| Persona     | PER-01 Adri, a dona · conta: `admin` — `QA_ADMIN_*`                    |
| Tour · modo | Feature · por cenário (J-01)                                           |
| Rodada      | exploração                                                             |
| Orçamento   | 50 ações de browser de 50 (mais 8 de encerramento: fechar o editor sem salvar, sair da conta, fechar o browser) |
| Ambiente    | painel http://localhost:8083/admin/menu · loja http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports 1440 × 900 (painel e loja) · 390 × 844 (loja) |
| Paridade    | Supabase local; `**/*.supabase.co/**` e `**/g/collect*` bloqueados; menu ainda na forma legada (nenhuma gravação nesta sessão); perfil de estilo Black Friday na partida (o charter dizia Padrão; o briefing declara Black Friday) |

## Missão

Confirmar que a dona acha o ícone de etiqueta entre os dois grupos do seletor, dá ao item uma cor para cada fundo vendo o efeito na prévia, e encontra tudo gravado — no painel recarregado e na loja — sem que nada mais mude.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel pela tela de login e foi a Loja › Menu da loja; registrou o estado de partida do painel e da loja a 1440 (barra) e a 390 (folha aberta) | Login levou ao Dashboard; pelo link "Menu da loja" chegou a /admin/menu com Joias afetivas, Coleção Amuletos, Colar e correntes, Personalizados e Sobre. Loja a 1440: barra com JOIAS AFETIVAS, COLEÇÃO AMULETOS, COLAR E CORRENTES, PERSONALIZADOS, SOBRE. Loja a 390: folha aberta pelo "Abrir menu", com "Sobre" | `screenshots/CH-01-01-painel-partida.png` · `screenshots/CH-01-01-loja-1440-partida.png` · `screenshots/CH-01-01-loja-390-partida.png` |
| 02 | Abriu o item A ("Sobre") | Clicar na linha do item não abriu editor; abriu por "Ações de “Sobre”" › "Editar nome, ícone e banners". Diálogo "Editar “Sobre”" com Nome no menu, "Ícone de “Sobre”" (busca + "Sem ícone"), título "DA UMA ESTRELINHA" com 29 ícones da marca, título "DO SISTEMA" com Etiqueta, Porcentagem, Presente, Coração, Cupom, Frete, Calendário, Informação, Dúvida, Início; depois o grupo "Cor do texto" com "Na barra do computador (fundo escuro)" e "Na lista do celular (fundo branco)", cada um com seletor de cor, campo de código e "Usar a cor padrão" (desabilitado, sem cor) | — |
| 03 | Rolou até "Do sistema" sem buscar | O grupo aparece abaixo da grade da marca, com os dez ícones | `screenshots/CH-01-02-do-sistema.png` |
| 04 | Buscou "etiqueta" | Só "DO SISTEMA" com Etiqueta; "DA UMA ESTRELINHA" sumiu; "Sem ícone" continua | — |
| 05 | Buscou "coracao" (sem acento) | Só "DO SISTEMA" com Coração | — |
| 06 | Buscou "Calendário" | Só "DO SISTEMA" com Calendário | — |
| 07 | Buscou pela chave `gota-afetiva` | Só "DA UMA ESTRELINHA" com Gota afetiva; "DO SISTEMA" sumiu | — |
| 08 | Buscou "xyzw" | Os dois grupos somem; "Sem ícone" continua; há um parágrafo depois de "Sem ícone", cujo texto o snapshot compacto não trouxe — mensagem não confirmada | — |
| 09 | (orçamento esgotado) Fechou o editor com Esc sem escolher nada nem salvar; saiu da conta | Nada gravado; voltou à tela de login | — |

**Edge cases tentados:** busca sem acento ("coracao") e com acento e caixa ("Calendário") — funcionaram. Os outros (recarregar logo após Salvar, duplo clique no Salvar, trocar de item com cor não salva, Esc no seletor, "PORCENTAGEM"/"duvida"/"informação", mudar só o nome depois de gravar a cor, voltar do navegador) não foram tentados — orçamento.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-001 | skip | 02 | — | Só o passo 1 do TC (editor com "Cor do texto" e os dois campos) foi visto e passou; escolher Etiqueta, dar as cores, salvar e conferir a loja não foram feitos — orçamento esgotado |
| TC-FUNC-001 | pass | 02–03 | `screenshots/CH-01-02-do-sistema.png` | Passo 1 confere (Sem ícone, "Da Uma Estrelinha" + grade, "Do sistema" com os dez, na ordem da fonte). Passo 2 visto até "Do sistema"; "Sem ícone" fixo ao rolar e o texto do cabeçalho (passo 3) não conferidos; variações não feitas |
| TC-FUNC-002 | pass | 04–08 | — | Passos 1, 2 e 4 conferem pelo snapshot (grupo sem resultado some com o título; "Sem ícone" continua); variação sem acento ("coracao") confere. Passo 3 (termo nos dois grupos / limpar) não feito; texto da mensagem de nenhum resultado não confirmado |
| TC-FUNC-003 | skip | — | — | Depende da gravação do item A, não alcançada |
| TC-FUNC-004 | skip | — | — | Prévia com cor não salva não alcançada |
| TC-UI-001 | skip | 03 | `screenshots/CH-01-02-do-sistema.png` | Comparação visual não julgada (a screenshot fica para a triagem); loja com A e B não alcançada |

Contagem: pass 2 · fail 0 · blocked 0 · skip 4

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| No item sem cor, o seletor de cor nativo da barra mostra `#ffffff`, enquanto o rótulo sem cor da barra é `#F7F3EC` (ambiente) — o poço de cor não mostra a cor que a loja usa hoje | 08 | polimento |

## Fora da cobertura

- **Toda a gravação da jornada J-01** — escolher a Etiqueta, dar barra `#E8C77A` pelo seletor nativo e lista `#8A5A2B` pelo código, ver a prévia em Celular e Computador, salvar, recarregar e reabrir; item B com Presente e lista `#8A5A2B`; a loja a 1440 e 390 depois — orçamento de 50 ações esgotado na preparação (login, chegada ao menu, estado de partida em painel e loja, descoberta do caminho do editor) e nas buscas
- **A massa do charter NÃO foi aplicada**: o menu segue como na partida (forma legada, A com `estrela`, B com `gota-afetiva`, sem cores). CH-03 e CH-04 leem o estado que este charter deveria deixar — eles precisam de outra sessão de CH-01 (ou da massa aplicada) antes de rodar
- Edge cases do charter (lista acima) — orçamento
- Texto da mensagem de nenhum resultado da busca — o snapshot compacto não trouxe o texto do parágrafo; não houve ação sobrando para conferir
- TC-UI-001 — julgamento visual não feito; a loja com A e B alterados não existe ainda

## Debrief

- **Surpresas:** o editor do item não abre clicando na linha; só por "Ações" › "Editar nome, ícone e banners" (pré-existente, fora da Mudança). O login leva ao Dashboard, não à URL pedida. A preparação (login, partida em duas superfícies e dois viewports, achar o editor) consumiu cerca de 35 das 50 ações
- **Próximo charter:** uma continuação do CH-01 começando direto no editor do item A (estado de partida já registrado aqui), com orçamento só para os passos 3 e 4 do charter, TC-JOURNEY-001, TC-FUNC-003, TC-FUNC-004 e TC-UI-001 — e que deixe a massa de A e B para CH-03/CH-04. O charter tem 6 TC e o passo 1 de partida em duas superfícies; 50 ações não cabem
- **Padrão novo:** nada
