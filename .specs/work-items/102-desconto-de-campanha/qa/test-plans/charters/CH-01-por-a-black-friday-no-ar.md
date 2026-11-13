# CH-01 · Pôr a Black Friday no ar

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-01 Adri |
| Tour         | Feature |
| Modo         | por cenário (J-01) |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | o item **Campanhas** no grupo Descontos, a lista e o cadastro da campanha (CA-01, CA-14 padrão), o cartão da campanha na aba **Preço e estoque** do produto com a prévia por variação (CA-01, CA-03, CA-05, CA-06), e o bloco "Joias em oferta" na bandeja da Home (R-04) |
| Viewport     | 1440 × 900 (a dona no ateliê); a lista conferida também em 390 × 844 |
| Massa        | **cria** a campanha "Black Friday" (13/11/2026 00:00 a 30/11/2026 23:59, 10/15/20, ligada, preto e ouro); **altera** as marcações: M-A 20 %, M-B 15 %, M-C 10 %, M-D 20 %; **cria** e liga o bloco "Joias em oferta" em `/admin/home`. Não toca em mais nada |
| Driver       | — |
| Entrada      | `http://localhost:8083/admin` · logada como `admin-loja`, nenhuma campanha cadastrada |
| Jornadas     | J-01 |
| TC           | TC-FUNC-001, TC-FUNC-003, TC-JOURNEY-003 |

## Missão

Como a dona, pôr a Black Friday no ar sozinha — cadastro, marcação das quatro peças e o bloco da Home — e chegar
à loja vendo as peças em oferta, procurando qualquer ponto em que a tela diga uma coisa e grave outra (data, hora,
percentual, preço).

## Deve tentar

1. Cadastrar a campanha exatamente com a vigência do manifesto, conferindo na lista que "Termina em 30/11 23:59" virou
   "13/11 a 30/11/2026" e o estado "Em vigência" — e reabrir a edição para ver se a hora voltou como foi digitada
2. Digitar o nome antes do texto do selo e ver o texto do selo acompanhar os 14 primeiros caracteres; olhar a prévia
   de 173 px mudar com o maior percentual
3. Marcar M-C (com "de/por") e conferir na tabela por variação o menor entre o "por" de hoje e o "de" com 10 %
4. Ligar o bloco "Joias em oferta" e abrir `/ofertas` e a Home na loja (`http://localhost:8082`) para fechar a jornada

## Edge cases sugeridos

- Recarregar durante o salvar da campanha
- Duplo clique em Salvar
- Voltar no meio do formulário da campanha e retornar
- Voltar depois do sucesso (lista → editar → voltar)
- Sair da aba de preço com o percentual escolhido e sem salvar
- Mesma campanha aberta em duas abas (só ler a segunda)

## Fora do escopo

- As recusas do cadastro (CH-02) — se aparecer uma recusa no caminho feliz, registre e siga
- Edição em massa, filtro da lista de produtos e a campanha "Natal" (CH-02)
- O resto do formulário do produto (fotos, SEO, variações, fornecedor) e o resto da bandeja da Home: a mudança
  não os toca — o que se vir ali é sugestão de backlog
- Cupons e Promoções: telas vizinhas, não mudam neste WI
- Encerrar, desligar e apagar a campanha (CH-06) — **não** encerre nem desligue a Black Friday: os lotes seguintes dependem dela
