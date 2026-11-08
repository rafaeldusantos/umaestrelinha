## TC-SEC-001: Conta sem acesso ao ateliê vê a recusa na montagem, em Montados e no pedido montado, sem dado de cliente

**Tipo:** security
**Prioridade:** P0
**Origem:** UC-01, UC-02, UC-05, UC-09 (D-01, D-02, D-40)
**Autor:** dev
**Persona:** PER-05 Conta sem acesso ao ateliê
**Jornada:** J-06, passos 1–3; ramo J-06a
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** precisa da conta `cliente-sem-papel`

### Objetivo

Nenhum dado de cliente sai pelas telas novas para quem não administra a loja.

### Pré-condições

- Conta: `cliente-sem-papel`
- Massa: um pedido montado real (o `id`)
- Estado de partida: logada

### Condições reais

As da persona.

### Passos

1. Abre `/pedidos/montar`; snapshot no primeiro quadro e depois de 2 s
   - **Esperado:** a recusa de acesso do app; nenhuma busca de cliente, nenhum nome
2. Abre `/pedidos?visao=montados`
   - **Esperado:** a recusa; nenhum cartão
3. Abre `/pedidos/montados/<id>`
   - **Esperado:** a recusa; nenhum link, peça, cliente ou histórico
4. Com a rede cortada, recarrega uma das rotas
   - **Esperado:** falha de rede (com saída), nunca a recusa

### Esperado e fonte

"recusa só pelo `42501`" e "nenhum dado de cliente" — fonte: spec D-01, D-02, Obrigações transversais; `apps/mobile-adm/CLAUDE.md` › Pedidos montados.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| sem sessão | abre `/pedidos/montar` deslogada | o login |
