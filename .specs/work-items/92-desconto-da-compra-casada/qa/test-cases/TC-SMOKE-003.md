## TC-SMOKE-003: A dona grava 10% num adicional e a prévia diz por quanto a peça sai com a joia

**Tipo:** smoke
**Prioridade:** P0
**Origem:** CA-01.1, CA-01.5
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-02, passos 1–4
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** sem o percentual gravado, nenhuma sessão da loja tem massa

### Objetivo

Confirmar em dois minutos que o painel grava o percentual e mostra a prévia.

### Pré-condições

- Conta: `admin-painel`
- Massa: P com a corrente avulsa como adicional, sem percentual
- Estado de partida: `/admin/produtos/<id de P>/editar`, aba "Compre junto"

### Condições reais

As da persona (1440, mouse-teclado).

### Passos

1. Digitar 10 no campo "Desconto em percentual" da corrente avulsa
   - **Esperado:** a prévia ao lado: "a corrente sai a R$ X com esta joia", com X = preço da peça × 0,90 a centavo
2. Salvar e recarregar a página
   - **Esperado:** o campo continua com 10

### Esperado e fonte

O campo grava e a prévia mostra o preço com a joia — fonte: `prd.md` CA-01.1, CA-01.5.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| — | — | — |
