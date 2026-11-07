## TC-FUNC-006: No bloco, cada peça com desconto mostra o preço da variação escolhida riscado e o preço levando junto, também nas peças de uma lista

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-02.1
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 1
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** as peças de uma lista ficam numa faixa que rola dentro dela (protótipo), exigida neste WI — decisão Q-02, 2026-11-04

### Objetivo

Marina vê, antes de marcar, quanto cada peça custa levando junto, para a variação que ela escolheu, e percorre as
peças da lista sem a página rolar de lado.

### Pré-condições

- Conta: `anonima`
- Massa: M-01 (lista a 10 % com 3 ou mais correntes de preços diferentes; corrente avulsa R$ 79,90 a 15 %)
- Estado de partida: página de P

### Condições reais

As da persona.

### Passos

1. Olhar a corrente avulsa
   - **Esperado:** "R$ 79,90" riscado, "R$ 67,92" e "15% a menos levando junto"
2. Trocar a variação da corrente para uma de outro preço
   - **Esperado:** o riscado e o preço levando junto acompanham a variação escolhida
3. Abrir a escolha da lista "Correntes"
   - **Esperado:** as peças numa faixa que rola dentro dela (na horizontal, sem rolar o `body`), cada cartão com o "de/por" dele, sem a frase "N% a menos levando junto"
4. Rolar a faixa até a última peça e escolher uma
   - **Esperado:** a última peça alcançável pelo dedo; a linha do adicional, com a peça escolhida, com o "de/por" e "10% a menos levando junto"

### Esperado e fonte

Fonte: `prd.md` CA-02.1; `spec.md` › Design › Loja — Bloco ("Peças de uma lista (faixa que rola dentro dela): cada
cartão com o 'de/por'; sem a frase"; o preço levando junto = `round(cheio × (100 − pct)) / 100`); decisão Q-02 do
Gate 1 (a faixa é exigida). A grade de hoje no lugar da faixa é bug.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| 1440 | abrir a lista no computador | a faixa conforme o frame do protótipo |
| variação não liberada | procurar a variação que a dona não liberou | não oferecida (WI-01) |
| peça esgotada | — | some do bloco (WI-01), sem achado |
