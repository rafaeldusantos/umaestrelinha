## TC-UI-002: Peça sem foto aparece no fundo areia com a estrela da marca em todo lugar da montagem

**Tipo:** ui
**Prioridade:** P2
**Origem:** UC-06
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passo 5
**Charter:** CH-09
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** julgamento visual

### Objetivo

Peça sem foto não parece erro nem buraco na tela.

### Pré-condições

- Conta: `admin-atelie`
- Massa: uma peça sem foto nenhuma (sem capa e sem foto por variação)
- Estado de partida: passo 2

### Condições reais

As da persona.

### Protótipo e tela

PRD vence o protótipo (o protótipo desenha um quadro listrado; a costura decidiu pelo PRD).

### Propriedades a comparar

Fundo areia, a estrela da marca, proporção retrato 4:5 em cada vaga. Viewport 390.

### Passos

1. Olha a peça no catálogo, na folha da variação, na sacola, na revisão e no pedido montado
   - **Esperado:** em todos, o quadro no fundo areia com a estrela da marca, como no detalhe do pedido e em "Joias mais pedidas"

### Esperado e fonte

"Peça sem foto cadastrada: o quadro fica no fundo areia com a estrela da marca" — fonte: PRD › Passo 2; spec Divergências (vale o PRD).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| foto que não carrega | corta a rede das imagens | sem ícone de imagem quebrada sobre o quadro |
