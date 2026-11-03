## TC-UI-006: A aba Adesão confere com o protótipo do painel

**Tipo:** ui
**Prioridade:** P2
**Origem:** CA-06.4
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** n/a
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** o estado vazio não está desenhado; os dados do protótipo são fictícios

### Objetivo

A dona lê o relatório como o desenhou.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-08, gravada pela thread no banco local antes do CH-04 (decisão D-01 do plano) e só apagada ao fim da rodada, ainda presente no CH-08
- Estado de partida: logada

### Condições reais

1440 × 900 e 390 × 844.

### Protótipo e tela

Claude Design, "Uma Estrelinha - Backoffice", `Compre Junto - Listas e adesão.html` (Adesão) × `/admin/compre-junto/adesao`.

### Propriedades a comparar

Seletor 7/30/90; três indicadores com as linhas de apoio; nota da régua; cartão com alternador "Por joia principal" / "Por lista"; colunas de cada recorte; barra proporcional; cartões no celular.

### Passos

1. Conferir em 1440 e em 390
   - **Esperado:** igual ao protótipo na estrutura e nos textos fixos

### Esperado e fonte

Fonte: protótipo do painel (Adesão); PRD CA-06.4.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| vazio | período sem pedido | sem frame — registrar "sem frame", não comparar |
