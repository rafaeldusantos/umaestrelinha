## TC-FUNC-027: Na Semana, "Com sacola" é a soma dos dias, e a tela diz isso em letra pequena

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-51
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, passo 5
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a frase literal da nota não está na fonte; confere-se o sentido

### Objetivo

A Adri não estranha "Com sacola" da semana maior que o esperado quando a mesma cliente voltou em dois dias.

### Pré-condições

- Conta: `admin-atelie`
- Massa: o mesmo navegador com marca de sacola em dois dias desta semana; outros navegadores em um dia só
- Estado de partida: Acessos em Semana

### Condições reais

as da persona

### Passos

1. Lê "Com sacola" na Semana
   - **Esperado:** a soma dos "Com sacola" de cada dia desde segunda (o navegador de dois dias conta 2)
2. Procura a nota
   - **Esperado:** em letra pequena, perto dos números, uma frase dizendo que na semana "Com sacola" é a soma dos dias e que quem pôs joia na sacola em dois dias conta duas vezes
3. Troca para Hoje e Ontem
   - **Esperado:** a nota não aparece

### Esperado e fonte

Soma dos dias na Semana, declarada em letra pequena — fonte: PRD LAV-51 item 2; spec D-01, D-02

### Variações

| Variação      | Ação                   | Esperado                |
| ------------- | ---------------------- | ----------------------- |
| fonte 200 %    | lê a nota              | inteira, sem sobrepor os números |
