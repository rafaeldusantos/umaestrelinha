## TC-CFR-001: Com a faixa ligada, a Home e a página de produto não pulam enquanto carregam em rede lenta

**Tipo:** cfr
**Prioridade:** P1
**Origem:** CA-06, RN-02
**Autor:** dev
**Persona:** PER-03 Marta
**Jornada:** J-04, passo 1 · J-02, ramo J-02a
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** CLS por `PerformanceObserver` (`layout-shift`, `buffered: true`) num build servido (`vite preview`), com o documento interceptado no navegador e `data-faixa` escrito no `<html>`, como a função faz (Q-02, respondida); driver `cli`, que também limita rede e CPU. Medido no dev server ou sem atributo, o número não vale para CA-06

### Objetivo

Quem está lendo e vê a página pular perde o lugar — e a Marta, com fonte grande, perde mais. A faixa chegando não pode empurrar a página.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto, ligada (só leitura — a sessão não muda a configuração)
- Estado de partida: build servido (Ambiente da execução), cache do navegador vazio a cada medida; a rota que reescreve o documento registrada antes do `goto`

### Condições reais

| Dimensão | Valor |
| --- | --- |
| Dispositivo | 390 × 844, depois 1440 × 900 |
| Rede | lenta (Slow 4G) e CPU 4× mais lenta, por CDP antes da carga |

### Categoria

Performance percebida (e Paridade com produção, no cabeçalho do log: build, não dev)

### Metas

| Observável | Alvo | Aceitável |
| --- | --- | --- |
| CLS da Home com `data-faixa="1"` | ≤ o da mesma Home com `data-faixa="0"` (na carga, sem faixa — spec H-03) | até +0,01 |
| CLS do produto com `data-faixa="1"` | ≤ o do mesmo produto com `data-faixa="0"` | até +0,01 |
| fonte do deslocamento | nenhuma entrada de `layout-shift` com a faixa ou o `<header>` entre as fontes | — |

### Passos

1. Mede o CLS da Home três vezes com o documento marcado `data-faixa="0"` e anota a mediana
   - **Esperado:** sem faixa nesta carga (a referência sem faixa)
2. Mede três vezes com `data-faixa="1"`
   - **Esperado:** a vaga ouro desde a primeira pintura, o A1 dentro dela; CLS dentro da meta
3. Repete 1–2 num produto de C1
4. Repete a Home em 1440 × 900

### Esperado e fonte

Fonte: PRD CA-06, RN-02; spec PR-1, H-03

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| sem atributo | documento sem `data-faixa` (o estado "não sei", como no dev) | registrar o CLS; não conta para CA-06 |
