# Personas — 103 · Joias em oferta configurável

| ID     | Nome   | Arquétipo                       | Conta        | Jornadas         | Charters                               |
| ------ | ------ | ------------------------------- | ------------ | ---------------- | -------------------------------------- |
| PER-01 | Adri   | usuário avançado                | `admin-loja` | J-01, J-03, J-04 | CH-01, CH-04, CH-05, CH-06, CH-07, CH-08 |
| PER-02 | Marina | usuário mobile (primeira visita) | `anonima`    | J-02             | CH-02                                  |
| PER-03 | Adri, conferindo a loja | usuário ocasional | `admin-loja` | J-05     | CH-03                                  |

**Não cobertas:** usuário de tecnologia assistiva — sem persona própria: rótulos, alerta, teclado e fonte a 200 %
(RNF-04, RNF-08) são categorias do CFR (CH-07) nas duas superfícies; leitor de tela real fica fora (o browser da
sessão só simula pela árvore de acessibilidade). Usuário em recuperação — melhoria nova, sem falha anterior de
usuário. Novo usuário no painel — só a dona administra, e todo dia.

**Conta `admin-loja`:** a conta com papel de admin do Supabase local (a do `seed.sql`, a mesma da WI 102), que
entra no painel e — só no CH-03 — na loja. Credencial `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA`; a thread diz
onde está. Na loja, o login é por código de 6 dígitos (cai no Mailpit) ou por senha.

---

## PER-01 · Adri — usuário avançado (dona do ateliê)

**Objetivo:** pôr no bloco "Joias em oferta" da Home as palavras dela e as peças que ela escolheu da campanha que
está valendo, e deixar pronto o bloco da próxima campanha para ele entrar sozinho quando ela começar.

**Contexto:** faz tudo sozinha, entre uma peça e outra no ateliê em Porto Alegre. Usa o painel todo dia no
notebook e conhece o editor de "Produtos em destaque". Já cadastrou as campanhas na WI 102 e marcou as peças.
Até hoje o bloco se montava sozinho com o nome da campanha e as quatro primeiras peças — ela quer escolher. Não
quer descobrir pela cliente que o bloco sumiu ou que mostrou a peça errada.

| Atributo      | Valor |
| ------------- | ----- |
| Familiaridade | diária |
| Dispositivo   | desktop (1440 × 900); a prévia do painel alterna Celular 390 × 844 e Computador 1024 × 768 |
| Rede          | rápida |
| Modalidade    | mouse-teclado |
| Locale        | pt-BR, horário de Brasília |
| Paciência     | 30 s para uma gravação; zero para "salvou?" sem resposta |
| Conta         | `admin-loja` · credencial `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA` |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. Abrir a Home do painel depois da atualização e o bloco de hoje estar "sem campanha", fora da loja, sem ela ter
   mexido — e não entender o que fazer
2. Procurar uma peça na busca do bloco e ela "não existir" porque não está marcada na campanha, sem a tela dizer
   por quê
3. Escolher uma campanha agendada, olhar a prévia, não ver o bloco e achar que não salvou

**Superfícies:** `/admin/home` (lista, bandeja, prévia), o editor do bloco em `/admin/home/<id>`, e — para montar a
massa — `/admin/campanhas` e a aba **Preço e estoque** de `/admin/produtos`. A loja, numa aba sem login, para
conferir.

## PER-02 · Marina — usuário mobile (primeira visita)

**Objetivo:** achar pelo celular, na Home, uma joia em oferta que faça sentido para ela e entender quanto vai
pagar antes de decidir.

**Contexto:** viu a campanha da loja num story do Instagram, à noite, com o bebê no colo. Nunca abriu a loja.
Celular, uma mão, rede de casa razoável — às vezes lenta. Lê pouco: o título e a descrição do bloco são o que a
fazem descer ou sair.

| Atributo      | Valor |
| ------------- | ----- |
| Familiaridade | nenhuma |
| Dispositivo   | celular (390 × 844); confere depois no computador (1440 × 900) |
| Rede          | rápida, às vezes lenta |
| Modalidade    | toque |
| Locale        | pt-BR |
| Paciência     | 60 s confusa, sai |
| Conta         | `anonima` |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. A fileira de peças rolar de lado sem ela perceber que há mais, ou empurrar a página para o lado
2. A Home "pular" quando as peças chegam e ela tocar no lugar errado
3. Não ligar o título do bloco ao desconto (o selo e os cartões de percentual longe do título)

**Superfícies:** Home (bloco "Joias em oferta"), página da peça, `/ofertas` (pelo "Ver todas").

## PER-03 · Adri, conferindo a loja — usuário ocasional

**Objetivo:** olhar a loja pelo celular, logada com a conta dela, e ter certeza de que a vitrine mostra só a
campanha que está valendo hoje — nada da "Natal" que ela já deixou agendada.

**Contexto:** a mesma dona, fora do ateliê, entre uma entrega e outra. Usa a loja de vez em quando, sempre logada
(a sessão fica aberta no celular). Se vê o desconto do Natal na Home em novembro, acha que a campanha entrou antes
da hora e vai mexer no cadastro — quando o problema é só o que a sessão dela enxerga.

| Atributo      | Valor |
| ------------- | ----- |
| Familiaridade | ocasional (na loja) |
| Dispositivo   | celular (390 × 844) |
| Rede          | rápida |
| Modalidade    | toque |
| Locale        | pt-BR, horário de Brasília |
| Paciência     | 60 s — desconfia ao primeiro preço que não bate |
| Conta         | `admin-loja` (na loja e no painel) · credencial `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA` |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. Ver o selo ou o preço da "Natal" numa peça que ela já marcou para dezembro
2. Ver numa peça o desconto da "Black Friday" que já acabou
3. A prévia do painel mostrar uma coisa e a loja logada outra

**Superfícies:** Home, página da peça, `/ofertas`, sacola — antes e depois de entrar na loja —, e a prévia de
`/admin/home`.
