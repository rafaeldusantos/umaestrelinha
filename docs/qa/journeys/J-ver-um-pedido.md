# J-ver-um-pedido — Abrir um pedido e saber em que pé ele está

Feature `74` (`MAP-20`..`MAP-30`, `MAP-52`, `MAP-55`). A pergunta da Adri, com a cliente esperando
resposta no WhatsApp: *"o que ela comprou, com que gravação, o material chegou, já saiu?"*. Uma tela só,
o próximo passo dito por `nextStep` (o mesmo do painel), **sem botão de ação** (as escritas são da `75`). **Desde a `75`** o detalhe ganha o rodapé de ação, a folha do rastreio e o lembrete: essa jornada é `J-registrar-material-e-envio`.

```mermaid
flowchart TD
    A1[Entrada: toca uma linha da lista] --> D0
    A2[Entrada: toca uma linha de Últimos pedidos da Início] --> D0
    A3[Entrada: link /pedidos/id colado ou F5] --> D0
    D0[Esqueletos por bloco, aba Pedidos marcada] -->|pedido e atelie_clock respondem| D[Cabeçalho: Pedido número, data de Brasília, há quanto tempo, situação]
    D0 -->|id não existe| N[Não encontrei este pedido. + Voltar aos pedidos]
    D0 -->|42501| R[Recusa da 72, nenhum bloco]
    D0 -->|rede| F[Não consegui carregar. + Tentar de novo]
    D --> NS[Próximo passo: rótulo de nextStep, sem botão e sem blockedReason]
    D --> CL[Cliente: nome, Nª compra, e-mail, telefone + WhatsApp se válido; sem Ver cliente]
    CL --> WA[Side effect: WhatsApp abre wa.me do número certo em nova aba, sem mensagem pronta]
    D --> MT[Material afetivo: título, linha do envelope ou recebido, quatro passos] 
    MT -->|nao_aplicavel| MT0[Bloco ausente]
    D --> IT[N joias: nome congelado, variação, Gravação, quantidade × preço]
    IT -->|leitura dos itens falha| IT2[Só este bloco: Não consegui carregar. + Tentar de novo]
    D --> VL[Valores: subtotal, frete, descontos > 0, total = orders.total, meio e selo de pagamento]
    D --> EN[Entrega: endereço, serviço, linha do rastreio] 
    EN -->|retirada| EN2[Retirada no escritório, sem transportadora, prazo nem rastreio]
    D --> H[Histórico: status, e-mails e notas internas, do mais recente; e-mail falho diz que a cliente não soube]
    D --> RT[Side effect: o pedido muda no painel] --> RT2[Realtime relê o detalhe]
    D --> V[Voltar ou voltar do Android] --> V2[Lista no mesmo recorte e posição, ou a Início se veio dela; sem histórico, a lista]
    D --> END[True end: cada bloco bate com /admin/pedidos/id depois de recarregar, e a resposta à cliente pode ser dada sem o computador]
    D -.->|sai para responder no WhatsApp e volta| X1[Abandono: o app volta ao primeiro plano e relê o detalhe, mesmo pedido na tela]
```

```yaml
journey:
  id: J-ver-um-pedido
  name: Ver um pedido no celular
  value_statement: "A Adri responde a cliente pelo celular sabendo o que foi comprado, o estado do material, como sai e o que já aconteceu"
  personas: [Adri no celular, Equipe com TalkBack, Cliente com conta da loja]
  entry_points:
    - url: /pedidos/<id> (linha da lista)
      origin: in-app-nav
    - url: /pedidos/<id> (linha de Últimos pedidos da Início)
      origin: in-app-nav
    - url: /pedidos/<id> colado
      origin: external-share
  actions:
    - step: 1
      verb: abre o pedido
      expected_observable: número, data, idade e situação no topo; foco no h1
    - step: 2
      verb: lê o próximo passo e o bloqueio
      expected_observable: texto sem botão, nenhuma frase que mande avançar
    - step: 3
      verb: confere cliente, material, joias com gravação e valores
      expected_observable: os blocos iguais aos do painel; o total é o do pedido, sem recalcular
    - step: 4
      verb: toca WhatsApp
      expected_observable: abre a conversa com o número da cliente, sem texto pronto
    - step: 5
      verb: volta
      expected_observable: a lista no mesmo recorte e posição, ou a Início
  goal:
    observable: os blocos do detalhe iguais aos de /admin/pedidos/<id>
    side_effects: [wa.me aberto em nova aba; um canal Realtime de orders; nenhuma escrita]
  true_end_state: depois de recarregar /pedidos/<id>, os mesmos blocos; o voltar devolve a Adri ao ponto de onde veio
  exit:
    natural: volta à lista ou à Início, ou sai para o WhatsApp
  abandonment:
    - at_step: 4
      how: sai para o WhatsApp e só volta minutos depois
      resume: o detalhe relê ao voltar ao primeiro plano
  crosses: [PostgREST orders/order_items/order_status_history/order_notes/order_notifications, RPC atelie_clock, Supabase Realtime, wa.me, painel /admin/pedidos/<id>]
```

## Varredura da taxonomia

| Dimensão | Onde |
| --- | --- |
| Jornada | `MAD-pedido-abrir-e-entender`, `MAD-pedido-ultimos-pedidos-abre-detalhe` |
| Funcional | `MAD-pedido-whatsapp-da-cliente` (o side effect no destino), `MAD-pedido-retirada-no-escritorio` |
| Experiencial | sem CTA morto e tom memorial dentro de `MAD-pedido-abrir-e-entender`; leitor de tela no detalhe dentro de `MAD-pedidos-com-leitor-de-tela` |
| Borda/erro/vazio | `MAD-pedido-inexistente`, `MAD-pedido-bloco-secundario-falha` |
| Transversal | `MAD-pedido-voltar-mantem-recorte` (voltar do Android), `MAD-pedido-muda-com-a-tela-aberta` (painel em outra aba); a fonte grande e 360 px dentro de `MAD-pedidos-fonte-grande-e-telas-estreitas` |
