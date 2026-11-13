# CH-05 · A dona encerra a campanha

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P1 |
| Persona      | PER-01 Adri |
| Tour         | Back-Button |
| Modo         | por cenário (J-05) |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | desligada, a faixa não existe e o cabeçalho volta ao topo; o atributo `data-faixa` da página servida decide a carga e a configuração decide depois da primeira troca de rota (UC-04, CA-05, CA-08, RN-02) |
| Viewport     | 390 × 844 e 1440 × 900 |
| Massa        | **altera**: desliga a faixa e, ao fim, **religa** — termina com o manifesto gravado como encontrou |
| Driver       | `agent-browser` — interceptar o documento HTML da loja e escrever `data-faixa` no `<html>`, como a função faz (Q-02, respondida): `network route` da URL exata de cada página (a Home, C1, `/checkout`) respondendo com o documento servido com o atributo, um arquivo por URL e valor (Ambiente da execução). Corpo fixo basta: este charter não atrasa resposta. Sonda no começo: a página roteada abre como página e `document.documentElement.dataset.faixa` lê o valor; se abrir como texto, `blocked` e o charter passa ao `cli` |
| Entrada      | `http://localhost:8083/admin/faixa-de-avisos` · logada como `admin-loja`; a loja numa segunda aba |
| Jornadas     | J-05 |
| TC           | TC-FUNC-009, TC-FUNC-010, TC-UI-003 |

## Missão

Confirmar que, ao desligar a faixa, a Adri vê a loja de sempre (sem vão, sem vaga ouro), que voltar e avançar entre páginas abertas antes e depois da troca nunca faz a página pular, e que religar devolve a campanha inteira.

## Deve tentar

1. Desligar e salvar; conferir a loja em três rotas e comparar com a referência (`:8092`) em 390 e em 1440.
2. Abrir a loja com o documento marcado como a página antiga (`"1"` com a faixa desligada; `"0"` com ela ligada), navegar, e usar voltar/avançar.
3. Religar e conferir que os quatro avisos voltaram.

## Edge cases sugeridos

- Voltar e avançar repetido entre a primeira página e a segunda
- Recarregar a primeira página depois de navegar
- Deep link direto para uma categoria com o documento marcado
- `/checkout` com o documento marcado `"1"`
- Abrir a mesma página da loja em duas abas, uma antes e outra depois de salvar

## Fora do escopo

- O prazo real de 5 min / 1 h e o `HIT` do cache: só no preview da Vercel (spec › Não resolvido)
- A Home servida pela função na Vercel: idem
- Montar avisos: CH-01; recusas: CH-04
- Agendamento por data (WI 102)
- Achado de CLS medido em rede lenta: CH-07 (aqui só se observa "pula / não pula", pelas entradas de `layout-shift`)
