## TC-JOURNEY-006: Quem entra no app com uma conta sem acesso ao ateliê é barrado sem ver dado de cliente e troca para a conta certa

**Tipo:** journey
**Prioridade:** P1
**Origem:** UC-01, UC-02, UC-09 (D-01, D-02)
**Autor:** dev
**Persona:** PER-05 Conta sem acesso ao ateliê
**Jornada:** J-06, passos 1–4
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** precisa da conta `cliente-sem-papel`

### Objetivo

Quem não administra a loja nunca vê cliente pelas telas novas, e consegue sair para a conta certa.

### Pré-condições

- Conta: `cliente-sem-papel`, depois `admin-atelie`
- Massa: um pedido montado real (o `id` colhido antes)
- Estado de partida: logada como `cliente-sem-papel`

### Condições reais

As da persona.

### Entrada

Deep link nas três rotas novas.

### Passos com tempo

| # | A persona… | Esperado | Em até |
| - | ---------- | -------- | ------ |
| 1 | abre `/pedidos/montar` | a recusa de acesso do app | 5 s |
| 2 | abre `/pedidos?visao=montados` e `/pedidos/montados/<id>` | a mesma recusa, sem cartão, link, peça ou nome | 10 s |
| 3 | sai e entra com `admin-atelie` | Pedidos normal | 20 s |
| 4 | toca em "Montar pedido" | a montagem abre vazia | 3 s |

### Objetivo e efeitos

Nenhum dado de cliente em instante nenhum para a conta sem papel; a conta do ateliê usa tudo depois da troca.

### Caminho de abandono

J-06a: rede cortada ao abrir ⇒ falha de rede com saída, nunca a recusa.

### Esperado e fonte

Recusa só pelo papel, sem dado — fonte: spec D-01, D-02, Obrigações ("recusa só pelo `42501`"); `apps/mobile-adm/CLAUDE.md` › Pedidos montados.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| sem sessão | abre `/pedidos/montar` deslogada | vai ao login; depois de entrar como admin, ao destino |
