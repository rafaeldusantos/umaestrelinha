# Sessão CH-09 · design-check — a montagem e o pedido montado contra `Montar Pedido.dc.html`

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-09-design-check-montar-pedido.md` · design-check · P1 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri no WhatsApp · conta: `admin-atelie` (referência do briefing, nunca o valor) |
| Tour · modo | — · —                                                                  |
| Rodada      | confirmação (r2)                                                       |
| Orçamento   | 25 ações de browser de 25 (+2 de encerramento: limpar a sessão e fechar o browser) |
| Ambiente    | http://localhost:8084 (app do ateliê, feature/94 @ e8b20c6c) · Chromium (Playwright MCP headless) · 390 × 844 |
| Paridade    | Supabase e edge functions locais; `*.supabase.co` bloqueado por rota; massa dos charters anteriores (P-0040 Aberta, P-0014 Concluída); nenhum link criado nesta sessão |

## Missão

Rodada de confirmação: conferir se as telas onde moram BUG-010..BUG-020 batem agora com o protótipo, se as
correções trouxeram divergência nova visível, e tentar de novo o TC-UI-002 (blocked na r1).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Ler o protótipo pelo MCP `claude-design` | `list_files` e `read_file` responderam (etag `1793640090478181`, 1138 linhas); valores de referência os mesmos da r1 (ex.: campo de busca na tela Pedidos · Montados, `.eb` 11/600 maiúsculas) | — |
| 02 | Entrar e abrir Pedidos › Montados | Total do cartão em Libre Baskerville 700 16px primária `#34495e` (BUG-016 corrigido aqui). Sem campo de busca nesta visão — decidido `conforme a fonte` na triagem da r1, não registrado | `screenshots/CH-09-r2-01-montados.png` |
| 03 | Abrir P-0014 (Concluída) | Faixa em `rgb(238,240,236)` com texto `rgb(63,90,59)` (tom de concluído), raio 12; "Ver o pedido #0366" num rodapé `fixed` (top 784, bottom 832 em 844); foto 48×60; histórico "Concluído pela cliente · pedido #0366", "Aberto pela cliente" | `screenshots/CH-09-r2-02-concluida.png` |
| 04 | Abrir P-0040 (Aberta) | "Link para Alana" h2 Outfit 600 11px maiúsculas; cartão padding 18, raio 20; caixa do link com borda `rgba(255,255,255,.12)`, fundo translúcido, fonte de corpo; "Enviar pelo WhatsApp" `#25D366` com texto tinta, Libre Baskerville 700 15px; "Copiar link" translúcido com borda e texto on-primary; mensagem do WhatsApp em caixa `ground-deep` raio 12; histórico com ponto dourado (accent) no evento; nome da cliente Libre Baskerville 700 17px; "Total dos itens" Libre Baskerville 700 18px primária; "Cancelar este pedido" ghost, largura total, texto alert | `screenshots/CH-09-r2-03-aberta.png` |
| 05 | Montar pedido › passo 1 | Título 17px serifa 700, subtítulo 12px; indicador com rótulos visíveis "Cliente/Peças/Descontos/Revisar", barra do atual 4px em accent `rgb(184,148,95)`, demais em line; lista de clientes dentro de cartão (surface, borda line, raio 20), inicial 44px; motivo "Escolha a cliente para continuar." 13px em `rgb(107,79,36)` (cor de espera); CTA "Continuar" 190×48 | `screenshots/CH-09-r2-04-passo1.png` |
| 06 | Escolher Alana Muniz › Continuar › buscar e abrir "Anel Afetivo com Leite materno" | Folha: preço Libre Baskerville 700 16px primária; chip escolhido preenchido em primária com texto claro; aviso de material com ícone de envio | `screenshots/CH-09-r2-05-folha-variacao.png` |
| 07 | Acrescentar a peça e esperar | "Peça acrescentada. Anel Afetivo… · Folheado a prata" aparece flutuante (`position:absolute`, fundo tinta, sobre a barra) aos 0,6 s e **sumiu** aos 4,6 s | resultado da medição no log (sem screenshot: orçamento) |
| 08 | Limpar a sessão do navegador e fechar | Armazenamento local e de sessão limpos (sessão e rascunho desta montagem); browser fechado | — |

**Edge cases tentados:** só os estados das telas dos bugs (rodada de confirmação). A ação do passo 07 foi feita
por um `evaluate` que toca "Acrescentar" e mede o aviso em dois instantes — o snapshot não mede tempo de
permanência; está declarado aqui.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-UI-001 | pass | 02–07 | `screenshots/CH-09-r2-01…05` | Nas telas conferidas, as divergências de BUG-010, 011, 012, 013 (cor, tamanho e CTA), 015, 016, 017 (cartão da lista e inicial), 018 (chip e ícone), 019 (histórico) e 020 (foto 48×60, raio 12) estão corrigidas; nenhuma divergência nova visível. Partes não reconferidas ficam em Fora da cobertura e com o retester |
| TC-UI-002 | blocked | — | — | massa: o mesmo bloqueio da r1 — a massa não tem peça sem foto nenhuma (sem capa e sem foto por variação); a lista do passo 2 mostrou só peças com foto. Criar a peça exigiria o painel ou o banco, fora da Entrada do charter |

Contagem: pass 1 · fail 0 · blocked 1 · skip 0

## Achados

nada — nenhuma regressão nem achado novo critical/high.

### Por bug conferido (para o retester)

| Bug | Conferido nesta sessão | Situação vista |
| --- | ---------------------- | -------------- |
| BUG-010 | toast após "Acrescentar" | corrigido — flutuante, fundo tinta, some antes de 4,6 s |
| BUG-011 | P-0014 | corrigido — faixa done-soft/done raio 12, rodapé fixo |
| BUG-012 | casca do passo 1 | corrigido — rótulos visíveis, atual em accent 4px, título 17 / subtítulo 12 |
| BUG-013 | barra do passo 1 | cor de espera, 13px e CTA 190 corrigidos; a recusa do combinado na barra (passo 3) **não conferida** |
| BUG-014 | — | **não conferido** (CEP e cupom não provocados: orçamento) |
| BUG-015 | P-0040 | corrigido — cartão do link, WhatsApp, Copiar, mensagem em caixa, histórico com ponto, Cancelar ghost |
| BUG-016 | Montados, P-0040, folha | corrigido nos totais, preço da folha e nome da cliente; total da barra fixa não medido |
| BUG-017 | passo 1 cadastrada | cartão da lista e inicial 44 corrigidos; convite, placeholder do e-mail e bloco de endereço (Cliente nova) **não conferidos** |
| BUG-018 | folha da variação | chip e ícone corrigidos; linha de estoque acima do teto **não conferida** (peça de estoque livre) |
| BUG-019 | histórico | "Aberto pela cliente" e "· pedido #0366" corrigidos; "Desconto (%)", "Total" do Revisar, sinal de menos e "0 / 2000" **não conferidos** |
| BUG-020 | P-0014 | foto 48×60 e raio 12 corrigidos; raio do segmento e botões secundários das folhas **não conferidos** |

## Design

**Protótipo:** `a780eec8-8aba-4d6e-8b4c-2c485e2750c7` · Uma Estrelinha - Mobile Admin · `Montar Pedido.dc.html` · `claude_design` · lido por MCP `claude-design` (`list_files`, `read_file` linhas 1–60); os valores de cada elemento são os da tabela D1–D30 da sessão r1 (`sessions/2026-11-08-r1/CH-09-design-check-montar-pedido.md`), lida do mesmo arquivo.

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |
| D1 | Pedido montado Concluída | "Ver o pedido #N" | posição | rodapé fixo | `fixed`, 784–832 | r2-02 | — (BUG-011 corrigido) |
| D2 | idem | faixa | fundo / texto / raio | done-soft / done / 12 | `#eef0ec` / `#3f5a3b` / 12 | r2-02 | — |
| D3 | casca | indicador | rótulos / atual | visíveis / accent 4px | visíveis / `#b8945f` 4px | r2-04 | — (BUG-012 corrigido) |
| D5 | casca | título / subtítulo | font-size | 17 / 12 | 17 / 12 | r2-04 | — |
| D6 | passo 2 | toast | posição, fundo, duração | flutuante, tinta, ~3,2 s | absolute, `#23303a`, some < 4,6 s | passo 07 | — (BUG-010 corrigido) |
| D7 | barra | motivo | cor / tamanho | wait / 13 | `#6b4f24` / 13 | r2-04 | — |
| D9 | barra | CTA | largura | 190 | 190 | r2-04 | — |
| D11 | Montados · folha · pedido montado | totais/preço | família/peso/cor | serifa 700 primária | serifa 700 `#34495e` | r2-01, r2-03, r2-05 | — (BUG-016) |
| D12 | pedido montado | nome da cliente | display 17 700 | display 17 700 | idem | r2-03 | — |
| D13–D19 | Pedido montado Aberta | cartão do link, WhatsApp, Copiar, mensagem, histórico, Cancelar | ver r1 | ver r1 | iguais ao desenho (passo 04) | r2-03 | — (BUG-015) |
| D22 | passo 1 | resultados | contêiner / inicial | cartão raio 20 / 44 | cartão raio 20 / 44 | r2-04 | — |
| D26–D27 | folha da variação | chip escolhido / ícone material | primária + on-primary / ícone envio | primária + texto claro / ícone presente | r2-05 | — (BUG-018) |
| D30 | pedido montado | foto da peça / raio da faixa | 48×60 / 12 | 48×60 / 12 | r2-02 | — |

**Divergências aceitas pela costura ou pela triagem da r1, não registradas:** busca ausente na visão Montados
(`conforme a fonte`); "Nome da joia" (D-37); Observação interna no pedido montado (D-30/D-36).

**Iguais ao desenho:** todos os elementos medidos nesta sessão (tabela acima).

**Telas não conferidas:** ver Fora da cobertura.

## Spec-gaps

Na rodada de confirmação não se registra `spec-gap`.

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| nada | — | — |

## Fora da cobertura

- Passo 1 · Cliente nova (convite de colar, placeholder do e-mail, bloco "Endereço de entrega", CEP não achado) — orçamento; BUG-014 e parte de BUG-017 ficam para o retester
- Passo 3 (cupom recusado com estado de erro, combinado que zera com o motivo na barra, rótulo "Desconto (%)") e Passo 4 ("Total") — orçamento; BUG-013 (parte), BUG-014, BUG-019 (parte)
- Folha "Colar texto" ("0 / 2000"), folhas Cancelar/Sair (botões secundários), desconto com sinal de menos na Cancelada — orçamento; BUG-019/020 (partes)
- Linha de estoque acima do teto na folha da variação — a peça aberta é de estoque livre; BUG-018 (parte)
- Total da barra fixa (BUG-016) — não medido
- TC-UI-002 — massa sem peça sem foto (mesmo bloqueio da r1)
- Pedido montado Expirada / Renovar, "criando", "preço que mudou" — fora do escopo desta confirmação
- Rede lenta — fora do alcance desta sessão

## Debrief

- **Surpresas:** nenhuma; as correções de maior superfície bateram com o desenho em todos os pontos medidos.
- **Próximo charter:** o retester cobre bug a bug as partes acima; TC-UI-002 precisa de massa com uma peça sem foto.
- **Padrão novo:** medir o tempo do toast num único `evaluate` (toca e mede em dois instantes) economiza ações.
