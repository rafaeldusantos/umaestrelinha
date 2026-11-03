## TC-JOURNEY-005: A cliente volta com a sacola de antes da mudança e completa o conjunto sem perder nada

**Tipo:** journey
**Prioridade:** P1
**Origem:** CA-04.7, CA-04.1
**Autor:** dev
**Persona:** PER-04 Sônia
**Jornada:** J-05, passos 1–4
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a automação semeia `estrelinha-cart` no formato de antes (versão 3) antes de abrir a loja

### Objetivo

Quem já tinha sacola antes do deploy encontra tudo como deixou e o conjunto se soma a ela.

### Pré-condições

- Conta: anonima
- Massa: M-07 (sacola de antes com uma corrente de M-02, variação V), M-01
- Estado de partida: navegador com M-07 gravada

### Condições reais

As da persona (1440 × 900).

### Entrada

Direta, `/`.

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| - | ---------- | -------- | ------ |
| 1 | abre a sacola | a corrente na variação V, sem frase | 5 s |
| 2 | leva o conjunto de M-01 com a mesma corrente, variação V | uma linha da corrente, quantidade somada, "acompanha o <M-01>" | 10 s |
| 3 | fecha a aba e reabre a loja | a sacola igual | 10 s |

### Objetivo e efeitos

Sacola com as peças de antes e as novas, sem duplicata.

### Caminho de abandono

Remover o pingente: a corrente fica, sem a frase (TC-FUNC-015).

### Esperado e fonte

Sacola intacta e mescla — fonte: PRD CA-04.7, CA-04.1.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| variação diferente | leva a corrente numa variação ≠ V | duas linhas: a de antes sem frase, a nova com a frase |
