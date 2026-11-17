## TC-FUNC-008: Na Home, o bloco mostra o selo, o título, a descrição, os cartões de percentual e as peças na ordem da dona

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-01.4, CA-02.2, CA-03.2, CA-04.6, RNF-02
**Autor:** dev
**Persona:** PER-02 Marina
**Jornada:** J-02, passos 1–2 e ramo J-02b
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o conteúdo do bloco na loja; a variação de falha usa bloqueio de rota

### Objetivo

A cliente lê o que a dona escreveu, vê de que campanha é o desconto e quais peças a dona escolheu — e o bloco não
derruba a Home quando as peças não chegam.

### Pré-condições

- Conta: `anonima`
- Massa: B-1 como o CH-01 deixou
- Estado de partida: Home da loja

### Condições reais

as da persona

### Passos

1. Descer até o bloco "Joias em oferta"
   - **Esperado:** o texto do selo de "Dia das Mães" acima do título; o título e a descrição que a dona escreveu;
     os cartões de percentual de "Dia das Mães"; o "Ver todas"
2. Ler as peças
   - **Esperado:** P-3, P-1, P-2, nessa ordem, e só elas (não as quatro primeiras da campanha)
3. Bloquear a leitura de produtos (`**/rest/v1/products*`) e recarregar
   - **Esperado:** a Home continua de pé; o bloco mostra o selo, o título, a descrição e os cartões, sem a
     fileira e sem erro na tela
4. Tirar o bloqueio e recarregar
   - **Esperado:** volta ao passo 2

### Esperado e fonte

Selo acima, título e descrição configurados, cartões com ou sem peças, peças na ordem do editor; a falha das peças
não derruba a Home nem os cartões — fonte: PRD CA-01.4, CA-02.2, CA-03.2, CA-04.6, RNF-02

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| fonte a 200 % | repetir o passo 1 | título e descrição sem corte nem sobreposição |
| computador | repetir em 1440 × 900 | o mesmo conteúdo |
