## TC-FUNC-004: Fechar a montagem com algo preenchido pergunta antes e oferece guardar o rascunho quando há peças

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-02 (D-18)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-03, ramos J-03a, J-03b
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** —

### Objetivo

Sair por querer não joga fora a sacola sem a Adri escolher.

### Pré-condições

- Conta: `admin-atelie`
- Massa: uma cliente; uma peça
- Estado de partida: `/pedidos/montar`

### Condições reais

As da persona.

### Passos

1. Sem nada preenchido, toca no "x" (aria "Fechar a montagem")
   - **Esperado:** volta a Pedidos direto, sem folha
2. Escolhe só a cliente e toca no "x"
   - **Esperado:** "Sair sem criar o link?" com "Continuar montando" e "Sair"
3. Com uma peça na sacola, toca no "x"
   - **Esperado:** a folha com "Continuar montando", "Guardar rascunho" e "Descartar", empilhados
4. Toca em "Guardar rascunho" e reabre "Montar pedido"
   - **Esperado:** "Rascunho retomado: …"
5. Repete com "Descartar" e reabre
   - **Esperado:** a montagem vazia, sem aviso

### Esperado e fonte

Fonte: PRD › Pedido montado ("Fechar a montagem com algo preenchido pede confirmação"); spec D-18 (guardar ou descartar); Design › casca (o que conta como preenchido: cliente, nome, e-mail, peças ou CEP; cupom e desconto não).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| só o CEP digitado | digita o CEP em "Cliente nova" e toca no "x" | a folha com "Sair" |
| voltar com a folha aberta | `history.back` | a folha fecha, a montagem fica |
| "Continuar montando" | toca | a folha fecha, nada mudou |
