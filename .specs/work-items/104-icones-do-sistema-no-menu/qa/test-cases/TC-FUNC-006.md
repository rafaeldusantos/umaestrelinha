## TC-FUNC-006: Um código de cor fora do formato não é gravado como cor

**Tipo:** functional
**Prioridade:** P1
**Origem:** C-07
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** J-01, ramo J-01b
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** entradas fixas, resultado determinístico; pedido de automação E2E

### Objetivo

A dona que cola um código de outro lugar, ou digita pela metade, não grava lixo no menu nem fica sem saber o que errou.

### Pré-condições

- Conta: `admin`
- Massa: item C, sem cor
- Estado de partida: editor do item C aberto

### Condições reais

as da persona.

### Passos

1. Na barra, digita `E8C77A` (sem `#`) e salva
   - **Esperado:** nada gravado como cor; o editor diz que o código não está no formato (frase da recusa); o código continua no campo
2. Repete com `#12`, `#GGGGGG` e `#E8C77AFF`
   - **Esperado:** o mesmo, para cada um
3. Recarrega e reabre o item C
   - **Esperado:** item C sem cor

### Esperado e fonte

Um valor fora de `#RRGGBB` não é cor; a recusa confere o formato antes do contraste — fonte: `plan.md` C-07; `tasks/02` › Contrato (`menuLabelColorRefusal`, molde `campaignColorsRefusal`: formato antes de contraste). A forma exata da mensagem é suposição 🟡 do plano.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| minúsculas | `#e8c77a` (o que o seletor nativo produz) | aceito como cor (🟡 do plano) |
| colado com espaço | ` #E8C77A ` | registrar o que acontece — nenhuma fonte decide |
| campo vazio | apagar o código e salvar | sem cor naquela superfície, sem recusa |
| na lista | os mesmos códigos no campo da lista | o mesmo resultado |
