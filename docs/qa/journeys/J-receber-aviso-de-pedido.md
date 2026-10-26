# J-receber-aviso-de-pedido — Ligar o aviso no celular e chegar ao pedido por ele

Feature `79` (`MAN-01`..`MAN-42`, `AD-062`). A pergunta da Adri: *"chegou pedido e eu não estou no
computador — fico sabendo?"*. Ela liga o aviso **neste** aparelho, escolhe quais dos quatro eventos
quer, e um pedido pago vira um aviso que abre o pedido. O aviso é por aparelho, independente do
e-mail. A chegada real (FCM, tela de bloqueio, toque) só se prova no Chrome real e no Android.

```mermaid
flowchart TD
    A1[Entrada: Sua conta → Avisos neste celular] --> S0
    A2[Entrada: /avisos colado ou F5] --> S0
    S0{Estado do aparelho}
    S0 -->|sem serviceWorker/PushManager| NS[Este navegador não recebe avisos. sem botão]
    S0 -->|permissão negada| BL[As notificações estão bloqueadas… sem interruptores]
    S0 -->|sem inscrição| D[Avisar neste celular]
    S0 -->|42501| RC[Recusa da 72]
    S0 -->|rede ao ler| FL[Não consegui conferir os avisos deste celular. Tente de novo.]
    D --> P{Pedido de permissão do Android}
    P -->|nega| BL
    P -->|concede| G[Porta subscribe]
    G -->|falha| FA[Não consegui ativar os avisos. Tente de novo., inscrição do navegador desfeita]
    G --> L[Quatro interruptores ligados]
    L --> T[Desliga ou liga um evento: aria-busy, volta se falhar]
    L --> TT[Enviar um aviso de teste] -->|antes de 30 s| CD[Aguarde alguns segundos…]
    TT --> AT[Side effect: aviso Avisos ligados só neste aparelho; toque abre a Início]
    L --> PA[Parar avisos neste celular] --> D
    L --> SA[Sair no menu] -->|porta falha| SQ[Não consegui parar os avisos deste celular. Sair mesmo assim / Tentar de novo]
    SA --> OUT[Inscrição apagada antes do signOut]
    L --> EV[Servidor: payment_approved disparado duas vezes]
    EV --> AV[Side effect: UM aviso Pedido #NNNN pago / R$ valor]
    AV --> TO[Toque] -->|sessão vencida| LG[Login] --> PD
    TO --> PD[/pedidos/id]
    PD --> END[True end: a Adri está no pedido certo, e o histórico mostra a linha Celular ao lado da de e-mail]
    D -.->|fecha o pedido de permissão sem responder| X1[Abandono: segue em Avisar neste celular, nada gravado]
    AV -.->|ignora o aviso| X2[Abandono: o pedido segue na fila da Início; nenhum reenvio de push]
```

```yaml
journey:
  id: J-receber-aviso-de-pedido
  name: Receber o aviso de pedido no celular
  value_statement: "A Adri fica sabendo de pedido pago, recebido, recusado ou de material a caminho sem abrir o computador, só nos aparelhos que ela ligou"
  personas: [Adri no celular, Pessoa da equipe com leitor de tela, Cliente da loja que achou o endereço do ateliê]
  entry_points:
    - url: /avisos (menu da conta)
      origin: in-app-nav
    - url: /pedidos/<id> (toque no aviso)
      origin: push-notification
  actions:
    - step: 1
      verb: toca Avisar neste celular e permite
      expected_observable: quatro interruptores ligados, na ordem da jornada
    - step: 2
      verb: desliga um evento
      expected_observable: só esta inscrição muda; F5 mantém
    - step: 3
      verb: envia um aviso de teste
      expected_observable: Avisos ligados neste aparelho; segundo em menos de 30 s recusado com a frase própria
    - step: 4
      verb: recebe o aviso de um pedido pago e toca
      expected_observable: um aviso só, número e valor; abre /pedidos/<id>
    - step: 5
      verb: para os avisos ou sai
      expected_observable: inscrição apagada; com a porta falhando, a pergunta antes de sair
  goal:
    observable: aviso chega uma vez por evento e aparelho, e o toque abre o pedido certo
    side_effects: [linha push_subscriptions por aparelho; order_notifications com channel push; aviso no sistema]
  true_end_state: "order_notifications tem uma linha push sent por evento; o histórico mostra Celular; o aparelho que parou ou saiu não tem linha em push_subscriptions"
  exit:
    natural: volta ao app pelo pedido aberto
  abandonment:
    - at_step: 1
      how: fecha o pedido de permissão sem responder
      resume: a tela segue em Avisar neste celular, nada gravado
    - at_step: 4
      how: ignora o aviso
      resume: o pedido segue na fila; o push não é reenviado
  crosses: [edge function atelie-avisos, send-notification trigger, mercado-pago webhook, FCM, service worker sw-avisos.js, painel /admin/pedidos/<id>]
```

## Varredura da taxonomia

| Dimensão | Onde |
| --- | --- |
| Jornada | `MAD-avisos-ativar-neste-celular`, `MAD-avisos-aviso-de-pedido-chega-uma-vez`, `MAD-avisos-tocar-abre-o-pedido` |
| Funcional | `MAD-avisos-interruptor-por-evento`, `MAD-avisos-aviso-de-teste`, `MAD-avisos-teste-antes-de-30s`, `MAD-avisos-parar-neste-celular`, `MAD-avisos-sair-para-os-avisos`, `MAD-avisos-historico-canal-celular` |
| Experiencial | `MAD-avisos-tom-memorial`, `MAD-avisos-com-leitor-de-tela` |
| Borda/erro/vazio | `MAD-avisos-permissao-bloqueada`, `MAD-avisos-navegador-sem-suporte`, `MAD-avisos-falha-ao-ativar` |
| Transversal | `MAD-avisos-conta-sem-acesso`, `MAD-avisos-fonte-grande-e-telas-estreitas` |

Fora do QA de navegador e encaminhado: a idempotência no banco, o 404/410 apagando a inscrição e o
orçamento de tempo do webhook são provados pelos probes `02`, `03` e `05` da feature e pela suíte de
functions — não se repetem aqui.
