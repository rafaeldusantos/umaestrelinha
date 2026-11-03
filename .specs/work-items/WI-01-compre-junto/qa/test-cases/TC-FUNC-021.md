## TC-FUNC-021: Peça que saiu do ar ou esgotou some do bloco, e os outros adicionais continuam

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-07.1, CA-01.5, CA-02.7
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** n/a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a dona muda o estado no painel (aba A) e confere a loja (aba B)

### Objetivo

Quando uma peça sai do ar, a cliente não a vê oferecida, e o resto do conjunto continua à venda.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01 com A1 (lista com ≥ 3 peças) e A2 (peça só)
- Estado de partida: loja com M-01 aberta na aba B

### Condições reais

As da persona.

### Passos

1. No painel, desativar uma peça da lista "Correntes"; recarregar M-01
   - **Esperado:** A1 continua no bloco, sem aquela peça; A2 continua
2. Desativar o produto de A2; recarregar M-01
   - **Esperado:** A2 some; A1 continua
3. Reativar as duas
   - **Esperado:** voltam ao bloco

### Esperado e fonte

Fonte: PRD CA-07.1, CA-01.5, CA-02.7 (o lado da loja).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| variações liberadas todas extintas | desativa todas as variações liberadas de uma peça | a peça sai da loja e nunca passa a oferecer todas (spec › Decisões, 11) |
| loja aberta sem recarregar | tenta levar a peça que acabou de sair do ar | registrar o que acontece (sem esperado na fonte) |
