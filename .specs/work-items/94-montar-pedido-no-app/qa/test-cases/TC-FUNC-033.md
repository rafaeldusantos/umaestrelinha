## TC-FUNC-033: No painel, Salvar no cadastro grava o endereço junto com o pedido montado, numa gravação só

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-10 (D-04, D-20, D-32)
**Autor:** dev
**Persona:** PER-04 Adri no computador
**Jornada:** J-05, passos 5–6; ramos J-05a, J-05b
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a falha se provoca parando a `order-proposals` local

### Objetivo

O endereço que a Adri marca para salvar entra na ficha uma vez, e só se o pedido montado for gravado.

### Pré-condições

- Conta: `admin-atelie`
- Massa: cliente sem endereço padrão; cliente com um endereço salvo
- Estado de partida: painel › montar pedido

### Condições reais

As da persona.

### Passos

1. Monta para a cliente sem padrão, com "Outro endereço" e "Salvar no cadastro da cliente" marcada (vem marcada), e cria
   - **Esperado:** o pedido montado; na ficha, o endereço salvo e como padrão
2. Monta para a cliente com endereço salvo, digitando o mesmo endereço, e cria
   - **Esperado:** nenhum endereço duplicado na ficha
3. Com a function parada, cria de novo
   - **Esperado:** "Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo."; nem pedido montado nem endereço novo
4. Abre "Editar" de um pedido montado
   - **Esperado:** "Salvar no cadastro" desmarcada (D-32)

### Esperado e fonte

Fonte: spec UC-10, D-04 (gravado pela function), D-20 (uma gravação só e a frase da falha), D-32 (padrão só sem padrão; sem duplicar).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| sem cliente escolhida | cliente nova no painel | a caixa não aparece até haver cliente |
