# Sessão CH-08 · CFR: a primeira pintura e a legibilidade da loja de Black Friday

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-08-cfr-primeira-pintura-e-legibilidade.md` · cfr · P1 |
| Status      | done                                                                   |
| Persona     | PER-05 Marta · conta: anonima                                          |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | 33 ações de browser de 35                                              |
| Ambiente    | http://localhost:4173 (build servido por `vite preview`) · build não exposto · Chromium 157 (headless, playwright-cli 0.1.24) · viewports 390 × 844 e 1440 × 900 · comparação com a "loja de antes do WI" em http://localhost:8092 (só leitura) |
| Paridade    | (1) O documento HTML é interceptado (`page.route` + `route.fetch()` + `route.fulfill`), e o `data-perfil` é escrito no `<html>`: isso faz o papel da função `api/page`, que não roda localmente. (2) O documento entregue por `route.fulfill` fez o Chromium tratar a página como "pública" e bloquear (Local Network Access) as chamadas ao Supabase local `127.0.0.1:54441` (`blocked by CORS policy: Permission was denied for this request to access the loopback address space`). Isso só acontece neste arranjo: a primeira carga (passo 01a) saiu sem dados. Daí em diante a permissão `local-network-access` foi concedida para `http://localhost:4173` e os dados carregaram. (3) Slow 4G (562,5 ms, 1,44 Mbps / 675 kbps) e CPU 4× por CDP, com cache desligado, nos passos 01–04. Os passos de contraste e de fonte rodaram sem limitação. (4) Os bloqueios `*.supabase.co` e `**/g/collect*` ficaram ativos a sessão toda (o console mostra as `g/collect` abortadas, nenhuma escapou). (5) Supabase local, não o backend de produção |

## Missão

Como quem usa a loja com rede lenta e fonte grande, conferir que a Black Friday chega pintada desde o primeiro quadro e
que nenhum texto do perfil novo fica abaixo do piso de legibilidade.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01a | Abrir a Home em Slow 4G + CPU 4×, documento em `black-friday` (primeira tentativa) | Cabeçalho `#0D0C0B` desde o primeiro quadro, mas a página ficou sem dados: o Chromium bloqueou o Supabase local (LNA). É artefato da interceptação, ver Paridade. Medição descartada | — |
| 01 | Mesma carga da Home com o acesso à rede local concedido; a cor do cabeçalho, do fundo e do primeiro botão primário gravada a cada `requestAnimationFrame` desde o início do documento | Primeiro quadro com `<header>` (t = 2,73 s): `rgb(13,12,11)` = `#0D0C0B`. Em nenhum dos quadros seguintes (até 30 s) aparece `#283A4A` ou `#34495E`. O botão primário ("Explorar coleções") aparece em `rgb(28,26,24)` = `#1C1A18` a 5,8 s. FCP 2 740 ms. CLS 0,131 (deslocamentos aos 3,6 s e aos 5,1 s, na chegada do conteúdo) | `screenshots/2026-11-14-r1/CH-08-01-home-bf-slow4g-390.png` |
| 02 | Abrir um produto (Joia Afetiva Árvore da Vida Flores…) nas mesmas condições, documento em `black-friday` | Cabeçalho `#0D0C0B` desde o primeiro quadro (2,75 s), só essa cor. "Adicionar à sacola" `#1C1A18`. FCP 2 760 ms. CLS 0,8983 (0,056 + 0,245 + 0,597, na chegada da galeria e do conteúdo) | `screenshots/2026-11-14-r1/CH-08-02-produto-bf-slow4g-390.png` |
| 03 | J-03a: o mesmo produto com o documento em `padrao` e o perfil salvo = Black Friday (S1), mesmas condições | Carga inteira em ardósia: cabeçalho `rgb(40,58,74)` = `#283A4A` em todos os quadros, "Adicionar à sacola" `#34495E`. Não troca sozinha. FCP 2 740 ms. CLS 0,8983, com os mesmos três deslocamentos do passo 02: a medida não muda com o perfil | `screenshots/2026-11-14-r1/CH-08-03-produto-doc-padrao-salvo-bf-390.png` |
| 04 | A partir do passo 03, tocar num produto relacionado (troca de página dentro da loja) | 87 ms depois do toque, o cabeçalho passa de `#283A4A` para `#0D0C0B`, o `<html>` passa a `black-friday` e a altura do cabeçalho fica igual (64 px). Os botões ficam em `#1C1A18`. A troca de cor não desloca nada. Durante a navegação entra um deslocamento de 0,597, do mesmo tamanho do deslocamento de carga do produto nos passos 02 e 03 (nos dois perfis): é a galeria do produto, não a troca de perfil | `screenshots/2026-11-14-r1/CH-08-04-troca-de-pagina-bf-390.png` |
| 05 | Ler a Home no Black Friday em 390, sem limitação: contraste pelas cores computadas, com o fundo efetivo (ancestrais compostos) | Nenhum texto abaixo do piso. Mínimos: subtítulo/parcelas `ink-soft` `#57524B` sobre `#F0EADF` **6,46:1** ("4x de R$ 69,97 sem juros", 13 px); texto corrido e rodapé `#57524B` sobre `#FAF8F4` **7,30:1**; texto sobre o ouro `#161514` sobre `#C2A063` **7,38:1** (faixa "Black Friday · novembro…"). Em 390 o cabeçalho não tem texto visível, só ícones. Selo "-X%": nenhum na Home | — |
| 06 | Ler o produto no Black Friday em 390 e tentar pôr na sacola | Contraste: `ink-soft` / parcelas / rodapé 7,30:1, sobre o ouro ("Frete grátis · acima de R$ 450,00…") 7,38:1, nenhum abaixo do piso. Selo "-X%": nenhum neste produto. As duas tentativas de "Adicionar à sacola" falharam do lado da sessão (botão da barra fixa fora do alcance do clique por script; depois, ref vencida). A sacola e o checkout ficaram sem medida | `screenshots/2026-11-14-r1/CH-08-05-produto-bf-390.png` |
| 07 | Home em 1440: contraste do cabeçalho; depois Tab pelo cabeçalho | Texto do cabeçalho `#F7F3EC` sobre `#1C1A18` **15,69:1**, o resto igual ao passo 05, sem rolagem horizontal em 1440. Ordem do Tab: Aviso anterior → link da faixa ouro → Próximo aviso → logo → busca → Buscar → Favoritos → Entrar → Sacola. Nos itens do cabeçalho o foco é o anel padrão do Chromium (`auto 1px #005FCC`, ~3,3:1 sobre `#0D0C0B`): visível. Na faixa ouro, anel `#161514` em box-shadow sobre `#C2A063` (7,38:1). No campo de busca, `outline` transparente e sem box-shadow: o foco vem de outro indicador ou não aparece (não conferido) | `screenshots/2026-11-14-r1/CH-08-06-foco-cabecalho-1440.png` |
| 08 | Fonte do sistema a 130 % e 200 % (`documentElement.style.fontSize`, refeito a cada carga) em 390, no produto e na Home | Cabeçalho segue `#0D0C0B` (altura 83 px a 130 %, 128 px a 200 %), "Adicionar à sacola" `#1C1A18` dentro da tela. Rolagem horizontal: produto 0 a 130 %, **45 px** a 200 %; Home **384 / 446 px** (já são 358 px a 100 %). Títulos dos cards de produto presos em 40 px de altura com texto de 60–80 px (corte de linha dos cards) | `screenshots/2026-11-14-r1/CH-08-07-produto-fonte200-390.png` · `screenshots/2026-11-14-r1/CH-08-07-home-fonte200-390.png` |
| 09 | Comparar a rolagem horizontal com o documento em `padrao` e com a loja de antes do WI (8092) | Home a 100 %: 358 px nos três (BF, padrão, 8092). Produto a 200 %: 45 px em `padrao` e no 8092. É pré-existente e não depende do perfil | — |
| 10 | Edge cases: tema escuro do sistema + movimento reduzido na Home BF | `prefers-color-scheme: dark` ativo, perfil continua `black-friday`, cabeçalho `#0D0C0B`, fundo `#FAF8F4`, nada quebra. Com `reduce`, a única animação contínua é o `ping` do botão do WhatsApp, a mesma da loja de antes do WI (8092): nada novo | `screenshots/2026-11-14-r1/CH-08-08-home-bf-dark-reduce-390.png` |

**Edge cases tentados:**

- Movimento reduzido (`reducedMotion: reduce`): nenhuma animação decorativa nova, só o `ping` do WhatsApp, pré-existente (passo 10)
- Tema escuro do sistema (`colorScheme: dark`): o perfil continua de pé (passo 10)
- O mesmo produto com o documento em `black-friday` e em `padrao`, comparando a primeira pintura: feito em 390 com Slow 4G (passos 02 e 03), não em 1440

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-CFR-001 | pass | 01–04 | `screenshots/2026-11-14-r1/CH-08-01-home-bf-slow4g-390.png` · `CH-08-02-…` · `CH-08-03-…` · `CH-08-04-…` | Cabeçalho só `#0D0C0B` e botão `#1C1A18` desde o primeiro quadro, na Home e no produto. FCP 2,74 / 2,76 s: dentro do aceitável (< 4 s), fora do alvo (< 2 s), e igual com o documento em `padrao` (2,74 s), portanto não vem da mudança. CLS do produto igual entre `black-friday` e `padrao` (0,8983). O CLS da Home com `padrao` não foi medido. Variação J-03a: carga toda em ardósia; depois da troca de página, preto sem salto do cabeçalho |
| TC-CFR-002 | pass | 05–10 | `screenshots/2026-11-14-r1/CH-08-05-produto-bf-390.png` · `CH-08-06-…` · `CH-08-07-…` | Cobertura parcial. Contraste dentro das metas em todas as amostras da Home (390 e 1440) e do produto (390): mínimo 6,46:1. Foco visível no cabeçalho e na faixa ouro. A rolagem horizontal a 200 % existe (produto 45 px, Home 446 px), mas é pré-existente: igual com `padrao` e na loja de antes do WI. Fica fora da superfície da Mudança e vai em Spec-gaps. Sem medida: sacola, checkout, selo "-X%", botões ouro do conteúdo e produto em 1440 (Fora da cobertura) |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

## CFR

| Jornada | Categoria             | Marca | Itens que não passaram | Achado |
| ------- | --------------------- | ----- | ---------------------- | ------ |
| J-03    | Performance percebida | pass  | Na superfície da Mudança, nenhum: nunca há quadro em ardósia antes do preto. FCP de 2,7 s em Slow 4G + CPU 4× (aceitável) e CLS alto no produto (0,90) são iguais no Padrão, portanto pré-existentes | — |
| J-03a   | Performance percebida | pass  | nenhum: a carga fica em ardósia, sem troca sozinha; a troca de página passa ao preto em 87 ms, com o cabeçalho na mesma altura | — |
| J-03    | Acessibilidade        | pass  | nenhum no que foi medido: contraste ≥ 6,46:1 em todas as amostras, foco visível no cabeçalho e na faixa ouro. Sacola e checkout não medidos | — |
| J-03    | Compatibilidade       | pass  | nenhum que dependa do perfil: tema escuro e movimento reduzido mantêm o perfil. A rolagem horizontal (Home a 100 %, produto a 200 %) é pré-existente | — |
| J-03 / J-03a | Paridade com produção | — | condição da rodada, ver o cabeçalho (documento interceptado, LNA concedido, Supabase local) | — |

**Categorias fora:** Usabilidade (a mudança é só cor; a usabilidade do card é do CH-01/CH-02). Recuperação de erro (não há caminho de falha nesta superfície da loja).

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| A Home em 390 × 844 rola 358 px na horizontal já com a fonte a 100 % (446 px a 200 %); o produto rola 45 px a 200 %. É igual com o documento em `padrao` e na loja de antes do WI (8092) | 08, 09 | pré-existente |
| CLS de carga do produto de 0,90 em Slow 4G (galeria e conteúdo chegando), igual nos dois perfis | 02, 03 | pré-existente |

## Fora da cobertura

- Contraste e fonte grande na **sacola** e no **checkout**: as duas tentativas de "Adicionar à sacola" falharam do lado da sessão (botão da barra fixa e ref vencida), e o orçamento acabou antes de uma terceira
- **Selo "-X%"**: nenhum produto com desconto apareceu na Home nem no produto amostrado. O contraste do selo ficou sem medida
- **Foco nos botões ouro do conteúdo** (fora da faixa de avisos): o Tab passou só pelo cabeçalho (9 tabulações)
- **Foco do campo de busca do cabeçalho**: `outline` transparente e sem box-shadow no foco. O indicador real não foi conferido na imagem (vale olhar `CH-08-06`)
- **CLS da Home com o documento em `padrao`** em Slow 4G: só o produto foi comparado entre os perfis
- **Produto em 1440 com `black-friday` × sem atributo** (edge case): a comparação da primeira pintura foi feita em 390
- Contraste a 130 % / 200 %: só o layout foi medido nessas escalas (o contraste não depende do tamanho, só a classe "texto grande")
- Outros engines (Safari, Firefox, móveis reais): só o Chromium do driver
- Leitor de tela real; cache de borda real da Vercel e a função `api/page` real: fora do browser da sessão e só em produção

## Debrief

- **Surpresas:** o documento por `route.fulfill` fez o Chromium aplicar o Local Network Access e cortar o Supabase local. Foi preciso conceder `local-network-access` ao contexto. Outros charters que interceptam o documento vão tropeçar no mesmo
- **Próximo charter:** contraste e fonte a 200 % na sacola e no checkout no Black Friday, e o selo "-X%" num produto em oferta (o CH-04 cobre a compra e pode emprestar a massa)
- **Padrão novo:** gravar a cor do cabeçalho por `requestAnimationFrame` num `addInitScript` dá a sequência de quadros sem depender de screenshot. Serve de candidato a receita de "primeira pintura" no guia de CFR
