# Sessão CH-09 · design-check — o desconto do Compre Junto contra os protótipos

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-09-design-check.md` · design-check · P2        |
| Status      | done (com TC-UI-005 parcialmente `blocked` por massa)                  |
| Persona     | PER-01 Marina · conta: anonima (loja) · `admin-painel` só para a conferência do painel — premissa da thread: o usuário de desenvolvimento do `supabase/seed.sql` (seção 5, só local) |
| Tour · modo | —                                                                      |
| Rodada      | confirmação (rodada 2) — só TC-UI-004, TC-UI-005, TC-UI-006            |
| Orçamento   | 22 ações de browser de 25                                              |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 · Supabase local :54441 · worktree feature/92 · build não exposto · Chromium (Playwright MCP) · viewports 390 × 844, 1440 × 900, 900 × 900 |
| Paridade    | `*.supabase.co` e `**/g/collect*` bloqueados por rota; massa sintética QA (M-01); `mercado-pago` com chave inválida de propósito |

## Missão

Conferir, tela a tela, o que o WI desenhou contra o que a loja e o painel entregam, registrando cada diferença com o
valor do design e o observado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Ler o protótipo no Claude Design (MCP): `cj-loja-bloco.jsx`, `cj-loja.jsx`, `cj-loja.css`, `cjd-telas.jsx` (Loja) e `cj-admin-produto.jsx` (Backoffice) | Fonte legível nesta rodada; estrutura, textos e medidas lidos do código do protótipo | — |
| 02 | Abrir `/produtos/qa-pingente-estrela` em 390 e ler o bloco | Título "Compre junto", frase "Peças que eu escolhi…", três linhas: QA Correntes "de R$ 89,90 por R$ 80,91" + "10% a menos levando junto" + "Ver os 3 modelos"; QA Berloque Coração "de 69,90 por 59,42" + "15% a menos levando junto"; QA Medalha Afetiva R$ 149,90 sem frase. Caixa 44 × 44, foto 64 × 80 — iguais ao design | — |
| 03 | Marcar a lista e o berloque, escolher a Veneziana e "Prata 925" | Linha "Desconto do Compre Junto −R$ 10,48", "Total do conjunto", "no Pix", nota com "O desconto vale enquanto a joia estiver no mesmo pedido." — estrutura do design. Faixa das peças: `overflow-x: auto`, `scroll-snap-type: x mandatory`, `scrollWidth` 416 > `clientWidth` 270 (rola dentro dela); cada cartão com "de/por" e sem a frase; rótulo "Escolha a peça · 3 modelos" | `screenshots/CH-09-r2-01-bloco-marcado-390.png` |
| 04 | Recarregar e marcar só a lista (sem escolher o comprimento), depois o berloque sem a cor | O bloco mostra "Total do conjunto R$ 259,90" (só a joia), sem a linha do desconto e sem a frase da nota; a peça marcada com escolha faltando fica fora do total. Reproduziu 2 de 2 | `screenshots/CH-09-r2-02-sem-linha-desconto-com-falta-390.png` |
| 05 | Em 1440, escolher Veneziana 45 cm e Prata | Bloco: "QA Corrente Veneziana · 45 cm", "de R$ 94,90 por R$ 85,41", Desconto −R$ 19,97, Total R$ 404,73 | `screenshots/CH-09-r2-03-bloco-1440.png` |
| 06 | "Levar o conjunto" e ler a gaveta | Linhas com "de/por" e "Acompanha o QA Pingente Estrela · 10% a menos" / "· 15% a menos"; rodapé "Subtotal (3 itens) R$ 424,70 · Desconto do Compre Junto −R$ 19,97 · Total R$ 404,73 · Frete calculado no checkout, com o seu CEP." — sem a linha "ou R$ Z no PIX" do design | `screenshots/CH-09-r2-04-gaveta-1440.png` |
| 07 | Aumentar a corrente para 2 | "de R$ 189,80 por R$ 180,31", "1 com desconto, 1 a preço cheio" — igual ao design | `screenshots/CH-09-r2-05-gaveta-mista-1440.png` |
| 08 | "Finalizar Pedido" e abrir o resumo do checkout em 390 | Itens com "Acompanha o … · N% a menos", "1 com desconto, 1 a preço cheio", "de/por"; Subtotal 519,60 · Desconto do Compre Junto −19,97 · Desconto PIX (7%) −34,97 · Frete a calcular · Total 464,66; nota "O desconto do Compre Junto vale enquanto a joia estiver no mesmo pedido." — estrutura e textos do design (ordem não comparada, Q-01) | `screenshots/CH-09-r2-06-checkout-resumo-390.png` |
| 09 | Painel `admin-painel`, `/admin/produtos/<QA Pingente Estrela>/editar`, aba "Compre junto", 1440 | Nos 3 adicionais, "Desconto ao levar junto" é o último bloco; campo "Desconto em percentual" 120 × 44 com sufixo "%" (10, 15, vazio); grade texto à esquerda (225 px) + coluna de 120 px. Ajuda sem a frase do cupom (vale o PRD). Linha de prévia "As peças de QA Correntes saem de R$ 71,91 a R$ 125,91…" — sem frame | `screenshots/CH-09-r2-07-painel-campo-1440.png` |
| 10 | Mesma aba em 900 | Bloco empilhado (uma coluna de 520 px), campo abaixo do texto; `scrollWidth` 900 | `screenshots/CH-09-r2-08-painel-campo-900.png` |
| 11 | Painel › Notificações, `order_id` do #0376, "Pedido recebido" › prévia | "1× QA Berloque Coração / Compre Junto · 15% a menos · R$ 69,90 / R$ 59,42"; Subtotal 329,80 · Desconto do Compre Junto −10,48 · Cupom −47,90 · Desconto PIX −19,00 · Frete 19,90 · Total 272,32. O rótulo do cupom sai "Cupom", sem o código | `screenshots/CH-09-r2-09-email-previa-0376.png` |
| 12 | Em 1440, marcar o berloque e ler abaixo do botão | Nota "A joia e 1 peça marcada · R$ 319,32" — igual ao design | `screenshots/CH-09-r2-10-nota-1440.png` |
| 13 | Na gaveta, remover a joia | "O desconto de 10% volta com o QA Pingente Estrela na sacola." e "O desconto de 15% volta…"; preços cheios; sem a linha do desconto — igual ao design | `screenshots/CH-09-r2-11-gaveta-sem-joia-1440.png` |
| 14 | Abrir `/pedido/<id do #0376>` anônima | "Pedido não encontrado / O acesso a este pedido pode ter expirado…" — o acesso de convidada é do contexto de quem comprou | — |
| 15 | Sair do painel (limpar a sessão) e fechar o browser | `/admin` volta a `/admin/login` | — |

**Edge cases tentados:** peça marcada com escolha faltando (passo 04); quantidade 2 da peça com 1 joia (07); a joia saindo da sacola (13); viewport do painel abaixo de 1024 (10).

## Casos

| TC        | Veredito | Passo | Evidência | Nota |
| --------- | -------- | ----- | --------- | ---- |
| TC-UI-004 | pass     | 02–07, 12, 13 | `screenshots/CH-09-r2-01-bloco-marcado-390.png` · `CH-09-r2-03-bloco-1440.png` · `CH-09-r2-04-gaveta-1440.png` · `CH-09-r2-05-gaveta-mista-1440.png` · `CH-09-r2-11-gaveta-sem-joia-1440.png` | Estrutura e textos conferem; a faixa existe e rola (Q-02 atendida). Três diferenças menores registradas (D1–D3), nenhuma critical/high |
| TC-UI-005 | blocked  | 08, 11, 14 | `screenshots/CH-09-r2-06-checkout-resumo-390.png` · `CH-09-r2-09-email-previa-0376.png` | Checkout · resumo e E-mail conferidos (uma diferença menor, D4). Bloqueado por `massa`: as duas telas "o valor mudou" exigem mudar o percentual da M-01 entre a sacola e o pagamento (dado que a sessão não criou) e a Confirmação / Minha conta dos #0373/#0375/#0376 exigem o acesso de quem comprou (passo 14) |
| TC-UI-006 | pass     | 09, 10 | `screenshots/CH-09-r2-07-painel-campo-1440.png` · `CH-09-r2-08-painel-campo-900.png` | Último bloco do adicional, nome acessível, sufixo "%", 120 px em 1440, empilhado em 900. Prévia sem frame |

Contagem: pass 2 · fail 0 · blocked 1 · skip 0

## Achados

Nenhum critical/high. As quatro diferenças abaixo são divergências visuais menores e vão como **sugestão de backlog**
(rodada de confirmação), não como bug.

### A-1 · [Bloco] peça marcada com escolha faltando some do total e da linha do desconto — Marina não vê quanto economiza até escolher

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 Marina |
| Jornada e passo     | — · passo 04 do log |
| TC                  | TC-UI-004 |
| Gravidade proposta  | low — o total está coerente com o que vai para a sacola; só some a informação do desconto enquanto falta uma escolha |
| Reproduziu          | sim (2 de 2) |
| Viewport            | 390 × 844 |

**Passos para reproduzir:** 1) anônima, `/produtos/qa-pingente-estrela`; 2) marcar "QA Correntes" sem escolher o comprimento; 3) ler o rodapé do bloco.

**Esperado:** o protótipo soma toda peça marcada no total e mostra "Desconto do Compre Junto" quando há economia (`cj-loja-bloco.jsx`, `somaAdicionais` e `economia` sobre `marcados`) — **fonte:** protótipo, bloco.

**Observado:** "Total do conjunto R$ 259,90" (só a joia), sem a linha do desconto e sem "O desconto vale enquanto a joia estiver no mesmo pedido."; ao escolher o comprimento a linha aparece.

**Evidência:** `screenshots/CH-09-r2-02-sem-linha-desconto-com-falta-390.png` · console: nada · rede: nada

### A-2 · [Sacola] o rodapé da gaveta não traz "ou R$ Z no PIX · frete calculado no checkout"

| Campo | Valor |
| ----- | ----- |
| Persona | PER-01 Marina |
| Jornada e passo | — · passo 06 |
| TC | TC-UI-004 |
| Gravidade proposta | low — o valor no PIX aparece no checkout; a gaveta é a de antes do WI |
| Reproduziu | sim (2 de 2 — passos 06 e 13) |
| Viewport | 1440 × 900 |

**Esperado:** "ou {total × 0,93} no PIX · frete calculado no checkout" abaixo do Total — **fonte:** protótipo, sacola (`cj-loja.jsx`, `gaveta-ft`).
**Observado:** "Frete calculado no checkout, com o seu CEP.", sem o valor no PIX.
**Evidência:** `screenshots/CH-09-r2-04-gaveta-1440.png`

### A-3 · [Faixa da lista] cartões de 132 px no lugar de 112 px

| Campo | Valor |
| ----- | ----- |
| Persona | PER-01 Marina |
| Jornada e passo | — · passo 03 |
| TC | TC-UI-004 |
| Gravidade proposta | low — puramente visual; a faixa rola e cada cartão mostra o "de/por" |
| Reproduziu | sim (2 de 2) |
| Viewport | 390 × 844 |

**Esperado:** `.peca{width:112px}` — **fonte:** protótipo, `cj-loja.css`. **Observado:** 132 px nos três cartões.
**Evidência:** `screenshots/CH-09-r2-01-bloco-marcado-390.png`

### A-4 · [E-mail] a linha do cupom sai "Cupom", sem o código

| Campo | Valor |
| ----- | ----- |
| Persona | PER-01 Marina |
| Jornada e passo | — · passo 11 |
| TC | TC-UI-005 |
| Gravidade proposta | low — o valor está certo; só falta o nome do cupom |
| Reproduziu | sim (1 de 1 — prévia determinística do mesmo pedido) |
| Viewport | 1440 × 900 (prévia) |

**Esperado:** "Cupom {CÓDIGO}" — **fonte:** protótipo, E-mail do pedido (`cjd-telas.jsx`, `Email`). **Observado:** "Cupom −R$ 47,90".
**Evidência:** `screenshots/CH-09-r2-09-email-previa-0376.png`

## Design

**Protótipo:** `69224d8a-17ae-4b1f-a251-a8105b41edc2` (Loja: "Produto - Compre Junto com desconto", "Pedido - Desconto do Compre Junto") e `e3957c10-bd49-4f3d-9256-04d72a7d0f41` (Backoffice: "Produto - Compre Junto") · `claude_design` · lido pelo MCP `claude-design` (`list_files`, `read_file`)

| #  | Tela · frame | Elemento | Propriedade | Design | Observado | Evidência | Achado |
| -- | ------------ | -------- | ----------- | ------ | --------- | --------- | ------ |
| D1 | `/produtos/:slug` · bloco | total e "Desconto do Compre Junto" | estado com peça marcada e escolha faltando | peça somada; linha do desconto presente | peça fora do total; sem a linha nem a frase da nota · 390 | `screenshots/CH-09-r2-02-sem-linha-desconto-com-falta-390.png` | A-1 |
| D2 | gaveta da sacola · rodapé | linha do PIX | texto | "ou R$ Z no PIX · frete calculado no checkout" | "Frete calculado no checkout, com o seu CEP." · 1440 | `screenshots/CH-09-r2-04-gaveta-1440.png` | A-2 |
| D3 | `/produtos/:slug` · faixa da lista | cartão da peça | `width` | `112px` | `132px` · 390 | `screenshots/CH-09-r2-01-bloco-marcado-390.png` | A-3 |
| D4 | e-mail do pedido · totais | linha do cupom | texto | "Cupom {CÓDIGO}" | "Cupom" · prévia | `screenshots/CH-09-r2-09-email-previa-0376.png` | A-4 |

Conferido igual: textos "{N}% a menos levando junto", "Desconto do Compre Junto" (um rótulo só, H-03), as duas notas, "Escolha a peça · 3 modelos", caixa 44 × 44, foto 64 × 80, faixa com `overflow-x: auto` e `scroll-snap`, "Acompanha o … · N% a menos", "1 com desconto, 1 a preço cheio", "O desconto de N% volta com o … na sacola.", a nota do computador "A joia e 1 peça marcada · R$ X", o resumo do checkout e o campo do painel (último bloco, 120 px, sufixo "%", empilhado abaixo de 1024).

**Telas não conferidas:** Checkout · o valor mudou e Link / Minha conta · o valor mudou — `blocked` (massa); Confirmação · Minha conta — `blocked` (massa: acesso de convidada); barra fixa do celular — fora do recorte desta confirmação (reconferida em CH-01 r2); a prévia e a recusa do painel — sem frame; estado "Chaveiro" — não refeito.

## Spec-gaps

nada

## Fora da cobertura

- "O valor mudou" no checkout e no link/Minha conta — provocar exige mudar o percentual da M-01 no painel entre a sacola e o pagamento, dado que a sessão não criou (regra 7); a reconferência funcional é de CH-04.
- Confirmação e Minha conta dos #0373/#0375/#0376 — o acesso é do contexto de quem comprou ("Pedido não encontrado" anônima); criar um pedido novo só para isso pediria contato, CEP e PIX além do orçamento restante.
- A faixa do cupom ("{CÓDIGO} aplicado − R$ X") no resumo do checkout — sem cupom aplicado nesta sacola (conferido em CH-03 r2).
- Tipografia e cor finas do "de/por" (o riscado é um nó `aria-hidden` que a leitura não isolou) — estrutura e texto conferidos.
- O e-mail real no Mailpit — conferida a prévia do painel.

## Debrief

- **Surpresas:** a peça marcada com escolha faltando sai do total do bloco (A-1); o design soma.
- **Próximo charter:** uma sessão curta para "o valor mudou" com massa própria (lista e percentual criados pela sessão).
- **Padrão novo:** nada
