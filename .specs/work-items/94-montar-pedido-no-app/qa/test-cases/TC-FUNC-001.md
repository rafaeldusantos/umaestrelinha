## TC-FUNC-001: A visão Montados mostra o chip com os abertos ao fim dos chips e um cartão por pedido montado

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-01 (D-23, D-34, D-35)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-04, passo 1
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** massa com os cinco estados

### Objetivo

A Adri acha o pedido montado pela cliente e sabe, sem abrir, em que pé ele está.

### Pré-condições

- Conta: `admin-atelie`
- Massa: pedidos montados nos estados Aberta, Vista pela cliente, Concluída, Expirada e Cancelada; um com mais de 4 peças
- Estado de partida: `/pedidos`

### Condições reais

As da persona.

### Passos

1. Olha os chips de Pedidos
   - **Esperado:** os chips de antes, na mesma ordem, e "Montados · N abertos" por último; N = Abertas + Vistas
2. Toca em "Montados"
   - **Esperado:** "N pedidos montados · os mais recentes primeiro"; a busca de pedidos some; a URL é `/pedidos?visao=montados`
3. Lê cada cartão
   - **Esperado:** número `P-NNNN` e selo (Aberta, "Aberta — vista pela cliente", Concluída, Expirada, Cancelada); cliente; meta por estado ("Montado há N dias · vale até dd/mm", "Virou o pedido #NNNN", "Venceu em dd/mm", "Cancelado · montado há N dias"); o total à direita; as peças "Nome · variação" juntas por " · "
4. Toca num cartão
   - **Esperado:** o pedido montado daquele número

### Esperado e fonte

Fonte: PRD › Pedidos · Montados; spec Design › Pedidos · Montados; D-23 (chip ao fim), D-34 (até 4 linhas), D-35 (rótulo do selo).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| nenhum pedido montado | abre a visão sem massa | um estado vazio que diz que não há pedidos montados (sem régua de texto — 🟡 do plano) |
| "há N dias" | confere com a criação | o relógio é o do servidor, não o do aparelho |
| F5 na visão | recarrega | continua em Montados |
