## TC-FUNC-027: O pedido montado aberto mostra o link sempre, também ao reabrir, e copiar ou WhatsApp ficam no histórico

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-09 (D-14, D-28, D-31)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-04, passos 2–3; ramo J-04e
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** exige `PROPOSAL_TOKEN_KEY` nas functions locais; sem ela, o esperado é o da TC-FUNC-031

### Objetivo

A Adri nunca precisa gerar outro link para reenviar o que a cliente já tem.

### Pré-condições

- Conta: `admin-atelie`
- Massa: pedido montado aberto com telefone; outro sem telefone; ambos criados com a chave
- Estado de partida: `/pedidos?visao=montados`

### Condições reais

As da persona.

### Passos

1. Abre o com telefone
   - **Esperado:** cabeçalho "Pedido montado P-NNNN", "Montado há N dias · vale até dd/mm", selo; cartão escuro "Link para <primeiro nome>" com `…/pedido-montado#<token>`; "Enviar pelo WhatsApp"; "Copiar link"; "Vale até dd/mm. Quem tem o link pode pagar este pedido — não pode ver a conta dela."; a "Mensagem do WhatsApp" escrita
2. Toca em "Copiar link"
   - **Esperado:** "Link copiado." / "Cole na conversa com <nome>."; "Link enviado · copiado" no histórico
3. Toca em "Enviar pelo WhatsApp"
   - **Esperado:** "Abrindo o WhatsApp…"; o `wa.me` com a mensagem; "Link enviado · WhatsApp" no histórico
4. Sai, fecha o app, reabre o mesmo pedido montado
   - **Esperado:** o mesmo link, sem "Gerar link novo"
5. Abre o sem telefone
   - **Esperado:** "Sem telefone — copie o link." no lugar do WhatsApp

### Esperado e fonte

Fonte: PRD › Pedido montado (o link "sempre disponível […] também ao reabri-lo depois"; WhatsApp só com telefone; "Copiar/WhatsApp registram 'Link enviado · canal'"); spec D-14, D-28, D-31.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| as peças | olha o bloco "N peças" | foto, "nome · variação · N un.", resumo, "Total dos itens", "Frete: a cliente escolhe no link." |
| sem `VITE_STORE_URL` no app | build sem a env | o cartão diz que o link não pôde ser montado (`LINK_WITHOUT_STORE`) |
