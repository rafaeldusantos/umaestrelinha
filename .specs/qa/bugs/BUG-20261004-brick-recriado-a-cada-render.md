---
id: BUG-20261004-brick-recriado-a-cada-render
status: fixed
impact: Blocks-Completion
area: checkout / pagamento com cartão
found: 2026-10-04 (relato da dona em produção; reproduzido em QA no mesmo dia)
---

# O formulário de cartão é recriado do zero a cada renderização da página

## O que a cliente vê

Três sintomas, a mesma causa:

1. **Ao digitar o número do cartão, a "tela recarrega"** e o formulário volta vazio.
2. **Com tudo preenchido, "Pagar" fica desabilitado** — ou o contrário: habilitado sobre um
   formulário que acabou de ser esvaziado.
3. **Ao clicar em "Pagar" (habilitado), os dados do cartão somem** e nada acontece.

## Reprodução (persona: cliente no celular, 390×844, sem conta)

1. `/produtos/pingente-menino-zirconias-no-bone-pequeno-em-prata-925` → rolar → "Adicionar à sacola".
2. `/checkout` → Contato → Entrega (CEP 01310-100) → Cartão de crédito.
3. Digitar o número de um cartão de teste.

**Medido (`qa/antes-do-conserto`):** antes de digitar, 0 reconstruções; depois do número,
**6 reconstruções do container e 1 troca do controller** do Brick. O campo de validade some debaixo
do dedo, e o CTA aparece **habilitado** com o número já apagado
(`antes-do-conserto-03-numero.png`).

## Causa

`@mercadopago/sdk-react` 1.0.7, `CardPayment`: o `useEffect` que cria o Brick depende de
`[initialization, customization, onBinChange, onReady, onError, onSubmit]` e, na limpeza, chama
`cardPaymentBrickController.unmount()`. `CardPaymentBrick` passava `customization` e `onSubmit` como
**literais novos a cada render** (e, desde `6e57219`, também `onBinChange`). Qualquer renderização
do pai recria o Brick vazio:

- o sintoma 1 nasceu em `6e57219`: `onBinChange` → store → a página renderiza → Brick recriado;
- o sintoma 3 é **anterior**: o clique faz `setBusy(true)`, a página renderiza, e o Brick é
  destruído no meio de `getFormData()`.

## Evidência

`scratchpad/qa/antes-do-conserto-*.png`, `antes-do-conserto.json` (sessão de 2026-10-04).

## Conserto

`CardPaymentBrick.tsx`: `customization` em `useMemo([maxInstallments])`, `onBinChange` em
`useCallback`, `onSubmit` como constante do módulo (`SEM_SUBMIT`). Teste de regressão:
`CardPaymentBrick.test.tsx` → "renderizar de novo NÃO recria o Brick", com a régua do SDK (`toBe`)
nas seis dependências — **vermelho antes** (`customization` com identidade nova), verde depois.

Re-walk no navegador (`depois-do-conserto`, `s3-confirmacao`, `s6-afetivo-pos`): **0 reconstruções
e 0 trocas de controller** do número digitado até depois do clique (eram 6 e 1); "Pagar" habilita
com tudo preenchido; o cartão continua preenchido depois do clique; o Mercado Pago tokeniza e o
pagamento é aprovado.
