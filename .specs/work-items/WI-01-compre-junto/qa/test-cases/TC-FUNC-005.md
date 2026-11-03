## TC-FUNC-005: Adicional marcado sem a escolha completa não entra, e o bloco diz qual escolha falta

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03.6
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, ramo J-01a
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** erro previsível do caminho principal; P0 por evitar sacola diferente do prometido

### Objetivo

A cliente que esqueceu o comprimento da corrente descobre na hora o que falta, e nada entra pela metade.

### Pré-condições

- Conta: anonima
- Massa: M-01, A1 (lista) e A2 (peça com eixo de variação)
- Estado de partida: sacola vazia, variação do pingente escolhida

### Condições reais

As da persona.

### Passos

1. Marcar A1 sem escolher a peça e tocar "Levar o conjunto" na barra fixa
   - **Esperado:** nada entra na sacola; aviso "Falta uma escolha em 1 peça. Ela está marcada acima."; a página rola até A1, que diz "Escolha a corrente."
2. Escolher a peça e não o eixo; tocar de novo
   - **Esperado:** nada entra; o adicional diz "Escolha o <eixo> da <primeira palavra do nome da peça>."
3. Marcar também A2 sem variação e tocar
   - **Esperado:** "Falta uma escolha em 2 peças. …"; o foco/rolagem vai ao primeiro incompleto

### Esperado e fonte

"Um adicional com variações não pode ser incluído sem a variação escolhida; o bloco diz qual escolha falta" — fonte: PRD CA-03.6; textos: protótipo da loja (spec › Design › Loja).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| eixo com uma só opção vendável | abre uma peça cujo eixo tem uma única opção | já nasce escolhida (protótipo) |
| computador | 1440, botão da coluna | mesmo comportamento |
