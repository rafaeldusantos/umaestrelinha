## TC-REG-002: O Dashboard do painel mostra as mesmas visitas e vendas que o app do ateliê

**Tipo:** regression
**Prioridade:** P2
**Origem:** exploratório — a leitura do movimento foi recriada, e o painel também a lê
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, efeitos
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** dois apps (painel :8083 e app :8084); conferência cruzada manual

### Objetivo

A Adri usa o painel no computador e o app no celular; os dois têm de dizer o mesmo movimento.

### Pré-condições

- Conta: `admin-atelie` nos dois
- Massa: a do CH-05
- Estado de partida: painel em http://localhost:8083/admin (Dashboard), app em `/ao-vivo`

### Condições reais

painel em 1440

### Passos

1. Lê "Movimento da loja" no Dashboard em Hoje, Ontem e Semana
   - **Esperado:** o bloco carrega sem erro
2. Compara com Visitas e Vendas do app nos mesmos períodos
   - **Esperado:** os mesmos números

### O que mudou

A leitura do movimento foi recriada com "Com sacola" e a semana anterior; o painel continua lendo só os períodos.

### Pontos de contato com outras jornadas

J-03.

### Esperado e fonte

Painel e app com os mesmos números — fonte: PRD §10.1; spec › Depende / Expõe

### Variações

| Variação      | Ação                  | Esperado            |
| ------------- | --------------------- | ------------------- |
| painel a 390   | abre o Dashboard a 390 | o bloco sem rolar de lado |
