## TC-JOURNEY-005: Adri reabre no computador um pedido montado pelo app, copia o link e renova o vencido

**Tipo:** journey
**Prioridade:** P1
**Origem:** UC-10 (D-14, D-17, D-28)
**Autor:** dev
**Persona:** PER-04 Adri no computador
**Jornada:** J-05, passos 1–4
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** painel em 1440; depende de `PROPOSAL_TOKEN_KEY` local

### Objetivo

O painel e o app mostram o mesmo link; renovar só existe para o que venceu.

### Pré-condições

- Conta: `admin-atelie`
- Massa: um pedido montado aberto criado pelo app (link anotado) e um vencido
- Estado de partida: `http://localhost:8083/admin`

### Condições reais

As da persona.

### Entrada

Painel → Pedidos montados.

### Passos com tempo

| # | A persona… | Esperado | Em até |
| - | ---------- | -------- | ------ |
| 1 | abre o pedido montado criado pelo app | "Link para a cliente" com o link e "Vale até {validade}"; nenhum "Gerar link novo" | 3 s |
| 2 | clica em "Copiar link" | o mesmo link que o app mostra | 2 s |
| 3 | procura renovar no aberto | não há ação de renovar | 5 s |
| 4 | abre o vencido e clica em "Renovar prazo" | o diálogo com a frase "O link venceu em {dd/mm}. Os preços são conferidos de novo e sai um link novo, que vale até {dd/mm}. Mande o novo para {nome}."; confirma e o link novo aparece | 10 s |

### Objetivo e efeitos

Link igual nos dois apps; o vencido renovado com link novo e o antigo morto.

### Caminho de abandono

J-05a: falha da gravação na montagem ⇒ "Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo." (TC-FUNC-033).

### Esperado e fonte

Fonte: PRD › Pedido montado ("no app e no painel", Renovar só depois de expirar); spec UC-10, D-17.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| duas abas no mesmo pedido | renova numa, recarrega a outra | a outra mostra o link novo |
