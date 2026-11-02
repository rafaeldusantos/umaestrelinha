## TC-JOURNEY-002: A cliente fecha a aba da loja e sai do total em até 5 minutos

**Tipo:** journey
**Prioridade:** P0
**Origem:** §10.4, LAV-12
**Autor:** dev
**Persona:** PER-03 Lúcia
**Jornada:** J-05, passo 4 e ramo J-05a; J-02a
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** espera real de até 5 min + 75 s; determinístico, mas longo

### Objetivo

Se a cliente que foi embora continua contada, a Adri vê gente onde não há ninguém.

### Pré-condições

- Conta: `anonima` com estatística aceita; a Adri (`admin-atelie`) lê `/ao-vivo` noutro contexto
- Massa: ambiente do CH-01; ninguém mais na loja
- Estado de partida: a Lúcia no checkout com uma joia na sacola, contada em "No checkout"

### Condições reais

as da persona (rede lenta)

### Entrada

http://localhost:8082/checkout

### Passos com tempo

| # | A persona… | Deve ver (na Loja ao vivo) | Em até |
| - | ---------- | -------------------------- | ------ |
| 1 | está no checkout | total 1, "No checkout" 1, a nota do checkout | 75 s |
| 2 | fecha a aba (anota a hora) | ainda 1 nos primeiros minutos | — |
| 3 | não volta | total 0, "No checkout" 0, a nota some, "Ninguém na loja agora" no cartão do Início | 5 min + 15 s depois do passo 2 |

### Objetivo e efeitos

Quem saiu deixa de contar em até 5 min. Efeito: a barra de agora cai junto; as barras dos minutos em que ela
estava continuam.

### Caminho de abandono

Este caso é o caminho de abandono de J-05 e de J-02.

### Esperado e fonte

Fechar a aba tira a pessoa do total em até 5 min — fonte: PRD §10.4, LAV-12

### Variações

| Variação                  | Ação                                     | Esperado                         |
| ------------------------- | ---------------------------------------- | -------------------------------- |
| fecha numa joia            | fecha a aba olhando uma joia              | sai de "Olhando joias" e de C     |
