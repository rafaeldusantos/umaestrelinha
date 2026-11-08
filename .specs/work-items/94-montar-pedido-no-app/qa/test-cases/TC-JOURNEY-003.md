## TC-JOURNEY-003: Adri retoma a montagem depois de o celular bloquear e cria o link

**Tipo:** journey
**Prioridade:** P1
**Origem:** UC-02 (D-15, D-19, D-42)
**Autor:** dev
**Persona:** PER-02 Adri interrompida
**Jornada:** J-03, passos 1–6
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o processo encerrado se simula fechando a aba e abrindo outra; o PWA instalado no Android real fica fora

### Objetivo

A interrupção não custa a sacola: a Adri volta, escolhe a cliente de novo e manda o link.

### Pré-condições

- Conta: `admin-atelie`
- Massa: uma cliente cadastrada; duas peças; um cupom válido
- Estado de partida: `/pedidos`, sem rascunho

### Condições reais

As da persona.

### Entrada

`/pedidos` → "Montar pedido".

### Passos com tempo

| # | A persona… | Esperado | Em até |
| - | ---------- | -------- | ------ |
| 1 | escolhe a cliente, acrescenta duas peças, aplica o cupom e liga o combinado com motivo | o resumo com tudo | 90 s |
| 2 | fecha a aba (interrupção) e abre `/pedidos` numa aba nova | — | — |
| 3 | toca em "Montar pedido" | "Rascunho retomado: …"; as duas peças, o cupom e o valor do combinado | 5 s |
| 4 | escolhe a cliente de novo e reescreve o motivo | a cliente e o motivo vinham vazios | 30 s |
| 5 | revisa e cria o link | o pedido montado | 10 s |
| 6 | volta a Pedidos e toca em "Montar pedido" | a montagem vazia, sem aviso de rascunho | 3 s |

### Objetivo e efeitos

O pedido montado criado com as peças retomadas; o rascunho apagado.

### Caminho de abandono

J-03a/b: "x" com peças ⇒ "Sair sem criar o link?" com "Continuar montando", "Guardar rascunho" e "Descartar"; "Descartar" ⇒ a próxima montagem abre vazia (TC-FUNC-004).

### Esperado e fonte

Rascunho só de peças e descontos, retomado e apagado ao criar — fonte: PRD › Pedido montado (último item); spec D-15, D-18, D-19, D-42.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| peça saiu do catálogo | desativa uma peça no painel antes de reabrir | a peça não volta e o aviso a conta |
