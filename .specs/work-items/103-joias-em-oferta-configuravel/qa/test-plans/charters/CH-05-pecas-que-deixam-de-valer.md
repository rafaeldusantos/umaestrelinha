# CH-05 · Peças escolhidas que deixam de valer, e a troca de campanha

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-01 Adri                                                                   |
| Tour         | Interrupt                                                                     |
| Modo         | por técnica — transição de estado (a peça muda enquanto a dona está fora do editor) |
| Time-box     | 90 min · orçamento: 70 ações                                                  |
| Mudança      | peça escolhida tirada da campanha, despublicada, apagada ou que a campanha não barateia some do bloco sem substituta; o painel conta e nomeia; ao abrir, o editor tira as que saíram da campanha (ou foram apagadas) e abre alterado, e não tira nada se não conseguir ler a campanha; trocar a campanha tira as peças que a nova não tem — CA-03.6, CA-04.1, CA-04.2, CA-04.3, CA-04.4, CA-04.5, CA-04.6 |
| Viewport     | 1440 × 900 (painel); a loja de conferência em 390 × 844                       |
| Massa        | **altera** B-1 (acrescenta P-TIRA, P-FORA, P-APAG, P-NB depois de P-3, P-1, P-2); **tira** P-TIRA de C-VIG (não devolve); **despublica** P-FORA e **republica no fim**; **apaga** P-APAG; só lê P-NB, P-AMBAS, C-AGE |
| Driver       | `—` (precisa de bloqueio de rota por padrão de URL)                            |
| Entrada      | `/admin/home` no painel (`:8083`) · logada como `admin-loja`; outra aba da loja (`:8082`) **sem** login — nunca entre na loja com a conta de admin (ela enxerga peça despublicada, D-04) |
| Jornadas     | J-04                                                                          |
| TC           | TC-FUNC-015, TC-FUNC-016, TC-FUNC-017, TC-FUNC-018, TC-FUNC-019, TC-FUNC-020 — 6 TC em 70 ações |

## Missão

Achar qualquer jeito de a cliente ver no bloco uma peça que não está mais em oferta, de a loja completar a vaga
com uma peça que a dona não escolheu, ou de a dona perder a curadoria sem aviso quando uma peça muda fora do
editor.

## Deve tentar

1. Em B-1, acrescentar P-TIRA, P-FORA, P-APAG e P-NB e salvar. Ler o que o editor e a linha dizem de P-NB; na loja,
   contar as peças da fileira
2. Sair do editor; na aba Preço e estoque de P-TIRA, tirá-la de "Dia das Mães". Na loja: P-TIRA sumiu, ninguém
   entrou no lugar. Reabrir B-1: o que o editor diz e se abre como alterado; **salvar**
3. Despublicar P-FORA e apagar P-APAG (em `/admin/produtos`). Na loja, as duas somem. Na lista da Home, a linha de
   B-1; no editor, como cada uma é nomeada. Salvar se o editor abrir alterado
4. Bloquear `**/rest/v1/product_campaigns*` e abrir B-1: o que sai da lista e o que o editor diz. **Tirar o
   bloqueio**, Cancelar
5. No rascunho de B-1, remover P-1, P-2 e P-3 (sobram só as que não valem): a prévia. Cancelar
6. No rascunho de B-1, trocar "Dia das Mães" por "Natal": quais peças saem, quais ficam (P-AMBAS), o que o editor
   diz; Cancelar e conferir que voltou tudo; na loja, nada mudou
7. Republicar P-FORA

## Edge cases sugeridos

- Fechar a aba do editor com a remoção pendente e reabrir (a pendência volta?)
- Ir para outra página com o editor alterado e voltar
- Trocar a campanha duas vezes seguidas (Dia das Mães → Natal → Dia das Mães) antes de Cancelar
- Recarregar o editor logo depois de tirar a peça da campanha noutra aba
- Voltar do browser a partir do editor alterado

## Fora do escopo

- a aba Preço e estoque, a edição em massa e a publicação de produto como comportamento (WI 102 e anteriores)
- peça despublicada visível com sessão de admin na loja (D-04)
- a peça tirada da campanha na **linha** do bloco (a fonte não pede; ver 🟡 do plano)
- B-2 e B-3
