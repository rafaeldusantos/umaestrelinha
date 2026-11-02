## TC-FUNC-006: Com alguém no checkout aparece a nota sobre Carrinhos abandonados, sem prazo

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-22
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, passo 5
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** texto literal da fonte

### Objetivo

A Adri entende o que acontece se a compra não fechar, sem a tela a apressar com um prazo.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01
- Estado de partida: `/ao-vivo`, ninguém no checkout

### Condições reais

as da persona

### Passos

1. Com ninguém no checkout, lê o bloco "O que estão fazendo"
   - **Esperado:** nenhuma nota abaixo das quatro linhas
2. Uma cliente abre o checkout; espera a leitura
   - **Esperado:** a nota "Alguém está no checkout agora. Se a compra não fechar e o e-mail já tiver sido preenchido, a sacola fica em Carrinhos abandonados, no painel."
3. Confere a nota
   - **Esperado:** nenhuma hora, minuto ou prazo; nenhuma exclamação
4. A cliente volta à sacola
   - **Esperado:** a nota some

### Esperado e fonte

Nota condicional, literal, sem prazo — fonte: PRD LAV-22; spec D-10

### Variações

| Variação         | Ação                  | Esperado              |
| ---------------- | --------------------- | --------------------- |
| 2 no checkout    | duas clientes no checkout | a mesma nota, uma vez |
