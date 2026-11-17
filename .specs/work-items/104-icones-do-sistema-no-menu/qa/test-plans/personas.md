# Personas — 104 · Ícones do sistema e cor do texto no Menu da loja

| ID     | Nome   | Arquétipo   | Conta                         | Jornadas   | Charters   |
| ------ | ------ | ----------- | ----------------------------- | ---------- | ---------- |
| PER-01 | Adri, a dona | usuário ocasional | `admin` | J-01 | CH-01, CH-02, CH-05 |
| PER-02 | Cliente no celular | usuário mobile | `anonima` | J-02 | CH-03 |
| PER-03 | Cliente no computador | novo usuário | `anonima` | J-03 | CH-04 |

**Não cobertas:** usuário de tecnologia assistiva com leitor de tela real — fora do browser da sessão; o CFR (CH-05) simula por teclado e árvore de acessibilidade. Usuário avançado em várias abas do painel — o conflito por `updated_at` é pré-existente e a mudança não o toca.

---

## PER-01 · Adri, a dona — usuário ocasional

**Objetivo:** dar ao item que leva às ofertas um ícone comercial (etiqueta, porcentagem, presente) e uma cor de rótulo que se destaque e que a cliente consiga ler, no computador e no celular.

**Contexto:** no notebook, entre uma encomenda e outra, preparando a vitrine de uma campanha. Monta o menu poucas vezes por mês; conhece a tela `/admin/menu` e os ícones da marca, não conhece contraste nem código hex — escolhe a cor pelo olho, no seletor de cor.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | ocasional                                                 |
| Dispositivo   | desktop (1440 × 900 — o alvo do projeto)                  |
| Rede          | rápida                                                    |
| Modalidade    | mouse-teclado                                             |
| Locale        | pt-BR                                                     |
| Paciência     | 120 s até desistir de uma escolha                         |
| Conta         | `admin` · credencial `QA_ADMIN_USUARIO` / `QA_ADMIN_SENHA` |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. O grupo "Do sistema" fica abaixo da dobra da grade que rola, e ela acha que os ícones novos não existem
2. A cor que ficou bonita na barra escura é recusada na lista branca, e ela não entende por que há dois campos nem o que a medida quer dizer
3. Depois de Salvar não fica claro se gravou — a prévia não mostra a cor, ou mostra uma coisa e a loja outra

**Superfícies:** `/admin/menu` — seletor de ícone, editor do item principal ("Cor do texto"), prévia ao lado; a loja, para conferir o resultado; Configurações › Dados da loja › "Perfil de estilo da loja" (só em CH-02).

## PER-02 · Cliente no celular — usuário mobile

**Objetivo:** abrir o menu e chegar à página que procura (as ofertas, uma coleção) com uma mão, sem errar o toque.

**Contexto:** no ônibus, pelo celular — ≈90% dos acessos da loja. Chegou à loja por um link e abriu o menu para procurar; nunca viu o menu antes.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | nenhuma                                                   |
| Dispositivo   | celular (390 × 844 — o alvo do projeto)                   |
| Rede          | rápida (ambiente local)                                   |
| Modalidade    | toque                                                     |
| Locale        | pt-BR                                                     |
| Paciência     | 30 s até fechar o menu                                    |
| Conta         | `anonima` · sem credencial                                |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. O rótulo colorido parece outra coisa (link visitado, aviso, item desabilitado) ou fica difícil de ler no branco
2. O ícone novo, desalinhado ou de tamanho diferente dos da marca, empurra o rótulo e o alvo de toque encolhe abaixo de 44 px
3. No item com submenu, o rótulo colorido não deixa claro que abre um acordeão (a pista é o chevron)

**Superfícies:** a folha do menu do celular (link direto e acordeão).

## PER-03 · Cliente no computador — novo usuário

**Objetivo:** achar o departamento que procura pela barra do topo, na primeira visita.

**Contexto:** no computador de casa, chegou pela busca; passa o mouse pela barra para ver o que a loja tem.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | nenhuma                                                   |
| Dispositivo   | desktop (1440 × 900)                                      |
| Rede          | rápida                                                    |
| Modalidade    | mouse-teclado                                             |
| Locale        | pt-BR                                                     |
| Paciência     | 60 s até desistir da barra e usar a busca                 |
| Conta         | `anonima` · sem credencial                                |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. Com o item colorido, não dá para saber qual departamento está aberto (o hover não muda mais a cor)
2. O rótulo colorido destoa a ponto de parecer anúncio, e ela o evita
3. O ícone e o rótulo desalinham na barra, ou a barra passa a rolar quando antes cabia

**Superfícies:** a barra do computador e o painel do mega menu.
