## TC-FUNC-035: O 4º adicional de uma joia e a 13ª peça de uma lista são recusados com o motivo escrito

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.1
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-03, ramos J-03a e J-03b
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** valor limite; a recusa é texto, não botão apagado

### Objetivo

A dona entende o limite na hora e sabe o que fazer, sem perder o que montou.

### Pré-condições

- Conta: `admin-painel`
- Massa: 13 produtos ativos para a lista; um produto com 3 adicionais
- Estado de partida: editor de lista; aba "Compre junto" do produto

### Condições reais

As da persona.

### Passos

1. Com 3 adicionais, tocar "Acrescentar um adicional"
   - **Esperado:** "Cada joia leva até 3 adicionais. Tire um para acrescentar outro."; os 3 continuam
2. Tirar um
   - **Esperado:** a recusa some
3. Com 12 peças na lista, acrescentar a 13ª
   - **Esperado:** "Uma lista leva até 12 peças. Tire uma para acrescentar outra, ou crie uma segunda lista."; as 12 continuam

### Esperado e fonte

Fonte: PRD CA-02.1; spec › Decisões, 10 (teto de 12); textos do protótipo do painel.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| duplo clique em acrescentar | dois cliques com 2 adicionais | 3 adicionais e a recusa, nunca 4 |
