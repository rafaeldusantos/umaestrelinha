## TC-UI-004: O índice e o editor de listas do painel conferem com o protótipo

**Tipo:** ui
**Prioridade:** P2
**Origem:** CA-01.1
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** n/a
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** conferência visual do painel

### Objetivo

A dona encontra as listas como as aprovou no desenho.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-02 e uma lista com peça fora do ar
- Estado de partida: logada

### Condições reais

1440 × 900 (índice e editor) e 390 × 844 (índice em cartões).

### Protótipo e tela

Claude Design, "Uma Estrelinha - Backoffice" — https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Compre+Junto+-+Listas+e+ades%C3%A3o.html × `/admin/compre-junto` e `/admin/compre-junto/listas/:id`.

### Propriedades a comparar

Índice: cabeçalho, "Nova lista", abas "Listas" (com contagem) e "Adesão", tabela (Lista, Peças, Em uso em, Atualizada, Editar) e cartões no celular, aviso "N peça(s) saiu/saíram do ar", fotos em pilha, estado vazio com o texto do protótipo. Editor: subtítulo, cartões "Lista" e "Peças da lista", contador "n / 40", "todas as ativas (N)" / "k de N", lateral "Em uso", barra de salvar.

### Passos

1. Conferir o índice em 1440 e 390
   - **Esperado:** igual ao protótipo
2. Conferir o editor de M-02 e o de "Nova lista"
   - **Esperado:** igual ao protótipo

### Esperado e fonte

Fonte: protótipo do painel (Listas).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| recusa da 13ª peça | provoca a recusa | o texto do protótipo |
