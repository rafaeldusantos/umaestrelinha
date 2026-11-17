# Sessão CH-03 · A cliente no celular chega pelo item destacado

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-cliente-no-celular.md` · exploratório · P0  |
| Status      | done                                                                   |
| Persona     | PER-02 Cliente no celular · conta: anonima                             |
| Tour · modo | Feature · por cenário (J-02)                                           |
| Rodada      | exploração                                                             |
| Orçamento   | 35 ações de browser de 25 (contando cada leitura — `snapshot`, `eval`, `get url`, `wait`, screenshot; passou 10 do teto, sobretudo por leituras; um `dblclick` falhou num seletor que o driver não aceita e precisou de outro snapshot) |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports 390 × 844 · 320 × 568 · 844 × 390 · rotas `**/*.supabase.co/**` e `**/g/collect*` abortadas |
| Paridade    | backend Supabase local (:54441); massa gravada pelas sessões CH-01/CH-02 |

## Missão

Confirmar que quem nunca viu a loja reconhece no celular o item destacado pelo ícone e pela cor, lê o rótulo no branco e chega à página dele com um toque, sem confundir o rótulo colorido com outra coisa.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir a loja em `/` no celular (390 × 844) | Home com o botão "Abrir menu" no topo | — |
| 02 | Tocar em "Abrir menu" | A folha "Menu" com os itens principais: "Joias afetivas" (acordeão), "Colar e correntes", "Personalizados" (acordeão), "Sobre". "Coleção Amuletos" (D, só no computador) não aparece. "Sobre" (A): rótulo computado `rgb(138, 90, 43)`, ícone de etiqueta (o caminho do SVG desenha a etiqueta) de 20 px, no tom de destaque da marca `rgb(154, 122, 69)` — o ícone não herda a cor do rótulo. "Joias afetivas" (B): rótulo `rgb(138, 90, 43)`, ícone de caixa de presente. "Personalizados" (C): rótulo `rgb(22, 21, 20)`, o mesmo de "Colar e correntes" (sem cor), ícone de lápis da marca (gravação). Todas as linhas com 56 px de altura e 350 px de largura | `screenshots/CH-03-02-folha-aberta.png` |
| 03 | Abrir o acordeão de "Joias afetivas" | `expanded=true`; rótulo segue `rgb(138, 90, 43)`; o chevron passa de "para baixo" a "para cima" (`lucide-chevron-up`) no tom de hoje `rgb(28, 26, 24)`; 11 filhos ("Linha Leite Materno"…"Correntes e Pingentes") e "ver tudo em Joias afetivas →", sem ícone e na cor de hoje (filho `rgb(22, 21, 20)`, "ver tudo" `rgb(28, 26, 24)`) | `screenshots/CH-03-03-acordeao-b-aberto.png` |
| 04 | Com o acordeão aberto, voltar pelo navegador | O voltar saiu da loja (a aba volta à página anterior, aqui `about:blank`): a folha não guarda entrada no histórico. Ver Spec-gaps | — |
| 05 | Avançar de volta à loja e reabrir o menu | Home de novo com o menu fechado; folha reaberta coerente: B fechado (`expanded=false`) com rótulo `rgb(138, 90, 43)`, A `rgb(138, 90, 43)`, C e "Colar e correntes" `rgb(22, 21, 20)` | — |
| 06 | Ver a folha num celular pequeno (320 × 568) | Folha com 320 px, sem rolagem horizontal na página nem na folha; as linhas com 56 px, ícone e rótulo sem corte (borda direita em 300 px) | `screenshots/CH-03-05-folha-320.png` |
| 07 | Girar o celular (844 × 390) com a folha aberta | A folha continua; A e B com o rótulo `rgb(138, 90, 43)` e o ícone; C sem cor | `screenshots/CH-03-06-folha-844x390.png` |
| 08 | Tocar duas vezes rápido em "Sobre" (ainda em 844 × 390) | Chegou a `/sobre` uma vez, sem erro no console | `screenshots/CH-03-07-destino-sobre.png` |

**Edge cases tentados:** viewport mínima 320 × 568 (passo 06) · girar para 844 × 390 com a folha aberta (passo 07) · duplo toque rápido no item A (passo 08) · voltar do navegador com o acordeão aberto e reabrir (passos 04–05)

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-002 | pass | 02, 08 | `screenshots/CH-03-02-folha-aberta.png` · `screenshots/CH-03-07-destino-sobre.png` | Folha abre, Etiqueta ao lado de "Sobre", rótulo `rgb(138, 90, 43)`, toque leva a `/sobre`. Variações: alvo 56 px (≥ 44), 320 × 568 sem corte nem rolagem horizontal, 844 × 390 mantém cor e ícone. O toque que chegou à página foi o duplo toque em 844 × 390; o toque simples em 390 × 844 não foi refeito à parte |
| TC-FUNC-010 | pass | 02, 03, 05, 07 | `screenshots/CH-03-03-acordeao-b-aberto.png` | A e B em `rgb(138, 90, 43)` (a cor da lista, nunca a da barra `#E8C77A`); B aberto e fechado na mesma cor; chevron marca o aberto; filhos e "ver tudo" sem ícone e na cor de hoje; J-02a: a folha reaberta está coerente (ver o spec-gap sobre o voltar) |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Com a folha do menu aberta (e o acordeão aberto), o voltar do navegador não fecha a folha: sai da página da loja para a página anterior do histórico. Nenhuma fonte diz se o voltar deveria fechar a folha. A mudança não toca na folha como diálogo | 04 | pré-existente |

## Fora da cobertura

- Movimento reduzido ao abrir o acordeão — o orçamento acabou antes
- Rótulo longo com ícone — nenhum item principal da massa tem nome longo ("Joias afetivas" é o maior), e a massa é só leitura
- Toque simples em "Sobre" a 390 × 844 separado do duplo toque — a chegada a `/sobre` foi provada pelo duplo toque em 844 × 390; o orçamento acabou

## Debrief

- **Surpresas:** o rótulo sem cor na folha saiu `rgb(22, 21, 20)` (#161514) — em C e em "Colar e correntes" igualmente —, não o #23303A/#34495E que o briefing dava como referência. Como os dois itens sem cor são iguais, a cor de hoje se manteve e não é achado; vale conferir a referência para o perfil Black Friday. O voltar do navegador sai da loja (spec-gap)
- **Próximo charter:** nada
- **Padrão novo:** nada
