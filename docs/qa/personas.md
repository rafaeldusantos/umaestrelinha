# Personas do projeto

Instâncias, não metodologia (ver `qa-report/references/personas.md`). Atualizar quando o público mudar.

## Adri no celular (dona, administra a loja)

```yaml
persona:
  name: Adri no celular
  base: Mobile User
  goal: acompanhar pedidos, clientes e descontos da loja pelo celular, sem abrir o notebook
  device: phone-large
  network: 4g
  modality: touch
  locale: pt-BR
  patience_seconds: 10
```

Faz as joias à mão e atende sozinha. Abre o app entre uma peça e outra, muitas vezes com uma mão só.
É quem mais se machuca se o app disser algo falso sobre a loja (um pedido, um acesso).

## Adri voltando depois de esquecer a senha

```yaml
persona:
  name: Adri recuperando o acesso
  base: Recovering User
  goal: voltar a entrar no ateliê depois de esquecer a senha, sem pedir ajuda
  device: phone-large
  network: 4g
  modality: touch
  locale: pt-BR
  patience_seconds: 30
```

A última tentativa terminou em "E-mail ou senha inválidos". A confiança está baixa: qualquer
instrução que não bata com o e-mail que chegou (link × código) faz ela desistir.

## Cliente da loja que achou o endereço do ateliê

```yaml
persona:
  name: Cliente com conta da loja
  base: Casual User
  goal: entrar com a conta de cliente que ela já tem (não é admin)
  device: phone-small
  network: wifi-fast
  modality: touch
  locale: pt-BR
  patience_seconds: 15
```

Tem conta de cliente (`customers`), nunca teve papel admin. O que ela vê prova o limite de acesso:
nenhum dado da loja, uma frase clara e um jeito de sair.

## Pessoa da equipe com leitor de tela

```yaml
persona:
  name: Equipe com TalkBack
  base: Accessibility-Reliant
  goal: entrar e navegar pelas abas só com o leitor de tela do Android
  device: phone-large
  network: wifi-fast
  modality: screen-reader
  locale: pt-BR
  patience_seconds: 20
```

Hoje a equipe é a Adri sozinha; a persona existe porque o acesso é o mesmo do Backoffice e outra
pessoa pode ganhar papel admin em `/admin/usuarios`. Em navegador ela é aproximada pela árvore de
acessibilidade; o TalkBack de verdade só no aparelho.

## Adri cadastrando peças (painel, celular e notebook)

```yaml
persona:
  name: Adri cadastrando peças
  base: Power User
  goal: cadastrar e publicar peças seguidas, e curar o que aparece no Google, sem travar em texto de marketing
  device: desktop (1440) e phone-large (390), com a fonte do sistema às vezes em 130 % ou 200 %
  network: wifi-fast
  modality: mouse + teclado no notebook; toque no celular
  locale: pt-BR
  patience_seconds: 20
```

Faz a peça, fotografa e cadastra na mesma tarde. Escreve no registro memorial da loja: nada festivo, nada
de urgência. O que mais assusta é perder o texto que ela já escreveu, ou a loja mostrar no Google algo que
ela não viu. Estava em `journeys/J-cadastrar-peca-com-variacoes.md` (`81`); entrou aqui no ciclo da `84`.

## Adri montando o menu da loja (painel, quase sempre no celular)

```yaml
persona:
  name: Adri montando o menu
  base: Mobile User
  goal: deixar o menu da loja com os itens, a ordem, os nomes e os submenus que ela quer, sem adivinhar o que cada chave faz
  device: phone-large (390), às vezes o notebook (1440); fonte do sistema às vezes em 130 % ou 200 %
  network: 4g
  modality: touch no celular (sem arraste confiável); mouse + teclado no notebook
  locale: pt-BR
  patience_seconds: 15
```

Pouco técnica: pensa em "o que a cliente vê", não em categoria, slug ou `sort_order`. Abre `/admin/menu`
entre uma peça e outra, faz uma mudança e confere na prévia. O que mais a assusta é mexer no menu e
bagunçar outra tela da loja (a Home, o rodapé), ou achar que salvou quando não salvou. Entrou no ciclo da
`86`; a persona "Adri cadastrando peças" continua sendo a do cadastro de produto.

## Cliente navegando a loja pelo menu (celular, contexto memorial)

```yaml
persona:
  name: Cliente navegando pelo menu
  base: Casual User
  goal: achar a joia certa para o material que ela tem (cinzas, leite, mecha) pelo menu, sem se perder
  device: phone-small (360) e phone-large (390); às vezes o notebook (1440)
  network: 4g
  modality: touch; no notebook mouse e às vezes só teclado
  locale: pt-BR
  patience_seconds: 10
```

Muitas vezes acabou de perder alguém. Abre a folha do menu no celular, toca num item, abre o submenu,
escolhe. Qualquer item que leva a uma página vazia, a uma categoria que não existe mais ou a "Página não
encontrada" pesa mais aqui do que numa loja comum. Não tem conta nem papel no painel. Entrou no ciclo da
`86`.

## Adri despachando pedidos (painel, notebook e celular)

```yaml
persona:
  name: Adri despachando pedidos
  base: Power User
  goal: acertar o status, o rastreio e o material dos pedidos do dia sem mandar à cliente um e-mail repetido ou fora de hora
  device: desktop (1440) e phone-large (390), com a fonte do sistema às vezes em 130 % ou 200 %
  network: wifi-fast, às vezes Slow 3G (o ateliê tem rede ruim)
  modality: mouse + teclado no notebook; toque no celular
  locale: pt-BR
  patience_seconds: 15
```

Muitas vezes já avisou a cliente pelo WhatsApp e só quer acertar o registro. O que mais a machuca: um
e-mail repetido para quem acabou de perder alguém, e a tela dizer "avisada" quando não avisou. Entrou no
ciclo da `88`.

## Adri montando uma venda do WhatsApp (painel, notebook)

```yaml
persona:
  name: Adri montando uma venda
  base: Power User
  goal: transformar a conversa do WhatsApp num pedido montado — cliente, peças com variação e gravação, cupom e o desconto combinado — e mandar o link sem errar o valor
  device: desktop (1440); às vezes confere pelo celular (390) com a fonte do sistema em 130 % ou 200 %
  network: wifi-fast
  modality: mouse + teclado; às vezes só teclado
  locale: pt-BR
  patience_seconds: 20
```

Acabou de combinar com a cliente pelo WhatsApp. O que mais a machuca: o link cobrar um valor diferente do
que ela prometeu, criar a cliente duas vezes, ou mandar um link que não funciona para alguém que está de
luto. Entrou no ciclo da `89`.

## Cliente de luto abrindo o link (celular, contexto memorial)

```yaml
persona:
  name: Cliente de luto pelo link
  base: First-Time User
  goal: abrir o link que a Adri mandou no WhatsApp, conferir o pedido, escolher a entrega e pagar, sem refazer nada
  device: phone-large (390×844), às vezes com a fonte do sistema em 130 % ou 200 %
  network: 4g
  modality: touch; às vezes leitor de tela
  locale: pt-BR
  patience_seconds: 10
```

Não tem conta na loja. Abre o link dentro do WhatsApp, muitas vezes dias depois. Qualquer frase errada
(valor diferente do combinado, "link inválido" sem saída, um pedido que precisa ser refeito) pesa mais do
que numa loja comum. Entrou no ciclo da `89`.

## Cliente com conta abrindo o link (celular)

```yaml
persona:
  name: Cliente com conta pelo link
  base: Returning User
  goal: concluir o pedido que a Adri montou e vê-lo depois na própria conta, sem pedir código
  device: phone-large (390×844)
  network: 4g
  modality: touch
  locale: pt-BR
  patience_seconds: 15
```

Já comprou antes e tem conta (`auth.users` + `customers.user_id`). Pode estar logada ou não. O que prova:
o pedido vai para a conta dela (A-08) sem desafio de código, e o e-mail do link não pode ser trocado
(A-07). Entrou no ciclo da `89`.
