---
id: BUG-20261004-brick-com-cor-da-loja-anterior
status: fixed
impact: Trust-Damage
area: checkout / pagamento com cartão
found: 2026-10-04 (QA, sessão depois-do-conserto)
---

# O formulário de cartão pinta foco e seleção no magenta da loja anterior

## O que a cliente vê

Ao tocar no número do cartão, a borda do campo fica **magenta** (`#B0176B`) — a cor da Nanita, a
loja que este repositório foi antes do rebrand (`AD-016`). No resto do checkout tudo é azul-marinho
e ouro.

## Causa

`CardPaymentBrick.tsx` passava `baseColor: '#B0176B'` escrito à mão, com o comentário "Geleia".
`brandScan.test.ts` recusa o NOME da marca anterior, não a cor, e nenhum guarda de paleta alcança
uma string passada a um SDK de terceiro.

## Conserto

A cor passou a ser lida de `--estrelinha-primary` (`App.css`, dono da paleta, guardado por
`palette.test.ts`). Sem a folha carregada, o Brick recebe `undefined` e usa a cor padrão dele.
Teste: `CardPaymentBrick.test.tsx` → "a cor do formulário é a da marca" (vermelho antes, verde
depois). Medido no navegador: foco em `#34495e` (`qa/cor-foco.png`).
