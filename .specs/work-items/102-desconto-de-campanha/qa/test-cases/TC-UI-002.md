## TC-UI-002: O selo usa as duas cores da campanha cruzadas, como no protótipo

**Tipo:** ui
**Prioridade:** P1
**Origem:** CA-14
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 7 · J-03, passos 3 e 5
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** conferência visual contra o protótipo, por estilo computado

### Objetivo

O selo que a cliente vê é o que a dona escolheu na prévia, nas cores dela — e não muda se a paleta da loja mudar.

### Pré-condições

- Conta: `admin-loja`
- Massa: Black Friday em vigência com as cores padrão (#161514 e #C2A063); M-A em 20 %
- Estado de partida: `/ofertas` e a página de M-A

### Condições reais

| Dimensão    | Valor |
| ----------- | ----- |
| Dispositivo | celular (390 × 844) e computador (1440 × 900) |

### Passos

1. Mede a faixa do cartão de M-A
   - **Esperado:** fundo da faixa #161514, texto "BLACK FRIDAY" em #c2a063; bloco do percentual com fundo #c2a063 e "−20%" em #161514
2. Mede o selo em linha na página de M-A e na sacola
   - **Esperado:** as mesmas duas cores, cruzadas do mesmo jeito
3. Compara com a prévia da edição da campanha no painel
   - **Esperado:** a mesma aparência

### Esperado e fonte

O texto da campanha na cor de destaque sobre a faixa, o percentual na cor da faixa sobre o destaque; sem escolha,
preto #161514 e ouro #C2A063; o selo não usa cor da paleta da loja — fonte: PRD CA-14, RN-12; `spec.md` T16;
protótipo `Black Friday - Selo v2.html`.

### Protótipo e tela

`Black Friday - Selo v2.html` › `SeloFaixa`, `SeloLinha` (Claude Design, projeto `4abe021d-d77e-4fe7-affd-524180315fa3`)

### Propriedades a comparar

cor de fundo e de texto das duas partes; altura (30 px na faixa, 26 px em linha); raio (6 px em linha); tamanho e
peso do texto (11 px negrito, 0,08 em; percentual 13 px no cartão, 12 px em linha); "−" tipográfico

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| 768 × 1024 | o cartão no tablet | as mesmas cores e alturas |
