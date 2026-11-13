## TC-FUNC-012: Sem campanha em vigência, /ofertas diz que não há ofertas e o bloco da Home some

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-09, R-04 — PRD UC-07
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-06, passo 6 (e J-03b)
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** pedido de automação E2E

### Objetivo

Depois da campanha, quem chega por um link antigo não vê página quebrada nem oferta que não existe, e o Google
deixa de indexar a vitrine vazia.

### Pré-condições

- Conta: `admin-loja`; a loja numa segunda aba
- Massa: a Black Friday encerrada (TC-FUNC-017); "Dia das Mães" ainda **não** criada; "Natal" agendada
- Estado de partida: a loja, `http://localhost:8082/ofertas`

### Condições reais

a loja em 390 × 844

### Passos

1. Abre `/ofertas`
   - **Esperado:** trilha "Início › Ofertas"; a caixa "Não há ofertas agora"; o texto "Quando houver uma campanha com peças em oferta, elas aparecem aqui. Enquanto isso, as coleções da loja continuam abertas."; o botão "Ver as coleções"
2. Confere a cabeça da página
   - **Esperado:** `noindex` no robots da página
3. Toca em "Ver as coleções"
   - **Esperado:** leva à loja (a Home, onde estão as coleções — 🟡 do plano)
4. Abre a Home
   - **Esperado:** sem o bloco "Joias em oferta" e sem espaço vazio no lugar dele

### Esperado e fonte

Sem campanha em vigência, a vitrine diz que não há ofertas e tem `noindex`; o bloco da Home não aparece — fonte:
PRD CA-09, UC-06, UC-07; `spec.md` › Vitrine `/ofertas` (sem campanha), I-07. O "não entra no sitemap" fica com a
Validation (o sitemap servido não roda no dev).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| filtro velho | abre `/ofertas?percentual=20` | o mesmo estado vazio, sem erro |
| link antigo | abre `/black-friday` | `/ofertas` vazia |
| título da aba | olha o título | sem "Black Friday" |
