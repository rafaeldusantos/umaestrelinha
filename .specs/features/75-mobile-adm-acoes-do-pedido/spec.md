# 75 — mobile-adm: ações no pedido

> **RASCUNHO**: escopo e histórias P1 do programa mobile-adm (`AD-056`). Ao abrir a feature, rodar
> o Specify completo (varredura das dimensões implícitas, portão de fechamento) e o Design. Roteiro e
> decisões comuns: `.specs/features/72-mobile-adm-fundacao/spec.md`. Depende da `72`.
> Telas: Claude Design `a780eec8-…`, `Ateliê Admin.dc.html`. — ações da tela **Pedido**.

## Problem Statement
O envelope chega pelo correio e a postagem acontece no balcão, longe do computador. Marcar
"recebi o material" e salvar o rastreio no celular, na hora, é o que dá autonomia de verdade.

## Escopo
- **Recebi o material** (`material_enviado`/`aguardando_material` → `material_recebido`).
- **Rastreio**: informar ou alterar o código e **Marcar como enviado**. A confirmação avisa: "A
  cliente recebe o e-mail de postagem assim que você salvar o código." ("Agora não" · "Salvar").
- **Lembrar do envio no WhatsApp**: a cobrança de material com a mensagem pronta (`chargeMaterial`),
  sem urgência fabricada e sem nomear o material (`BL-015`).

## Regras
- As transições do material já têm dono duplo deliberado (TS × SQL, `materialTransitions.test.ts`).
  O app chama **a mesma RPC** (`set_material_tracking`) que o painel. Nenhum `update` direto em `orders`.
- `chargeMaterial` sobe para `core`, e o telefone vem de `customer_phone` (a lição do link sem número da `35`).
- O e-mail de postagem é o motor de notificações que já existe. O app não envia e-mail.

## P1 — critérios
1. WHEN ela toca "Recebi o material" num pedido elegível THEN a RPC SHALL ser chamada uma vez e a tela SHALL reler o pedido. (`MAA-01`)
2. WHEN a transição é recusada pelo banco THEN a tela SHALL mostrar o motivo legível do TypeScript, e o estado SHALL não mudar. (`MAA-02`)
3. WHEN ela salva um rastreio THEN o pedido SHALL ir para enviado pela mesma porta do painel, e o histórico SHALL registrar a mudança. (`MAA-03`)
4. WHEN o pedido é de retirada THEN rastreio e "Marcar como enviado" SHALL não aparecer. (`MAA-04`)
5. WHEN ela toca o lembrete do WhatsApp THEN SHALL abrir `wa.me` com o número da cliente e a mensagem de `chargeMaterial`. Sem número, o botão SHALL não aparecer. (`MAA-05`)
6. WHEN ela toca o botão duas vezes seguidas THEN SHALL haver uma gravação só (botão travado enquanto grava). (`MAA-06`)

## Perguntas abertas
- Gerar a etiqueta do Melhor Envio pelo celular? (O protótipo não tem. Sugestão: fica no computador.)
- Cancelar pedido pelo celular? (O protótipo não tem.)
