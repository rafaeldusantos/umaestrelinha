## TC-REG-001: Com o perfil Padrão, as telas da cliente ficam idênticas às de antes do Work Item

**Tipo:** regression
**Prioridade:** P0
**Origem:** CA-01, RN-01, RN-06, RN-08 (a metade Padrão)
**Autor:** dev
**Persona:** PER-04 Lúcia
**Jornada:** J-04, passos 1 a 4
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** comparar estilo computado dos elementos de referência (não pixel), worktree × referência, no mesmo banco

### Objetivo

A loja do ano inteiro é o Padrão. Se ele mudou um tom, todas as clientes sentem — e nenhum teste de componente vê.

### Pré-condições

- Conta: `cliente-qa` para `/conta` e a confirmação; `anonima` no resto
- Massa: perfil salvo = Padrão ou ausente (S0); o pedido PIX pendente da `cliente-qa` criado pela thread antes do L1
  (`/pedido/:id` no manifesto); a referência em `http://localhost:8092`
- Estado de partida: as duas lojas abertas em abas separadas, mesmo viewport

### Condições reais

390 × 844 em todas as telas; 1440 × 900 em Home, categoria, produto e checkout.

### O que mudou

As cores da loja passaram a vir de variáveis CSS por perfil (`--estrelinha-<t>` hex, `--estrelinha-<t>-rgb` para o
Tailwind com opacidade, camada HSL do shadcn por perfil), as sombras por `--estrelinha-shadow-rgb`/`--estrelinha-ink-rgb`,
o papel de desconto (`sale`, `on-sale`, `sale-bar`) com os valores de hoje, e a marca por `var(--estrelinha-primary-strong)`.

### Pontos de contato com outras jornadas

Toda jornada da cliente (compra, conta, pagamento PIX, confirmação) passa por estas cores.

### Passos

1. Em cada tela (Home, categoria, produto, sacola, checkout, `/conta`, confirmação `/pedido/:id`), lê com um `eval` as
   cores computadas dos elementos de referência no worktree e na referência
   - **Esperado:** iguais, elemento a elemento (cabeçalho, faixa de departamentos, botão primário, link, preço,
     parcelas, selo "-X%", barra do frete, borda de campo, rodapé, marca, sombra de um cartão, véu do menu; na
     confirmação, o selo de situação)
2. Compara os screenshots das duas
   - **Esperado:** sem diferença de cor visível
3. Confere as transparências (`/10`, `/70`, `/80`) e as sombras (cartão, aviso de cookies, convite do Instagram)
   - **Esperado:** mesmo valor `rgba` nas duas

### Esperado e fonte

Com o perfil Padrão, a loja é idêntica à de hoje, medida em 390 e 1440 nas telas de RN-08 — fonte: PRD CA-01, RN-08;
spec R6 (sombra do Padrão igual à de hoje), H2 (desconto do Padrão igual ao de hoje).

### Variações

| Variação         | Ação                                   | Esperado                         |
| ---------------- | -------------------------------------- | -------------------------------- |
| foco             | Tab num link e num botão               | o anel de foco igual             |
| 404              | `/nao-existe`                          | igual                            |
| perfil ausente × `padrao` | (se a thread alternar a chave)| igual nos dois                   |
