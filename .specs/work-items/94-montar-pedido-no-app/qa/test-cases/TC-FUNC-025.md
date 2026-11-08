## TC-FUNC-025: Criar link grava uma vez só e abre o pedido montado

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-08 (D-43)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, passo 8
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a variação "voltar depois do link" é esperado P1 decidido pelo humano (Q-01, 2026-11-08; D-43): o código de hoje cai na montagem vazia — essa saída é falha esperada, registrada como bug na rodada

### Objetivo

Um toque cria um pedido montado; o nervosismo do duplo toque não cria dois.

### Pré-condições

- Conta: `admin-atelie`
- Massa: montagem completa
- Estado de partida: passo 4

### Condições reais

As da persona; rede instável.

### Passos

1. Toca em "Criar link" duas vezes seguidas
   - **Esperado:** "Criando o link…" desligado; depois o pedido montado com o toast "Link criado." / "Agora é só mandar para <nome>."
2. Abre Montados
   - **Esperado:** um cartão novo só, com o total da revisão
3. Toca de novo em "Montar pedido"
   - **Esperado:** a montagem vazia

### Esperado e fonte

"Criar link → 'Criando o link…'" — fonte: PRD › Passo 4; spec Design › Passo 4. O voltar depois do link leva a Montados — fonte: spec D-43 (humano, Q-01 do plano, 2026-11-08).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| F5 durante "Criando o link…" | recarrega | no máximo um pedido montado em Montados |
| a function fora | para a `order-proposals` local | "Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo." (D-20, D-33); a montagem fica como estava |
| voltar depois do link (P1) | `history.back` | volta a Montados (`/pedidos?visao=montados`), com o cartão novo; a montagem não está mais no histórico — um segundo voltar não reabre passo nenhum (Q-01, D-43). Cair na montagem vazia é bug |
