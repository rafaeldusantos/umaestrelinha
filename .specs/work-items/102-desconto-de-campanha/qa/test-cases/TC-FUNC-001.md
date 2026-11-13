## TC-FUNC-001: A dona cadastra a Black Friday e a vê "Em vigência" na lista de campanhas

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-01
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 1–3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** fluxo P0 do painel, determinístico contra o banco local; pedido de automação E2E

### Objetivo

A dona consegue cadastrar a campanha com nome, vigência em horário de Brasília e percentuais, e a tela diz, sem
ela precisar deduzir, que a campanha já está valendo na loja.

### Pré-condições

- Conta: `admin-loja`
- Massa: nenhuma campanha cadastrada
- Estado de partida: painel aberto, logada

### Condições reais

as da persona (1440 × 900); a lista também em 390 × 844

### Passos

1. Abre o menu Descontos
   - **Esperado:** o item **Campanhas** ao lado de Cupons e Promoções
2. Abre Campanhas e toca em "Nova campanha"
   - **Esperado:** título "Nova campanha"; vigência nascendo 00:00 e 23:59; cores preto e ouro (#161514 e #C2A063); interruptor "Campanha ligada" ligado
3. Preenche nome "Black Friday", Começa em 13/11/2026 00:00, Termina em 30/11/2026 23:59, acrescenta 10, 15 e 20
   - Entrada: os valores acima
   - **Esperado:** o texto do selo acompanha o nome ("Black Friday"); a prévia mostra "BLACK FRIDAY · −20%"; "Pronta para salvar."
4. Salva e volta à lista
   - **Esperado:** a linha com o selo em linha, "Black Friday", "13/11 a 30/11/2026", as pílulas 10 %, 15 %, 20 %, a contagem de peças e a pílula **Em vigência**
5. Reabre a campanha
   - **Esperado:** "Termina em" mostra 30/11/2026 23:59 (não 01/12 00:00); "Estado: em vigência até 30/11 às 23:59"

### Esperado e fonte

A lista mostra "Em vigência" para a campanha ligada com hoje (13/11/2026) dentro da vigência — fonte: PRD CA-01,
UC-01, Vocabulário; `spec.md` › Painel · Campanhas · lista e nova/editar; H-04 (o painel mostra o último minuto que vale).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| duplo clique em Salvar | dois cliques seguidos | uma campanha só na lista |
| recarregar no salvar | salva e recarrega antes da resposta | uma campanha, ou nenhuma com a tela dizendo que não salvou — nunca duas |
| lista no celular | abre a lista em 390 × 844 | cartões com nome + estado, "{vigência} · {n} peças", selo + pílulas |
| texto do selo maior que o nome | nome com mais de 14 caracteres | o texto do selo acompanha só os 14 primeiros |
