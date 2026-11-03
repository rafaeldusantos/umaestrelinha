## TC-INT-005: Ver o bloco, escolher um adicional e levar o conjunto geram os eventos do GA4 sem contar a joia duas vezes

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-08.1, CA-08.2
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01
**Charter:** CH-01 (não executado na sessão: fica com o Dev)
**Situação:** ativo
**Automação:** target `integration` · status `missing`
**Spec:** —
**Nota:** a persona não vê o GA4; em desenvolvimento a loja não mede (só num build servido, `vite preview`), e a conferência intercepta por caminho (`**/g/collect*`), nunca por domínio (`CLAUDE.md` › feature 68). Coberto por `ProductPageBuyTogether.test.tsx` e `events.test`

### Objetivo

A dona mede o Compre Junto pelo que de fato aconteceu.

### Pré-condições

- Conta: anonima
- Massa: M-01; GA4 ligado com ID de teste e consentimento de cookies aceito
- Estado de partida: build da loja servido localmente

### Condições reais

As da persona.

### Passos

1. Abrir M-01 e ver o bloco
   - **Esperado:** um `view_item_list` com o identificador de lista do Compre Junto
2. Marcar um adicional
   - **Esperado:** um `select_item` com o mesmo identificador
3. Levar o conjunto com a joia em quantidade 1 e dois adicionais
   - **Esperado:** um `add_to_cart` com três itens, a joia uma vez, cada adicional com quantidade 1 e `item_list_id`

### Esperado e fonte

Fonte: PRD CA-08.1, CA-08.2; spec › Decisões, 20.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| sem adicional | "Adicionar à sacola" | o `add_to_cart` de sempre, um item |
