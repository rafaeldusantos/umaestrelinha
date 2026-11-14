## TC-UI-002: A Home no perfil Black Friday segue o protótipo no computador e no celular

**Tipo:** ui
**Prioridade:** P2
**Origem:** RN-01, RN-06 (protótipo da Home)
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, passo 1
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** conferência de token por elemento contra o Claude Design

### Objetivo

A dona aprovou uma Home de Black Friday no protótipo; a loja deve vestir exatamente aqueles papéis de cor.

### Pré-condições

- Conta: `admin-loja` (a Home se abre sem login, numa aba nova)
- Massa: S1
- Estado de partida: `http://localhost:8082/`

### Condições reais

Os frames do protótipo: computador e celular 390.

### Protótipo e tela

`Black Friday - Home.html` com o tema Black Friday (`bf.css`, `.palco[data-tema="bf"]`) × `/`.

### Propriedades a comparar

Cor por elemento pelo token que ele lê (spec › Design, "Elementos que mudam"): cabeçalho (primary-strong), faixa de
departamentos, ícones, "Ver todos", preço, aba ativa, link e foco (primary), texto corrido, faixa de declaração,
coração (ink), subtítulos, rodapé, parcelas (ink-soft), círculo da busca e botões ouro (accent), bordas (line), faixas
claras (ground-deep), bordas de campo (field), sombra suave; os tons iguais nos dois perfis (ground, surface,
on-primary, serenity, whatsapp); a marca no tom escuro.

### Passos

1. Compara em 1440 com o frame de computador
   - **Esperado:** cada elemento com o token do design (token vence valor)
2. Compara em 390 com o frame de celular
   - **Esperado:** as mesmas cores; só o layout muda

### Esperado e fonte

A Home no perfil Black Friday como no protótipo — fonte: `Black Friday - Home.html`; PRD tabela do perfil; spec ›
Design.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| —        | —    | —        |
