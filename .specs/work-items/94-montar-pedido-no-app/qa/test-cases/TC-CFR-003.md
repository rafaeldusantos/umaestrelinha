## TC-CFR-003: Cada espera da montagem mostra que está trabalhando

**Tipo:** cfr
**Prioridade:** P2
**Origem:** exploratório — performance percebida nas esperas novas (leitura, catálogo, prévia, cotação, criar link)
**Autor:** dev
**Persona:** PER-03 Adri com a fonte grande
**Jornada:** J-01, J-04
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** com rede lenta emulada

### Objetivo

A Adri não toca de novo por achar que nada aconteceu.

### Pré-condições

- Conta: `admin-atelie`
- Estado de partida: `/pedidos`

### Condições reais

| Dimensão | Valor |
| -------- | ----- |
| Rede     | lenta |

### Categoria

Performance percebida.

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| retorno do botão ("Lendo o texto…", "Criando o link…") | imediato | — |
| espera > 300 ms (catálogo, prévia, cotação, Montados) | indica que carrega | — |
| leitura longa (> 2 s) | "Lendo o texto…" segue visível | — |
| primeira pintura de Montados | < 2 s | < 4 s |

### Passos

1. Percorre J-01 e abre Montados com a rede lenta
   - **Esperado:** as metas

### Esperado e fonte

Fonte: cfr.md › Performance percebida; PRD (os rótulos "Lendo o texto…", "Criando o link…").

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
