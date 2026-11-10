## TC-FUNC-002: Registrar sem preencher nada é aceito; o meio sai de uma lista fixa de cinco; a data e a hora já vêm com agora, no horário de Brasília

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.2, CA-03.2a, CA-03.2b
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-01, passos 2–3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a hora pré-preenchida se confere contra o relógio de Brasília da execução

### Objetivo

Quando a cliente só disse "paguei", a dona registra sem inventar dado; quando sabe o meio, escolhe de uma lista curta e reconhecível.

### Pré-condições

- Conta: `admin`
- Massa: dois pedidos M6
- Estado de partida: `/admin/pedidos/:id/pagamento`

### Condições reais

As da persona.

### Passos

1. Abre o seletor de meio
   - **Esperado:** exatamente: PIX direto · Transferência · Dinheiro · Cartão de crédito (link de outro gateway ou maquininha) · Outro
2. Lê o campo de data e hora
   - **Esperado:** preenchido com a data e a hora de agora em Brasília (não UTC, não o fuso do aparelho se for outro)
3. No primeiro pedido, confirma sem escolher meio, sem observação e sem comprovante
   - **Esperado:** grava; o bloco Pagamento mostra "Meio não informado", a data pré-preenchida, quem registrou
4. No segundo, escolhe "Transferência" e confirma
   - **Esperado:** o bloco mostra "Transferência"

### Esperado e fonte

Campos opcionais, lista fixa de cinco meios, data e hora de Brasília pré-preenchida — fonte: PRD CA-03.2, CA-03.2a, CA-03.2b; rótulos de `core/orders/labels.ts` (`MANUAL_PAYMENT_METHOD_LABELS`, voz `admin`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Data apagada | apagar a data e a hora e confirmar | nenhuma fonte decide (🟡 no plano): registrar o que a tela faz, como pergunta |
| Fuso do navegador diferente | emular fuso `America/Manaus` | a hora pré-preenchida continua a de Brasília |
