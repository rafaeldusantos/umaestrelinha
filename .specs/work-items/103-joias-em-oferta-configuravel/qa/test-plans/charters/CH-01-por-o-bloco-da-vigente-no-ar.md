# CH-01 · Pôr no ar o bloco da campanha em vigência

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-01 Adri                                                                   |
| Tour         | Feature                                                                       |
| Modo         | por cenário (J-01)                                                            |
| Time-box     | 90 min · orçamento: 70 ações                                                  |
| Mudança      | o editor do bloco ganha Conteúdo (título até 60, descrição até 160), Campanha (seletor) e Peças escolhidas (busca restrita à campanha, lista ordenável, teto 12); a linha do bloco diz campanha e estado; o bloco de hoje fica sem campanha até a dona escolher — CA-01.1, CA-01.2, CA-01.3, CA-01.4, CA-01.6, CA-02.1, CA-02.2, CA-02.3, CA-02.4, CA-03.1, CA-03.2, CA-03.3, CA-03.4, CA-03.5, CA-04.6, CA-05.1, RNF-01 |
| Viewport     | 1440 × 900 (painel); a loja de conferência em 390 × 844                       |
| Massa        | **altera** B-1 (campanha C-VIG, título, descrição, P-1..P-3 nesta ordem: P-3, P-1, P-2); põe P-4..P-10 só no rascunho e cancela; só lê C-VIG, C-AGE, C-ENC |
| Driver       | `—`                                                                           |
| Entrada      | `/admin/home` no painel (`:8083`) · logada como `admin-loja`; uma segunda aba na loja (`:8082`) **sem** login |
| Jornadas     | J-01                                                                          |
| TC           | TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-FUNC-006, TC-FUNC-007 — 8 TC em 70 ações |

## Missão

Confirmar que a dona, sozinha e sem ajuda, tira o bloco "Joias em oferta" do estado "sem campanha" em que a
atualização o deixou, escreve o título e a descrição, escolhe e ordena três peças da campanha em vigência,
confere na prévia e o vê na loja com as palavras e a ordem dela.

## Deve tentar

1. Antes de abrir o editor: ler a linha de B-1 e conferir a loja na outra aba (o bloco não está lá, e não sobra
   espaço vazio onde ele estava)
2. Escolher a campanha **antes** de escrever: a prévia com título e descrição vazios mostra o nome da campanha, a
   frase dos percentuais e as primeiras peças — depois escrever e ver a prévia mudar sem salvar
3. Procurar pelo nome uma peça que **não** está em "Dia das Mães" (uma da coleção de P-4 que não esteja marcada,
   ou uma peça só de "Natal") e ver que a busca não a oferece; escolher P-1, P-2, P-3 e procurar P-1 de novo
4. Depois de salvar com P-3, P-1, P-2: título com 61 caracteres, descrição com 161, e P-4..P-10 mais uma 13ª
   (se houver) — tentar salvar, ler a recusa, e **Cancelar** (B-1 fica como foi salvo)

## Edge cases sugeridos

- Enviar vazio: salvar com a campanha escolhida e título e descrição vazios (a recusa não pode exigir título)
- Colar de editor de texto: título com aspas curvas e travessão
- Duplo clique no Salvar
- Fora de ordem: escolher as peças antes de escrever o título
- Só teclado: subir e descer uma peça na lista sem arrastar
- Recarregar com o rascunho por salvar (o que o editor diz)
- Voltar do browser com alteração não salva

## Fora do escopo

- o editor de "Produtos em destaque" e os outros blocos da Home — o que se vir neles é backlog
- o cadastro de campanhas e a marcação de peças (WI 102)
- os blocos novos da bandeja (CH-04) e as peças que deixam de valer (CH-05)
- entrar na loja com a conta `admin-loja`
