# Personas — 100 · Perfil de estilo da loja (Padrão e Black Friday), com a chave no painel

| ID     | Nome    | Arquétipo                                   | Conta        | Jornadas          | Charters                 |
| ------ | ------- | ------------------------------------------- | ------------ | ----------------- | ------------------------ |
| PER-01 | Adri    | usuário ocasional (a dona da loja)          | `admin-loja` | J-01, J-01a, J-01b, J-02 | CH-01, CH-02, CH-05, CH-07 |
| PER-02 | Bia     | usuário mobile (cliente comprando)          | `cliente-qa` | J-03              | CH-04                    |
| PER-03 | Rodrigo | usuário ocasional que deixou a loja aberta  | `anonima`    | J-03a             | CH-03                    |
| PER-04 | Lúcia   | usuário ocasional (cliente que volta)       | `cliente-qa` | J-04              | CH-06                    |
| PER-05 | Marta   | usuário de tecnologia assistiva             | `anonima`    | J-03, J-03a       | CH-08                    |

**Não cobertas:**

- **Usuário avançado** — a chave é usada duas vezes por ano por uma pessoa só; atalho e operação em lote não existem
  nesta superfície. Duas abas do painel ao mesmo tempo ficam como variação do CH-05, não como persona
- **Novo usuário** — o Work Item não muda nada que alguém de primeira visita veja diferente de uma cliente que volta
  (a loja muda de cor para todas). Lúcia e Bia cobrem a cliente
- **Usuário em recuperação** — não há bug anterior a retestar (`qa/issues/` vazio)
- **Leitor de tela real** (VoiceOver, TalkBack) — fora do browser da sessão; Marta é simulada por teclado, árvore de
  acessibilidade e fonte do sistema a 130 % e 200 %

---

## PER-01 · Adri — usuário ocasional (a dona da loja)

**Objetivo:** vestir a loja de Black Friday em novembro e voltar à cara de sempre depois, sem pedir deploy a ninguém.

**Contexto:** no computador do ateliê, entre um pedido e outro. Entra em Configurações poucas vezes por mês e conhece
"Dados da loja". Quer conferir antes de ligar, porque a loja é vista por gente em luto e uma cor errada pesa.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | ocasional                                                 |
| Dispositivo   | desktop (1440 × 900); às vezes o celular (390 × 844)      |
| Rede          | rápida                                                    |
| Modalidade    | mouse-teclado                                             |
| Locale        | pt-BR                                                     |
| Paciência     | 120 s até desistir de uma tela que não responde           |
| Conta         | `admin-loja` · credencial `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA` |

**O que pode atrapalhá-la:**

1. Salvar e não saber se a loja já mudou — o aviso de prazo (5 min / 1 hora) não é lido, e ela abre a loja e acha que
   não funcionou
2. A prévia mostra uma coisa e a loja publicada outra, ou fechar a prévia deixa a escolha num estado que ela não pediu
3. Voltar ao Padrão parece "apagar" algo — ela teme perder banners, textos ou preços que montou

**Superfícies:** `/admin/configuracoes/dados-da-loja` (card "Perfil de estilo da loja" e o modal da prévia), a loja
`http://localhost:8082`, o app do ateliê `http://localhost:8084`.

## PER-02 · Bia — usuário mobile (cliente comprando)

**Objetivo:** comprar um pingente pelo celular durante a Black Friday, vendo o desconto e o frete com clareza.

**Contexto:** chegou pelo Instagram, no ônibus, com uma mão. A loja de preto e ouro é a primeira que ela vê. Entra na
conta com o código que chega por e-mail.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | ocasional                                                 |
| Dispositivo   | celular (390 × 844), depois o computador (1440 × 900) para a mesma conferência |
| Rede          | lenta                                                     |
| Modalidade    | toque                                                     |
| Locale        | pt-BR                                                     |
| Paciência     | 30 s até desistir                                         |
| Conta         | `cliente-qa` · credencial `QA_CLIENTE_QA_USUARIO` (só o e-mail; o código chega no Mailpit local) |

**O que pode atrapalhá-la:**

1. Texto escuro sobre fundo escuro ou ouro claro sobre branco no perfil novo — preço, parcelas ou o selo de desconto
   que ela não consegue ler ao sol
2. O selo "-X%" e o selo "Novo" ficam parecidos e ela não percebe qual peça está em oferta
3. Um botão ou uma faixa que perdeu o contraste no checkout, onde ela já está com pressa

**Superfícies:** Home, categoria, produto, sacola (gaveta), checkout, `/conta` e a confirmação do pedido.

## PER-03 · Rodrigo — usuário ocasional que deixou a loja aberta

**Objetivo:** voltar à aba da loja que abriu antes da troca de perfil e continuar escolhendo, sem a página mudar de cor
debaixo do dedo.

**Contexto:** abriu a loja à tarde, deixou a aba no celular, voltou à noite — e nesse meio-tempo a dona ligou o
Black Friday. A página dele veio do cache com o perfil anterior.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | ocasional                                                 |
| Dispositivo   | celular (390 × 844)                                       |
| Rede          | rápida                                                    |
| Modalidade    | toque                                                     |
| Locale        | pt-BR                                                     |
| Paciência     | 45 s                                                      |
| Conta         | `anonima` — sem login                                     |

**O que pode atrapalhá-la:**

1. A cor muda sozinha quando ele volta para a aba (foco da janela) sem tocar em nada
2. Metade da página num perfil e metade no outro depois de trocar de página
3. Voltar com o botão do sistema devolve o perfil antigo e a loja "pisca" entre os dois

**Superfícies:** Home, categoria e produto, navegando entre elas.

## PER-04 · Lúcia — usuário ocasional (cliente que volta)

**Objetivo:** reencontrar a loja que ela já conhece, com as mesmas cores, quando a dona não ligou nada.

**Contexto:** comprou um pingente com cinzas da mãe no ano passado e volta para comprar outro. Qualquer coisa
diferente na loja a faz desconfiar. Usa o celular e às vezes o notebook.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | ocasional                                                 |
| Dispositivo   | celular (390 × 844) e desktop (1440 × 900)                |
| Rede          | rápida                                                    |
| Modalidade    | toque e mouse                                             |
| Locale        | pt-BR                                                     |
| Paciência     | 60 s                                                      |
| Conta         | `cliente-qa` · credencial `QA_CLIENTE_QA_USUARIO` (só o e-mail; código no Mailpit) |

**O que pode atrapalhá-la:**

1. Um tom levemente diferente (um cinza mais quente, uma borda que sumiu) que ela não sabe nomear mas sente
2. Uma sombra ou uma transparência (`/80`, `/70`) que mudou de força e deixou um bloco "lavado"
3. A marca desenhada no rodapé ou no menu com outra cor

**Superfícies:** as telas da cliente de RN-08, no Padrão.

## PER-05 · Marta — usuário de tecnologia assistiva

**Objetivo:** ler a loja de Black Friday com a fonte do celular grande, sem perder o preço nem o desconto.

**Contexto:** usa a fonte do sistema a 200 % e navega por teclado no computador. Desiste quando um texto some no fundo.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | ocasional                                                 |
| Dispositivo   | celular (390 × 844) e desktop (1440 × 900)                |
| Rede          | lenta (Slow 4G na medida da primeira pintura)             |
| Modalidade    | só-teclado no computador; toque no celular; fonte a 130 % e 200 % |
| Locale        | pt-BR                                                     |
| Paciência     | 60 s                                                      |
| Conta         | `anonima` — sem login                                     |

**O que pode atrapalhá-la:**

1. Contraste abaixo de 4,5:1 em texto pequeno do perfil novo (parcelas, subtítulos, rodapé)
2. A primeira pintura em ardósia e depois em preto — ela vê a página "piscar" em rede lenta
3. Foco invisível sobre o cabeçalho quase preto

**Superfícies:** Home, produto e sacola no Black Friday.
