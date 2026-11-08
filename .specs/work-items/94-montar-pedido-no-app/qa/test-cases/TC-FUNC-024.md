## TC-FUNC-024: A revisão mostra as peças com foto primeiro, a cliente, a entrega com a prévia da cotação e a observação

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-08 (D-30, D-40)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passo 7
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a cotação depende do `melhor-envio` local

### Objetivo

A conferência final é visual e completa, e cada bloco leva de volta a onde se corrige.

### Pré-condições

- Conta: `admin-atelie`
- Massa: cliente nova com endereço de Porto Alegre; duas peças
- Estado de partida: passo 4

### Condições reais

As da persona.

### Passos

1. Olha a ordem
   - **Esperado:** "Sacola · N peças" com "Alterar" primeiro (linhas com foto, "variação · N un. · gravação “X”", total; resumo, Total, PIX); depois "Cliente" com "Alterar" e "Ficha nova · criada com o link"; depois "Entrega" com "Alterar"
2. Olha a entrega
   - **Esperado:** o endereço; a prévia com PAC · Correios, SEDEX · Correios e "Retirada no escritório" (CEP do RS), prazo em dias úteis e preço ou "grátis"; "Prévia. A cliente escolhe a entrega no link."
3. Lê a nota
   - **Esperado:** "Os preços ficam travados como estão aqui. O link vale 7 dias, até dd/mm. Nada é gravado antes de você criar o link."
4. Escreve uma observação interna (campo opcional)
   - **Esperado:** aceita; ela aparecerá no pedido montado (TC-FUNC-030)
5. Toca em "Alterar" do bloco Cliente
   - **Esperado:** passo 1, com tudo preenchido

### Esperado e fonte

Fonte: PRD › Passo 4 · Revisar; › Pedido montado (observação no Revisar); spec Design › Passo 4; D-30, D-40.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| "A cliente preenche no link" | escolhe no passo 1 | "A cliente preenche o endereço no link."; sem prévia |
| CEP de fora do RS | endereço de SP | sem "Retirada no escritório" |
| cotação fora do ar | corta a rede da cotação | a revisão segue; dá para criar o link |
| cliente sem telefone | cadastrada sem telefone | "sem telefone" no bloco Cliente |
