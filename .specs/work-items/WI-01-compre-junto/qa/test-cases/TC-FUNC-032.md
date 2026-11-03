## TC-FUNC-032: A lista mostra em quantas joias está em uso, e editá-la muda o bloco de todas

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.4
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** n/a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** duas abas: painel e loja

### Objetivo

A dona sabe o alcance de uma edição antes de fazê-la, e a edição vale onde ela espera.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-02 em uso em M-01 e M-03
- Estado de partida: índice do Compre Junto; M-01 e M-03 na loja

### Condições reais

As da persona.

### Passos

1. Olhar a linha de "Correntes" no índice e a lateral "Em uso" do editor
   - **Esperado:** "2 joias"; os nomes de M-01 e M-03
2. Tirar uma peça da lista e salvar; recarregar M-01 e M-03
   - **Esperado:** a peça some do bloco nas duas joias

### Esperado e fonte

Fonte: PRD CA-01.4.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| mais de 4 joias | lista em uso em 5 joias | até 4 nomes e "Ver as 5 joias" (protótipo) |
