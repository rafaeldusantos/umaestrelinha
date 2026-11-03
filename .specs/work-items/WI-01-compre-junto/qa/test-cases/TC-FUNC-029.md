## TC-FUNC-029: A lista exige nome de até 40 caracteres, e a lista sem peças salva mas não pode ser escolhida

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.1
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-03, passo 2 e ramo J-03c
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** valor limite; o nome da lista é o que a cliente lê

### Objetivo

A dona não publica um nome que estoura o bloco, nem oferece uma lista vazia à cliente.

### Pré-condições

- Conta: `admin-painel`
- Massa: —
- Estado de partida: editor de "Nova lista"

### Condições reais

As da persona.

### Passos

1. Digitar 40 caracteres e depois tentar o 41º
   - **Esperado:** o contador mostra "40 / 40" e o 41º não entra (ou é recusado com o motivo)
2. Apagar o nome e tentar salvar
   - **Esperado:** "Dê um nome à lista para salvar."; nada grava
3. Salvar com nome e sem peças
   - **Esperado:** grava; o editor diz "Nenhuma peça ainda. A lista só pode ser usada numa joia depois de ter pelo menos uma."
4. Na aba "Compre junto" de um produto, num adicional "Uma peça de uma lista"
   - **Esperado:** a lista vazia aparece desabilitada ("Lista sem peças")

### Esperado e fonte

Fonte: PRD CA-01.1; textos do protótipo do painel (spec › Design › Painel).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| nome colado com emoji e espaços | cola " Correntes ✨ " | registrar como o nome é guardado e mostrado na loja |
