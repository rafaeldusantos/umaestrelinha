## TC-FUNC-024: A tela sempre se chama "Loja ao vivo", no título da página e na aba, em qualquer estado

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-62
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-06
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** —

### Objetivo

A Adri, e o leitor de tela dela, sabem em que tela estão mesmo quando a leitura falhou.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01
- Estado de partida: `/ao-vivo`

### Condições reais

as da persona

### Passos

1. Lê o título principal e o título da aba no estado cheio
   - **Esperado:** título principal (nível 1) "Loja ao vivo"; aba "Loja ao vivo · Ateliê"
2. Repete carregando (leitura atrasada), com falha (leitura bloqueada) e com ninguém na loja
   - **Esperado:** o mesmo título principal e o mesmo título da aba nos três

### Esperado e fonte

`h1` e `document.title` em todos os estados — fonte: PRD LAV-62

### Variações

| Variação       | Ação                         | Esperado              |
| -------------- | ---------------------------- | --------------------- |
| loja não medida | estado do TC-FUNC-019        | mesmo título          |
