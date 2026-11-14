# Personas — 99 · Frete grátis por região (Sul e Sudeste) e a prévia de frete na sacola

| ID     | Nome   | Arquétipo                       | Conta                  | Jornadas   | Charters           |
| ------ | ------ | ------------------------------- | ---------------------- | ---------- | ------------------ |
| PER-01 | Luana  | Usuário mobile (novo usuário)   | `anonima`              | J-01       | CH-01, CH-04, CH-07, CH-08 |
| PER-02 | Cida   | Usuário ocasional, fora da região | `cliente-salvador`   | J-02, J-04 | CH-02, CH-06       |
| PER-03 | Adri   | Usuário avançado (a dona, no painel) | `admin-loja`      | J-03       | CH-05              |
| PER-04 | Teresa | Usuário de tecnologia assistiva (fonte grande, teclado) | `cliente-com-endereco` | J-05 | CH-03 |

**Não cobertas:** usuário em recuperação — o Work Item é feature nova, sem falha anterior para a persona voltar a
conferir. Leitor de tela real (TalkBack, VoiceOver) também fica fora: no browser da sessão a tecnologia assistiva se
simula por teclado e pela árvore de acessibilidade, e a fonte do sistema pela fonte da raiz do documento.

---

## PER-01 · Luana — usuário mobile (novo usuário)

**Objetivo:** escolher um pingente para guardar as cinzas do pai e saber, ainda na sacola, quanto custa a entrega
para São Paulo — e se o frete grátis da campanha vale para ela — antes de começar o checkout.

**Contexto:** primeira compra na loja, pelo celular, à noite, depois de ver a loja no Instagram. Tem pouca paciência
para formulário e desconfia de valor que muda no último passo. Mora em São Paulo/SP (CEP 01310-100).

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | nenhuma                                                   |
| Dispositivo   | celular (390 × 844, o alvo do projeto)                    |
| Rede          | lenta                                                     |
| Modalidade    | toque                                                     |
| Locale        | pt-BR                                                     |
| Paciência     | 60 s confusa até desistir                                 |
| Conta         | `anonima` (convidada, sem login)                          |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. O rodapé da sacola (CEP, opções, cupom, totais, botão) ocupa a tela e esconde as peças que ela acabou de escolher.
2. O valor do frete ou o Total que ela viu na sacola muda quando chega ao checkout, ou ela precisa digitar o CEP de
   novo.
3. O ⓘ é pequeno demais para o dedo, ou o balão abre por cima e não fecha com um toque fora.

**Superfícies:** gaveta da sacola (faixa do frete grátis, ⓘ, prévia de frete, totais), checkout › Entrega e Resumo,
Home (barra de confiança).

---

## PER-02 · Cida — usuário ocasional, fora da região da campanha

**Objetivo:** comprar uma joia com o leite materno da filha e entender, antes de pagar, que o frete grátis da Black
Friday não vale para Salvador — sem a sensação de ter sido enganada no checkout.

**Contexto:** já comprou uma vez na loja; tem conta (entra por código no e-mail). Mora em Salvador/BA (CEP
40020-000). Viu o anúncio "frete grátis acima de R$ 450" e montou a sacola acima disso. Às vezes usa o notebook do
trabalho para comparar, mas compra pelo celular. É a cliente que também recebe da Adri, pelo WhatsApp, um link de
pedido montado.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | ocasional                                                 |
| Dispositivo   | celular (390 × 844); compara em desktop (1440 × 900)      |
| Rede          | rápida                                                    |
| Modalidade    | toque                                                     |
| Locale        | pt-BR                                                     |
| Paciência     | 120 s                                                     |
| Conta         | `cliente-salvador` · credencial `QA_CLIENTE_SALVADOR_USUARIO` (o e-mail; não há senha: o código de 6 dígitos chega no Mailpit) |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. A sacola diz "frete grátis" (ou "liberado") antes de saber o CEP, e o checkout cobra o frete — promessa desfeita.
2. Com o CEP de Salvador a loja ainda sugere "Complete o frete grátis" com peças, como se a compra fosse ganhar o
   frete.
3. Ela troca o CEP no checkout e o Total não acompanha, ou só acompanha depois de recarregar.

**Superfícies:** gaveta da sacola (faixa fora da região, lista de sugestões, cupom), checkout › Entrega e Resumo,
`/pedido-montado`, `/conta`.

---

## PER-03 · Adri — usuário avançado (a dona, no painel)

**Objetivo:** ligar o frete grátis da Black Friday a partir de R$ 450 só para Sul e Sudeste e ver, na mesma hora,
a loja dizendo isso às clientes — sem pedir deploy a ninguém.

**Contexto:** faz tudo da loja sozinha, todo dia, no notebook, com o painel numa aba e a loja em outra. Configura a
campanha na véspera; um erro aqui é frete grátis para o Brasil inteiro ou para ninguém.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | diária                                                    |
| Dispositivo   | desktop (1440 × 900)                                      |
| Rede          | rápida                                                    |
| Modalidade    | mouse-teclado                                             |
| Locale        | pt-BR                                                     |
| Paciência     | alta para formulário, zero para "salvei e não valeu"      |
| Conta         | `admin-loja` · credencial `QA_ADMIN_LOJA_USUARIO` / `QA_ADMIN_LOJA_SENHA` (o admin de desenvolvimento do `supabase/seed.sql`, seção 5) |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. Ela desmarca todas as regiões por engano e o painel grava, deixando a campanha sem efeito sem avisar.
2. Salva Sul + Sudeste e a loja aberta na outra aba continua dizendo o texto antigo até ela descobrir que precisa
   recarregar.
3. O texto de ajuda não diz quais estados cada região cobre, e ela fica sem saber se o ES conta como Sudeste.

**Superfícies:** painel › Configurações › Frete e Material; a loja numa segunda aba (gaveta, Home).

---

## PER-04 · Teresa — usuário de tecnologia assistiva (fonte grande e teclado)

**Objetivo:** encomendar uma joia com o dente de leite do neto, entrando na própria conta, e escolher entre receber
em Porto Alegre ou retirar no escritório — lendo tudo com a fonte do celular no máximo.

**Contexto:** 62 anos, usa a fonte do sistema em 200 % e, no notebook, navega pelo teclado. Tem conta na loja com o
endereço de Porto Alegre/RS (CEP 90010-000) salvo. Vai e volta entre a sacola e o checkout antes de decidir.

| Atributo      | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Familiaridade | ocasional                                                 |
| Dispositivo   | celular (390 × 844) com fonte a 200 %; teclado no desktop (1440 × 900) |
| Rede          | rápida                                                    |
| Modalidade    | toque e só-teclado                                        |
| Locale        | pt-BR                                                     |
| Paciência     | presa à tarefa — desiste se perde onde estava              |
| Conta         | `cliente-com-endereco` · credencial `QA_CLIENTE_COM_ENDERECO_USUARIO` (o e-mail; código de 6 dígitos no Mailpit; endereço salvo em Porto Alegre/RS, 90010-000) |

**O que pode atrapalhá-la** (hipóteses de fricção, antes da execução):

1. Com a fonte a 200 %, o valor da opção de frete ou o CEP na linha recolhida são cortados ("R$ 2…"), ou o rodapé
   empurra o botão "Finalizar Pedido" para fora da tela.
2. Ao voltar do checkout para a sacola e de novo ao checkout, o endereço salvo dela substitui o CEP que acabou de
   calcular (ou o contrário), e o número some.
3. A retirada no escritório aparece já marcada, ou o resumo não deixa claro que é retirada e grátis.

**Superfícies:** login (`AuthOverlay`), gaveta da sacola, checkout › Entrega e Resumo, Home (barra de confiança),
página do produto (cálculo de frete).
