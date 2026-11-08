## TC-JOURNEY-002: Adri monta pelo celular o pedido de uma cliente cadastrada, com desconto combinado, e cria o link

**Tipo:** journey
**Prioridade:** P0
**Origem:** UC-02, UC-03, UC-06, UC-07, UC-08
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-02, passos 1–6
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** caminho P0 determinístico, sem IA; pedido de automação E2E

### Objetivo

A cliente de volta recebe o pedido no endereço que já tem, com o desconto acertado, sem redigitar nada.

### Pré-condições

- Conta: `admin-atelie`
- Massa: cliente cadastrada com telefone, endereço padrão e um segundo endereço salvo; duas peças com estoque, uma que aceita gravação
- Estado de partida: `/pedidos`, sem rascunho

### Condições reais

As da persona.

### Entrada

Navegação interna: `/pedidos` → "Montar pedido".

### Passos com tempo

| # | A persona… | Esperado | Em até |
| - | ---------- | -------- | ------ |
| 1 | busca a cliente pelos dígitos do telefone e a escolhe | cartão "Cliente" com "Trocar"; "Entrega" em "Endereço padrão" | 7 s |
| 2 | troca para o outro endereço salvo e segue | o endereço escolhido; "Continuar" ligado | 5 s |
| 3 | acrescenta duas peças, uma com gravação | a sacola com a foto de cada variação e "Gravação: <texto>" | 60 s |
| 4 | liga "Desconto combinado" em %, digita 10 e o motivo | o resumo com o combinado; "No PIX: …" | 20 s |
| 5 | revisa e toca em "Criar link" | o pedido montado com o link e o toast "Link criado." | 10 s |

### Objetivo e efeitos

O total do pedido montado igual ao "Total" da revisão; a ficha não muda de nome, e-mail nem telefone; o cartão novo em Montados.

### Caminho de abandono

J-02b: combinado de 100 % — "O desconto não pode zerar o pedido." e o desconto fica fora da conta; a Adri corrige e segue.

### Esperado e fonte

Pedido montado com o total da revisão — fonte: PRD › Passo 1 (cadastrada), › Passo 3, › Passo 4; spec UC-03, UC-07, UC-08.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| cliente sem endereço salvo | escolhe a cliente | a entrega nasce em "A cliente preenche no link" |
