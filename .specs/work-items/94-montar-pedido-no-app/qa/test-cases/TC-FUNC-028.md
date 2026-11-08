## TC-FUNC-028: As ações do pedido montado seguem o estado: cancelar a aberta, renovar só a vencida, ver o pedido da concluída

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-09 (D-17, D-28)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-04, ramos J-04a, J-04b; passo 6
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a expirada se prepara pela validade passada no banco local

### Objetivo

Cada ação aparece só quando faz sentido, e as que matam o link pedem confirmação.

### Pré-condições

- Conta: `admin-atelie`
- Massa: pedidos montados Aberta, Expirada, Concluída e Cancelada
- Estado de partida: `/pedidos?visao=montados`

### Condições reais

As da persona.

### Passos

1. Abre a Aberta
   - **Esperado:** "Editar" e "Cancelar este pedido"; **nenhum** "Renovar"
2. Toca em "Cancelar este pedido"
   - **Esperado:** a folha "Cancelar P-NNNN?" / "Quem abrir o link vai ler que este pedido não está mais disponível. Não dá para desfazer." com "Manter" e "Cancelar pedido"
3. Confirma
   - **Esperado:** "Pedido montado cancelado." / "O link deixou de funcionar."; a faixa "Cancelado. Quem abrir o link lê que este pedido não está mais disponível."; sem ações; "Cancelado por você" no histórico
4. Abre a Expirada
   - **Esperado:** a faixa "O link venceu em dd/mm. …"; "Renovar prazo"
5. Toca em "Renovar prazo"
   - **Esperado:** a folha com "O link venceu em {dd/mm}. Os preços são conferidos de novo e sai um link novo, que vale até {dd/mm}. Mande o novo para {nome}."; confirmada, "Prazo renovado." / "Mande o link novo — o anterior não abre mais."; "Prazo renovado · link novo, o anterior parou de funcionar" no histórico
6. Abre a Concluída
   - **Esperado:** "<nome> concluiu no link. O pedido #NNNN segue na fila como qualquer pedido da loja."; "Ver o pedido #NNNN" leva ao detalhe do pedido

### Esperado e fonte

Fonte: PRD › Pedido montado ("Aberta: Editar, Cancelar […] Renovar só aparece depois de o link atual expirar. Expirada: Renovar prazo […] Concluída: 'Ver o pedido #0262'"); spec D-17 (a frase da folha), Design › Pedido montado (app).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| preço mudou antes de renovar | muda o preço no painel e renova | a folha mostra o total relido e confirma com ele |
| duplo toque em "Cancelar pedido" | toca duas vezes | um cancelamento |
| voltar com a folha aberta | `history.back` | a folha fecha |
