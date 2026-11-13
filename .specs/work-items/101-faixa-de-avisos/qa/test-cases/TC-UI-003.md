## TC-UI-003: Com a faixa desligada, a loja fica igual à de hoje em 390 e em 1440

**Tipo:** ui
**Prioridade:** P1
**Origem:** CA-05, UC-04
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-05, passo 3
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** comparação de captura; julgamento visual. A referência "de hoje" é a loja sem o Work Item (Pergunta 🟡 de referência no plano)

### Objetivo

Fora de campanha, a Adri quer a loja exatamente como sempre foi — nem uma faixa vazia, nem um vão em cima.

### Pré-condições

- Conta: `admin-loja` (para desligar) — a loja é lida sem login
- Massa: a faixa do manifesto, **desligada** (passo 1 de TC-FUNC-009)
- Estado de partida: a referência servida em `http://localhost:8092` (ver Ambiente da execução) e a loja do branch em `http://localhost:8082`

### Condições reais

| Dimensão | Valor |
| --- | --- |
| Dispositivo | 390 × 844 e 1440 × 900 |

### Protótipo e tela

Referência: a mesma rota na loja sem o Work Item (`:8092`)

### Propriedades a comparar

| Propriedade | Esperado |
| --- | --- |
| elementos acima do `<header>` | nenhum, nas duas lojas |
| topo do `<header>` | y = 0 nas duas |
| captura da primeira dobra | igual, fora o conteúdo dinâmico (produtos, banners) |

### Passos

1. Captura a Home, uma categoria e um produto nas duas lojas, em 390 × 844
   - **Esperado:** sem faixa no branch; mesma posição do cabeçalho e do primeiro bloco
2. Repete em 1440 × 900
   - **Esperado:** o mesmo

### Esperado e fonte

Fonte: PRD CA-05 ("a loja é idêntica à de hoje, medida por captura em 390 e 1440"), UC-04

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| sem a referência | `:8092` não subiu | comparação estrutural só (nenhum elemento antes do `<header>`, `<header>` em y = 0); registrar que a captura comparada não rodou |
