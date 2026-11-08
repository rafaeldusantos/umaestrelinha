## TC-FUNC-009: E-mail que já tem ficha oferece usar a ficha dela ou corrigir, sem nascer uma segunda ficha

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-04 (MON-03)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, ramo J-01c
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

Uma cliente nunca ganha duas fichas por a Adri não saber que ela já comprou.

### Pré-condições

- Conta: `admin-atelie`
- Massa: cliente "Juliana Prates" (nome sintético) com e-mail e 2 pedidos
- Estado de partida: passo 1, "Cliente nova"

### Condições reais

As da persona.

### Passos

1. Digita o e-mail dela
   - **Esperado:** "<e-mail> já é de Juliana Prates · 2 pedidos. Para não nascer uma segunda ficha, use a dela." com "Usar a ficha dela" e "Corrigir o e-mail"; a barra: "Este e-mail já tem ficha. Use a ficha dela ou corrija o e-mail."
2. Toca em "Corrigir o e-mail"
   - **Esperado:** o foco vai ao campo do e-mail
3. Digita o e-mail de novo, preenche um endereço com CEP de 8 dígitos e toca em "Usar a ficha dela"
   - **Esperado:** vira "Cliente cadastrada" com a ficha dela; a entrega em "Outro endereço" com o endereço digitado; o toast "Usando a ficha de Juliana Prates."
4. Cria o link e abre a ficha no painel
   - **Esperado:** uma ficha só para esse e-mail

### Esperado e fonte

Fonte: PRD › Passo 1 ("E-mail que já tem ficha […] Usar a ficha dela / Corrigir o e-mail (MON-03). Usar a ficha guarda o endereço lido como 'Outro endereço'"); spec Design › Passo 1.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| sem CEP digitado | "Usar a ficha dela" | entrega no endereço padrão; toast "A entrega veio no endereço padrão dela." |
| e-mail em maiúsculas | digita "JULIANA…@…" | o aviso aparece igual |
| e-mail de convidada | digita o de uma convidada | o aviso com a convidada; "Usar a ficha dela" |
