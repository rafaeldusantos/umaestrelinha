# Sessão CH-01 · Adri liga o Black Friday, confere a loja e volta ao Padrão

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-adri-liga-o-black-friday-e-volta.md` · exploratório · P0 |
| Status      | done (o orçamento acabou antes do passo 4 do charter, conferir a loja de volta ao Padrão; a massa foi devolvida a S0) |
| Persona     | PER-01 Adri · conta: `admin-loja` — `QA_ADMIN_LOJA_*` (painel e ateliê) |
| Tour · modo | Feature · por cenário (J-01 e J-02)                                    |
| Rodada      | exploração                                                             |
| Orçamento   | 70 ações de browser de 70 na exploração, mais 7 para devolver o Padrão e fechar (obrigação de massa do briefing) |
| Ambiente    | painel http://localhost:8083/admin · loja http://localhost:8082 · ateliê http://localhost:8084 · build não exposto · Chromium (agent-browser 0.39.1) · viewports 1440 × 900 (painel, produto) · 390 × 844 (Home, ateliê) |
| Paridade    | dev server: o `<html>` chega sem `data-perfil` do servidor (o atributo aparece depois de a configuração carregar); Supabase local; `*.supabase.co` e `**/g/collect*` abortados por rota |

## Missão

Como a dona, confirmar que dá para vestir a loja de Black Friday por uma escolha em Configurações, ver a loja da
cliente em preto e ouro na próxima página aberta — com o painel e o ateliê intocados — e depois voltar ao Padrão pela
mesma escolha sem que nada do que ela montou se perca.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Entra no painel e abre Configurações › Dados da loja | O card "Perfil de estilo da loja" é o último da seção. Texto: "Muda só as cores da loja. Textos, blocos da Home, preços e menu continuam iguais, e voltar ao Padrão é a mesma escolha." Grupo "Perfil de estilo"; Padrão ("Ardósia e ouro, a cara de sempre da loja.") com "Em uso"; Black Friday ("Preto e ouro, para a campanha."). Aviso literal: "Depois de salvar, quem abrir a loja já vê o perfil novo nas páginas de produto e de categoria em até 5 minutos, e nas outras páginas em até 1 hora. Quem já está com a loja aberta vê ao trocar de página." Amostras: Padrão `#283A4A` `#34495E` `#B8945F` `#F1EBE1`, Black Friday `#0D0C0B` `#1C1A18` `#C2A063` `#F0EADF`. Salvar desabilitado. Cores do painel: botão primário em degradê `rgb(255,59,127)` para `rgb(108,60,233)`, item ativo da sidebar com fundo `rgb(243,239,248)` e texto `rgb(108,60,233)`, h1 `rgb(24,15,46)`, fundo `rgb(255,249,245)`; sem `data-perfil` | `screenshots/2026-11-14-r1/CH-01-01-card-padrao.png` |
| 02 | Abre a loja numa aba nova (390 × 844) para anotar como ela está | `data-perfil="padrao"`. Cabeçalho `#283A4A`, Buscar `#B8945F`, texto `#23303A`, fundo `#FAF8F4`, botão primário `#34495E`, 34 elementos em `#F1EBE1`. Faixa de avisos: "Black Friday · novembro inteiro com joias em oferta · Ver ofertas". Blocos: "Joias Árvore da Vida", "Linha Leite Materno", "Cada joia é uma memória eternizada à mão", "Decorativos"…; um preço: R$ 259,90; menu: Joias afetivas, Coleção Amuletos… | `screenshots/2026-11-14-r1/CH-01-02-home-padrao-390.png` |
| 03 | Abre o ateliê numa aba nova e entra com a mesma conta | Início "Bom dia, Adri."; seção do topo `#283A4A`, aba ativa "Início" `#34495E`, fundo `#FAF8F4`; sem `data-perfil` | `screenshots/2026-11-14-r1/CH-01-03-atelie-padrao.png` |
| 04 | No painel, clica no cartão inteiro do Black Friday (não no rádio) | O Black Friday fica marcado, "Em uso" continua no Padrão e Salvar habilita. Clica no cartão do Padrão: Salvar volta a ficar desabilitado | `screenshots/2026-11-14-r1/CH-01-04-bf-marcado-nao-salvo.png` |
| 05 | Marca Black Friday e dá duplo clique em Salvar | Uma mensagem só: "Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora." "Em uso" passa ao Black Friday e Salvar desabilita. Rede: um único `POST /rest/v1/store_settings → 201` | `screenshots/2026-11-14-r1/CH-01-05-bf-salvo.png` |
| 06 | Recarrega o painel na hora | "Em uso" continua no Black Friday, que segue marcado; Salvar desabilitado (salvar o perfil já salvo não é possível) | — |
| 07 | Confere o painel com o Black Friday salvo (Dados da loja) | As mesmas cores do passo 01: degradê do botão, item ativo, h1 e fundo; sem `data-perfil` | — |
| 08 | Abre a loja numa aba nova (390 × 844) | `data-perfil="black-friday"`. Cabeçalho `#0D0C0B`, Buscar `#C2A063`, texto `#161514`, botão primário `#1C1A18`, 34 elementos em `#F0EADF` (nenhum sobra em `#F1EBE1`), fundo `#FAF8F4` igual ao de antes. Faixa, blocos, preço R$ 259,90 e menu iguais aos do passo 02 | `screenshots/2026-11-14-r1/CH-01-06-home-bf-390.png` |
| 09 | Na mesma aba, em 1440 × 900, abre um produto (Joia Afetiva Árvore da Vida Flores com Leite Materno…) | `data-perfil="black-friday"`, cabeçalho `#0D0C0B`, Buscar `#C2A063`, texto `#161514` | `screenshots/2026-11-14-r1/CH-01-07-produto-bf-1440.png` |
| 10 | Volta à aba do ateliê e recarrega | A leitura aconteceu antes de a Início terminar de renderizar: só o fundo `#FAF8F4` e nenhum `data-perfil` deram para ler. O orçamento acabou aqui e não houve segunda leitura | — |
| 11 | (devolução da massa, depois do teto) No painel, marca Padrão e salva | "Perfil salvo…"; "Em uso" no Padrão; Salvar desabilitado | `screenshots/2026-11-14-r1/CH-01-08-padrao-salvo.png` |

**Edge cases tentados:**

- Clicar no cartão inteiro, não no rádio: marca (passos 04, 11)
- Marcar Black Friday e depois Padrão sem salvar: Salvar desabilita de novo (passo 04)
- Duplo clique em Salvar: uma gravação e uma mensagem, sem erro (passo 05)
- Recarregar logo depois de salvar: "Em uso" segue no perfil salvo (passo 06)
- Ler o aviso: os dois prazos e a frase de quem está com a loja aberta, literais (passo 01)
- Salvar o perfil igual ao salvo: impossível, o botão fica desabilitado (passos 01, 06, 11)

## Casos

| TC             | Veredito | Passo         | Evidência | Nota |
| -------------- | -------- | ------------- | --------- | ---- |
| TC-FUNC-003    | pass     | 01, 04        | `screenshots/2026-11-14-r1/CH-01-01-card-padrao.png`, `screenshots/2026-11-14-r1/CH-01-04-bf-marcado-nao-salvo.png` | texto, aviso, rótulo do grupo, amostras e o botão desabilitado → habilitado → desabilitado. A variação em 390 do card não foi feita |
| TC-FUNC-001    | pass     | 04–09         | `screenshots/2026-11-14-r1/CH-01-05-bf-salvo.png`, `screenshots/2026-11-14-r1/CH-01-06-home-bf-390.png`, `screenshots/2026-11-14-r1/CH-01-07-produto-bf-1440.png` | todas as cores do perfil batem; o conteúdo é o mesmo; as variações cartão, duplo clique e recarregar passam. A de opacidade não teve amostra na Home: nenhum fundo de cor do perfil com alfa |
| TC-FUNC-004    | skip     | 07, 10        | — | o painel passa: cores iguais e sem `data-perfil` com o Black Friday salvo. O ateliê com o Black Friday salvo ficou sem leitura de cor (a leitura veio antes da renderização) e o orçamento acabou. Pedidos no painel e no ateliê também não foram abertos |
| TC-FUNC-002    | skip     | 11            | `screenshots/2026-11-14-r1/CH-01-08-padrao-salvo.png` | só o passo 1 foi feito (marca Padrão, salva, "Em uso" no Padrão, Salvar desabilitado), e só para devolver a massa. Os passos 2–4 (loja numa aba nova, conteúdo, Dados da loja, faixa e Frete) não rodaram por orçamento |
| TC-JOURNEY-001 | skip     | 01–09, 11     | — | os passos 1, 3, 4 e 5 da tabela passam. O passo 2 (prévia) e o 6 (loja de volta em ardósia) não rodaram, por orçamento |

Contagem: pass 2 · fail 0 · blocked 0 · skip 3

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- Charter, passo 4 (TC-FUNC-002, passos 2–4; TC-JOURNEY-001, passo 6): abrir a loja numa aba nova depois de voltar ao Padrão e comparar cores e conteúdo com o passo 02; conferir no painel que Dados da loja, a faixa de avisos e o frete não mudaram. Motivo: orçamento. A devolução do Padrão ficou confirmada só no card
- TC-FUNC-004 no ateliê com o Black Friday salvo (Início e Pedidos) e Pedidos no painel. Motivo: orçamento; a única leitura do ateliê veio antes da renderização
- Abrir e fechar a prévia uma vez (TC-JOURNEY-001, passo 2). Motivo: orçamento; ela é coberta pelo CH-02
- O card em 390 × 844 (variação do TC-FUNC-003). Motivo: orçamento
- Sair da conta pela tela: não foi feito. A sessão do agent-browser não tinha perfil, ficava só em memória e foi fechada
- A aba da loja aberta antes de salvar e a pintura em ardósia antes do preto no dev server ficaram fora do escopo do charter (CH-03, CH-08)

## Debrief

- **Surpresas:** o orçamento de 70 ações não alcançou o charter inteiro, que tem três apps, duas viewports e ida e volta. As anotações de antes de mexer (painel, loja e ateliê) gastaram cerca de 35 ações
- **Próximo charter:** uma sessão curta (cerca de 25 ações) com Black Friday → Padrão para fechar o TC-FUNC-002 (passos 2–4) e o TC-FUNC-004 no ateliê. A massa precisa sair de S1 pela tela e voltar a S0
- **Padrão novo:** nada
