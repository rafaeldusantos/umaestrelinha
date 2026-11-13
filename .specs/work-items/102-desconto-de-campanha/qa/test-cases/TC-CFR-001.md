## TC-CFR-001: O selo, os preços e os filtros da campanha são legíveis por teclado e leitor de tela

**Tipo:** cfr
**Prioridade:** P1
**Origem:** exploratório — acessibilidade das superfícies novas da loja (CA-03, CA-09)
**Autor:** dev
**Persona:** PER-04 Rosa
**Jornada:** J-03, J-04
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** árvore de acessibilidade e teclado; leitor de tela real fica fora

### Objetivo

Quem não enxerga bem entende o desconto e o preço que vale, e opera os filtros sem mouse.

### Pré-condições

- Conta: `anonima`
- Massa: "Dia das Mães" em vigência; M-A (10 %), M-D (15 %), M-E comum
- Estado de partida: `http://localhost:8082/`

### Condições reais

| Dimensão    | Valor |
| ----------- | ----- |
| Dispositivo | 1440 × 900 (teclado); 390 × 844 (fonte a 200 %) |
| Modalidade  | só-teclado · leitor-de-tela (simulado pela árvore de acessibilidade) |

### Categoria

Acessibilidade (e recuperação de erro, no cupom recusado)

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| nome da faixa | "DIA DAS MÃES, 10% de desconto" (texto do selo + percentual + "de desconto") | — |
| preço riscado | lido com "De R$ X" | — |
| chips de `/ofertas` | estado pressionado anunciado; alcançáveis por Tab; foco visível | — |
| cartões do bloco da Home | "Ver as peças com {n}% de desconto" | — |
| recusa do cupom (sacola só de campanha) | anunciada como alerta/região viva | — |
| contraste do selo | ≥ 4,5:1 entre as duas cores | — |

### Passos

1. Pela árvore de acessibilidade, lê um cartão de M-A em `/ofertas`
   - **Esperado:** o nome da faixa e "De R$ X" no riscado
2. Só teclado: percorre os chips, escolhe "15%" com Enter/Espaço
   - **Esperado:** foco visível; estado pressionado
3. Só teclado na Home: chega aos cartões do bloco
   - **Esperado:** o nome "Ver as peças com …% de desconto"
4. Só teclado: M-A na sacola, aplica um cupom com só peças de campanha
   - **Esperado:** a recusa anunciada; o foco não se perde

### Esperado e fonte

Nome para leitor de tela "{texto do selo}, {pct}% de desconto"; "De R$" só para leitor de tela — fonte: `spec.md` ›
Selo · a faixa, Cartão, Home ("leitor de tela 'Ver as peças com {n}% de desconto'"); guia de CFR.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| movimento reduzido | com redução de movimento | o bloco e a vitrine sem animação decorativa |
| página do produto | lê o selo em linha | o mesmo nome |
