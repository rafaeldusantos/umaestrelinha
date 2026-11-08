# Sessão CH-08 · CFR — a montagem e o pedido montado no celular

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-08-cfr-montagem-e-pedido-montado.md` · cfr · P1 |
| Status      | done                                                                   |
| Persona     | PER-03 Adri com a fonte grande · conta: `admin-atelie` (`QA_ADMIN_ATELIE_*`) |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | 35 ações de browser de 35 (a saída da conta foi feita dentro da ação 34, junto com a última screenshot) |
| Ambiente    | http://localhost:8084 (app do ateliê, branch feature/94) · build não exposto · Chromium headless (Playwright MCP) · viewports 390×844, 390×500 (teclado simulado), 320×568; fonte da raiz a 100/130/200 % |
| Paridade    | Supabase local (54441) e edge functions servidas localmente; `*.supabase.co` bloqueado por rota; Mercado Pago não configurado; dados de clientes reais importados misturados com fichas sintéticas `@exemplo.invalid`; fonte do sistema simulada pelo `font-size` do `<html>`, teclado simulado encurtando a viewport. A chave da IA e `PROPOSAL_TOKEN_KEY` não foram conferidas (a leitura do texto não foi exercitada; o link foi criado, então o token existe) |

## Missão

Refazer a montagem de uma cliente nova (J-01) e o reenvio do link (J-04) como auditoria: nada rola de lado,
nada fica atrás da barra fixa ou do teclado, todo alvo tem 44 px, cada espera diz que está trabalhando, e a
rede que cai não leva o que a Adri digitou.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou e abriu `/pedidos`; mediu a 100/130/200 % | `scrollWidth` 390 nos três; nenhum alvo < 44 px; o chip "Montados · 4 abertos" fica na fileira de chips que rola dentro do próprio contêiner (o texto inteiro, sem corte). A 200 % "Descontos" da barra de abas passa da borda (r=404) — barra de abas, pré-existente, fora do escopo | — |
| 02 | Abriu "Montados · 4 abertos" | Lista "17 pedidos montados · os mais recentes primeiro", nome de joia longo (P-0033) quebra em linhas; `scrollWidth` 390 e zero alvos < 44 e zero texto cortado a 100/130/200 % | `screenshots/CH-08-02-montados-200.png` |
| 03 | Tocou "Montar pedido" (passo 1) | "Passo 1 de 4 · Cliente"; indicador com nomes "Passo n: Nome"; "Fechar a montagem"; "Continuar" desligado com `aria-describedby="motivo-do-bloqueio"` → "Escolha a cliente para continuar."; barra fixa: 101 px a 100 %, 131 px a 130 %, **321 px a 200 %** (38 % da tela de 844) | — |
| 04 | "Cliente nova"; digitou nome longo, e-mail, WhatsApp; escolheu "A cliente preenche no link" | Motivo do bloqueio troca para "Falta o nome da cliente." e some quando preenchido; o rótulo "Complemento" + "Opcional" vira o nome acessível "ComplementoOpcional" (sem espaço) | — |
| 05 | Simulou o teclado aberto (390×500) e focou Nome, E-mail e WhatsApp a 130 % e 200 % | 130 %: campo focado em 219–281, barra começa em 405 — visível. **200 %: o cabeçalho fixo (sticky) vai de 0 a 313 e a barra fixa de 275 a 500 — os dois se sobrepõem e não sobra faixa visível; o campo focado (202–298) fica atrás dos dois** | `screenshots/CH-08-05-teclado-200-campo-coberto.png` |
| 06 | Mediu as camadas fixas na mesma tela | sticky "Montar pedido · Passo 1 de 4 · Cliente" 0–313; fixed "Nenhuma peça ainda — Continuar" 275–500; `scroll-padding-bottom: auto` | — |
| 07 | Contraprova 320×568 sem teclado | 100 %: 366 px livres entre cabeçalho (0–129) e barra (495–568); 130 %: 280 px; **200 %: cabeçalho 0–353, barra 343–568 — −10 px, nenhuma área de conteúdo visível mesmo sem teclado** (reproduziu o passo 05); `scrollWidth` 320 nos três; rádios de entrega 20/26/40 px dentro de rótulo clicável | `screenshots/CH-08-07-320-200-sem-area-visivel.png` |
| 08 | Voltou a 390×844, "Continuar" para Peças; abriu uma joia com variações | Folha de variação é `dialog` com nome da joia; o foco entra na folha (no primeiro chip de variação); a 130/200 % a folha ocupa 760 px e rola dentro de si (scrollHeight 935/1916); nenhum alvo < 44; `scrollWidth` 390 | — |
| 09 | "Acrescentar · R$ 329,90" → Continuar (Descontos) → Continuar (Revisar) | A sacola, a cliente com nome longo quebrando, "Ficha nova · criada com o link", "O link vale 7 dias, até 15/11. Nada é gravado antes de você criar o link."; **a região `status` "Peça acrescentada. …" continua no DOM dois passos depois** | — |
| 10 | Digitou a observação interna, cortou a rede (setOffline) e tocou "Criar link" | 150 ms depois o botão ainda dizia "Criar link" (sem "Criando o link…" observado — a falha foi imediata, offline); em 4 s: `alert` "Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo."; observação preservada; continua em `/pedidos/montar` | `screenshots/CH-08-31-criar-link-offline.png` |
| 11 | Restaurou a rede e tocou "Criar link" de novo | Foi para o pedido montado **P-0037**; `status` "Link criado. Agora é só mandar para Sônia." Um único pedido montado novo (a tentativa offline não gravou nada visível) | — |
| 12 | No pedido montado, mediu o cartão escuro do link a 100/130/200 % e o contraste | `scrollWidth` 390; nenhum alvo < 44; nada cortado no cartão (URL longa quebra); contraste ~12,2:1 nos textos claros sobre `rgb(35,48,58)`, "Enviar pelo WhatsApp" 7,7:1; a URL sobre faixa de 10 % de claro — legível | `screenshots/CH-08-33-cartao-do-link.png` |
| 13 | Saiu da conta | O menu da conta não foi localizado por nome acessível dentro do orçamento; a sessão foi encerrada limpando `localStorage`/`sessionStorage` do contexto (isolado, em memória) e o browser foi fechado | — |

**Edge cases tentados:** fonte 100/130/200 %; teclado aberto (viewport 390×500); 320×568; nome de cliente longo ("Sônia Teste QA Maria Aparecida dos Santos Albuquerque") e de joia longo (P-0033 na lista); rede cortada em "Criar link". Não tentados: `reducedMotion`, rede lenta, rede cortada em "Ler o texto"/resumo vivo/"Copiar link", girar o celular.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-CFR-001 | fail | 05, 07 | `screenshots/CH-08-05-teclado-200-campo-coberto.png`, `screenshots/CH-08-07-320-200-sem-area-visivel.png` | A-1. Largura e alvos de 44 px passam em todas as telas medidas (lista, montagem passos 1–4, folha de variação, pedido montado, cartão do link); a meta "barra fixa com o teclado aberto: campo focado visível" falha a 200 %. Folhas colar texto, sair, cancelar, renovar e observação não medidas (orçamento) |
| TC-CFR-002 | pass | 03, 08, 09, 10, 11, 12 | — | Parcial: `aria-describedby` do motivo, nomes "Fechar a montagem"/"Passo n: Nome"/"Alterar …", folha como `dialog` nomeado com foco dentro, falha em `alert`, sucesso em `status`, contraste do cartão ≥ 4,5:1. Não conferido: foco voltando ao gatilho, Esc, "Lido do texto — confira.", `reducedMotion`. Notas A-2 e A-3 (low) |
| TC-CFR-003 | skip | — | — | Rede lenta não emulada (orçamento); a única espera vista foi a falha offline, imediata |
| TC-CFR-004 | pass | 10, 11 | `screenshots/CH-08-31-criar-link-offline.png` | Passo 1 (Criar link) passa: frase simples com próximo passo, observação preservada, sem "Link criado." otimista, depois um único pedido montado. Passos 2 (Copiar/Renovar/Cancelar offline) não executados. Tom dos textos lidos: sem `!`, sem emoji, sem urgência (a mensagem de WhatsApp gerada tem "Oi, Sônia!" — texto para a cliente, já aprovado em outra feature; não registrado) |
| TC-PERSONA-002 | fail | 05, 07 | `screenshots/CH-08-07-320-200-sem-area-visivel.png` | A-1: a 200 % a montagem foi concluída a 390×844 sem teclado, mas com o teclado aberto o campo digitado fica escondido, e em 320×568 não há área de conteúdo — hipótese de fricção 1 da persona confirmada. Link criado (P-0037) em ~3 min |

Contagem: pass 2 · fail 2 · blocked 0 · skip 1

## Achados

### A-1 · [Montagem] A 200 % de fonte, o cabeçalho fixo e a barra fixa juntos cobrem a tela inteira e escondem o campo que a Adri está digitando

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Adri com a fonte grande                                        |
| Jornada e passo     | J-01, passo 1 (dados da cliente nova) · passos 05–07 do log           |
| TC                  | TC-CFR-001, TC-PERSONA-002                                            |
| Gravidade proposta  | high — com a fonte que ela usa à noite e o teclado aberto, ela digita nome, e-mail e WhatsApp sem ver o campo; num celular pequeno não vê conteúdo nenhum |
| Reproduziu          | sim (2 de 2 — 390×500 com teclado simulado, e 320×568 sem teclado)    |
| Viewport            | 390×500 (390×844 com teclado) e 320×568, fonte da raiz 200 %         |

**Passos para reproduzir** — de um estado limpo:

1. `admin-atelie`, fonte do sistema a 200 % (no browser: `font-size: 200%` no `<html>`), viewport 390×844
2. `/pedidos` → "Montar pedido" → "Cliente nova"
3. Abrir o teclado (viewport 390×500) e tocar no campo "Nome" (ou "E-mail", "WhatsApp")

**Esperado:** o campo focado e o botão da barra visíveis; aceitável o campo visível rolando — **fonte:** TC-CFR-001 › Metas ("barra fixa com o teclado aberto"); CLAUDE.md da raiz › Convenções (mobile, prova a 130/200 %, "CTA fixo brigando"); PER-03 › O que pode atrapalhá-la, item 1.

**Observado:** a 200 % o cabeçalho "Montar pedido · Passo 1 de 4 · Cliente" é `sticky` e mede 313 px (0–313); a barra "Nenhuma peça ainda — Continuar" é `fixed` e mede 225 px (275–500). Os dois se sobrepõem; o campo focado fica em 202–298, atrás de ambos. Rolar não resolve: não há faixa livre entre as duas camadas. Em 320×568 sem teclado: cabeçalho 0–353, barra 343–568 (−10 px livres). A 130 % ficam 124 px livres (390×500) e 280 px (320×568). Sem rolagem lateral em nenhum caso.

**Evidência:**

- `screenshots/CH-08-05-teclado-200-campo-coberto.png` — 390×500 a 200 % com "E-mail" focado
- `screenshots/CH-08-07-320-200-sem-area-visivel.png` — 320×568 a 200 %, sem área de conteúdo
- console: nada
- rede: nada

### A-2 · [Montagem] O aviso "Peça acrescentada." fica na região viva até o passo Revisar

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Adri com a fonte grande                                        |
| Jornada e passo     | J-01, passos 2→4 · passos 09–10 do log                                |
| TC                  | TC-CFR-002                                                            |
| Gravidade proposta  | low — o aviso velho segue lido como estado atual dois passos depois e ao lado do alerta de falha |
| Reproduziu          | sim (2 de 2 — visto no Revisar e de novo junto do alerta de falha offline) |
| Viewport            | 390×844                                                               |

**Passos para reproduzir** — de um estado limpo:

1. `admin-atelie` → `/pedidos/montar`, cliente nova preenchida, Continuar
2. Acrescentar uma joia → Continuar → Continuar (Revisar)
3. Ler as regiões vivas da página

**Esperado:** a confirmação de peça acrescentada some depois de um tempo ou ao trocar de passo — **fonte:** cfr.md › Acessibilidade (toasts em região viva) — duração não definida pela spec (ver spec-gaps)

**Observado:** `status`: "Peça acrescentada. Anel Afetivo 6 Corações com Leite Materno em Prata 925 · Prata 925 Folheado a Ouro Branco" presente no Revisar e ainda presente ao lado do `alert` de falha do "Criar link".

**Evidência:**

- `screenshots/CH-08-31-criar-link-offline.png` — o Revisar com o alerta de falha
- console: nada
- rede: nada

### A-3 · [Montagem] O campo "Complemento" tem nome acessível "ComplementoOpcional"

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Adri com a fonte grande                                        |
| Jornada e passo     | J-01, passo 1 (entrega com endereço agora) · passo 04 do log          |
| TC                  | TC-CFR-002                                                            |
| Gravidade proposta  | low — o leitor de tela lê uma palavra só, "ComplementoOpcional"       |
| Reproduziu          | sim (2 de 2 — no snapshot da cliente nova, nas duas aberturas do passo 1) |
| Viewport            | 390×844                                                               |

**Passos para reproduzir** — de um estado limpo:

1. `admin-atelie` → `/pedidos/montar` → "Cliente nova", entrega "Informar o endereço agora"
2. Ler a árvore de acessibilidade do campo Complemento

**Esperado:** nome acessível "Complemento (opcional)" ou equivalente legível — **fonte:** TC-CFR-002 › Metas (controles com nome que descreve a ação); cfr.md › Acessibilidade

**Observado:** `textbox "ComplementoOpcional"` — rótulo e marca "Opcional" em elementos vizinhos sem espaço entre eles.

**Evidência:**

- snapshot do passo 04 (árvore de acessibilidade, não salva no qa_dir)
- console: nada
- rede: nada

## CFR

| Jornada | Categoria             | Marca    | Itens que não passaram | Achado |
| ------- | --------------------- | -------- | ---------------------- | ------ |
| J-01    | Usabilidade           | fail     | campo focado escondido a 200 % com teclado; sem área de conteúdo em 320×568 a 200 % | A-1 |
| J-01    | Acessibilidade        | friction | aviso velho na região viva; nome "ComplementoOpcional" | A-2, A-3 |
| J-01    | Performance percebida | —        | não medida (rede lenta não emulada) | — |
| J-01    | Compatibilidade       | fail     | 320×568 a 200 % | A-1 |
| J-01    | Recuperação de erro   | pass     | — | — |
| J-01    | Paridade com produção | pass     | registrada no cabeçalho | — |
| J-04    | Usabilidade           | pass     | cartão do link inteiro a 100/130/200 % | — |
| J-04    | Acessibilidade        | pass     | contraste do cartão ≥ 7,7:1; sucesso em `status` | — |
| J-04    | Performance percebida | —        | não medida | — |
| J-04    | Compatibilidade       | pass     | 390 a 100/130/200 % (320 não medido no pedido montado) | — |
| J-04    | Recuperação de erro   | —        | não executada (Copiar/Renovar/Cancelar offline) | — |
| J-04    | Paridade com produção | pass     | — | — |

**Categorias fora:** Performance percebida — rede lenta não emulada dentro das 35 ações.

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Nenhuma fonte define quanto tempo a confirmação "Peça acrescentada." fica na região `status` nem se ela sai ao trocar de passo | 09 | polimento |
| Com a falha offline imediata, o rótulo "Criando o link…" não chega a ser visto; não há definição de duração mínima do estado de espera | 10 | polimento |

## Fora da cobertura

- Folhas "Colar texto", "Sair sem criar o link?", "Cancelar pedido", "Renovar prazo", "Observação" do pedido montado — não medidas a 130/200 %: orçamento
- Rede cortada em "Ler o texto", no resumo vivo e em "Copiar link"/"Renovar prazo"/"Cancelar pedido" (TC-CFR-004 passo 2): orçamento
- Rede lenta e tempo de primeira pintura de Montados (TC-CFR-003): orçamento
- Foco voltando ao gatilho ao fechar folha, Esc, marca "Lido do texto — confira.", `reducedMotion: reduce`: orçamento
- Girar o celular (844×390), 320×568 no pedido montado e nas folhas: orçamento
- Teclado virtual real, fonte do sistema e TalkBack num Android real: fora do alcance do browser
- Saída da conta pelo menu da conta: o controle não foi achado dentro do orçamento; a sessão foi encerrada limpando o armazenamento do contexto isolado e fechando o browser
- Barra de abas a 200 % ("Descontos" passa da borda) — pré-existente, fora do escopo do charter, sem achado

## Efeitos na massa

- Criado o pedido montado **P-0037** (`/pedidos/montados/8b555c40-4e91-4db4-9913-d3af9ec9cbfc`), aberto, para a cliente nova sintética "Sônia Teste QA Maria Aparecida dos Santos Albuquerque" (`sonia.teste.qa@exemplo.invalid`, WhatsApp 51999990094), 1 peça (Anel Afetivo 6 Corações · Prata 925 Folheado a Ouro Branco), endereço a preencher pela cliente, observação interna "Gravar o nome da avó, Dona Cida.". O chip de Montados passa a contar 5 abertos
- Uma ficha de cliente nova pode ter sido criada com o link ("Ficha nova · criada com o link")

## Debrief

- **Surpresas:** a 200 % o problema não é a barra fixa sozinha, e sim ela somada ao cabeçalho `sticky` do passo, que cresce para 313–353 px
- **Próximo charter:** rodada curta só das folhas (colar texto, sair, cancelar, renovar, observação) a 200 % e da recuperação de rede no pedido montado
- **Padrão novo:** medir as camadas `fixed`/`sticky` e a faixa livre entre elas a cada tamanho de fonte — achou A-1 em uma ação
