## TC-UI-001: Os ícones do sistema têm o traço e o realce dourado dos ícones da marca

**Tipo:** ui
**Prioridade:** P1
**Origem:** C-02
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** J-01, passo 2
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** julgamento visual; a régua técnica (grade, traço, `currentColor`, realce) é de `icons.test.ts` e `menuIconCatalog.test.ts`, na Validation

### Objetivo

Os ícones novos parecem da mesma família dos da marca — senão o menu fica remendado aos olhos da dona e da cliente.

### Pré-condições

- Conta: `admin`
- Massa: —
- Estado de partida: seletor de ícone aberto

### Condições reais

as da persona; também a loja a 390 e 1440 com os itens A e B.

### Protótipo e tela

Sem protótipo (decisão "Seguir sem design"). A régua é o texto de C-02 e os ícones do grupo "Da Uma Estrelinha" na mesma tela.

### Propriedades a comparar

- Espessura do traço: `stroke-width` computado do contorno igual ao dos ícones da marca (1,5 na grade 24)
- Contorno na cor do texto em volta (`currentColor`) e realce dourado onde o ícone tem realce
- Mesmo tamanho na grade e na barra/folha; nenhum preenchido sólido
- Os dez desenhos legíveis como o que o rótulo diz

### Passos

1. Compara a grade "Do sistema" com a "Da Uma Estrelinha"
   - **Esperado:** mesma espessura, mesmo tamanho, mesmo dourado do realce
2. Confere na loja a 390 e a 1440 a Etiqueta (A) ao lado de D (ícone da marca)
   - **Esperado:** mesma família visual, mesmo alinhamento ao rótulo

### Esperado e fonte

Grade 24, traço 1,5, contorno `currentColor`, realce `ICON_ACCENT` — fonte: `plan.md` C-02.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| viewports | 390 · 768 · 1440 na loja | ícone sem corte nem distorção |
