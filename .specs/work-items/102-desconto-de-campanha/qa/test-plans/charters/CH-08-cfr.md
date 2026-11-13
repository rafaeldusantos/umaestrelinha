# CH-08 · CFR da campanha na loja

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | cfr |
| Prioridade   | P1 |
| Persona      | PER-04 Rosa |
| Tour         | — |
| Modo         | — |
| Time-box     | 45 min · orçamento: 35 ações |
| Mudança      | a faixa e o selo em linha da campanha, os preços com desconto e riscado, os chips de `/ofertas`, o bloco "Joias em oferta" e a linha "Desconto de campanha" na sacola e no checkout (CA-03, CA-09, CA-15, R-04) — sobre a campanha "Dia das Mães", em vigência depois do CH-06 |
| Viewport     | 390 × 844 (com a fonte a 200 %) e 1440 × 900 (só teclado); 768 × 1024 de passagem |
| Massa        | só lê a campanha "Dia das Mães", M-A, M-D, M-E; **cria** no máximo um pedido de convidada |
| Driver       | — |
| Entrada      | `http://localhost:8082/` · sem login, sacola vazia |
| Jornadas     | J-03, J-04 |
| TC           | TC-UI-003, TC-CFR-001, TC-CFR-002 |

## Missão

Refazer J-03 e J-04 como auditoria, pela Rosa — fonte grande, teclado e a árvore de acessibilidade —, procurando
o que impede ou engana quem não enxerga bem: percentual cortado, preço riscado lido como o que vale, chip sem
estado, conteúdo pulando quando o bloco da Home aparece.

## Deve tentar

1. Home e `/ofertas` em 390 × 844 com a fonte a 200 %: o selo inteiro nos cartões (texto e percentual), sem rolagem
   horizontal; o mesmo em 1440 com o cartão de 220 px
2. Pela árvore de acessibilidade: o nome da faixa ("DIA DAS MÃES, 10% de desconto"), "De R$ X" no riscado, chips
   com estado pressionado e o nome "Ver as peças com {n}% de desconto" nos cartões do bloco
3. Só teclado em 1440: chips, cartões do bloco, cartão da peça e o checkout até o resumo com "Desconto de campanha"
4. Medir o deslocamento de layout ao abrir a Home e `/ofertas` (o bloco não reserva espaço enquanto carrega) e o
   tempo até a vitrine mostrar os cartões; conferir o tom: nada de contagem regressiva, escassez ou exclamação

## Fora do escopo

- Leitor de tela real (VoiceOver, TalkBack) e a fonte do sistema de um Android real: ficam em Fora da cobertura
- Elementos que a mudança não tocou, mesmo nas mesmas telas (cabeçalho, rodapé, menu, filtros da categoria): `pré-existente`, sem achado
- Tema escuro: a loja não tem
- Pagar (chave inválida no local)

## CFR

**Jornadas:** J-03, J-04 — a maior superfície da mudança na loja: o selo e o preço em todas as listagens, e o
dinheiro na sacola e no checkout.

| Categoria             | Na rodada | Por quê, se fora |
| --------------------- | --------- | ---------------- |
| Usabilidade           | sim       |                  |
| Acessibilidade        | sim       |                  |
| Performance percebida | sim       |                  |
| Compatibilidade       | sim       |                  |
| Recuperação de erro   | sim       |                  |
| Paridade com produção | sim       | sempre — é a condição da rodada; desvios declarados: build de dev (`pnpm dev`), banco e functions locais com chaves externas inválidas, Storage hospedado bloqueado (fotos podem faltar) |
