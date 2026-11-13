# CH-02 · Recusas do cadastro e a edição em massa

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P1 |
| Persona      | PER-01 Adri |
| Tour         | Garbage |
| Modo         | por técnica — valor limite e transição de estado |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | as recusas do cadastro da campanha (CA-02, CA-14), a recusa de tirar percentual em uso (CA-08), a seção de campanha da edição em massa e o Desfazer dela (que devolve também as marcações — Q-01 (A)), o filtro da lista de produtos pela campanha e "Ver as peças" (R-01), e as telas de campanhas em 390 (CA-15) |
| Viewport     | 1440 × 900; as três telas de campanhas também em 390 × 844 |
| Massa        | **cria** a campanha "Natal" (01/12/2026 00:00 a 24/12/2026 23:59, 10 e 15 %, ligada — Agendada); **altera** só as marcações de M-G (15 % no Natal, em lote). Para o Desfazer, marca **uma** peça de M-G com 10 % na Black Friday e desfaz na mesma hora — ao sair, essa peça tem de estar sem marcação na Black Friday. Não edita a campanha Black Friday: toda tentativa contra ela tem de ser recusada; não salve nada nela |
| Driver       | — |
| Entrada      | `http://localhost:8083/admin/campanhas/nova` · logada como `admin-loja`; Black Friday em vigência (do CH-01) |
| Jornadas     | J-02 |
| TC           | TC-FUNC-002, TC-FUNC-010, TC-FUNC-021, TC-UI-004 |

## Missão

Como a dona com pressa, achar qualquer entrada no cadastro de campanha que grave sem motivo ou recuse sem dizer
por quê, qualquer jeito de a marcação em lote numa campanha agendada aparecer na loja antes da hora, e qualquer
lote que o Desfazer não devolva por inteiro.

## Deve tentar

1. Em "Nova campanha", provocar cada recusa uma de cada vez: fim antes do início no **mesmo dia** (por hora),
   percentual 0, 80, repetido, nenhum percentual, sexto percentual, texto do selo com 15 caracteres, cores sem
   contraste (ex.: #777777 e #999999) e hex inválido, vigência cruzando a Black Friday — conferindo o motivo
   literal e o Salvar desligado, e que nada aparece na lista depois
2. Criar "Natal" sem cruzar; marcar M-G em lote com 15 % no Natal; filtrar a lista por "Natal" e por "15 %"
3. Em "Natal", tentar tirar o 15 % e seguir o link "Ver as peças com 15%"
4. Desfazer da edição em massa (TC-FUNC-021, variações "Desfazer"): aplicar Natal → 10 % sobre M-G e desfazer —
   as peças voltam a 15 % na lista do painel; depois marcar uma peça de M-G com 10 % na Black Friday e desfazer —
   a peça volta a sem campanha no painel e, na loja, ao preço de sempre, sem faixa e fora de `/ofertas`. O Desfazer
   que deixa a marcação de campanha no lugar é bug (Q-01 respondida (A), 2026-11-13)
5. Abrir a lista de campanhas, a nova e a edição em 390 × 844 e procurar rolagem lateral

## Edge cases sugeridos

- Colar de editor de texto no nome e no texto do selo (aspas curvas, travessão)
- Colar o hex com espaço ou em minúsculas
- Enviar vazio (nome vazio)
- Duplo clique em "Adicionar" percentual e em "Aplicar" da edição em massa
- Desfazer depois de recarregar a página, ou depois de o aviso sumir
- Fora de ordem: preencher vigência antes do nome
- Recarregar durante a aplicação do lote

## Fora do escopo

- O cadastro feliz da Black Friday e o campo da peça (CH-01)
- A loja — exceto conferir rapidamente que uma peça de M-G **não** aparece em `/ofertas` (isso é do CH-06) e a
  peça do Desfazer na Black Friday (passo 4)
- Edição em massa de outros campos (preço, estoque, categoria): a mudança não os toca — o que se vir ali é sugestão de backlog
- A promoção progressiva e os cupons do painel (telas vizinhas)
