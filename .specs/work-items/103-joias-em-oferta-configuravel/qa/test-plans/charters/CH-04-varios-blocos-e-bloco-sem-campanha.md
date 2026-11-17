# CH-04 · Um bloco por campanha: o novo, o da próxima, a colisão e a campanha apagada

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-01 Adri                                                                   |
| Tour         | Multi-Tab                                                                     |
| Modo         | por cenário (J-03, passos 1–6, e os ramos J-03a e J-03b)                       |
| Time-box     | 90 min · orçamento: 70 ações                                                  |
| Mudança      | "Joias em oferta" deixa de ser bloco único: a bandeja oferece outro, que nasce desligado e sem campanha; cada campanha só pode ter um bloco (a usada fica indisponível no seletor; a colisão de gravações é recusada com a mesma frase); campanha agendada tem aviso de prévia; campanha apagada deixa o bloco sem campanha — CA-01.5, CA-02.2, CA-02.3, CA-02.4, CA-02.5, CA-02.6, CA-05.2 |
| Viewport     | 1440 × 900 (painel); a loja de conferência em 390 × 844                       |
| Massa        | **cria** B-2 (bandeja → "Natal", título "Natal QA", 2 peças de "Natal") e B-3 (bandeja); **cria** C-X ("QA103 Ano Novo") e **apaga** C-X; só lê B-1 e C-VIG |
| Driver       | `—`                                                                           |
| Entrada      | `/admin/home` no painel (`:8083`) · logada como `admin-loja`; outra aba da loja (`:8082`) **sem** login |
| Jornadas     | J-03                                                                          |
| TC           | TC-FUNC-009, TC-FUNC-010, TC-FUNC-011, TC-FUNC-012, TC-FUNC-013, TC-FUNC-014 — 6 TC em 70 ações |

## Missão

Achar qualquer jeito de a Home ficar com dois blocos da mesma campanha, de um bloco sem campanha aparecer na loja,
ou de a dona perder o que escreveu quando outra aba grava antes — preparando o bloco da "Natal" como a dona faria.

## Deve tentar

1. **Bloco novo:** acrescentar "Joias em oferta" pela bandeja (B-2); ler a linha; ligar B-2 e ler a linha de novo;
   na loja, nada novo. Abrir B-2 e salvar sem campanha (recusa). No seletor, "Dia das Mães" indisponível com a
   posição e o título de B-1. Escolher "Natal": o aviso de prévia; a prévia sem B-2. Título "Natal QA", duas peças
   de "Natal", salvar. Ler a linha. Na loja, só B-1
2. **Colisão:** em `/admin/campanhas`, criar C-X "QA103 Ano Novo" — agendada, 26/12/2026 00:00 a 31/12/2026 23:59,
   10 %, ligada, sem peças. Acrescentar B-3 pela bandeja. **Aba A:** abrir o editor de B-3. **Aba B:** abrir o
   editor de B-2 (as duas listas de campanha carregadas depois de C-X existir). Aba A: escolher C-X e salvar. Aba
   B, **sem recarregar**: trocar "Natal" por C-X e salvar — ler a recusa e conferir que o rascunho de B-2 (título,
   campanha) continua na tela. Cancelar na aba B; B-2 continua "Natal"
3. **Campanha apagada:** em `/admin/campanhas`, apagar C-X. Voltar a `/admin/home`: a linha e o editor de B-3
   dizem que ele está sem campanha e pedem a escolha — comparar com o que B-2 dizia no passo 1. Na loja, nada
   mudou. **Deixar B-3 sem campanha** (o CH-06 o usa)

## Edge cases sugeridos

- Mesma URL em duas abas: o editor de B-2 aberto nas duas, salvar numa e recarregar a outra
- Duplo clique no Salvar da aba B
- Sair na aba A com o editor aberto na B
- Ligar e desligar B-3 sem campanha várias vezes (o interruptor é a única gravação otimista do painel)
- Remover B-3 pelo menu e desfazer pelo `confirm` (não remover — B-3 é massa do CH-06)
- Recarregar com o aviso de colisão na tela

## Fora do escopo

- o cadastro de campanhas além de criar e apagar C-X (recusas do cadastro são da WI 102)
- o bloco B-1 — não editar
- a virada no início da campanha (CH-06) e as peças que deixam de valer (CH-05)
- a recusa de desligar a última seção ativa da Home (pré-existente)
