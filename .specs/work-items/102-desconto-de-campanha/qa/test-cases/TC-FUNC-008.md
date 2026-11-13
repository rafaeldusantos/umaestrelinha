## TC-FUNC-008: Peça que já tinha "de/por" cobra o menor preço, nunca os dois descontos somados

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-06
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-04, passo 1
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** pedido de automação E2E

### Objetivo

A peça que já estava com preço reduzido não ganha, na campanha, um desconto em cima do outro — e nem fica mais cara
que antes.

### Pré-condições

- Conta: `anonima`
- Massa: Black Friday em vigência; M-C (variação com "de" pouco acima do "por") marcada em 10 %
- Estado de partida: página de M-C, na variação com "de/por"

### Condições reais

as da persona

### Passos

1. Olha o preço da variação com "de/por"
   - **Esperado:** "De" = o "de" da variação; o preço = o **menor** entre o "por" de hoje e o "de" com 10 %
2. Acrescenta à sacola e vai ao checkout
   - **Esperado:** o mesmo valor; nunca o "por" com mais 10 % em cima
3. Finaliza e abre `/pedido/:id`
   - **Esperado:** o mesmo valor cobrado

### Esperado e fonte

"De" R$ 259,90 / por R$ 239,90 com 10 % ⇒ cobra R$ 233,91, "de" R$ 259,90; nunca R$ 215,91 — fonte: PRD CA-06,
RN-06; `spec.md` T7, I-03.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| "de/por" mais forte que a campanha | variação com "por" bem abaixo do "de" com 10 % | cobra o "por" de hoje; a peça segue comum (sem selo, fora do recorte do cupom) — I-02 |
| outra variação de M-C | variação sem "de" | 10 % sobre o preço dela |
