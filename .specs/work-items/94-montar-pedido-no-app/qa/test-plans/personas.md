# Personas — 94 · Montar pedido no app do ateliê, com a leitura dos dados da cliente por IA

| ID     | Nome                              | Arquétipo                       | Conta               | Jornadas         | Charters                 |
| ------ | --------------------------------- | ------------------------------- | ------------------- | ---------------- | ------------------------ |
| PER-01 | Adri no WhatsApp                  | Usuário mobile                  | `admin-atelie`      | J-01, J-02       | CH-01, CH-02, CH-03, CH-09 |
| PER-02 | Adri interrompida                 | Usuário ocasional               | `admin-atelie`      | J-03, J-04       | CH-04, CH-06             |
| PER-03 | Adri com a fonte grande           | Usuário de tecnologia assistiva | `admin-atelie`      | J-01 (secundária), J-04 (secundária) | CH-08          |
| PER-04 | Adri no computador                | Usuário avançado                | `admin-atelie`      | J-05             | CH-07                    |
| PER-05 | Conta sem acesso ao ateliê        | Usuário ocasional (permissão restrita) | `cliente-sem-papel` | J-06       | CH-05                    |
| PER-06 | Juliana, a cliente que recebe o link | Novo usuário                 | `anonima`           | J-04 (secundária) | CH-06 (só a ponta da loja) |

**Não cobertas:** usuário em recuperação — o WI não corrige bug nem tela de falha anterior; os estados de
falha da montagem são cobertos pela PER-01 (CH-02) e pela PER-02 (CH-04). Leitor de tela real
(TalkBack) — o browser da sessão só simula pela árvore de acessibilidade e pelo teclado; vai a Fora da
cobertura no CH-08.

---

## PER-01 · Adri no WhatsApp — Usuário mobile

**Objetivo:** montar, no celular, o pedido que a cliente acertou na conversa do WhatsApp e mandar o link
de pagamento sem sair do aparelho.

**Contexto:** a Adri atende sozinha, entre uma peça e outra, com o celular na mão e a conversa aberta no
WhatsApp. Conhece o app do ateliê de uso diário (Pedidos, Clientes), mas a montagem é nova. Copia a
mensagem da cliente, cola no app, confere e manda. Muitas vezes com uma mão só.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | diária (com o app); nenhuma (com a montagem)              |
| Dispositivo   | celular — **390 × 844** (o alvo do projeto)               |
| Rede          | instável (4G de rua)                                      |
| Modalidade    | toque                                                     |
| Locale        | pt-BR                                                     |
| Paciência     | 60 s por passo até desistir e voltar ao painel no computador |
| Conta         | `admin-atelie` · credencial `QA_ADMIN_ATELIE_USUARIO` / `QA_ADMIN_ATELIE_SENHA` |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. O teclado virtual cobre a barra fixa com o total e o botão "Continuar", e ela não vê por que não segue
2. O texto colado do WhatsApp (emoji, quebras de linha, "Oi Adri!!", endereço em duas mensagens) é lido
   pela metade ou no campo errado, e a marca "Lido do texto — confira." passa despercebida
3. Os chips de variação e a foto pequena não deixam conferir qual peça vai, e ela escolhe a variação errada

**Superfícies:** Pedidos › "Montar pedido"; a montagem (4 passos); a folha "Colar texto"; a folha da
variação; o pedido montado recém-criado.

---

## PER-02 · Adri interrompida — Usuário ocasional

**Objetivo:** não perder a montagem quando o celular bloqueia ou uma ligação a tira da tela, e dias depois
reabrir o pedido montado para mandar o link de novo.

**Contexto:** monta alguns pedidos por semana, sempre interrompida — cliente que responde depois de horas,
o processo do app encerrado pelo Android em segundo plano. Usa o voltar do Android como navegação
principal. Volta ao pedido montado quando a cliente diz "perdi o link".

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | ocasional                                                 |
| Dispositivo   | celular — 390 × 844                                       |
| Rede          | instável                                                  |
| Modalidade    | toque, com o voltar do sistema                            |
| Locale        | pt-BR                                                     |
| Paciência     | 45 s — se a montagem sumiu, desiste e monta de novo no painel |
| Conta         | `admin-atelie` · `QA_ADMIN_ATELIE_USUARIO` / `QA_ADMIN_ATELIE_SENHA` |

**O que pode atrapalhá-la:**

1. O voltar do Android sai da montagem inteira em vez de recuar um passo, ou fecha sem perguntar
2. O rascunho volta pela metade (sem o cupom, com a peça errada) ou volta com dado da cliente que não
   devia estar no aparelho
3. Ao reabrir o pedido montado dias depois, o link não está lá e ela acha que precisa gerar outro

**Superfícies:** a montagem (voltar, sair, rascunho); Pedidos › Montados; o pedido montado.

---

## PER-03 · Adri com a fonte grande — Usuário de tecnologia assistiva

**Objetivo:** montar e mandar o pedido com a fonte do sistema aumentada, sem conteúdo cortado nem botão
fora de alcance.

**Contexto:** usa a fonte do Android em 130 % no dia a dia e 200 % à noite. É a mesma Adri, nas mesmas
telas — o que muda é o tamanho do texto e o uso da árvore de acessibilidade para conferir anúncios.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | diária                                                    |
| Dispositivo   | celular — 390 × 844, fonte a 130 % e 200 %                |
| Rede          | rápida                                                    |
| Modalidade    | toque + só-teclado (simulação pela árvore de acessibilidade) |
| Locale        | pt-BR                                                     |
| Paciência     | 60 s                                                      |
| Conta         | `admin-atelie` · `QA_ADMIN_ATELIE_USUARIO` / `QA_ADMIN_ATELIE_SENHA` |

**O que pode atrapalhá-la:**

1. A barra fixa (motivo + total + botão) cresce em várias linhas e cobre o campo que ela está editando
2. O chip "Montados · N abertos" e os três botões empilhados da folha de sair ficam cortados ou rolam de lado
3. O motivo do botão desligado, a marca "Lido do texto — confira." e os toasts não são anunciados

**Superfícies:** as mesmas da PER-01 e da PER-02, sob fonte grande.

---

## PER-04 · Adri no computador — Usuário avançado

**Objetivo:** abrir no painel um pedido montado (pelo app ou pelo painel), copiar o link de novo sem gerar
outro, renovar o que venceu, e montar com o endereço salvo no cadastro da cliente.

**Contexto:** usa o painel no computador do ateliê todo dia, com várias abas abertas. Já montava pedido no
painel desde a feature 89; o que muda é o link sempre disponível e o endereço gravado pela function.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | diária                                                    |
| Dispositivo   | desktop — 1440 × 900 (o secundário do projeto)            |
| Rede          | rápida                                                    |
| Modalidade    | mouse-teclado                                             |
| Locale        | pt-BR                                                     |
| Paciência     | 20 s para qualquer lentidão                               |
| Conta         | `admin-atelie` · `QA_ADMIN_ATELIE_USUARIO` / `QA_ADMIN_ATELIE_SENHA` |

**O que pode atrapalhá-la:**

1. O cartão do link ainda pede "Gerar link novo" num pedido aberto, e gerar mata o link que a cliente já tem
2. "Renovar" some quando ela queria dar mais prazo a um pedido aberto (agora só depois de vencer)
3. Marca "Salvar no cadastro da cliente" e o endereço não aparece na ficha, ou aparece duplicado

**Superfícies:** painel › Pedidos montados › pedido montado; painel › montagem (endereço).

---

## PER-05 · Conta sem acesso ao ateliê — Usuário ocasional, permissão restrita

**Objetivo:** perceber que entrou com a conta errada (a de cliente da loja) e trocar para a do ateliê sem
que nada de cliente apareça para essa conta.

**Contexto:** alguém (às vezes a própria Adri, com o e-mail pessoal) entra no app instalado com uma conta
que compra na loja mas não administra. Abre um link interno salvo (montagem, pedido montado).

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | ocasional                                                 |
| Dispositivo   | celular — 390 × 844                                       |
| Rede          | rápida                                                    |
| Modalidade    | toque                                                     |
| Locale        | pt-BR                                                     |
| Paciência     | 30 s                                                      |
| Conta         | `cliente-sem-papel` — conta autenticada da loja, sem papel de admin · `QA_CLIENTE_SEM_PAPEL_USUARIO` / `QA_CLIENTE_SEM_PAPEL_SENHA` |

**O que pode atrapalhá-la:**

1. A tela fica em "carregando" sem fim, ou pisca um nome de cliente antes da recusa
2. A folha "Colar texto" ou a cotação respondem como se fosse falha de rede em vez de recusa
3. Não há caminho claro para sair e entrar com a conta certa

**Superfícies:** `/pedidos/montar`, `/pedidos?visao=montados`, `/pedidos/montados/<id>`.

---

## PER-06 · Juliana, a cliente que recebe o link — Novo usuário

**Objetivo:** abrir o link que a Adri mandou (às vezes reenviado dias depois), ver as peças e o preço
combinados e concluir.

**Contexto:** acabou de perder alguém e encomendou uma joia afetiva pela conversa. Nunca usou a loja.
Recebe o link no WhatsApp e abre no celular. Entra só para conferir a ponta da loja das jornadas da Adri.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | nenhuma                                                   |
| Dispositivo   | celular — 390 × 844                                       |
| Rede          | lenta                                                     |
| Modalidade    | toque                                                     |
| Locale        | pt-BR                                                     |
| Paciência     | 60 s                                                      |
| Conta         | `anonima`                                                 |

**O que pode atrapalhá-la:**

1. O link reenviado abre "não disponível" porque a Adri gerou um novo sem querer
2. O preço no link diverge do que a Adri escreveu na conversa
3. Não entende que precisa escolher a entrega no link (a Adri não informou o endereço)

**Superfícies:** loja › `/pedido-montado#<token>` (só abrir e conferir; o checkout é da feature 89).
