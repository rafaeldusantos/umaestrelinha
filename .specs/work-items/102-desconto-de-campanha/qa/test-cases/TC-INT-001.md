## TC-INT-001: O feed do Google traz o preço promocional e a vigência iguais aos da página

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-10
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-05, passo 5
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `integration` — status `missing`
**Spec:** —
**Nota:** efeito fora da tela da loja (o XML da function `google-feed`); a paridade fica melhor no teste do Dev (`shoppingParity`), a QA confere uma amostra

### Objetivo

O anúncio do Google mostra o mesmo preço que a cliente encontra ao clicar, para a loja não ter o anúncio
reprovado nem a cliente se sentir enganada.

### Pré-condições

- Conta: `admin-loja` (a leitura do feed não precisa de login)
- Massa: Black Friday em vigência; M-A (20 %) e M-B (15 %)
- Estado de partida: a function `google-feed` servida localmente

### Condições reais

as da persona

### Passos

1. Abre `http://127.0.0.1:54441/functions/v1/google-feed` e acha os itens de M-A
   - **Esperado:** cada variação com `g:price` = o preço cheio, `g:sale_price` = o preço com desconto, `g:sale_price_effective_date` = a vigência (início e fim, em UTC)
2. Compara com a página de M-A na loja, variação por variação
   - **Esperado:** `g:sale_price` igual ao preço com desconto da página
3. Faz o mesmo com duas variações de M-B
   - **Esperado:** o mesmo, cada uma com o próprio preço
4. Acha uma peça comum
   - **Esperado:** sem `g:sale_price` de campanha

### Esperado e fonte

`<g:price>` = o cheio, `<g:sale_price>` = o com desconto, `<g:sale_price_effective_date>` = a vigência, para cada
variação de peça marcada — fonte: PRD CA-10, RN-07; `spec.md` I-09 (UTC com o fim exclusivo).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| M-C com "de/por" | olha a variação com "de" | `g:sale_price` = o menor (CA-06) |
| fim exclusivo | lê o fim da vigência | 01/12/2026 03:00 UTC (= 30/11 23:59 + 1 min em Brasília), conforme I-09 |
