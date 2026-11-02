## TC-UI-003: "Joias sendo vistas agora", "De onde vieram", "No celular" e Acessos conferem com o protótipo

**Tipo:** ui
**Prioridade:** P2
**Origem:** LAV-30, LAV-40, LAV-45, LAV-51
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, J-03
**Charter:** CH-09
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** conferência contra a fonte de design

### Objetivo

Os blocos de baixo completam a tela; devem ser os desenhados, com as correções que o PRD fez.

### Pré-condições

- Conta: `admin-atelie`
- Massa: clientes em 3 joias e no Guia, com 4 origens e um computador; Acessos com dados nos três períodos
- Estado de partida: `/ao-vivo`

### Condições reais

as da persona (390)

### Protótipo e tela

`Ateliê Admin.dc.html` › Loja ao vivo › fim e Acessos (`05-ao-vivo-fim-390.png`, `04-acessos-hoje.png`, `04-acessos-ontem.png`, `04-acessos-semana.png`) × http://localhost:8084/ao-vivo

### Propriedades a comparar

| Elemento | Design |
| -------- | ------ |
| bloco C  | padding 4/16, título 17; linhas com padding vertical 10, gap 12, divisória `line` a partir da 2ª; caixa 40 × 40 raio 6 `ground-deep`; nome 14 px; "{n} pessoa(s)" 13 px `ink-soft` sem quebra. O PRD manda **foto** da joia na caixa; o ícone `envio` só no Guia |
| bloco D  | barra empilhada 10 px raio 999, gap 2; legenda em duas colunas, gap 8/12, 14 px, quadrado 10 × 10 raio 3, número display 700 `primary`; Instagram `primary`, Google `primary-strong`, WhatsApp `accent`, Direto `field`; faixa zerada some |
| bloco E  | eyebrow; "{m} de {n}" display 700 20 px `primary`; segunda linha 12 px `ink-soft`. O PRD manda "o resto pelo computador ou tablet" e a linha inteira (D-19) |
| Acessos  | números em duas colunas; variação 12 px, `done` na alta, `ink-soft` na queda |

Viewports: 390.

### Passos

1. Mede cada propriedade pelos valores computados
   - **Esperado:** iguais ao design onde o PRD não diverge; as divergências da `spec.md` › Design não são achado

### Esperado e fonte

As propriedades do protótipo, com o PRD prevalecendo — fonte: protótipo › Loja ao vivo; spec › Design e D-19

### Variações

| Variação         | Ação                  | Esperado                                       |
| ---------------- | --------------------- | ---------------------------------------------- |
| faixa "Outros"    | uma pessoa de Outros  | a cor dela não tem régua no design — só registre |
