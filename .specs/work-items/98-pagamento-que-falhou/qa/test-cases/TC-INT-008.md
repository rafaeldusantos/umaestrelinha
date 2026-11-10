## TC-INT-008: O cancelamento automático alcança só o pedido pendente não pago de 7 dias, recomeça no desfazer e não é adiado pelo link

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-06.1, CA-06.1a, CA-06.2, CA-03.15, CA-05.8
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-06, ramo J-06a
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** a thread prepara as datas e executa a function `cancel-unpaid-orders` servida localmente; a persona confere o efeito no painel (probe 10 da Validation)

### Objetivo

Só sai do caminho o pedido que ninguém pagou; nenhum pedido pago, em produção ou com material a caminho é cancelado.

### Pré-condições

- Conta: `admin`
- Massa (todas criadas depois do corte, salvo indicado): A pendente não pago criado há 8 dias; B pendente não pago criado há 6 dias; C criado há 8 dias e registrado à mão; D criado há 8 dias, em Separando; E criado há 8 dias, material enviado; F criado antes do corte, há 8 dias; G criado há 10 dias, registrado e desfeito há 2 dias; H criado há 8 dias, com link de cartão gerado ontem
- Estado de partida: a thread executa o job uma vez, depois uma segunda vez

### Condições reais

As da persona.

### Passos

1. Abre A e H no painel
   - **Esperado:** cancelados, com a marca de cancelamento por falta de pagamento
2. Abre B, C, D, E, F e G
   - **Esperado:** como estavam, não cancelados
3. Depois da segunda execução, abre A e H
   - **Esperado:** nada repetido (uma linha de histórico, um e-mail no máximo)

### Esperado e fonte

Recorte, prazo do desfazer, link não adia, idempotente — fonte: PRD CA-06.1, CA-06.1a, CA-06.2, CA-03.15, CA-05.8; costura Decisão 1.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Material recebido | pedido de 8 dias com material recebido | não cancelado |
