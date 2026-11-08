# Sessão CH-09 · design-check — a montagem e o pedido montado contra `Montar Pedido.dc.html`

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-09-design-check-montar-pedido.md` · design-check · P1 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri no WhatsApp · conta: `admin-atelie` (referência do briefing, nunca o valor) |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | 43 ações de browser de 50                                              |
| Ambiente    | http://localhost:8084 (app do ateliê, branch feature/94) · build não exposto · Chromium (Playwright MCP) · viewport 390 × 844 |
| Paridade    | Supabase e edge functions locais; `*.supabase.co` bloqueado; massa sintética dos charters anteriores; nenhum link criado nesta sessão |

## Missão

Conferir, tela a tela, estrutura, texto, tipografia, cor, espaço e estados das telas novas do app contra o
protótipo `Montar Pedido.dc.html`, com o PRD e as Decisões da costura vencendo o protótipo onde divergem.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir Pedidos › Montados | Título + "Montar pedido", chips de hoje com "Montados · 5 abertos" ao fim (D-23), "18 pedidos montados · os mais recentes primeiro", cartões com número, selo, cliente, meta, total e peças. Sem o campo de busca nesta visão (aparece em "Tudo"). Total do cartão em Outfit 500 cor tinta | `screenshots/CH-09-01-montados.png` |
| 02 | Abrir P-0034 (Aberta) | Cartão escuro do link com título em serifa 16/700 (não sobretítulo), caixa do link sem borda e em monoespaçada, "Enviar pelo WhatsApp" verde escuro com texto branco, "Copiar link" sólido claro; "Mensagem do WhatsApp" sem caixa de fundo; Cliente com e-mail, telefone, CPF e endereço em linhas; peça com foto 56×70 e preço; "Total dos itens" 14/500 tinta; Observação interna (D-30); Histórico sem pontos/linha do tempo; Editar (sólido) + Cancelar (contorno vermelho) lado a lado, sem Renovar (D-17) | `screenshots/CH-09-02-aberta.png` |
| 03 | Abrir P-0014 (Concluída) | Faixa "Helena concluiu no link. O pedido #0366 segue na fila…" em fundo areia/tinta (desenho: verde done-soft/done), raio 20; "Ver o pedido #0366" no fim do conteúdo (bottom 984 em 844), não em rodapé fixo; histórico "Concluído pela cliente", "Visto pela cliente" | `screenshots/CH-09-03-concluida.png` |
| 04 | Abrir P-0033 (Cancelada) | Faixa "Cancelado. Quem abrir o link lê…" (texto igual); sem ações; desconto "- R$ 47,19" com hífen | `screenshots/CH-09-04-cancelada.png` |
| 05 | Montar pedido › passo 1 › cadastrada › buscar "zzqxyw" | Cabeçalho "Montar pedido" 20px, "Passo 1 de 4 · Cliente" 14px; indicador com 4 barras **sem rótulos visíveis**, passo atual na cor primária (desenho: accent); "Ninguém com “zzqxyw”. Se for a primeira compra, use Cliente nova." (igual); lista de clientes sem cartão; motivo da barra em tinta 14px; botão Continuar 119px | `screenshots/CH-09-05-passo1-sem-resultado.png` |
| 06 | Trocar para Cliente nova | Cartão escuro do convite (título 18/700 serifa; ícone na cor on-primary, não accent); "Contato" com Nome/E-mail/WhatsApp/CPF (e-mail sem placeholder "nome@email.com"); Entrega: "Informar o endereço agora" com os campos aninhados entre as duas opções, sem o título "Endereço de entrega" | `screenshots/CH-09-06-passo1-nova.png` |
| 07 | Abrir "Colar texto da conversa" | Título, subtítulo, rótulo, placeholder, "O texto não fica guardado.", "0/2000", Cancelar / Ler o texto (desligado vazio) — textos iguais | `screenshots/CH-09-07-folha-colar.png` |
| 08 | Colar texto sem dados e ler | "Lendo o texto…", depois a caixa alert-soft "Não encontrei nome, contato nem endereço…" e "Preencher à mão" — igual ao desenho | `screenshots/CH-09-08-colar-sem-dados.png` |
| 09 | Digitar CEP 99999-999 | "Não achei este CEP. Confira, ou preencha o endereço à mão." em cor tinta, abaixo do campo; campo sem estado de erro (borda normal, sem `aria-invalid`/`aria-describedby`) | `screenshots/CH-09-09-cep-nao-achado.png` |
| 10 | Cadastrada › escolher Juliana Prates Ch02 | Cartão Cliente com "Trocar", nome em Outfit 16/400 (desenho serifa 17/700); Entrega com Endereço padrão / Outro endereço / A cliente preenche no link (já registrados: telefone/contagem, CEP sem hífen) | `screenshots/CH-09-10-cadastrada-escolhida.png` |
| 11 | Passo 2 › buscar "QA" | Placeholder "Nome da joia" (D-37); linhas com capa 56×70, "a partir de R$ X · N em estoque · pede material" | `screenshots/CH-09-11-passo2-busca.png` |
| 12 | Procurar peça sem foto (QA, Anel, Pingente, Colar, Brinco) | Todas as peças listadas têm foto; nenhuma peça sem foto achada pela busca | `screenshots/CH-09-12-foto-nao-carrega-catalogo.png` |
| 13 | Abrir a folha da variação de "QA Medalha Afetiva" | Foto 104×130, nome, preço em Outfit 400 tinta (desenho serifa 700 primária), "A foto troca com a variação escolhida.", chips com miniatura e "10 em estoque" (selecionado em areia com borda, desenho: preenchido primária), Quantidade, aviso de material sem ícone, "Acrescentar · R$ 149,90" | `screenshots/CH-09-13-folha-variacao.png` |
| 14 | Subir a quantidade para 11 | "Só há 10 em estoque." em alert e botão desligado; a linha "10 em estoque" continua acima do aviso (desenho troca uma pela outra) | `screenshots/CH-09-14-acima-do-estoque.png` |
| 15 | Acrescentar a peça | Sacola · 1 peça (foto 64×80, variação, "1 × R$ 149,90", etiqueta material, Editar/lixeira); aviso "Peça acrescentada." **dentro do conteúdo**, em fundo areia, sem sumir; barra com "—" (já registrado) | `screenshots/CH-09-15-sacola.png` |
| 16 | Passo 3 › cupom "naoexiste99" | Maiúsculas; "Cupom inválido." (D-38) em alert abaixo; campo sem estado de erro; o aviso "Peça acrescentada." ainda no topo | `screenshots/CH-09-16-cupom-recusado.png` |
| 17 | Desconto combinado 100 % | "Em reais / Em %" (desligado sem borda), rótulo "Valor em %" (desenho "Desconto (%)"), "O desconto não pode zerar o pedido." só abaixo do campo, a barra sem o motivo | `screenshots/CH-09-17-combinado-zera.png` |
| 18 | Passo 4 › Revisar | Ordem Sacola → Cliente → Entrega (cotação SEDEX) → Observação interna (D-30) → nota "Os preços ficam travados…" (igual); última linha do resumo "Itens" (desenho "Total"); aviso "Peça acrescentada." ainda no topo | `screenshots/CH-09-18-revisar.png` |
| 19 | Fechar a montagem | Folha "Sair sem criar o link?" com Continuar montando / Guardar rascunho / Descartar (D-18); descartei | `screenshots/CH-09-19-folha-sair.png` |
| 20 | P-0034 › Cancelar este pedido › Manter | "Cancelar P-0034?" / texto igual / Manter (sem contorno) + Cancelar pedido (tinta sólida); a proposta seguiu Aberta | `screenshots/CH-09-20-folha-cancelar.png` |
| 21 | P-0034 recarregado com as imagens do Storage cortadas | Quadro 56×70 (4:5) em areia com a estrela da marca, sem ícone de imagem quebrada | `screenshots/CH-09-21-foto-falhou.png` |
| 22 | Sair da conta e fechar o browser | Voltou a `/login`; browser fechado | — |

**Edge cases tentados:** busca de cliente sem resultado; folha "Colar texto" com texto sem dados; CEP inexistente; quantidade acima do estoque; cupom inexistente; desconto combinado que zera; imagens do Storage cortadas no pedido montado (variação do TC-UI-002); estados vazios/carregando — sem frame no protótipo, não comparados.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-UI-001 | fail | 01–20 | `screenshots/CH-09-01…20` | A-1 a A-12; Expirada, Renovar, preço que mudou e criando não conferidos (Fora da cobertura) |
| TC-UI-002 | blocked | 12, 21 | `screenshots/CH-09-12-foto-nao-carrega-catalogo.png`, `screenshots/CH-09-21-foto-falhou.png` | massa: nenhuma peça sem foto achada pela busca (5 termos). A variação "foto que não carrega" passa no pedido montado (areia + estrela, 4:5, sem ícone quebrado) |

Contagem: pass 0 · fail 1 · blocked 1 · skip 0

## Achados

### A-1 · [Pedido montado · Concluída] "Ver o pedido" fica no fim da rolagem e a faixa perde o tom de concluído — Adri

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 Adri no WhatsApp |
| Jornada e passo     | UC-09 · passo 03 do log |
| TC                  | TC-UI-001 |
| Gravidade proposta  | low — a ação principal da concluída exige rolar até o fim e a faixa não se distingue das de cancelada/expirada |
| Reproduziu          | sim (P-0014; mesma estrutura em todas as concluídas da lista) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. `admin-atelie`, `/pedidos?visao=montados`
2. Tocar em P-0014 (Concluída)
3. Olhar a faixa do topo e procurar "Ver o pedido #0366"

**Esperado:** rodapé fixo (fundo surface, borda superior) com o botão primário "Ver o pedido #N"; faixa em `--estrelinha-done-soft` com texto `--estrelinha-done`, raio 12 — **fonte:** protótipo, tela Pedido montado (`pr.temRodape`, `pr.concluida`)

**Observado:** o botão está no fluxo, depois do Histórico (bottom 984px numa tela de 844); faixa em `#f1ebe1` (ground-deep) com texto tinta `#23303a`, raio 20 — igual à faixa da Cancelada.

**Evidência:**

- `screenshots/CH-09-03-concluida.png` — faixa e botão no fim da página
- console: nada
- rede: nada

### A-2 · [Montar pedido · casca] O indicador de passos não mostra os nomes e o passo atual não tem o destaque dourado

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 |
| Jornada e passo     | UC-02 · passos 05, 16, 18 |
| TC                  | TC-UI-001 |
| Gravidade proposta  | low — a orientação continua no subtítulo "Passo n de 4 · Nome" |
| Reproduziu          | sim (passos 1, 3 e 4) |
| Viewport            | 390 × 844 |

**Passos para reproduzir:** `/pedidos/montar`, olhar a faixa de 4 barras sob o cabeçalho.

**Esperado:** cada segmento com a barra (4px) e o rótulo visível "Cliente / Peças / Descontos / Revisar" (12px); atual em `--estrelinha-accent`, feitos em primária, demais em line — **fonte:** protótipo, Montar pedido — casca (`steps`)

**Observado:** só as barras (6px), rótulos só no `aria-label`; passo atual em primária `#34495e`. Também: título 20px (desenho 17px) e subtítulo 14px (desenho 12px).

**Evidência:** `screenshots/CH-09-05-passo1-sem-resultado.png`

### A-3 · [Montar pedido] O aviso "Peça acrescentada." vira bloco fixo no conteúdo e acompanha a montagem até o Revisar

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 |
| Jornada e passo     | UC-06 → UC-08 · passos 15, 16, 18 |
| TC                  | TC-UI-001 |
| Gravidade proposta  | low — o aviso velho ocupa o topo dos passos seguintes e fala de uma ação já superada |
| Reproduziu          | sim (visto nos passos 2, 3 e 4, mais de 1 min depois) |
| Viewport            | 390 × 844 |

**Passos para reproduzir:** montar com uma cliente, acrescentar uma peça, seguir para Descontos e Revisar.

**Esperado:** toast flutuante sobre a barra (fundo tinta, ícone check dourado), que some em ~3 s — **fonte:** protótipo (`hasToast`, `showToast` 3200 ms)

**Observado:** `role=status` estático no topo da área de conteúdo, fundo areia `#f1ebe1`, texto tinta; segue no passo 3 e no passo 4.

**Evidência:** `screenshots/CH-09-15-sacola.png`, `screenshots/CH-09-16-cupom-recusado.png`, `screenshots/CH-09-18-revisar.png`

### A-4 · [Montar pedido · barra] O motivo do bloqueio perde a cor de espera e a recusa do combinado não sobe para a barra

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 |
| Jornada e passo     | UC-02/UC-07 · passos 05, 17 |
| TC                  | TC-UI-001 |
| Gravidade proposta  | low |
| Reproduziu          | sim (passos 1 e 3) |
| Viewport            | 390 × 844 |

**Esperado:** motivo em `--estrelinha-wait`, 13px, acima do total; no passo 3 "O desconto não pode zerar o pedido." aparece logo na barra; CTA com 190px — **fonte:** protótipo (`hasBlock`, `showBlock`) e spec › Montar pedido — casca

**Observado:** motivo em tinta `#23303a`, 14px; com o combinado em 100 % a barra não mostra motivo nenhum (só o erro abaixo do campo); CTA "Continuar" 119px / "Criar link" 113px.

**Evidência:** `screenshots/CH-09-05-passo1-sem-resultado.png`, `screenshots/CH-09-17-combinado-zera.png`

### A-5 · [Passo 1 / Passo 3] Erros de campo (CEP não achado, cupom recusado) sem o estado de erro do campo

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 |
| Jornada e passo     | UC-03, UC-07 · passos 09, 16 |
| TC                  | TC-UI-001 |
| Gravidade proposta  | low — o texto aparece; o campo não fica marcado e leitor de tela não liga a mensagem ao campo |
| Reproduziu          | sim (CEP e cupom) |
| Viewport            | 390 × 844 |

**Passos:** Cliente nova › CEP `99999999`; ou passo 3 › cupom `naoexiste99` › Aplicar.

**Esperado:** `TextField` com `error` (texto e borda de erro) — **fonte:** protótipo (`errs.cep`, `cp.err`)

**Observado:** CEP: mensagem em tinta, borda `#8c8073` normal, sem `aria-invalid`/`aria-describedby`. Cupom: mensagem `role=alert` em alert `#7e2f2b`, mas o campo também sem borda de erro nem `aria-invalid`.

**Evidência:** `screenshots/CH-09-09-cep-nao-achado.png`, `screenshots/CH-09-16-cupom-recusado.png`

### A-6 · [Montados · Pedido montado · Folha da variação · Barra] Valores em dinheiro e nomes sem a tipografia de destaque

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 |
| Jornada e passo     | UC-01, UC-06, UC-09 · passos 01, 02, 10, 13, 15 |
| TC                  | TC-UI-001 |
| Gravidade proposta  | low |
| Reproduziu          | sim (5 telas) |
| Viewport            | 390 × 844 |

**Esperado:** total do cartão de Montados, "Total dos itens", total da barra e preço da folha em `--font-display` (Libre Baskerville) 700, cor primária (16/18/18/16px); nome da cliente escolhida e no pedido montado em display 700 17px — **fonte:** protótipo

**Observado:** cartão: Outfit 500 16px tinta; "Total dos itens": Outfit 500 14px tinta; barra: Libre Baskerville 400 18px tinta; preço da folha: Outfit 400 16px tinta; nome da cliente: Outfit 400/500 16px.

**Evidência:** `screenshots/CH-09-01-montados.png`, `CH-09-02-aberta.png`, `CH-09-13-folha-variacao.png`, `CH-09-15-sacola.png`, `CH-09-10-cadastrada-escolhida.png`

### A-7 · [Pedido montado · Aberta] O cartão do link, a mensagem, o histórico e as ações com outro desenho

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 |
| Jornada e passo     | UC-09 · passo 02 |
| TC                  | TC-UI-001 |
| Gravidade proposta  | low |
| Reproduziu          | sim (P-0034; P-0033 para histórico) |
| Viewport            | 390 × 844 |

**Esperado (protótipo, Pedido montado):** "Link para X" como sobretítulo 11px 600 maiúsculas; caixa do link com borda `on-ink-border` em fonte de corpo; "Enviar pelo WhatsApp" em `--estrelinha-whatsapp` com texto tinta, display 700 15px; "Copiar link" translúcido `on-ink-surface` com borda e texto on-primary; nota 13px 300; padding do cartão 18px; mensagem do WhatsApp numa caixa `ground-deep` raio 12; histórico com ponto (accent no mais recente) e linha do tempo; Editar `secondary` e "Cancelar este pedido" `ghost` centrado.

**Observado:** título h2 Libre Baskerville 700 16px sem maiúsculas; caixa do link sem borda, monoespaçada; WhatsApp `#075e54` com texto branco, Outfit 500 16px; "Copiar link" sólido `#f7f3ec` com texto tinta; nota 12px 400; padding 16; mensagem sem caixa; histórico só texto (sem ponto nem linha); Editar sólido tinta e Cancelar contorno `#7e2f2b`, lado a lado.

**Evidência:** `screenshots/CH-09-02-aberta.png`, `screenshots/CH-09-04-cancelada.png`

### A-8 · [Pedidos · Montados] A busca some na visão Montados

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 |
| Jornada e passo     | UC-01 · passo 01 |
| TC                  | TC-UI-001 |
| Gravidade proposta  | low |
| Reproduziu          | sim (troca Tudo → Montados, 2 vezes) |
| Viewport            | 390 × 844 |

**Esperado:** campo "Número, nome, e-mail ou rastreio" entre o título e os chips também com "Montados" — **fonte:** protótipo, Pedidos · Montados

**Observado:** em "Tudo" o campo existe; em "Montados" não há campo. Também: gap interno do cartão 8px (desenho 10px).

**Evidência:** `screenshots/CH-09-01-montados.png`

### A-9 · [Passo 1] Estrutura e detalhes do passo Cliente diferentes do desenho

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 |
| Jornada e passo     | UC-03, UC-04 · passos 05, 06 |
| TC                  | TC-UI-001 |
| Gravidade proposta  | low |
| Reproduziu          | sim |
| Viewport            | 390 × 844 |

**Esperado:** resultados da busca dentro de um cartão (surface, borda, raio 20), inicial 44px; convite com título 15px 500 e ícone em accent, padding 18; e-mail com placeholder "nome@email.com"; formulário de endereço depois do cartão Entrega, com título "Endereço de entrega" — **fonte:** protótipo, Passo 1

**Observado:** lista solta (sem cartão), inicial 40px; título do convite Libre Baskerville 700 18px, ícone on-primary, padding 16; e-mail sem placeholder; campos do endereço aninhados entre "Informar o endereço agora" e "A cliente preenche no link", sem o título.

**Evidência:** `screenshots/CH-09-05-passo1-sem-resultado.png`, `screenshots/CH-09-06-passo1-nova.png`

### A-10 · [Folha da variação] Chip escolhido, aviso de material e linha de estoque diferentes

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 |
| Jornada e passo     | UC-06 · passos 13, 14 |
| TC                  | TC-UI-001 |
| Gravidade proposta  | low |
| Reproduziu          | sim |
| Viewport            | 390 × 844 |

**Esperado:** chip escolhido preenchido em primária com texto on-primary; aviso de material com ícone "envio" em primária; acima do estoque a linha "N em estoque" vira "Só há N em estoque." — **fonte:** protótipo, Folha da variação

**Observado:** chip escolhido em areia `#f1ebe1` com borda primária e texto tinta; aviso sem ícone; acima do estoque aparecem as duas linhas ("10 em estoque" e, abaixo, "Só há 10 em estoque."). Seletor "Em reais / Em %" desligado sem borda (desenho: borda 2px field).

**Evidência:** `screenshots/CH-09-13-folha-variacao.png`, `screenshots/CH-09-14-acima-do-estoque.png`, `screenshots/CH-09-17-combinado-zera.png`

### A-11 · [Textos] Rótulos e frases que divergem do desenho sem decisão na costura

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 |
| Jornada e passo     | UC-07, UC-08, UC-09 · passos 03, 04, 07, 17, 18 |
| TC                  | TC-UI-001 |
| Gravidade proposta  | low |
| Reproduziu          | sim |
| Viewport            | 390 × 844 |

| Onde | Desenho | Observado |
| ---- | ------- | --------- |
| Passo 3, valor do combinado | "Desconto (%)" / "Desconto (R$)" | "Valor em %" |
| Passo 4, última linha do resumo | "Total" | "Itens" |
| Pedido montado, histórico | "Aberto pela cliente" | "Visto pela cliente" |
| Pedido montado, histórico da concluída | "Concluído pela cliente · pedido #0262" | "Concluído pela cliente" |
| Pedido montado, desconto | "− R$ …" (sinal de menos) | "- R$ 47,19" (hífen) |
| Folha "Colar texto", contador | "0 / 2000" | "0/2000" |

("Cancelado" sem "por você" no histórico já está registrado — não reaberto.)

**Evidência:** `screenshots/CH-09-17-combinado-zera.png`, `CH-09-18-revisar.png`, `CH-09-03-concluida.png`, `CH-09-04-cancelada.png`, `CH-09-07-folha-colar.png`

### A-12 · [Dimensões] Medidas fixadas no desenho com outro valor

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 |
| Jornada e passo     | passos 02, 03, 21 |
| TC                  | TC-UI-001 |
| Gravidade proposta  | low |
| Reproduziu          | sim |
| Viewport            | 390 × 844 |

Foto da peça no pedido montado 56×70 (desenho 48×60); faixas Concluída/Cancelada raio 20 (desenho 12); segmento escolhido raio 6 (desenho 8). Botões secundários das folhas ("Manter", "Continuar montando", "Cancelar") sem contorno (desenho `secondary`).

**Evidência:** `screenshots/CH-09-02-aberta.png`, `CH-09-04-cancelada.png`, `CH-09-20-folha-cancelar.png`

## Design

**Protótipo:** `a780eec8-8aba-4d6e-8b4c-2c485e2750c7` · Uma Estrelinha - Mobile Admin · `Montar Pedido.dc.html` (+ `montado-dados.js` não precisou ser lido: só dados fictícios) · `claude_design` · lido por MCP `claude-design` (`list_files`, `read_file` em 4 partes)

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |
| D1 | `/pedidos/montados/:id` Concluída · Pedido montado | "Ver o pedido #N" | posição | rodapé fixo | no fluxo, após Histórico · 390 | `CH-09-03-concluida.png` | A-1 |
| D2 | idem | faixa concluída | `background-color` / `color` / raio | `--estrelinha-done-soft` / `--estrelinha-done` / 12 | `#f1ebe1` / `#23303a` / 20 | `CH-09-03-concluida.png` | A-1 |
| D3 | `/pedidos/montar` · casca | indicador | rótulos visíveis | "Cliente/Peças/Descontos/Revisar" 12px | ausentes (só `aria-label`) | `CH-09-05-…png` | A-2 |
| D4 | idem | barra do passo atual | `background-color` / altura | `--estrelinha-accent` / 4 | `#34495e` / 6 | idem | A-2 |
| D5 | idem | título / subtítulo | `font-size` | 17 / 12 | 20 / 14 | idem | A-2 |
| D6 | `/pedidos/montar` passos 2–4 | toast | posição, fundo, duração | flutuante, `--estrelinha-ink`, ~3,2 s | estático no conteúdo, `#f1ebe1`, persiste | `CH-09-15/16/18` | A-3 |
| D7 | `/pedidos/montar` barra | motivo | `color` / `font-size` | `--estrelinha-wait` / 13 | `#23303a` / 14 | `CH-09-05-…png` | A-4 |
| D8 | idem, passo 3 | motivo do combinado que zera | presença na barra | presente | ausente | `CH-09-17-…png` | A-4 |
| D9 | idem | CTA | `width` | 190 | 119 / 113 | idem | A-4 |
| D10 | passo 1 / passo 3 | campo CEP, campo cupom | estado de erro | `error` do TextField | sem borda de erro, sem `aria-invalid` (CEP também texto em tinta) | `CH-09-09`, `CH-09-16` | A-5 |
| D11 | Montados · Pedido montado · folha · barra | totais e preços | família / peso / cor | Libre Baskerville / 700 / primária | Outfit / 400–500 / tinta (barra: serifa 400 tinta) | 01, 02, 13, 15 | A-6 |
| D12 | Pedido montado · passo 1 | nome da cliente | família / tamanho / peso | display / 17 / 700 | Outfit / 16 / 400–500 | 02, 10 | A-6 |
| D13 | Pedido montado Aberta | "Link para X" | tipografia | 11 / 600 / maiúsculas | serifa 16 / 700 / normal | 02 | A-7 |
| D14 | idem | caixa do link | borda / família | 1px on-ink-border / corpo | sem borda / monoespaçada | 02 | A-7 |
| D15 | idem | Enviar pelo WhatsApp | fundo / texto / fonte | `--estrelinha-whatsapp` / tinta / display 700 15 | `#075e54` / `#ffffff` / Outfit 500 16 | 02 | A-7 |
| D16 | idem | Copiar link | fundo / borda / texto | on-ink-surface / on-ink-border / on-primary | `#f7f3ec` sólido / sem borda / tinta | 02 | A-7 |
| D17 | idem | mensagem do WhatsApp | fundo | `ground-deep` raio 12 | sem caixa | 02 | A-7 |
| D18 | Pedido montado | histórico | marcadores | ponto + linha do tempo | sem | 02, 04 | A-7 |
| D19 | idem | Editar / Cancelar | variante | secondary / ghost centrado | sólido tinta / contorno alert, lado a lado | 02 | A-7 |
| D20 | `/pedidos?visao=montados` | busca | presença | presente | ausente nesta visão | 01 | A-8 |
| D21 | idem | cartão | `gap` | 10 | 8 | 01 | A-8 |
| D22 | passo 1 | resultados da busca | contêiner | cartão surface raio 20 | sem cartão | 05 | A-9 |
| D23 | passo 1 nova | convite | título / ícone | 15 500 / accent | serifa 18 700 / on-primary | 06 | A-9 |
| D24 | passo 1 nova | E-mail | placeholder | "nome@email.com" | vazio | 06 | A-9 |
| D25 | passo 1 nova | endereço | estrutura | bloco próprio "Endereço de entrega" após Entrega | aninhado entre as opções, sem título | 06 | A-9 |
| D26 | folha da variação | chip escolhido | fundo / texto | primária / on-primary | `#f1ebe1` / tinta | 13 | A-10 |
| D27 | idem | aviso de material | ícone | "envio" primária | ausente | 13 | A-10 |
| D28 | idem | acima do estoque | linha de estoque | substituída pelo aviso | as duas linhas | 14 | A-10 |
| D29 | vários | textos | literal | ver tabela de A-11 | ver tabela de A-11 | — | A-11 |
| D30 | vários | medidas | px | 48×60, raio 12, raio 8 | 56×70, raio 20, raio 6 | 02, 04 | A-12 |

**Divergências aceitas pela costura, conferidas e não registradas:** "Aberta — vista pela cliente" em P-0009 (D-35); busca "Nome da joia" (D-37); "Cupom inválido." (D-38); sem "Renovar prazo" na Aberta (D-17); folha de sair com "Guardar rascunho"/"Descartar" (D-18); "Observação interna" no Revisar e no pedido montado (D-30/D-36); "Montados" ao fim dos chips (D-23); "Pedido montado" no histórico (D-25); peça sem foto em areia com a estrela (Divergências da costura; visto com a imagem cortada).

**Iguais ao desenho:** textos da folha "Colar texto" (título, subtítulo, rótulo, placeholder, "O texto não fica guardado.", "Lendo o texto…", erro sem dados e "Preencher à mão" em caixa alert-soft); "Ninguém com “q”…"; textos das faixas Concluída e Cancelada; folha "Cancelar P-NNNN?"; nota final do Revisar; textos do link e da mensagem do WhatsApp; cartão de Montados (raio 20, padding 16, borda line, número em serifa 15/700).

**Telas não conferidas:** pedido montado **Expirada** e a folha **Renovar** — `blocked` (massa: nenhuma proposta expirada na lista); Passo 4 **criando** e **preço que mudou** — não provocados (criaria link / exige mudar preço no banco); Montados vazio e carregando — sem frame; frame único 390 (sem frame para 768/1280).

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| O cartão "Cliente" do pedido montado mostra CPF e endereço completo, que o desenho não tem (só "e-mail · telefone") | 02, 03, 04 | polimento |
| Catálogo do passo 2 mostra "Estoque livre" para peças sem controle de estoque; nenhuma fonte define o texto | 15 | pré-existente |
| A linha da peça no pedido montado traz o preço da linha, que o desenho não mostra | 02 | polimento |

## Fora da cobertura

- Pedido montado Expirada e a folha Renovar (frase nova de D-17) — sem proposta expirada na massa
- Passo 4 "Criando o link…" e "Os preços mudaram enquanto você montava." — não provocados sem criar link nem mexer no preço por fora da tela
- Folha "Colar texto" fora do ar, resultado "Preenchi N de M" (bloco da leitura), e e-mail com ficha ("Usar a ficha dela") — não provocados para poupar orçamento; cobertos funcionalmente no CH-02
- Folha da variação: chip esgotado, campo de gravação, modo "Salvar" da edição; passo 3 com cupom aplicado — não provocados
- Pedido montado sem telefone ("Sem telefone — copie o link.") — sem proposta aberta sem telefone identificada na lista
- TC-UI-002 com uma peça sem foto cadastrada (catálogo, folha, sacola, revisar) — nenhuma achada pela busca; só a variação "foto não carrega" no pedido montado foi vista
- Estados de foco e hover; 130 % de fonte — orçamento
- Rede lenta — fora do alcance desta sessão

## Debrief

- **Surpresas:** o aviso "Peça acrescentada." não some e acompanha os passos seguintes (A-3); o indicador de passos não tem os nomes visíveis (A-2).
- **Próximo charter:** uma rodada curta com massa de proposta Expirada, proposta aberta sem telefone e peça sem foto, para fechar Renovar, "Sem telefone" e TC-UI-002.
- **Padrão novo:** cortar as imagens do Storage e recarregar a página para ver o quadro de foto ausente sem precisar de massa — a troca no mesmo render não refaz o `<img>`, precisa recarregar.
