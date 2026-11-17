## TC-FUNC-011: Na barra do computador, o rótulo sai na cor da barra e a mantém no hover e com o painel aberto

**Tipo:** functional
**Prioridade:** P1
**Origem:** C-03, C-06
**Autor:** dev
**Persona:** PER-03 Cliente no computador
**Jornada:** J-03, passos 1–3 e ramo J-03a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** cor computada em estados provocáveis (hover, foco); pedido de automação E2E

### Objetivo

A cor da dona não pisca para branco no hover, e a cliente continua sabendo qual departamento está aberto.

### Pré-condições

- Conta: `anonima`
- Massa: item A (Etiqueta, barra `#E8C77A`); para o painel aberto, um item principal com cor de barra e submenu, se houver — senão, só hover e foco em A
- Estado de partida: `/` na loja, 1440 × 900

### Condições reais

as da persona.

### Passos

1. Confere o rótulo de A parado
   - **Esperado:** `rgb(232, 199, 122)`; Etiqueta ao lado, no tom dela (não herda a cor do rótulo)
2. Passa o mouse em A
   - **Esperado:** rótulo continua `rgb(232, 199, 122)`
3. Chega em A por Tab
   - **Esperado:** foco visível; rótulo continua na cor
4. Abre o painel de um item com submenu
   - **Esperado:** a régua de 2 px marca o aberto; se o item tiver cor de barra, o rótulo a mantém aberto

### Esperado e fonte

Aberto e hover mantêm a cor da dona; a pista do aberto continua pela régua de 2 px — fonte: `plan.md` C-06 (P-05), Design › Loja; `tasks/02` › Testes ("o ícone continua no tom dele").

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| J-03a | abrir o painel de B e sair por Tab | painel fecha; foco visível no rótulo colorido de A |
| superfície certa | item A tem lista `#8A5A2B` também | a barra usa `#E8C77A`, nunca a cor da lista |
