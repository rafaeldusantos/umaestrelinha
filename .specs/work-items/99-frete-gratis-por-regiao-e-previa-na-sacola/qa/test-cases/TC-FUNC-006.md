## TC-FUNC-006: Com CEP de São Paulo ou do Rio Grande do Sul e a faixa alcançada, o frete grátis é liberado na sacola e no checkout com o mesmo Total

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-16, CA-06 (PRD 99 UC-08, M-02; PRD 97 RN-03)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passos 5 a 7
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** dinheiro, P0, determinístico

### Objetivo

Quando Luana alcança a faixa e mora numa região da campanha, ela tem de ver o frete grátis concedido — e pagar
exatamente isso no checkout.

### Pré-condições

- Conta: anonima
- Massa: Sul + Sudeste, R$ 450; peças que somem ≥ R$ 450; fixture A
- Estado de partida: gaveta com 01310-100 calculado e o PAC escolhido, abaixo da faixa

### Condições reais

As da persona.

### Passos

1. Aumenta a quantidade até o subtotal passar de R$ 450
   - **Esperado:** a faixa vira destaque em ouro, com o ✓, "Frete grátis liberado" em negrito e o ⓘ, sem barra; o PAC
     (a mais barata) sai "Grátis" com o valor cheio riscado; o SEDEX mantém o preço; "Frete · PAC" Grátis; o Total sem
     frete
2. Toca no ⓘ
   - **Esperado:** "Entrega em São Paulo/SP, região Sudeste. A forma de envio mais barata sai sem custo."
3. Segue ao checkout e confere Entrega e Resumo
   - **Esperado:** a mesma opção "Grátis" com o valor riscado e o mesmo Total da gaveta
4. Repete os passos 1 a 3 com 90010-000
   - **Esperado:** o mesmo, com "Entrega em Porto Alegre/RS, região Sul. …"

### Esperado e fonte

"Frete grátis liberado", a mais barata "Grátis" riscada, só ela, Total sem frete, igual na gaveta e no checkout —
fonte: PRD 99 CA-16, UC-08, M-02; PRD 97 CA-06, RN-03.

### Variações

| Variação                        | Ação                                       | Esperado                                           |
| ------------------------------- | ------------------------------------------ | -------------------------------------------------- |
| Escolhe o SEDEX acima da faixa  | toca no SEDEX                              | o SEDEX é cobrado; só a mais barata é grátis       |
| 1440 × 900                      | repete a comparação gaveta × checkout       | o mesmo Total                                      |
| Exatamente R$ 450,00            | sacola somando R$ 450,00, se o catálogo permitir | conta como alcançada                          |
