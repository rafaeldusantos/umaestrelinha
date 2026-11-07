## TC-FUNC-002: Percentual 0, 51, 10,5 ou com letras é recusado com a frase do motivo e nada é gravado

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.2
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-02, ramo J-02a
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a frase exata não está nas fontes de design; confere-se que existe, junto do campo, e diz o motivo (1 a 50, inteiro)

### Objetivo

A dona nunca grava um desconto que a loja não sabe aplicar, e sabe por que foi recusado.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01
- Estado de partida: aba "Compre junto" de P, corrente avulsa com 15 gravado

### Condições reais

As da persona.

### Passos

1. Digitar 0 e tentar salvar
   - **Esperado:** recusa antes de gravar, com a frase do motivo junto do campo
2. Repetir com 51, 10,5, 10.5, "10%" e "abc"
   - **Esperado:** a mesma recusa em cada um
3. Recarregar sem salvar com sucesso
   - **Esperado:** o campo continua com 15

### Esperado e fonte

Fora de 1 % a 50 %, ou não inteiro, recusado antes de gravar, com a frase do motivo — fonte: `prd.md` CA-01.2.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| limites | 1 e 50 | gravados |
| colar de planilha | colar "10\t" | 10, ou recusa clara — nunca gravação silenciosa de outro valor |
| "051" | digitar | 51 recusado, ou recusa — nunca 51 gravado |
