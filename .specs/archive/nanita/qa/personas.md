# Personas — Nanita Store

O produto tem **dois públicos**, e eles não se parecem:

- **Quem compra** (loja) — colecionadoras de bottons de cultura pop, ticket baixo (R$ 9–30), compra
  por impulso, recompra a cada drop. Cinco personas, abaixo.
- **Quem opera** (backoffice) — a criadora e quem a ajuda no drop. Duas personas, na segunda seção.
  Público adicionado em 2026-08-02, no ciclo de QA das features `11`–`14`: até então a árvore só
  tinha personas de loja, e o backoffice nunca tinha sido andado por ninguém.

**Das cinco personas de loja, três são de celular, e a primária é.** Isso não é preferência — é a
distribuição real de tráfego (~90% mobile). Persona de desktop existe para cobrir os 10%, não para
liderar o ciclo. **No backoffice a regra se inverte** — ver a nota de viewport na segunda seção.

Personas são **duráveis**: mudam quando o público muda, não a cada ciclo.

---

## Marina — colecionadora no celular ⭐ primária

```yaml
persona:
  name: Marina
  base: Mobile User
  goal: "Fechar o pin do drop novo antes de esgotar, sem sair do celular"
  device: phone-large
  network: 4g
  modality: touch
  locale: pt-BR
  patience_seconds: 20
```

Compra pins de anime desde o ano passado, tem 27 na coleção. Descobre o drop pelo Stories, abre no
navegador do Instagram, decide em segundos. Já tem endereço salvo e espera **não redigitar nada**.
Paga PIX porque é instantâneo e tem desconto.

**O que ela revela:** alvo de toque pequeno, CTA fixo brigando com a barra do sistema, resumo que
esconde o total, texto embrulhando em pílula, e qualquer passo a mais entre decidir e pagar.
É a persona que mede se o one-page cumpriu a promessa.

---

## Bia — primeira compra, no celular

```yaml
persona:
  name: Bia
  base: New User
  goal: "Entender se a loja é confiável e comprar um pin de presente"
  device: phone-small
  network: 4g
  modality: touch
  locale: pt-BR
  patience_seconds: 12
```

Nunca comprou aqui. Chegou por um link, não conhece a marca e desconfia. Não sabe que o login é
obrigatório e não entende por que a loja quer o CPF dela. Se algo parecer golpe ou confuso, fecha.

**O que ela revela:** o overlay de login aparecendo sem explicação, o campo de CPF sem justificativa,
selo de segurança ausente, copy que promete o que a loja não faz, e o que acontece quando ela
simplesmente não sabe o próximo passo.

---

## Rui — voltou depois de dar errado

```yaml
persona:
  name: Rui
  base: Recovering User
  goal: "Terminar a compra que falhou ontem, sem pagar duas vezes"
  device: phone-large
  network: flaky
  modality: touch
  locale: pt-BR
  patience_seconds: 10
```

O PIX dele expirou, ou o cartão foi recusado. Voltou desconfiado, com medo de ter sido cobrado sem o
pedido existir — ou de pagar de novo. Rede instável no caminho do trabalho.

**O que ele revela:** pedido órfão, cobrança duplicada, PIX expirado sem saída, retentativa criando
pedido novo em vez de reusar, carrinho perdido, e mensagem de erro que não diz o que fazer.
É a persona que mede se os caminhos de recuperação existem de verdade.

---

## Léo — mesa, carrinho grande

```yaml
persona:
  name: Léo
  base: Casual User
  goal: "Montar um kit de 6 pins para revender e pagar no cartão parcelado"
  device: desktop
  network: wifi-fast
  modality: mouse-keyboard
  locale: pt-BR
  patience_seconds: 45
```

Compra a cada dois meses, em quantidade. Confere valor, frete e parcela antes de fechar. Abre várias
abas. Representa os ~10% de desktop — e o ticket mais alto.

**O que ele revela:** coluna de resumo fixa perdendo sincronia, parcelamento divergindo do total,
frete grátis calculando errado em carrinho grande, estado entre abas, e o desconto do bump aparecendo
diferente do cobrado.

---

## Sofia — leitora de tela, no celular

```yaml
persona:
  name: Sofia
  base: Accessibility-Reliant
  goal: "Comprar sozinha, sem pedir ajuda para ninguém ler a tela"
  device: phone-large
  network: wifi-fast
  modality: screen-reader
  locale: pt-BR
  patience_seconds: 60
```

Usa TalkBack no Android. Precisa que o acordeão anuncie qual bloco abriu, que o CTA diga o valor, que
o erro de CPF seja lido junto do campo, e que a timeline do pedido não dependa de cor para informar o
estágio.

**O que ela revela:** bloco que muda sem anunciar, campo sem label associado, erro que só aparece
visualmente, estado comunicado apenas por cor (a timeline monocromática existe por isso), foco preso
no overlay de login, e ordem de tabulação furada no acordeão.

---

# Personas de backoffice

Quem opera a loja. **Duas**, porque o público real é esse tamanho: a criadora, todo dia, e uma
ajudante que aparece no drop.

## Nota de viewport — aqui o desktop lidera, e isso é deliberado

A premissa mobile-first do `README.md` é sobre a **loja**, onde ~90% do tráfego é celular. O
backoffice é ferramenta de trabalho de desktop — decidido em `A31` da feature `14` (a tela ocupa a
janela inteira, sem `max-w`) e visível no desenho: a listagem tem 8 colunas e o formulário tem 3
faixas. Consequência para o QA, registrada para não ler como esquecimento:

- **Sessão de backoffice começa em 1440×900**, não em 390×844.
- **Não se abre bug de layout mobile no backoffice** — não é regressão, é escopo declarado.
- O que atravessa para o celular é o **resultado**: a página do produto, a foto da variação, o
  alt-text, a URL que a lojista mudou. Essa metade é andada por Marina, no celular, como sempre.

## Nana — a criadora, todo dia no backoffice ⭐ primária do backoffice

```yaml
persona:
  name: Nana
  base: Power User
  goal: "Publicar o drop da semana sem abrir 20 formulários, e sem publicar nada com preço errado"
  device: desktop
  network: wifi-fast
  modality: mouse-keyboard
  locale: pt-BR
  patience_seconds: 30
```

É a dona da loja e desenha os bottons. Cadastra por lote quando o drop chega, corrige preço no meio
da semana, e conhece a tela de cor — vai de teclado, deixa abas abertas, cola da planilha onde
controla os custos. Aceita tela feia se for rápida; não aceita perder 40 minutos de cadastro.

**O que ela revela:** atalho que parou de funcionar (`Enter`/`Tab`/`Esc` na célula, `⌘S`), operação
em lote que mente sobre quantos itens mudou, desfazer que não desfaz, rascunho perdido num F5,
listagem que fica lenta quando o catálogo cresce, e valor que a tela mostra diferente do que o banco
guardou. É a persona que mede se as features `11`–`14` cumpriram a promessa de "não abrir 20
formulários".

## Dora — ajuda no drop, uma vez por mês

```yaml
persona:
  name: Dora
  base: Casual User
  goal: "Cadastrar os produtos que a Nana pediu, sem estragar nada do catálogo"
  device: laptop
  network: wifi-fast
  modality: mouse-keyboard
  locale: pt-BR
  patience_seconds: 60
```

Amiga da Nana, entra no backoffice quando o drop é grande. Lembra o objetivo, não o caminho: sabe que
precisa "pôr os pins novos no site", não em qual aba mora o preço. Tem medo de apagar algo e por isso
lê os avisos — e trava quando um botão está desabilitado sem dizer por quê.

**O que ela revela:** ação desabilitada sem explicação, erro em aba fechada que ninguém vê, cópia que
usa palavra de dev em vez de palavra de loja, checklist que não diz o que falta, ação destrutiva sem
confirmação nomeada, e o que acontece quando ela simplesmente não sabe o próximo passo.

## Sobre a persona de tecnologia assistiva no backoffice

Não existe, **e a razão fica registrada**: o backoffice tem operadoras conhecidas (a criadora e quem
ela chama), nenhuma dependente de leitor de tela. Inventar uma persona de leitor de tela aqui geraria
bug de escopo que ninguém pediu. O que **não** é dispensado:

- **Operação por teclado é requisito de spec**, não acessibilidade opcional — `PLS-03 AC 7`
  (`Enter`/`Tab`/`Esc` na edição inline), `PFM-16` (`⌘S`) e `P1.7 AC 3` (focar o primeiro campo
  inválido). Vai por Nana, que é teclado-primeiro por definição.
- **Leitor de tela segue coberto na loja**, por Sofia — inclusive no que o backoffice produz: o
  `alt` que a aba Mídia grava é lido na página do produto (`PMD-01 AC 10`).

---

## Cobertura por ciclo

Um ciclo cobre **no mínimo 3 personas**. Marina é obrigatória em todo ciclo que toque o checkout —
é o caso principal, não um caso de borda. **Nana é obrigatória em todo ciclo que toque o
backoffice**, e ciclo de backoffice fecha com Marina ou Sofia na ponta da loja quando a mudança
atravessa (foto, alt, URL, preço, disponibilidade) — senão metade da journey fica sem prova.
