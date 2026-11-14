## TC-CFR-003: O ⓘ do frete grátis abre com o ponteiro, o toque e o teclado, fecha com Esc e com toque fora, e o balão não passa da largura da gaveta

**Tipo:** cfr
**Prioridade:** P1
**Origem:** CA-22 (PRD 99 M-03; `spec.md` D-09)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passo 2; J-02, passo 4
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** a largura do balão dentro da gaveta (Popover em portal sobre um diálogo modal) só se confirma no navegador

### Objetivo

A regra do frete grátis mora no ⓘ: se Luana não consegue abri-lo com o dedo, ou Teresa com o teclado, a informação que
saiu da faixa some para elas.

### Pré-condições

- Conta: anonima
- Massa: Sul + Sudeste, R$ 450; fixture A
- Estado de partida: gaveta aberta, sem CEP

### Condições reais

390 × 844 (toque) e 1440 × 900 (mouse e teclado).

### Passos

1. Em 1440, passa o ponteiro sobre o ⓘ e tira
   - **Esperado:** o balão abre ao passar e fecha ao sair; com um clique, fica aberto
2. Tab até o ⓘ
   - **Esperado:** foco visível; o balão abre no foco; o nome acessível é "Sobre o frete grátis" com `aria-expanded`; o
     balão é `tooltip`; Esc fecha
3. Em 390, toca no ⓘ, depois toca fora
   - **Esperado:** abre ao tocar, fecha ao tocar fora; um segundo toque no ⓘ também fecha
4. Com o balão aberto em 390, mede as bordas
   - **Esperado:** o balão dentro da largura da gaveta (a ~12 px de cada borda), sobre a lista, sem rolagem horizontal
5. Repete o passo 4 com a faixa "fora" (40020-000), a de texto mais longo
   - **Esperado:** idem

### Categoria

Acessibilidade (teclado, nomes) e compatibilidade (viewport).

### Metas

| Observável             | Alvo                         | Aceitável |
| ---------------------- | ---------------------------- | --------- |
| abre por ponteiro, toque, foco | os três              | —         |
| fecha por Esc e fora   | os dois                      | —         |
| alvo de toque          | ≥ 44 px                      | —         |
| balão em 390           | dentro da gaveta             | —         |
| movimento reduzido     | o balão entra sem animação   | —         |

### Esperado e fonte

PRD 99 CA-22, M-03; `spec.md` › Design › "O ⓘ", D-09.

### Variações

| Variação            | Ação                                   | Esperado                         |
| ------------------- | -------------------------------------- | -------------------------------- |
| `reducedMotion`     | emula movimento reduzido e abre         | sem a subida de 4 px             |
| Fonte a 200 %       | abre o ⓘ                                | texto do balão inteiro, dentro da tela |
