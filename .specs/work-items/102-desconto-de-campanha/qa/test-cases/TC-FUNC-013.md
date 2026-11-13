## TC-FUNC-013: Uma campanha com outro nome mostra o texto e as cores dela no selo, na vitrine e na Home

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-12, CA-14
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-06, passo 8
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** pedido de automação E2E

### Objetivo

A dona liga a próxima campanha só pelo cadastro, e a loja inteira passa a falar dela — sem nenhum "Black Friday"
esquecido.

### Pré-condições

- Conta: `admin-loja`; a loja numa segunda aba
- Massa: a Black Friday encerrada; o bloco "Joias em oferta" ligado na Home
- Estado de partida: `/admin/campanhas/nova`

### Condições reais

painel em 1440 × 900; loja em 390 × 844

### Passos

1. Cria "Dia das Mães": texto do selo "DIA DAS MÃES", faixa #6E2433, destaque #F6DCD8 (ou a combinação "Vinho e rosa"), 10 e 15 %, de hoje no minuto seguinte ao encerramento da Black Friday até 30/11/2026 23:59, ligada
   - **Esperado:** a razão de contraste em verde; a prévia "DIA DAS MÃES · −15%" nas cores novas; salva; "Em vigência"
2. Marca M-A em 10 % e M-D em 15 % na campanha nova
   - **Esperado:** na aba de preço, o cartão "Dia das Mães" (a BF encerrada não aparece)
3. Na loja, abre `/ofertas`
   - **Esperado:** trilha "Início › Dia das Mães", título "Dia das Mães", "Peças com 10% e 15% de desconto até 30 de novembro.", chips "Todas · 2", "10% · 1", "15% · 1"; os cartões com a faixa "DIA DAS MÃES" em vinho e rosa
4. Abre a Home
   - **Esperado:** o bloco com o nome "Dia das Mães" e os cartões 10 % e 15 %
5. Abre M-A
   - **Esperado:** o selo em linha "DIA DAS MÃES · −10%" nas cores da campanha

### Esperado e fonte

O texto do selo, o nome e as cores vêm da campanha, sem mudança de código — fonte: PRD CA-12, CA-14, RN-11, RN-12;
`spec.md` › Vitrine (exemplo Dia das Mães #6E2433 / #F6DCD8).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| início antes do encerramento | põe o início antes do instante em que a BF foi encerrada | recusado por cruzar a Black Friday (ainda ligada) |
| nenhum resto da BF | procura "Black Friday" na loja | nenhuma ocorrência |
| ofertas sem esperar | abre `/ofertas` logo depois de salvar | já com a campanha nova (no dev não há cache de 5 min) |
