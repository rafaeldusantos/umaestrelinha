# Sessão CH-07 · No app do ateliê, o pedido diz que houve desconto do Compre Junto e quanto

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-app-do-atelie.md` · exploratório · P1       |
| Status      | done                                                                   |
| Persona     | PER-03 Adri (ateliê) · conta: `admin-painel` — `QA_ADMIN_PAINEL_*` não definidas; premissa da thread: o usuário de desenvolvimento de `supabase/seed.sql` (seção 5, só local). Senha não registrada aqui |
| Tour · modo | Feature · livre                                                        |
| Rodada      | exploração                                                             |
| Orçamento   | 15 ações de browser de 25 (algumas ações agruparam vários passos num `run_code`: voltar à lista, buscar e abrir o pedido) |
| Ambiente    | ateliê http://localhost:8084 · painel http://localhost:8083 (só para comparar) · build não exposto · Chromium (Playwright MCP, headless) · viewport 390×844 (e 844×390 no giro) |
| Paridade    | fonte do sistema simulada pelo `font-size` da raiz (130 % e 200 %), não pelo ajuste do Android; rede caindo simulada por `setOffline`; `*.supabase.co` e `g/collect` bloqueados por rota |

## Missão

Abrir no celular os pedidos com desconto e confirmar que a Adri reconhece cada peça, vê o desconto e o mesmo Total
do painel, na mesma ordem, sem nada estourando a tela.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no app e abriu a aba Pedidos | Lista "Precisa de ação" com 37 pedidos; busca por número | — |
| 02 | Buscou "0360" e abriu o #0360 (linha mista, PIX) | Itens: QA Berloque Coração 1 × R$ 59,42 com "De R$ 69,90, por R$ 59,42"; QA Berloque Coração 1 × R$ 69,90 (sem de/por); QA Pingente Estrela 1 × R$ 259,90. Valores, nesta ordem: Subtotal R$ 399,70 · **Frete · Frete padrão R$ 19,90** · Desconto do Compre Junto − R$ 10,48 · Desconto PIX − R$ 27,25 · Total R$ 381,87. Soma confere. `scrollWidth` 390 | `screenshots/CH-07-01-0360-390.png` |
| 03 | Voltou e abriu o #0363 (cupom) | Subtotal R$ 329,80 · **Frete R$ 19,90** · Compre Junto − R$ 10,48 · Cupom QA92CUPOM15 − R$ 47,90 · PIX − R$ 19,00 · Total R$ 272,32. O cupom fica entre o Compre Junto e o PIX, mas o Frete vem antes de todos os descontos | — (texto da tela; imagem no passo 09) |
| 04 | Voltou e abriu o #0362 (Cartier ×2 em promoção + oferta) | Cartier 2 × R$ 83,93 com "De R$ 239,80, por R$ 167,86" (total da linha); Veneziana 1 × R$ 71,92, "De R$ 89,90, por R$ 71,92". Subtotal R$ 589,60 · **Frete R$ 19,90** · Compre Junto − R$ 11,99 · Progressivo − R$ 59,95 · Oferta − R$ 17,98 · PIX − R$ 34,98 · Total R$ 484,60. Valores = painel (CH-06 passo 04) | `screenshots/CH-07-04-0362-fonte-200.png` |
| 05 | Voltou e abriu o #0365 (Berloque a 30 %) | Berloque 1 × R$ 48,93 "De R$ 69,90, por R$ 48,93". Subtotal R$ 329,80 · **Frete R$ 19,90** · Compre Junto − R$ 20,97 · PIX − R$ 21,62 · Total R$ 307,11 | `screenshots/CH-07-02-0365-390.png` |
| 06 | Fonte a 130 % e 200 % no #0365 | Sem rolagem horizontal (`scrollWidth` 390 nos dois); nenhum texto passa da borda; "Desconto do Compre Junto" quebra em várias linhas a 200 % (x 65–325), sem cortar | `screenshots/CH-07-03-0365-fonte-130.png` · `screenshots/CH-07-03-0365-fonte-200.png` |
| 07 | Fonte a 200 % no #0362 (o resumo mais longo) | `scrollWidth` 390, nada passa da borda; as linhas do resumo não se sobrepõem. A única sobreposição medida é a barra fixa "Iniciar separação" por cima do telefone da cliente na posição de rolagem atual (barra de ações fixa, fora do escopo) | `screenshots/CH-07-04-0362-fonte-200.png` |
| 08 | Abriu um pedido antigo (M-06), #NS-143, a 200 % | 1 joia R$ 159,90; Subtotal · Frete · Desconto − R$ 12,79 · Total R$ 172,04. Nenhuma linha do Compre Junto, nenhum de/por; sem rolagem horizontal | `screenshots/CH-07-04-NS-143-fonte-200.png` |
| 09 | Rede caiu ao tocar no #0363 (J-06a); depois voltou | Sem rede, o detalhe abriu com os mesmos valores (do cache do app; a tela de sem conexão não apareceu nos 3 s). Com a rede de volta (6 s), os mesmos valores | `screenshots/CH-07-05-0363-sem-rede.png` |
| 10 | Girou o celular (844×390) e recarregou o #0363 em 390 | Paisagem sem rolagem horizontal (`scrollWidth` 844); depois do F5 os mesmos valores | `screenshots/CH-07-06-0363-paisagem.png` |
| 11 | Abriu o #0363 no painel (390) para comparar | Painel: Subtotal R$ 329,80 · Compre Junto − R$ 10,48 · Cupom − R$ 47,90 · PIX − R$ 19,00 · **Frete R$ 19,90** · Total R$ 272,32. Mesmos valores e Total do app; a ordem difere só no Frete | `screenshots/CH-07-07-painel-0363-390.png` |
| 12 | Saiu das duas contas e fechou o browser | `/pedidos` redireciona para `/login` | — |

**Edge cases tentados:** fonte a 130 % e 200 % (#0365, #0362, #NS-143); rede caindo ao abrir o pedido; voltar à lista e reabrir (quatro vezes); girar o celular; F5 no detalhe; pedido antigo (M-06).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-008 | fail | 02–11 | `screenshots/CH-07-01-0360-390.png` · `screenshots/CH-07-07-painel-0363-390.png` | Chegar ao pedido, ver o desconto e o mesmo Total do painel: passa. A ordem não é a do painel (Frete antes dos descontos) ⇒ A-1. A variação a 200 % passa; J-06a passa |
| TC-FUNC-031 | fail | 02–05, 11 | `screenshots/CH-07-01-0360-390.png` · `screenshots/CH-07-02-0365-390.png` | Itens: a peça com desconto em "De/por", a segunda unidade a preço cheio numa linha à parte; os valores = painel. A ordem do resumo falha ⇒ A-1. Variação com cupom: o cupom fica entre o Compre Junto e o PIX, mas depois do Frete |

Contagem: pass 0 · fail 2 · blocked 0 · skip 0

## Achados

### A-1 · [App do ateliê · detalhe do pedido] o Frete aparece antes dos descontos, fora da ordem do painel — para a Adri conferindo o pedido

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Adri (ateliê)                                                  |
| Jornada e passo     | J-06, passo 2 (lê o bloco de valores) · passos 02–05 e 11 do log      |
| TC                  | TC-FUNC-031 · TC-JOURNEY-008                                          |
| Gravidade proposta  | medium — os valores e o Total batem, mas a Adri lê o resumo numa ordem diferente da do painel e da decisão Q-01, e a conta "Subtotal − descontos" não fica junta |
| Reproduziu          | sim (4 de 4: #0360, #0362, #0363, #0365; e depois do F5 no #0363)    |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Entrar no app do ateliê (http://localhost:8084/login) como `admin-painel`.
2. Aba Pedidos → buscar "0363" → abrir o #0363.
3. Ler o bloco de valores.

**Esperado:** Subtotal · Desconto do Compre Junto · Cupom · Desconto PIX · Frete · Total, a mesma ordem do painel — **fonte:** decisão Q-01 (2026-11-04), charter CH-07 › Mudança, TC-FUNC-031 passo 2, TC-JOURNEY-008 passo 2.

**Observado:** Subtotal R$ 329,80 · Frete · Frete padrão R$ 19,90 · Desconto do Compre Junto − R$ 10,48 · Cupom QA92CUPOM15 − R$ 47,90 · Desconto PIX − R$ 19,00 · Total R$ 272,32. O painel, para o mesmo pedido em 390: Subtotal · Compre Junto · Cupom · PIX · Frete · Total.

**Evidência:**

- `screenshots/CH-07-01-0360-390.png` — o #0360 com o Frete logo abaixo do Subtotal
- `screenshots/CH-07-02-0365-390.png` — o #0365, idem
- `screenshots/CH-07-07-painel-0363-390.png` — o painel com o Frete antes do Total
- console: nada relevante (2 warnings de sempre)
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O app não mostra "Acompanha o QA Pingente Estrela" na peça com desconto, que o painel mostra; as duas linhas de Berloque do #0360 se distinguem só pelo "De/por". A Adri vê duas linhas iguais de nome e pode achar que é a mesma peça repetida (hipótese 2 da persona). Nenhuma fonte que li pede a marca no app | 02 | polimento |
| No #0362 o "De/por" da Cartier é o total da linha (R$ 239,80 → R$ 167,86) ao lado de "2 × R$ 83,93"; o painel mostra por unidade. O TC diz que o total da linha no app não é bug — registrado só para a triagem | 04 | polimento |
| O "De/por" mistura no mesmo preço o Compre Junto e a promoção (#0362: 71,94 de desconto na Cartier, dos quais só 11,99 são Compre Junto). Mesmo tema do spec-gap do CH-06 | 04 | polimento |

## Fora da cobertura

- A tela de sem conexão do app ao abrir um pedido nunca visto: o pedido testado já estava no cache, e o app mostrou os dados guardados em vez da tela; não testei um pedido não visitado sem rede.
- Fonte do sistema de verdade (Android) e TalkBack — fora do alcance do browser; a fonte foi simulada pela raiz.
- O #0220 (montado pelo painel) não foi reaberto: já registrado como CH-06 #2.
- A barra fixa de ações cobrindo o conteúdo a 200 % — fora do escopo (as ações do pedido).

## Debrief

- **Surpresas:** sem rede, o detalhe abre do cache sem aviso de que pode estar velho — para estes valores não muda nada.
- **Próximo charter:** nada.
- **Padrão novo:** nada.
