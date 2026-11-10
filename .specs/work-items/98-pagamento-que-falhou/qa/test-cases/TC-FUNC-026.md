## TC-FUNC-026: App do ateliê mostra o pagamento registrado à mão, sem comprovante e sem ação de registrar

**Tipo:** functional
**Prioridade:** P1
**Origem:** RNF-09, RNF-08
**Autor:** dev
**Persona:** PER-01 Adri no celular
**Jornada:** J-07, passo 2, ramo J-07a
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** leitura determinística sobre M7

### Objetivo

Na bancada, a dona sabe pelo app que aquele pedido foi pago por fora, sem que o comprovante circule no celular.

### Pré-condições

- Conta: `admin` (no app :8084)
- Massa: M7 (registrado à mão: meio, data, observação, comprovantes)
- Estado de partida: `http://localhost:8084/pedidos/<M7>`

### Condições reais

As da persona.

### Passos

1. Lê o detalhe do pedido
   - **Esperado:** que o pagamento foi registrado à mão, o meio, a data e a observação
2. Procura comprovante e ações
   - **Esperado:** nenhum comprovante (nem link, nem nome de arquivo); nenhuma ação de registrar ou desfazer
3. Desfaz M7 no painel (outra aba) e relê o app
   - **Esperado:** o registro não aparece mais (🟡 no plano)

### Esperado e fonte

Registro, meio, data, observação; comprovantes só no painel; o app não registra — fonte: PRD RNF-09.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| Pago pela loja | abrir M9 | sem a marca de registro à mão |
