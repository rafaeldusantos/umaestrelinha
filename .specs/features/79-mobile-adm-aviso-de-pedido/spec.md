# 79 — mobile-adm: aviso de pedido pago (push no Android)

> **RASCUNHO**: escopo e histórias P1 do programa mobile-adm (`AD-056`). Ao abrir a feature, rodar
> o Specify completo (varredura das dimensões implícitas, portão de fechamento) e o Design. Roteiro e
> decisões comuns: `.specs/features/72-mobile-adm-fundacao/spec.md`. Depende da `72`.
> Telas: Claude Design `a780eec8-…`, `Ateliê Admin.dc.html`. Depende também da `74` (o aviso abre o detalhe do pedido).

## Problem Statement
Hoje ela só sabe que vendeu se abrir o app ou ler o e-mail. Um aviso no celular quando o pedido é
pago (e quando o envelope é marcado como postado pela cliente) fecha o ciclo.

## Escopo
- Pedir permissão de notificação **depois** de um toque dela ("Avisar quando chegar pedido"), nunca na abertura.
- Inscrição Web Push (VAPID) gravada por aparelho, ligada ao usuário admin.
- O motor de notificações (`send-notification`, eventos `owner_*` da `57`) passa a ter um canal
  push além do e-mail, com o mesmo interruptor por evento.
- Tocar o aviso abre o pedido no app.

## Regras
- Nova tabela de inscrições, fechada a `anon`, com policy por `auth.uid()`. A chave privada VAPID é
  secret de servidor e **nunca** chega a `apps/**` (`chaveDeServidorForaDoNavegador.test.ts`).
- Inscrição que o push service devolve como expirada (404/410) é apagada na hora do envio.
- O aviso não carrega dado sensível no corpo além do número do pedido e do valor.

## P1 — critérios
1. WHEN um pedido passa a pago THEN cada aparelho inscrito SHALL receber **um** aviso (sem duplicar em retentativa do webhook). (`MAN-01`)
2. WHEN o evento está desligado nas Notificações THEN nenhum push SHALL sair. (`MAN-02`)
3. WHEN ela toca o aviso THEN o app SHALL abrir no detalhe daquele pedido. (`MAN-03`)
4. WHEN a inscrição expirou THEN o envio SHALL apagá-la e seguir para as outras. (`MAN-04`)

## Perguntas abertas
- Quais eventos além de "pedido pago": material recebido? Pix expirado?
- Horário de silêncio (não avisar de madrugada)?
