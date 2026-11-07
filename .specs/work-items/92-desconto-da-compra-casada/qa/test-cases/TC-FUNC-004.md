## TC-FUNC-004: Gravar o desconto de um pingente não muda o Compre Junto de outro

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.4
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-02, objetivo (efeitos)
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

Editar um pingente nunca muda as condições de outro.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01 e M-02 (Q oferece a mesma corrente a 20 %)
- Estado de partida: aba "Compre junto" de P

### Condições reais

As da persona.

### Passos

1. Mudar o percentual da corrente avulsa em P para 12 e salvar
   - **Esperado:** gravado em P
2. Abrir a aba "Compre junto" de Q
   - **Esperado:** a mesma corrente continua a 20 % em Q; os adicionais de Q sem mudança
3. Abrir Q na loja
   - **Esperado:** a corrente com "20% a menos levando junto"

### Esperado e fonte

Fonte: `prd.md` CA-01.4.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| duas abas | P numa aba e Q noutra, salvando as duas | cada uma com o seu percentual |
