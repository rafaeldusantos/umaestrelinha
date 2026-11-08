## TC-UI-001: As telas da montagem e do pedido montado conferem com o protótipo no celular

**Tipo:** ui
**Prioridade:** P1
**Origem:** UC-01, UC-02, UC-03, UC-04, UC-05, UC-06, UC-07, UC-08, UC-09
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** n/a
**Charter:** CH-09
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** julgamento contra o protótipo; sem o MCP `claude-design`, `not-run`

### Objetivo

A Adri encontra no app o desenho que aprovou, com o tom da marca.

### Pré-condições

- Conta: `admin-atelie`
- Massa: a dos charters CH-01, CH-03 e CH-06
- Estado de partida: `/pedidos`

### Condições reais

As da persona.

### Protótipo e tela

`Montar Pedido.dc.html` (+ `montado-dados.js`), projeto `a780eec8-8aba-4d6e-8b4c-2c485e2750c7` — as telas da tabela **Design** do CH-09.

### Propriedades a comparar

Estrutura e ordem; texto literal; tipografia (família, tamanho, peso); cor (fundo, borda, ícone; o cartão escuro do link e o da leitura); espaço e raio; componentes; estados desenhados. Viewport: 390 (não há frame para 768 nem 1280 — o app é só celular).

### Passos

1. Para cada tela do CH-09, provoca o estado desenhado
   - **Esperado:** igual ao protótipo depois de normalizar, exceto as divergências decididas listadas no CH-09
2. Registra cada diferença com o valor do design e o observado
   - **Esperado:** —

### Esperado e fonte

Fonte: protótipo `Montar Pedido.dc.html`; o PRD e as Decisões D-17, D-18, D-35, D-37, D-38 vencem onde divergem.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| estados sem frame | Montados vazio, carregando | "sem frame" no log |
