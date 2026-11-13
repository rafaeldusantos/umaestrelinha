## TC-FUNC-014: A faixa rola com a página e o cabeçalho só se recolhe depois que ela sai da tela

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-01
**Autor:** dev
**Persona:** PER-02 Bia
**Jornada:** J-02, passo 4
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** julgamento de rolagem e sobreposição em navegador; o teste de unidade só prova a lógica

### Objetivo

No celular a tela é pequena: a faixa não pode grudar e comer espaço, e o cabeçalho que se recolhe não pode cobrir a faixa nem pular.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto (só leitura)
- Estado de partida: num produto de C1, no topo

### Condições reais

| Dimensão | Valor |
| --- | --- |
| Dispositivo | celular 390 × 844, e a mesma conferência com a fonte a 130 % |

### Passos

1. Rola a página para baixo devagar, até a faixa sair da tela
   - **Esperado:** a faixa sobe com o conteúdo; o cabeçalho continua visível enquanto a faixa está na tela, e nunca cobre a faixa
2. Continua rolando para baixo
   - **Esperado:** depois de a faixa sair, o cabeçalho se recolhe como antes
3. Rola para cima até o topo
   - **Esperado:** o cabeçalho volta; no topo, a faixa está acima dele de novo, sem vão nem sobreposição

### Esperado e fonte

Fonte: PRD UC-01 ("A faixa rola junto com a página (não é fixa) e não muda o comportamento do cabeçalho que se recolhe no celular"); spec H-06, I-08

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| fonte a 130 % | refaz os passos com a raiz em 130 % | a faixa mais alta, e o cabeçalho ainda só se recolhe depois dela |
| rolar rápido de volta ao topo | gesto rápido para cima | nada pisca nem sobrepõe |
