# Personas — 101 · Faixa de avisos no topo da loja

| ID     | Nome    | Arquétipo                        | Conta        | Jornadas   | Charters                 |
| ------ | ------- | -------------------------------- | ------------ | ---------- | ------------------------ |
| PER-01 | Adri    | usuário ocasional (a dona)       | `admin-loja` | J-01, J-05 | CH-01, CH-04, CH-05, CH-06 |
| PER-02 | Bia     | usuário mobile                   | `anonima`    | J-02       | CH-02                    |
| PER-03 | Marta   | usuário de tecnologia assistiva  | `anonima`    | J-04       | CH-07                    |
| PER-04 | Rodrigo | novo usuário, no computador      | `anonima`    | J-03       | CH-03                    |

**Não cobertas:**
- usuário avançado (muitas abas no painel): a tela é de uso eventual, por campanha, e só a dona a usa;
- usuário em recuperação: não há bug anterior neste Work Item;
- a dona no celular (`/admin/faixa-de-avisos` em 390): a costura não pede a tela do painel no celular — fica em Fora do escopo;
- leitor de tela real (VoiceOver, TalkBack): o browser da sessão simula por teclado e árvore de acessibilidade.

---

## PER-01 · Adri — usuário ocasional (a dona)

**Objetivo:** pôr no ar, sem deploy, a faixa da Black Friday que aparece em toda a loja, e tirá-la quando a campanha acabar.

**Contexto:** artesã que faz as joias e cuida da loja sozinha. Entra no painel algumas vezes por semana, quase sempre no
computador do ateliê, entre uma peça e outra. Monta a campanha de uma vez, confere na loja e volta ao trabalho.
Copia textos e endereços de outros lugares (Instagram, barra do navegador).

| Atributo      | Valor |
| ------------- | ----- |
| Familiaridade | ocasional |
| Dispositivo   | desktop 1440 × 900 |
| Rede          | rápida |
| Modalidade    | mouse-teclado |
| Locale        | pt-BR |
| Paciência     | 120 s até desistir de uma tarefa no painel |
| Conta         | `admin-loja` · credencial `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA` |

**O que pode atrapalhá-la** (hipóteses de fricção):

1. Cola o endereço completo (`https://…`) no Destino e não entende por que o Salvar não habilita.
2. Liga a faixa, abre a loja e não vê a mudança na hora — acha que não funcionou e liga e desliga de novo.
3. O texto do Instagram passa do teto de 90 caracteres e ela não sabe o que cortar.

**Superfícies:** `/admin/faixa-de-avisos` (interruptor, lista, prévia); a loja, para conferir.

## PER-02 · Bia — usuário mobile

**Objetivo:** chegando por um anúncio direto numa joia, descobrir que há Black Friday e chegar às peças em oferta.

**Contexto:** perdeu a avó há pouco e procura uma joia com as cinzas. Abre o anúncio no celular, numa mão só, no
ônibus, com 4G instável. Nunca visitou a loja.

| Atributo      | Valor |
| ------------- | ----- |
| Familiaridade | nenhuma |
| Dispositivo   | celular 390 × 844 |
| Rede          | lenta |
| Modalidade    | toque |
| Locale        | pt-BR |
| Paciência     | 30 s |
| Conta         | `anonima` |

**O que pode atrapalhá-la:**

1. O aviso troca enquanto ela ainda lê.
2. A faixa chega depois e empurra o texto que ela já estava lendo.
3. Ela toca na palavra errada do aviso e nada acontece.

**Superfícies:** a faixa na Home, na categoria e no produto; a ausência dela no checkout.

## PER-03 · Marta — usuário de tecnologia assistiva

**Objetivo:** ler os avisos da loja no próprio ritmo e abrir o que interessa, sem depender do mouse.

**Contexto:** 68 anos, baixa visão. Usa a fonte do sistema no máximo, "reduzir movimento" ligado, e navega pelo
teclado no computador da filha. Desiste quando algo se mexe sozinho ou quando o foco some.

| Atributo      | Valor |
| ------------- | ----- |
| Familiaridade | ocasional |
| Dispositivo   | desktop 1440 × 900 e celular 390 × 844 |
| Rede          | lenta |
| Modalidade    | só-teclado, fonte a 200 %, movimento reduzido |
| Locale        | pt-BR |
| Paciência     | presa à tarefa — sai se o foco some ou o texto corre |
| Conta         | `anonima` |

**O que pode atrapalhá-la:**

1. A faixa continua girando com o movimento reduzido ligado.
2. Com a fonte a 200 % o "Ver ofertas" fica cortado.
3. O foco sobre o ouro não aparece.

**Superfícies:** a faixa na Home e no produto.

## PER-04 · Rodrigo — novo usuário, no computador

**Objetivo:** vindo do Google numa categoria, ver o que a loja está oferecendo e ir direto ao aviso que interessa.

**Contexto:** procura um presente para a esposa que acabou de ter bebê (joia com leite materno). Pesquisa no notebook
do trabalho, com várias páginas abertas, mouse.

| Atributo      | Valor |
| ------------- | ----- |
| Familiaridade | nenhuma |
| Dispositivo   | desktop 1440 × 900 |
| Rede          | rápida |
| Modalidade    | mouse-teclado |
| Locale        | pt-BR |
| Paciência     | 45 s |
| Conta         | `anonima` |

**O que pode atrapalhá-la:**

1. Não percebe as setas e espera a troca.
2. O aviso troca no instante em que ele vai clicar.
3. A arte do aviso de imagem aparece cortada ou esticada no monitor largo.

**Superfícies:** a faixa em categoria e Home, com setas; o aviso de imagem; o Banner principal na Home.
