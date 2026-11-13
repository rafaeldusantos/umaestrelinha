# CH-06 · A virada da campanha

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P1 |
| Persona      | PER-01 Adri |
| Tour         | Multi-Tab |
| Modo         | por cenário (J-06) |
| Time-box     | 90 min · orçamento: 70 ações |
| Mudança      | o fim da campanha — agendada sem efeito (CA-04), tirar a peça, desligar e "Encerrar agora" (CA-07, R-08), `/ofertas` e a Home sem campanha (CA-09, R-04), o checkout aberto quando a campanha acaba (R-02), o pedido gravado intacto e a campanha usada que não se apaga (CA-13), e a próxima campanha com outro nome e outras cores (CA-12) |
| Viewport     | 1440 × 900 no painel; a loja em 390 × 844 |
| Massa        | **altera** a Black Friday (desliga, religa, **encerra**) e a marcação de M-D (tira da BF); **cria** "Dia das Mães" (texto do selo "DIA DAS MÃES", faixa #6E2433, destaque #F6DCD8, 10 e 15 %, de hoje no minuto seguinte ao encerramento até 30/11/2026 23:59, ligada) e marca M-A 10 % e M-D 15 % nela; **cria** um pedido de convidada na aba da loja (pode ser recusado). Lê os pedidos do CH-04 e as peças M-G |
| Driver       | — |
| Entrada      | `http://localhost:8083/admin/campanhas` · logada como `admin-loja`; uma segunda aba em `http://localhost:8082` (a loja, sem login) |
| Jornadas     | J-06 |
| TC           | TC-FUNC-006, TC-FUNC-009, TC-FUNC-012, TC-FUNC-013, TC-FUNC-017, TC-INT-002 |

## Missão

Com o painel numa aba e a loja na outra, achar qualquer estado em que a loja continue mostrando (ou cobrando) a
campanha depois que a dona a tirou, desligou ou encerrou, qualquer pedido antigo que mude com isso, e qualquer
pedaço da loja que não troque para a campanha seguinte.

## Deve tentar

1. Antes de mexer: uma peça de M-G (marcada no Natal, agendada) na loja — preço de sempre, sem selo, fora de `/ofertas`
2. Tirar M-D da BF ("Nenhum") e conferir a loja; desligar a BF e conferir a loja; religar e conferir de novo —
   conferindo no painel que o preço cadastrado de M-D e M-A não mudou
3. Na aba da loja, M-A na sacola e o checkout aberto e preenchido; na aba do painel, "Encerrar agora" (com a
   confirmação); voltar à aba da loja e tentar finalizar — a loja mostra o total novo e pede nova confirmação, ou
   recusa com "Um desconto deste pedido mudou. Nada foi cobrado."; nunca grava o valor com desconto
4. Depois do fim: `/ofertas` vazia com `noindex` na cabeça da página, a Home sem o bloco, o pedido do CH-04 intacto
   no painel e na loja, e "Apagar" desligado com o motivo; então criar "Dia das Mães" e conferir selo, vitrine e bloco

## Edge cases sugeridos

- Mesma URL em duas abas (a edição da BF aberta em duas abas, encerrar numa)
- Recarregar o checkout logo depois do encerramento
- Voltar depois do sucesso de "Encerrar agora"
- Tentar criar "Dia das Mães" começando antes do instante do encerramento (deve ser recusado por cruzar)
- Duplo clique em "Encerrar agora"
- A sacola reaberta (fechar e reabrir a aba) depois do fim

## Fora do escopo

- Pagar o pedido (chave inválida no local); D-05 (pago depois do fim) já provado na Validation
- O cache de 5 minutos do HTML servido e o sitemap: não rodam no servidor de dev
- Apagar uma campanha sem pedido: só se sobrar orçamento, e nunca a Black Friday
- Os pedidos e o histórico do painel além do pedido do CH-04: não mudaram neste WI
