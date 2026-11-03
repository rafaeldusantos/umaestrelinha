## TC-UI-005: A aba "Compre junto" do produto confere com o protótipo do painel

**Tipo:** ui
**Prioridade:** P2
**Origem:** CA-02.1
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** n/a
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** conferência visual; o campo de desconto e a faixa de conversão do protótipo não nascem aqui

### Objetivo

A dona monta os adicionais na tela que aprovou no desenho.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01 com adicionais de lista e de peça; um produto sem adicionais
- Estado de partida: logada

### Condições reais

1440 × 900.

### Protótipo e tela

Claude Design, "Uma Estrelinha - Backoffice" — https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Produto+-+Compre+Junto.html × `/admin/produtos/<id de M-01>/editar`, aba "Compre junto".

### Propriedades a comparar

Cartão "n de 3 adicionais", lista numerada, "Acrescentar um adicional"; por adicional: nome como a loja mostra ("Adicional N" vazio), Subir/Descer/Tirar, alternador "O que a cliente escolhe", rádio das listas, busca de peça, "Some quando a cliente escolhe"; laterais "Na loja" e "Quando a peça sai do ar"; estado "Sem Compre Junto. A página desta joia fica como hoje, sem o bloco."

### Passos

1. Conferir a aba de M-01 e a do produto sem adicionais
   - **Esperado:** igual ao protótipo, menos o campo "Desconto ao levar junto" e a faixa de conversão (fora, ver Fora do escopo do charter)

### Esperado e fonte

Fonte: protótipo do painel (Produto).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| recusa do 4º | provoca a recusa | o texto do protótipo |
