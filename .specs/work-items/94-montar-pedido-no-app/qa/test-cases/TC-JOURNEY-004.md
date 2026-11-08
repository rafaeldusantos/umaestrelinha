## TC-JOURNEY-004: Adri reabre um pedido montado dias depois, copia o mesmo link e a cliente o abre na loja

**Tipo:** journey
**Prioridade:** P0
**Origem:** UC-01, UC-09 (D-14, D-28, D-31)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-04, passos 1–4
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** cruza app → loja; exige `PROPOSAL_TOKEN_KEY` nas functions locais e `VITE_STORE_URL` do app na loja local

### Objetivo

Quando a cliente diz "perdi o link", a Adri reenvia o mesmo link e ele abre.

### Pré-condições

- Conta: `admin-atelie` (app); `anonima` (aba da loja)
- Massa: pedido montado aberto, criado com `PROPOSAL_TOKEN_KEY` configurada, com telefone e duas peças
- Estado de partida: `/pedidos`; o link anotado no momento da criação (para comparar)

### Condições reais

As da persona; a aba da loja em 390.

### Entrada

`/pedidos` → chip "Montados · N abertos".

### Passos com tempo

| # | A persona… | Esperado | Em até |
| - | ---------- | -------- | ------ |
| 1 | toca no chip "Montados" | os cartões, o mais recente primeiro | 3 s |
| 2 | abre o cartão | "Link para <primeiro nome>" e o link em caixa — o mesmo da criação | 3 s |
| 3 | toca em "Copiar link" | "Link copiado."; "Link enviado · copiado" no histórico | 2 s |
| 4 | abre o link numa aba anônima | `/pedido-montado` da loja com as peças e o total travados | 6 s |

### Objetivo e efeitos

O link copiado é idêntico ao da criação e abre na loja; nenhuma renovação aconteceu.

### Caminho de abandono

J-04a: pedido montado vencido ⇒ só "Renovar prazo"; renovado, o link antigo deixa de abrir (TC-FUNC-028, TC-INT-002).

### Esperado e fonte

"Cartão escuro com o link — sempre disponível enquanto o pedido montado está aberto, também ao reabri-lo depois […]; nunca é preciso gerar um link novo para copiar" — fonte: PRD › Pedido montado; spec D-14, D-28.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| recarregar o app antes de copiar | F5 no pedido montado | o mesmo link |
