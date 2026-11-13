## TC-UI-001: Em 390 × 844 a faixa não cria rolagem lateral, e o aviso mais longo cabe em duas linhas sem corte

**Tipo:** ui
**Prioridade:** P1
**Origem:** RN-07, CA-07, UC-01
**Autor:** dev
**Persona:** PER-02 Bia
**Jornada:** J-02, passo 1
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** a medida de layout só existe em navegador (jsdom devolve 0); o "sem corte" é julgamento visual. É a medida da premissa H-05 (teto conjunto de 90). As duas linhas e a altura fixa valem na fonte padrão; com a fonte maior a faixa pode crescer (Q-01, respondida)

### Objetivo

90 % dos acessos são do celular. Um aviso cortado ou uma página que escorrega para o lado na primeira tela é o pior primeiro contato com a campanha.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto — o A2 tem 90 caracteres somados (o máximo aceito)
- Estado de partida: num produto de C2

### Condições reais

| Dimensão | Valor |
| --- | --- |
| Dispositivo | celular 390 × 844; depois 360 × 800 |

### Protótipo e tela

`Black Friday - Home.html` (faixa `FaixaTopo`) × a faixa da loja no produto

### Propriedades a comparar

| Propriedade | Esperado |
| --- | --- |
| rolagem lateral | `document.documentElement.scrollWidth` = largura da janela, com cada um dos quatro avisos |
| linhas do A2 | duas linhas, com o rótulo "Ver as peças" inteiro e sem quebrar no meio |
| altura | a mesma para os quatro avisos (A1 curto, A2 longo, A3 sem link, A4 imagem) — nada abaixo da faixa se move nas trocas |
| corte | nenhum texto cortado nem coberto pelo cabeçalho |

### Passos

1. Espera o A2 e tira screenshot da faixa
   - **Esperado:** duas linhas, o rótulo inteiro, nada cortado
2. Mede a rolagem lateral com cada aviso na faixa
   - **Esperado:** nenhuma rolagem lateral
3. Mede a posição do topo do `<header>` em cada troca
   - **Esperado:** o mesmo valor nas quatro

### Esperado e fonte

Fonte: PRD UC-01 (altura fixa; até duas linhas), RN-07, CA-07; spec PR-2, H-04, H-05; resposta de Q-01 (2026-11-13): a altura fixa vale só para a fonte padrão

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| 360 de largura | refaz em 360 × 800 | registrar se o A2 passa de duas linhas (a premissa de 90 é medida a 390) |
| fonte a 130 % e a 200 % | raiz a 130 %, depois a 200 % | a faixa cresce com a fonte e pode passar de duas linhas — não é bug (Q-01). É bug: texto cortado ou sobreposto, rótulo do link inalcançável, rolagem lateral, cabeçalho cobrindo a faixa |
