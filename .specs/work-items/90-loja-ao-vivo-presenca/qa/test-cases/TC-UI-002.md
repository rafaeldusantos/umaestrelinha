## TC-UI-002: O cabeçalho e os blocos "Agora na loja" e "O que estão fazendo" conferem com o protótipo

**Tipo:** ui
**Prioridade:** P2
**Origem:** LAV-10, LAV-11, LAV-20
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 5; J-02
**Charter:** CH-09
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** conferência contra a fonte de design

### Objetivo

O bloco escuro com o número dourado é o centro da tela; deve ser o desenhado.

### Pré-condições

- Conta: `admin-atelie`
- Massa: 3 clientes: olhando, com sacola, no checkout
- Estado de partida: `/ao-vivo`

### Condições reais

as da persona (390)

### Protótipo e tela

`Ateliê Admin.dc.html` › Loja ao vivo › topo (`03-ao-vivo-topo-390.png`) × http://localhost:8084/ao-vivo

### Propriedades a comparar

| Elemento        | Design |
| --------------- | ------ |
| cabeçalho       | 60 px, `surface`, borda `line`; Voltar 44 × 44 com `chevron-left` 22; título display 700 17 px; frescor 12 px `ink-soft` |
| corpo           | padding 16, gap 12; ordem A · B · C · D · E · Acessos (Acessos com 12 a mais no topo) |
| bloco A         | fundo `ink`, raio 20, padding 20; eyebrow com ponto `accent` em `on-ink-strong`; número 56 px display 700, line-height 1, −0.03em, `accent`; "pessoas nos últimos 5 minutos" 15/300 `on-ink-strong`; 30 barras em 56 px de altura, gap 3, raio 2, a última `accent`, as outras `on-ink-border`; legendas 11 px `on-ink` |
| bloco B         | `surface`, padding 16, título 17 px; rótulo 14 px, número display 700 `primary`; trilho 6 px `ground-deep`, raio 999; cores: Olhando `field`, Com sacola `primary`, No checkout `accent`; nota 13 px/1.45 `ink-soft`, borda superior `line`, margem 14, padding-top 12 |

Viewports: 390.

### Passos

1. Mede cada propriedade pelos valores computados
   - **Esperado:** iguais ao design, normalizados; "Compraram" **sem** barra (o PRD vence o protótipo)

### Esperado e fonte

As propriedades do protótipo onde o PRD não diverge — fonte: protótipo › Loja ao vivo; spec › Design

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| —        | —    | —        |
