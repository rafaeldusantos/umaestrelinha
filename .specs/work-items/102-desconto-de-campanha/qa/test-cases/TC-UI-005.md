## TC-UI-005: As telas da campanha conferem com o protótipo

**Tipo:** ui
**Prioridade:** P2
**Origem:** exploratório — conferência das telas novas contra o Claude Design do Work Item
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, J-03
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** julgamento visual por estilo computado; diferença puramente visual tende a `low`

### Objetivo

As telas novas chegam como a dona aprovou no protótipo — textos, estrutura, estados e medidas.

### Pré-condições

- Conta: `admin-loja`
- Massa: Black Friday em vigência; M-A..M-D marcadas; o bloco da Home ligado
- Estado de partida: `/admin/campanhas`

### Condições reais

os viewports de cada frame (1440 e 390)

### Passos

1. Lista de campanhas, nova e editar contra `Painel - Campanhas, faixa e perfil.html`
   - **Esperado:** trilha, título, subtítulo, colunas, pílulas de estado (verde, azul, cinza, âmbar), textos de ajuda literais, combinações prontas, a prévia de 173 px
2. O cartão da campanha na aba Preço e estoque contra o frame "Produto · campo da campanha"
   - **Esperado:** cabeçalho com nome, pílula e vigência; o grupo de percentuais; a tabela; as notas literais
3. `/ofertas` contra `Black Friday - Vitrine ofertas.html`
   - **Esperado:** trilha, título (28 px celular, 44 px a partir de 1024), linha da campanha, chips, grade 2/3/4
4. O bloco da Home contra `Black Friday - Home.html`
   - **Esperado:** rótulo, título, texto, cartões por percentual (104 px / 220 px de altura, número 56 / 88 px), fileira com "Ver todas"

### Esperado e fonte

Igual ao protótipo onde ele fixa valor; onde o PRD diverge (H-09), vale o PRD — fonte: protótipos do Claude Design
(`item.md` › Insumos); `spec.md` › Design e H-09.

### Protótipo e tela

projeto `4abe021d-d77e-4fe7-affd-524180315fa3`: `Painel - Campanhas, faixa e perfil.html`, `Black Friday - Vitrine ofertas.html`, `Black Friday - Home.html`

### Propriedades a comparar

estrutura, texto literal, tipografia, cor, espaço e raio, estados desenhados (erro de contraste, vigência cruzada,
tirar % em uso)

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| tom | lê todos os textos das telas novas | nada de contagem regressiva, "últimas horas", escassez ou exclamação (RN-14) |
