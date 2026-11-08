## TC-FUNC-008: A cliente nova exige nome, e-mail válido e endereço completo, com o CPF opcional

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-04 (D-21)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passo 4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

A ficha nova nasce com o que o pedido precisa para chegar à cliente.

### Pré-condições

- Conta: `admin-atelie`
- Massa: um e-mail que não tem ficha
- Estado de partida: passo 1, "Cliente nova"

### Condições reais

As da persona.

### Passos

1. Olha o formulário
   - **Esperado:** cartão "Tem os dados numa mensagem?"; "Contato": Nome ("Como ela assina"), E-mail, WhatsApp `(51) 99999-9999`, CPF (opcional) `000.000.000-00`; "Entrega" com "Informar o endereço agora" escolhido e "A cliente preenche no link"
2. Preenche nome e e-mail, deixa o CPF vazio, completa o endereço
   - **Esperado:** "Continuar" liga sem CPF
3. Digita "ana@" e depois "ana@exemplo"
   - **Esperado:** "Confira o e-mail." enquanto inválido
4. Deixa a rua vazia com o resto do endereço preenchido
   - **Esperado:** o motivo "Complete o endereço, ou escolha 'A cliente preenche no link'."
5. Escolhe "A cliente preenche no link"
   - **Esperado:** o endereço deixa de ser exigido

### Esperado e fonte

Fonte: PRD › Passo 1 (Nova: nome, e-mail, WhatsApp, CPF opcional); spec Design › Passo 1; D-21 (CEP, rua, número, bairro, cidade e UF; complemento opcional).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| telefone digitado | digita 11 dígitos | máscara `(51) 99999-1234` |
| UF minúscula | digita "rs" | vira "RS" |
| trocar para "Cliente cadastrada" | troca o segmento | cliente, endereço e marcas se limpam |
