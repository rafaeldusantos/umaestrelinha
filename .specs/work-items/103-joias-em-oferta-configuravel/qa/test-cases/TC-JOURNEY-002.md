## TC-JOURNEY-002: A cliente, pelo celular, encontra na Home as joias escolhidas e chega à peça com o preço da campanha

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-02.2, CA-03.2
**Autor:** dev
**Persona:** PER-02 Marina
**Jornada:** J-02, passos 1–4
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a jornada de valor da cliente; determinística depois do CH-01

### Objetivo

Quem chega pela primeira vez acha as joias em oferta pelo bloco e chega a uma delas sabendo quanto vai pagar.

### Pré-condições

- Conta: `anonima`
- Massa: B-1 com "Dia das Mães", título, descrição e P-3, P-1, P-2 (deixado pelo CH-01)
- Estado de partida: loja fechada, sacola vazia

### Condições reais

as da persona (celular 390 × 844, toque)

### Entrada

`http://localhost:8082/` direto, como quem vem de um link de story.

### Passos com tempo

| # | A persona… | Esperado | Em até |
| - | ---------- | -------- | ------ |
| 1 | abre a Home e desce até o bloco | o bloco com o selo, o título e a descrição da dona, os cartões e as peças | 4 s |
| 2 | passa as peças | P-3, P-1, P-2, nessa ordem | 5 s |
| 3 | toca em P-1 | a página de P-1 com o selo de "Dia das Mães" e o preço da campanha (riscado o cheio) | 4 s |
| 4 | volta e toca em "Ver todas" | `/ofertas` com as peças da campanha | 4 s |

### Objetivo e efeitos

A página de uma peça escolhida com o preço da campanha.

### Caminho de abandono

Na rede lenta (J-02a), a cliente espera o bloco: as vagas reservadas aparecem e nada salta — TC-UI-001.

### Esperado e fonte

O bloco aparece durante a vigência com as peças na ordem da dona; a peça leva ao preço da campanha — fonte: PRD
CA-02.2, CA-03.2

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| computador | repetir em 1440 × 900 | a mesma ordem; setas na fileira |
| voltar | voltar do browser na página da peça | a Home volta ao ponto do bloco |
