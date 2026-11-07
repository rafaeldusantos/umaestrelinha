## TC-FUNC-001: Adicional sem percentual continua oferecido como antes, sem "de/por"

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.1
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-02, passo 1 e ramo J-02c
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

A dona pode deixar um adicional sem desconto, ou tirar o desconto, sem perder o adicional.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01 (o adicional sem percentual) e a corrente avulsa a 15 %
- Estado de partida: aba "Compre junto" de P

### Condições reais

As da persona.

### Passos

1. Olhar o adicional sem percentual
   - **Esperado:** o campo "Desconto em percentual" vazio
2. Apagar o 15 da corrente avulsa e salvar
   - **Esperado:** gravado; ao recarregar, o campo vazio
3. Abrir P na loja
   - **Esperado:** os dois adicionais oferecidos, só com o preço, sem "de/por", sem "N% a menos levando junto" e sem a linha do desconto no total

### Esperado e fonte

Vazio quer dizer sem desconto, e o adicional continua funcionando como no WI-01 — fonte: `prd.md` CA-01.1.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| só espaços no campo | digitar "  " e salvar | tratado como vazio, ou recusado com a frase — nunca gravado como 0 |
