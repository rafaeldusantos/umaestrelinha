# J-registrar-envelope-da-cliente — Registrar e consultar o código do envelope da cliente

Feature `82` (`ENV-01`..`ENV-27`). A cliente posta o envelope com o material (cinzas, leite, cabelo…) e
manda o código pelo WhatsApp. A Adri, no celular, abre o pedido, registra o código no bloco "Material
afetivo" → "Envelope da cliente", e o pedido passa para "A caminho". Depois ela consulta: copia o código,
abre nos Correios, vê quem informou e quando. Quando o envelope chega, "Colocar em produção" leva o
material à bancada. É a remessa de **entrada** (`material_tracking_code`), nunca o rastreio de saída da
joia (`J-registrar-material-e-envio`).

A escrita tem um dono (`writeMaterialTracking`, `core/order-actions`), o mesmo do card do painel; a RPC
`set_material_tracking` grava `material_tracking_set_by`/`_set_at` e move `aguardando → enviado`.

```mermaid
flowchart TD
    E1[Entrada: WhatsApp da cliente com o código] --> E2[Abre o app: Pedidos ou Início]
    E2 --> D[/pedidos/id, bloco Material afetivo/]
    D --> V{Tem código?}
    V -->|não, esperando o envelope| I[Informar código do envelope]
    V -->|sim, esperando| AL[Alterar]
    V -->|sim, qualquer estado| CC[Cartão: código, quem informou e quando]
    V -->|não, recebido ou cancelado| FR[Frase do sem código, sem botão]
    I --> F[Folha: Código do envelope, frase por estado e nome]
    AL --> F
    F -->|cola do WhatsApp| N[Campo normaliza: maiúsculas, sem espaço nem invisível]
    N -->|curto| RC[Confira o código, sem rede]
    N -->|Salvar| RPC[RPC set_material_tracking]
    RPC -->|ok| OK[Aviso: Código do envelope registrado. + passou para A caminho / atualizado]
    RPC -->|empty_code ou material_not_applicable| RR[Recusa legível na folha]
    RPC -->|not_allowed| CP{conferirPapel}
    CP -->|42501| REC[Recusa da 72: Esta conta não tem acesso ao painel.]
    CP -->|papel de pé| MU[Este pedido mudou enquanto você olhava.]
    RPC -->|rede| NE[Não consegui salvar. Tente de novo.]
    OK --> FX[Side effects: set_by admin, set_at now, gatilho material_tracking_set: e-mail à cliente se ligado, aviso à Adri; histórico Você registrou o rastreio do envelope]
    FX --> END[True end: o pedido relido no app e no painel mostra o código, A caminho, Registrado por você, a linha no histórico]
    CC --> CO[Copiar código: Código copiado. / Toque e segure]
    CC --> CR[Ver nos Correios: aba nova com o código no campo, captcha deles]
    D -->|envelope recebido| PR[Colocar em produção: RPC set_material_status em_producao]
    PR --> PRO[Aviso: Pedido em produção. O material de NOME está na bancada.]
    D -->|cancelado| CN[Pedido cancelado, saiu da fila de material. Se o envelope já tiver chegado, devolva à cliente.]
    F -.->|desiste: Agora não, fundo, voltar do Android| X1[Abandono: nada gravado, foco volta a quem abriu]
    F -.->|outra aba ou a cliente muda o pedido| X2[Folha fecha se deixou de ser editável; segue com o digitado se ainda é]
    F -.->|rede cai no meio| X3[Abandono forçado: tela Sem conexão; ao voltar, o pedido relido mostra o que foi gravado]
```

```yaml
journey:
  id: J-registrar-envelope-da-cliente
  name: Registrar e consultar o código do envelope da cliente
  value_statement: "A Adri registra pelo celular o código que a cliente mandou, o pedido passa para A caminho, e ela consegue conferir o envelope nos Correios e saber quem informou e quando"
  personas: [Adri no celular, Equipe com TalkBack, Cliente com conta da loja]
  entry_points:
    - url: /pedidos/<id> (bloco Material afetivo)
      origin: in-app-nav
    - url: /pedidos?bloco=aguardando-material (vindo da Início)
      origin: in-app-nav
  actions:
    - step: 1
      verb: abre o pedido da cliente que mandou o código
      expected_observable: bloco Material com os materiais, há quanto tempo espera e o Envelope da cliente
    - step: 2
      verb: toca Informar código do envelope (ou Alterar)
      expected_observable: folha com a frase do estado e o nome da cliente, foco no campo
    - step: 3
      verb: cola o código que veio no WhatsApp e salva
      expected_observable: código limpo no campo; a folha fecha só no sucesso; aviso de registro
    - step: 4
      verb: confere o envelope
      expected_observable: cartão com o código, Registrado por você agora; Copiar e Ver nos Correios
    - step: 5
      verb: quando o envelope chega, coloca em produção
      expected_observable: Pedido em produção. com o nome da cliente
  goal:
    observable: o código no pedido, A caminho, autoria e data certas, iguais no app e no painel
    side_effects: [orders.material_tracking_code/_set_by/_set_at; material_status aguardando→enviado; gatilho material_tracking_set em order_notifications; releitura do detalhe, lista e Início]
  true_end_state: depois de recarregar o app e abrir /admin/pedidos/<id>, os dois mostram o mesmo código e estado, o histórico do app tem a linha Você registrou o rastreio do envelope, e o link dos Correios abre o código exato
  exit:
    natural: aviso de confirmação e volta à lista
  abandonment:
    - at_step: 2
      how: abre a folha e desiste (Agora não, fundo, voltar do Android)
      resume: nada gravado; reabrir começa do valor salvo
    - at_step: 3
      how: a rede cai no meio do Salvar
      resume: ao voltar, o pedido relido mostra o que de fato foi gravado
  crosses: [RPC set_material_tracking, RPC set_material_status, RPC atelie_clock, edge function send-notification, Resend, Supabase Realtime, Correios (link externo), painel /admin/pedidos/<id>, loja (a cliente informa pelo OrderMaterialBlock)]
```

## Varredura da taxonomia

| Dimensão | Onde |
| --- | --- |
| Jornada | `MAD-envelope-informar-codigo`, `MAD-envelope-alterar-duas-vezes`, `MAD-envelope-colocar-em-producao`; o true end em `MAD-envelope-painel-grava-o-mesmo` |
| Funcional | `MAD-envelope-colar-do-whatsapp`, `MAD-envelope-copiar-e-ver-nos-correios`, `MAD-envelope-cancelado` |
| Experiencial | tom e gramática das frases (`MAD-envelope-sem-nome-e-sem-materiais`); `MAD-envelope-com-leitor-de-tela`; A3/ENV-17/ENV-20 lidos por quem usa (`MAD-envelope-varios-materiais-e-espera`) |
| Borda/erro/vazio | `MAD-envelope-rede-cai-ao-salvar`, `MAD-envelope-erro-fica-na-acao-certa`, `MAD-envelope-queda-curta-com-folha-aberta`, `MAD-envelope-sem-nome-e-sem-materiais` |
| Transversal | `MAD-envelope-outra-aba-com-folha-aberta`, `MAD-envelope-voltar-e-f5-com-folha`, `MAD-envelope-conta-sem-papel`; layout em 360/390/1440 × 100/130/200 % já medido pela prova da feature (45 combinações) — não repetido |

O que só o aparelho prova (fica `blocked-verify`): o colar do teclado do Android a partir do WhatsApp de
verdade, o "toque e segure" do código, a aba dos Correios no app instalado, o voltar do sistema e o TalkBack.
