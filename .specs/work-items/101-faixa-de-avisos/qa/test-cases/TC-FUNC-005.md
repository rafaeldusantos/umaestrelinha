## TC-FUNC-005: A dona reordena os avisos e a ordem vale na prévia; com cinco avisos o "+ Adicionar aviso" some

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 5
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** subir/descer determinístico; o arrasto fica como variação manual

### Objetivo

A Adri quer que o aviso principal da campanha venha primeiro. Se a ordem que ela vê não é a que a cliente vê, a campanha entra torta.

### Pré-condições

- Conta: `admin-loja`
- Massa: os quatro avisos do manifesto, gravados
- Estado de partida: em `/admin/faixa-de-avisos`

### Condições reais

as da persona

### Passos

1. Usa "Descer o aviso 1"
   - **Esperado:** o A1 passa a segundo; "Subir o aviso 1" fica desabilitado no novo primeiro; a prévia, em "Aviso 1 de 4", mostra o A2
2. Usa "Subir o aviso 2" e confere a prévia
   - **Esperado:** a ordem do manifesto volta (A1 primeiro); "Descer o aviso 4" desabilitado no último
3. Usa "+ Adicionar aviso" uma vez
   - **Esperado:** contador "5 de 5"; o "+ Adicionar aviso" some
4. Usa "Tirar o aviso 5"
   - **Esperado:** sai sem confirmação; contador "4 de 5"; o "+ Adicionar aviso" volta
5. Salva e recarrega
   - **Esperado:** a ordem do manifesto (A1, A2, A3, A4)

### Esperado e fonte

Até 5 avisos, ordem por subir/descer e por arrastar, "+ Adicionar aviso" some com 5 — fonte: PRD UC-03; spec Design (card "Avisos"), H-08, H-19

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| arrastar | arrasta o A3 para o topo e solta | a ordem muda igual ao subir; a prévia acompanha (desfazer antes de salvar) |
| reordenar só pelo teclado | foca "Descer o aviso 1" com Tab e aciona com Enter | mesma troca; o foco não se perde no `<body>` |
