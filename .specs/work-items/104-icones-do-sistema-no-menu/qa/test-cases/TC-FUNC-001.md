## TC-FUNC-001: O seletor de ícone mostra "Sem ícone" fixa e os ícones em dois grupos, "Da Uma Estrelinha" e "Do sistema"

**Tipo:** functional
**Prioridade:** P1
**Origem:** C-01, C-04
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** J-01, passo 2
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** estrutura do seletor verificável por texto e `data-testid` `icone-opcao-<chave>`; pedido de automação E2E

### Objetivo

A dona encontra os ícones novos sem saber que existem: eles têm de estar à vista, separados e nomeados, na mesma área que rola.

### Pré-condições

- Conta: `admin`
- Massa: item A
- Estado de partida: editor do item A aberto

### Condições reais

as da persona.

### Passos

1. Abre o seletor de ícone do item A
   - **Esperado:** a cela "Sem ícone" no topo; o título "Da Uma Estrelinha" e a grade dos ícones da marca; o título "Do sistema" e a grade com os dez: Etiqueta, Porcentagem, Presente, Coração, Cupom, Frete, Calendário, Informação, Dúvida, Início
2. Rola a área até o fim
   - **Esperado:** os dois grupos rolam juntos na mesma área; "Sem ícone" não some do lugar dela
3. Lê o cabeçalho do seletor
   - **Esperado:** o texto não diz mais que os ícones são só os desenhados para a loja

### Esperado e fonte

Cela "Sem ícone" fixa → "Da Uma Estrelinha" + grade → "Do sistema" + grade, os dez da P-02 — fonte: `plan.md` C-01, C-04, Design › Seletor de ícone; `tasks/01` › Decisões já tomadas.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| item que já tem ícone da marca | abrir o seletor no item D | o ícone de D marcado no grupo "Da Uma Estrelinha" |
| item com ícone do sistema | abrir o seletor no item A depois de gravado | a Etiqueta marcada no grupo "Do sistema" |
| "Sem ícone" | escolher "Sem ícone" e fechar sem salvar | o editor mostra sem ícone; nada gravado até Salvar |
