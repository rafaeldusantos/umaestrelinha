## TC-FUNC-009: Tirar a peça da campanha, desligar ou encerrar devolve o preço de sempre sem mudar o preço cadastrado

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-07, CA-04, R-08 — PRD Vocabulário / UC-01 (Desligada)
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-06, passos 2–4
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** pedido de automação E2E

### Objetivo

A dona desfaz a oferta sem tocar em preço, e a loja volta ao normal sozinha — nenhuma peça fica com preço de
campanha "esquecido".

### Pré-condições

- Conta: `admin-loja`; a loja numa segunda aba
- Massa: Black Friday em vigência; M-A (20 %) e M-D (20 %); anotar antes o preço cadastrado de M-A e M-D na aba Preço e estoque
- Estado de partida: `/admin/produtos/<M-D>/editar`

### Condições reais

painel em 1440 × 900; loja em 390 × 844

### Passos

1. No cartão da Black Friday de M-D, escolhe "Nenhum" e salva
   - **Esperado:** a nota "Sem desconto: a peça fica fora da vitrine /ofertas e sem selo."; o preço cadastrado igual ao anotado
2. Na loja, abre M-D e `/ofertas`
   - **Esperado:** M-D com o preço de sempre, sem faixa, fora da vitrine; o chip "20%" com uma peça a menos
3. Na edição da Black Friday, desliga "Campanha ligada" e salva
   - **Esperado:** a lista com a pílula "Desligada"; na loja, M-A sem desconto e `/ofertas` vazia
4. Religa e salva
   - **Esperado:** "Em vigência" de novo; na loja, M-A com o desconto
5. Mais tarde (no mesmo charter, TC-FUNC-017), "Encerrar agora"
   - **Esperado:** a lista com "Encerrada"; na loja, M-A com o preço de sempre; no painel, o preço cadastrado de M-A igual ao anotado

### Esperado e fonte

Tirar da campanha ou encerrar devolve o preço de sempre em todas as superfícies, e o preço cadastrado não muda;
desligada, a campanha não vale mesmo dentro da vigência — fonte: PRD CA-07, CA-04 ("depois do fim"), UC-02,
Vocabulário; `spec.md` › Painel · Campanha (interruptor e "Encerrar agora").

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| encerrar com confirmação | toca em "Encerrar agora" e cancela | nada muda |
| duplo clique em "Encerrar agora" | dois cliques | um encerramento; a campanha não some |
| sacola aberta | a sacola da aba da loja com M-A, reaberta depois do desligar | o preço de sempre |
| marcações guardadas | reabre M-A depois de encerrar | o cartão da BF some da aba de preço (só agendadas e em vigência aparecem); a campanha encerrada continua na lista com as peças |
