# J-ver-uma-cliente — Abrir a ficha de uma cliente e falar com ela

Feature `76` (`MAC-14`..`MAC-22`, `MAC-26`, `MAC-37`). A pergunta da Adri, com a mensagem da cliente aberta: *"o que ela já levou, tem peça minha em andamento, e como respondo?"*. Alcançada pela lista **ou** pelo "Ver cliente" do detalhe do pedido (`J-ver-um-pedido`). Números contam só pedidos pagos, e a ficha diz isso. **Só leitura.**

```mermaid
flowchart TD
    A1[Entrada: toca uma linha da lista] --> F0
    A2[Entrada: Ver cliente no bloco Cliente do pedido] --> R1[Resolve o id por leitura pareada, botão em espera] --> F0
    A3[Entrada: /clientes/id colado ou F5] --> F0
    R1 -->|pessoa não achada| R2[Não encontrei esta cliente. na própria linha, não navega]
    F0[Esqueletos, aba Clientes marcada] -->|id não é UUID| N[Não encontrei esta cliente., sem ir à rede]
    F0 -->|UUID sem linha| N
    F0 -->|42501| RC[Recusa da 72, ficha não permanece desenhada]
    F0 -->|rede| FF[Não consegui carregar + Tentar de novo]
    F0 --> H[Cabeçalho: inicial, nome ou e-mail, cidade/UF e cliente desde mês ano]
    H --> NU[Três números: compras, no total, ticket médio, travessão se nulo; texto: contam só pagos]
    H --> CT[Contato: e-mail; telefone mascarado e Conversar no WhatsApp só com telefone válido]
    CT --> WA[Side effect: wa.me/número em nova aba, conversa em branco]
    H --> PD[Pedidos: número, primeiro item, data e há N dias, total, situação; 20 por janela]
    PD -->|leitura dos pedidos falha| PD2[Só este bloco: Não consegui carregar os pedidos. + Tentar de novo]
    PD -->|leitura dos itens falha| PD3[Linhas sem o item, ficha não cai]
    PD -->|mais que 20| PD4[Pedidos · total + Ver mais pedidos]
    PD --> PT[Toca um pedido] --> PE[Detalhe da 74] --> V[Voltar] --> V2[Ficha na mesma posição]
    H --> END[True end: pedidos listados = orders_total, e a resposta à cliente sai sem o computador]
    CT -.->|sai para o WhatsApp e volta| X1[Abandono: o app volta e relê, mesma ficha]
```

```yaml
journey:
  id: J-ver-uma-cliente
  name: Ver a ficha de uma cliente no celular
  value_statement: "A Adri responde a cliente com o contexto na mão: contato, o que ela levou e se há peça em andamento"
  personas: [Adri no celular, Equipe com TalkBack, Cliente com conta da loja]
  entry_points:
    - url: /clientes/<id> (linha da lista)
      origin: in-app-nav
    - url: /clientes/<id> (Ver cliente do pedido)
      origin: in-app-nav
    - url: /clientes/<id> colado
      origin: external-share
  actions:
    - step: 1
      verb: abre a ficha
      expected_observable: nome, cidade/UF, cliente desde, foco no título
    - step: 2
      verb: confere os três números e a frase dos pagos
      expected_observable: iguais a customer_list e ao painel; ticket médio com travessão se nunca pagou
    - step: 3
      verb: toca Conversar no WhatsApp
      expected_observable: wa.me com 55 e o número certo, nova aba, sem texto pronto
    - step: 4
      verb: abre um pedido dela e volta
      expected_observable: detalhe da 74; voltar traz a ficha na mesma posição
    - step: 5
      verb: pede mais pedidos
      expected_observable: 20 → 22 linhas, sem repetir, botão some ao cobrir orders_total
  goal:
    observable: ficha igual à de /admin/clientes/<id> nos números e nos pedidos
    side_effects: [wa.me em nova aba; nenhuma escrita; nenhum dado da cliente em URL, history.state, armazenamento ou console]
  true_end_state: pedidos listados = orders_total de customer_list, inclusive convidada e e-mail com underscore
  exit:
    natural: volta à lista ou ao pedido de onde veio, ou sai para o WhatsApp
  abandonment:
    - at_step: 3
      how: sai para o WhatsApp e só volta minutos depois
      resume: a ficha relê ao voltar ao primeiro plano
  crosses: [PostgREST customer_list, customer_directory, orders, order_items, RPC atelie_clock, wa.me, painel /admin/clientes/<id>]
```

## Varredura da taxonomia

| Dimensão | Onde |
| --- | --- |
| Jornada | `MAD-cliente-abrir-e-entender`, `MAD-cliente-ver-cliente-do-pedido`, `MAD-cliente-pedido-dela-e-voltar` |
| Funcional | `MAD-cliente-whatsapp-em-branco`, `MAD-cliente-pedidos-batem-com-o-total`, `MAD-cliente-email-com-underscore-nao-mistura`, `MAD-cliente-numeros-so-pagos` |
| Experiencial | `MAD-cliente-tom-memorial`, `MAD-cliente-com-leitor-de-tela` |
| Borda/erro/vazio | `MAD-cliente-inexistente-ou-id-ruim`, `MAD-cliente-sem-telefone-sem-pedido`, `MAD-cliente-bloco-de-pedidos-falha` |
| Transversal | `MAD-cliente-fonte-grande-e-telas-estreitas`, `MAD-cliente-perde-o-acesso-com-ficha-aberta`, `MAD-cliente-muda-com-a-ficha-aberta` |
