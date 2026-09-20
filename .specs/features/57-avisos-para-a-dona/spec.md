# 57 — Os avisos para a dona, e o endereço que os recebe

**Status**: em execução
**Escopo**: Large (core + migration + backoffice + guardas)
**Origem**: pergunta do usuário — *"onde é configurado o e-mail que recebe as notificações da loja?
Esse dado precisa ser dinâmico. Existem 2 avisos (Pedido Pago, Material a caminho), mas precisamos
ter outros status de pedido como RECEBIDO."*

---

## O que já era verdade, e o que não era

**O e-mail já é dinâmico.** `recipientFor` (`dispatch.ts:194`) lê `settings.general.email` **na hora
de enviar**, a cada notificação: trocar o valor em `/admin/configuracoes/dados-da-loja` vale no
próximo e-mail, sem deploy e sem secret. Isto **não muda** nesta feature — é o que a pergunta
apurou, e a resposta era "já está".

**O que não era verdade é a separação.** O mesmo `general.email` tem **dois papéis**: ele é o
endereço que recebe os avisos internos **e** o e-mail público da loja, renderizado como `mailto:`
por `PolicyContact.tsx` nas páginas de política. Hoje a Adri não pode ter um endereço bonito na
vitrine e outro que ela de fato lê.

**E há dois avisos, não os que faltam.** `owner_order_paid` nasce de `payment_approved` e
`owner_material_incoming` de `material_tracking_set`. `pix_created` produz **só** `order_received`,
para a cliente — ninguém avisa a dona de que um pedido nasceu.

---

## Decisões do usuário

Apresentadas com o custo de cada uma, e escolhidas:

| Pergunta | Escolha |
| --- | --- |
| Quais avisos novos | **Pedido recebido** (antes do pagamento) e **Pagamento recusado** |
| PIX expirado | **Fora** — maior volume, menor ação possível |
| Cancelado / estornado | **Fora** desta rodada |
| O e-mail interno | **Campo próprio**, que cai no de contato quando vazio |

> **O custo de `owner_order_received` foi declarado e aceito**: "recebido" acontece **antes** do
> pagamento, e num PIX boa parte dos pedidos criados nunca é paga. A dona recebe e-mail de tentativa,
> não de venda. Ela nasce **desligada** (`PNL-06`), como todo aviso novo desde a `42`, então o volume
> só chega quando ela ligar sabendo disso.

---

## Critérios de aceitação

### A — os dois avisos novos

- **`AVD-01`** SHALL existir o evento `owner_order_received`, audiência `owner`, disparado por
  `pix_created` **depois** do `order_received` da cliente (a ordem de `eventsForTrigger` é regra: o
  orçamento de tempo do caixa é compartilhado, e quem espera é o aviso interno).
- **`AVD-02`** SHALL existir o evento `owner_payment_rejected`, audiência `owner`, disparado por
  `payment_rejected` depois do evento da cliente.
- **`AVD-03`** Os dois SHALL nascer **desligados** (`PNL-06`), e a migration SHALL ser aditiva e
  idempotente — um `db push` repetido não pode religar o que a Adri desligou nem sobrescrever o que
  ela editou.
- **`AVD-04`** Os dois SHALL ter texto padrão, nome, descrição e ícone próprios, e SHALL entrar na
  régua de tom que já vale para os outros (`notificationDraftRefusal`).
- **`AVD-05`** A pré-condição de cada um SHALL recusar o envio quando o estado do pedido não o
  justifica — `owner_order_received` exige um pedido existente; `owner_payment_rejected` exige que o
  pagamento tenha sido de fato recusado — **e** quando não há endereço para receber.
- **`AVD-06`** O `check (event in …)` do banco SHALL conhecer os 17, e o guarda SHALL comparar com
  `NOTIFICATION_EVENTS` nos dois sentidos **lendo a migration VIGENTE** — a que recria a constraint
  por último —, nunca a da `42`, que `AD-017` torna imutável.

### B — o endereço que recebe os avisos

- **`AVD-07`** SHALL existir `general.notifications_email`, editável em
  `/admin/configuracoes/dados-da-loja`, separado do e-mail de contato.
- **`AVD-08`** Vazio, ele SHALL cair no e-mail de contato — a loja de hoje não muda de
  comportamento no deploy, e quem não quiser separar não precisa preencher nada.
- **`AVD-09`** "Qual é o endereço que recebe os avisos?" SHALL ter **um dono só** em `core`, e as
  **três** superfícies que hoje fazem essa pergunta SHALL chamá-lo: o destinatário do envio
  (`recipientFor`), a pré-condição (`preconditionFailure`) e o aviso do painel (`NotificationsTab`).
  *Sem isso o fallback nasce escrito três vezes, e a divergência é pior que a ausência: o painel diz
  "nenhum e-mail cadastrado" enquanto o motor manda alegremente para o de contato.*
- **`AVD-10`** O campo novo SHALL ser lido **na hora de enviar**, como o de hoje — nenhum valor de
  e-mail entra em env, secret ou bundle.
- **`AVD-11`** O e-mail **público** da loja SHALL continuar sendo `general.email`: o campo novo é
  interno e **não** aparece em nenhuma tela da loja.

### C — o que não pode regredir

- **`AVD-12`** Os 15 eventos de hoje SHALL continuar com o mesmo texto, o mesmo estado de
  ligado/desligado e o mesmo gatilho.
- **`AVD-13`** A seção Notificações SHALL continuar cabendo abaixo de 2.500px com tudo recolhido, em
  1440 e em 390 — com 17 cards em vez de 15 (`LEG-12` da feature 56).

---

## Success criteria

1. Nenhum campo, texto ou comportamento de envio removido.
2. `packages/core/src/payment/**` sem uma linha alterada.
3. Sem regressão de lint, tipos e testes contra as baselines do `CLAUDE.md`.
4. A migration é aditiva e idempotente, e não reescreve nenhuma já aplicada.

---

## Out of scope

| O que | Por quê |
| --- | --- |
| `owner_pix_expired`, `owner_order_cancelled`, `owner_payment_refunded` | Recusados pelo usuário nesta rodada. O desenho não os impede — são três entradas de lista e um gatilho cada. |
| Mais de um destinatário | Recusado: `recipientFor` devolve UM destino, e a lista pede mudança de assinatura. |
| `{{motivo_recusa}}` | A variável **não existe** em `NOTIFICATION_VARIABLES`, e criá-la exige o dado da Mercado Pago atravessar o resolvedor. O texto de `owner_payment_rejected` diz que foi recusado e manda abrir o painel. |
| Canal WhatsApp | Feature 43. |
| Reagrupar as seções de Notificações | O primeiro grupo já tem nove eventos e vai a dez; é regra da `53`, e a dívida está registrada. |

---

## Edge cases

- **Os dois campos de e-mail vazios.** O aviso é **pulado** com `no_owner_contact` — não falha, não
  enfileira. O painel avisa nos quatro cards `owner_*`.
- **Só o de avisos vazio.** Cai no de contato. É o estado de toda loja no dia do deploy.
- **Só o de contato vazio, com o de avisos preenchido.** O aviso interno sai; a página de política
  deixa de mostrar e-mail. São perguntas diferentes, e cada uma responde pela sua.
- **PIX criado e pago em seguida.** A dona recebe **dois** e-mails — "recebido" e "pago". É o
  comportamento pedido, e é o argumento para o evento nascer desligado.
- **Pagamento recusado e retentado com sucesso.** Dois avisos, um de cada. A chave de "já enviei"
  é `(order_id, event, channel)`, então uma segunda recusa do **mesmo** pedido não reenvia.
