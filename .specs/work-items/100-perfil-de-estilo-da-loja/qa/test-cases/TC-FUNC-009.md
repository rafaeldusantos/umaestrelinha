## TC-FUNC-009: No Black Friday o selo de desconto do cartão e da página do produto fica em ouro, e os outros selos não mudam de papel

**Tipo:** functional
**Prioridade:** P1
**Origem:** RN-01 (a exceção do desconto)
**Autor:** dev
**Persona:** PER-02 Bia
**Jornada:** J-03, passos 2 e 3
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** cor computada do selo; precisa de um produto com preço "de/por" no catálogo local

### Objetivo

Na campanha, o desconto tem de saltar aos olhos. Se o selo "-X%" fica preto como os outros, a oferta passa
despercebida.

### Pré-condições

- Conta: `anonima` (antes do login da conta)
- Massa: perfil salvo = Black Friday; um produto com "de/por" (selo "-X%")
- Estado de partida: Home em 390 × 844

### Condições reais

As da persona.

### Passos

1. Entra numa categoria com o produto em oferta
   - **Esperado:** o selo "-X%" do cartão com fundo `#C2A063` (sale) e texto `#161514` (on-sale), sólido
2. Procura um cartão com "Novo" ou "Últimas"
   - **Esperado:** esses selos no papel de sempre (não passam a ouro)
3. Abre o produto em oferta
   - **Esperado:** o selo "-X%" da galeria com o mesmo fundo e texto do cartão

### Esperado e fonte

Selo de desconto em ouro com texto escuro; nenhum outro selo muda de papel — fonte: PRD RN-01; spec H2, H3; spec ›
Design (Regras de papel no BF).

### Variações

| Variação              | Ação                         | Esperado                                         |
| --------------------- | ---------------------------- | ------------------------------------------------ |
| 1440 × 900            | repete                       | o mesmo                                          |
| "-X%" e "Novo" juntos | cartão com os dois           | dá para distinguir os dois de relance            |
| Padrão                | (conferido no CH-06)         | o selo como hoje: fundo `#34495E`, texto branco  |
