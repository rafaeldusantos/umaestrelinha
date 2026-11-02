## TC-FUNC-016: A mesma cliente com a loja em duas abas conta como uma pessoa

**Tipo:** functional
**Prioridade:** P2
**Origem:** LAV-12
**Autor:** dev
**Persona:** PER-03 Lúcia
**Jornada:** J-05, ramo J-05c
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** o código da presença é um por navegador e por dia (spec D-01); qual estado vence entre as abas não é decidido pela fonte — só se confere "uma pessoa"

### Objetivo

Duas abas não são duas pessoas; a Adri não pode ver o número dobrar quando a cliente compara joias.

### Pré-condições

- Conta: `anonima` com estatística aceita; a Adri lê `/ao-vivo`
- Massa: ambiente do CH-01; ninguém mais na loja
- Estado de partida: Lúcia numa joia, contada como 1

### Condições reais

as da persona

### Passos

1. Abre uma segunda aba no mesmo navegador, em outra joia; alterna as duas, deixando cada uma visível por 2 min
   - **Esperado:** o total continua 1 durante todo o tempo
2. Lê a lista de joias
   - **Esperado:** no máximo as duas joias, cada uma com "1 pessoa" ou só uma delas — nunca o total acima de 1

### Esperado e fonte

Uma pessoa por navegador — fonte: PRD LAV-12 ("visitante com batida"); spec D-01 (código por navegador e por dia)

### Variações

| Variação           | Ação                      | Esperado              |
| ------------------ | ------------------------- | --------------------- |
| outro navegador     | a mesma pessoa noutro contexto | conta 2 (outro navegador) |
