## TC-UI-001: O cartão "Agora na loja" do Início confere com o protótipo

**Tipo:** ui
**Prioridade:** P2
**Origem:** LAV-02
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 1
**Charter:** CH-09
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** conferência contra a fonte de design; julgamento visual

### Objetivo

O cartão é o primeiro contato da Adri com a presença; ele deve ser o que foi desenhado com ela.

### Pré-condições

- Conta: `admin-atelie`
- Massa: 3 clientes presentes, uma com sacola e uma no checkout
- Estado de partida: Início

### Condições reais

as da persona (390)

### Protótipo e tela

`Ateliê Admin.dc.html` › Início › cartão "Agora na loja" (`02-inicio-cartao-agora-na-loja.png`, `01-inicio-390.png`) × http://localhost:8084/

### Propriedades a comparar

| Propriedade                       | Design                                                     |
| --------------------------------- | ---------------------------------------------------------- |
| posição                           | abaixo da faixa escura, antes de "Precisa de você"; padding 16 no topo e 20 nas laterais |
| caixa                             | fundo `surface`, borda `line`, raio 20, padding 16, sombra suave; gap 14 |
| eyebrow                           | ponto 8 × 8 `accent`; "Agora na loja" 11/600, caixa alta, .1em, `ink-soft` |
| número                            | `font-display` 700, 30 px, −0.02em, `primary`; "pessoas" 14 px `ink-soft` |
| linha do funil                    | 13 px `ink-soft`                                           |
| mini gráfico                      | 96 × 40, gap 2, 15 barras, raio 2, a última `accent`, as outras `line` |
| chevron                           | `chevron-right` 20 px `ink-soft`                           |

Viewports: 390 (o único frame).

### Passos

1. Mede cada propriedade da tabela no cartão, pelos valores computados
   - **Esperado:** iguais ao design, normalizados

### Esperado e fonte

As propriedades do protótipo, onde o PRD não diverge — fonte: protótipo › Início; spec › Design

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| —        | —    | —        |
