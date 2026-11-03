# Personas — WI-01 · Compre Junto na página do produto

| ID     | Nome   | Arquétipo                       | Conta          | Jornadas               | Charters               |
| ------ | ------ | ------------------------------- | -------------- | ---------------------- | ---------------------- |
| PER-01 | Marina | Usuária mobile                  | `anonima`      | J-01, J-02             | CH-01, CH-02           |
| PER-02 | Adri   | Usuária avançada (dona do ateliê) | `admin-painel` | J-03, J-04, J-06      | CH-03, CH-04, CH-08    |
| PER-03 | Helena | Usuária de tecnologia assistiva | `anonima`      | J-01 (sec.), J-04 (sec.) | CH-06, CH-07         |
| PER-04 | Sônia  | Usuária ocasional               | `anonima`      | J-02 (sec.), J-05      | CH-05                  |

**Não cobertas:**

- **Novo usuário em computador** — o caso principal da loja é o celular (~90% dos acessos, `CLAUDE.md` › Convenções); a primeira visita é coberta por PER-01 no celular, e o computador entra por PER-03 e PER-04.
- **Usuária em recuperação** — não há bug anterior neste Work Item (`bugs_abertos: nenhum`); a continuidade da sacola de antes da mudança fica com PER-04.
- **Leitor de tela real** (VoiceOver, TalkBack) — fora do browser da sessão; PER-03 é simulada por teclado, zoom e árvore de acessibilidade.

---

## PER-01 · Marina — Usuária mobile

**Objetivo:** levar o pingente com as cinzas da mãe e uma corrente para usá-lo, montando o conjunto sem sair da página do produto.

**Contexto:** abre a loja pelo celular, à noite, a partir de um link do Instagram. Nunca comprou aqui. Está fragilizada e com pouca paciência para telas confusas; quer resolver em poucos toques e compra como convidada, sem criar conta, pagando com PIX.

| Atributo      | Valor                                       |
| ------------- | ------------------------------------------- |
| Familiaridade | nenhuma                                     |
| Dispositivo   | celular (390 × 844 — o alvo do projeto)     |
| Rede          | rápida, com momentos lentos                 |
| Modalidade    | toque                                       |
| Locale        | pt-BR                                       |
| Paciência     | 60 s confusa numa tela até desistir; ~4 min da página do produto ao pedido |
| Conta         | `anonima` — compra como convidada; não precisa de credencial |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. Marca a corrente e toca a barra fixa sem ter escolhido o comprimento; não percebe qual escolha falta, porque o adicional incompleto está acima da dobra.
2. O total do conjunto na barra fixa ("Conjunto · N peças") não bate com o que ela acha que marcou, ou não mostra o PIX que ela viu na página.
3. Com três adicionais e nomes longos, o bloco empurra o conteúdo, cria rolagem lateral ou deixa controles pequenos demais para o dedo.

**Superfícies:** `/produtos/:slug` (bloco Compre Junto, barra fixa), gaveta da sacola, `/carrinho`, `/checkout`, `/pedido/:id/pagamento`, `/pedido/:id`.

---

## PER-02 · Adri — Usuária avançada (dona do ateliê)

**Objetivo:** montar uma vez a lista "Correntes", oferecê-la nos pingentes certos, escolher como o bloco aparece na loja e acompanhar se as clientes levam o conjunto.

**Contexto:** usa o painel todos os dias no notebook, com a loja aberta em outra aba para conferir. Conhece o catálogo de cor; tem pouca paciência para lentidão e muita para refazer algo bem feito. Edita várias joias em sequência.

| Atributo      | Valor                                       |
| ------------- | ------------------------------------------- |
| Familiaridade | diária                                      |
| Dispositivo   | desktop (1440 × 900); confere o índice e a adesão também em 390 |
| Rede          | rápida                                      |
| Modalidade    | mouse-teclado, várias abas                  |
| Locale        | pt-BR                                       |
| Paciência     | ~10 s para uma gravação; zero para tela que perde o que ela montou |
| Conta         | `admin-painel` — papel `admin` do painel · credencial `QA_ADMIN_PAINEL_USUARIO` / `QA_ADMIN_PAINEL_SENHA` (o usuário de desenvolvimento do `supabase/seed.sql` do worktree, seção 5 — só no Supabase local) |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. Acrescenta a 13ª peça ou o 4º adicional e não entende por que não entrou, ou perde o que estava montando.
2. Edita a lista numa aba e a loja aberta na outra continua mostrando a ordem ou as peças antigas.
3. Tenta apagar uma lista em uso e não sabe em quais joias ela está; ou não percebe que uma peça "saiu do ar".

**Superfícies:** `/admin/compre-junto` (Listas, forma do bloco), `/admin/compre-junto/listas/nova` e `/admin/compre-junto/listas/:id`, `/admin/produtos/:id/editar` (aba "Compre junto"), `/admin/compre-junto/adesao`, a página do pedido no painel, a loja em outra aba.

---

## PER-03 · Helena — Usuária de tecnologia assistiva

**Objetivo:** escolher um pingente de dente de leite para o filho e a corrente que combina, usando só o teclado e o zoom do navegador.

**Contexto:** tem baixa visão e navega no notebook com zoom de 200% e teclado; não usa mouse. Já desistiu de lojas em que o foco some ou o que mudou na tela não é anunciado.

| Atributo      | Valor                                       |
| ------------- | ------------------------------------------- |
| Familiaridade | ocasional                                   |
| Dispositivo   | desktop (1440 × 900) com zoom 200% (equivale a ~720 px de largura); confere também 390 × 844 com fonte a 200% |
| Rede          | rápida                                      |
| Modalidade    | só-teclado (árvore de acessibilidade como leitor de tela simulado) |
| Locale        | pt-BR                                       |
| Paciência     | presa à tarefa, ~120 s num passo; desiste se o foco se perde ou o anúncio é incompreensível |
| Conta         | `anonima` — não precisa de credencial       |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. A caixa de cada adicional não diz qual peça e qual variação ela leva ("Levar junto: …"), e ela não sabe o que marcou.
2. Na forma "Em folha", o foco não vai ao título ao abrir, Esc não fecha ou o foco não volta ao controle de origem.
3. Ao tentar levar o conjunto com escolha faltando, a mensagem não é anunciada e o foco não vai ao adicional incompleto.

**Superfícies:** `/produtos/:slug` (bloco nas três formas, CTA da coluna de informação), gaveta da sacola.

---

## PER-04 · Sônia — Usuária ocasional

**Objetivo:** voltar à loja, onde deixou uma corrente na sacola semana passada, e completar o conjunto com o pingente da neta, sem perder o que já tinha escolhido.

**Contexto:** compra de vez em quando; começou no celular e termina no notebook de casa. Deixou a sacola cheia antes da mudança e volta depois do deploy. Fecha a aba no meio e reabre; usa o voltar do navegador como navegação.

| Atributo      | Valor                                       |
| ------------- | ------------------------------------------- |
| Familiaridade | ocasional                                   |
| Dispositivo   | desktop (1440 × 900); confere a sacola também em 390 × 844 |
| Rede          | rápida                                      |
| Modalidade    | mouse-teclado                               |
| Locale        | pt-BR                                       |
| Paciência     | moderada, ~90 s num passo                   |
| Conta         | `anonima` — compra como convidada; para ver o pedido em Minha Conta entra por código no e-mail da compra (o e-mail cai no Mailpit local, :54444); sem credencial fixa |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. A sacola de antes da mudança volta vazia ou com a corrente duplicada.
2. Leva pelo conjunto a mesma corrente que já estava na sacola e aparecem duas linhas, ou a linha não diz que acompanha o pingente.
3. Remove o pingente da sacola e a corrente continua dizendo "acompanha", ou some junto.

**Superfícies:** `/produtos/:slug`, gaveta da sacola, `/carrinho`, `/checkout`, `/pedido/:id`, `/conta`.
