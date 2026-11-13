## TC-CFR-004: Com a fonte do sistema a 200 % no celular, o link do aviso continua inteiro e a página não rola para o lado

**Tipo:** cfr
**Prioridade:** P1
**Origem:** RN-07, CA-07
**Autor:** dev
**Persona:** PER-03 Marta
**Jornada:** J-04, passo 6
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** Q-01 respondida (2026-11-13): "A 200 % a faixa cresce além de duas linhas; a altura fixa vale só para a fonte padrão." A 200 %, mais de duas linhas não é bug; é bug texto cortado ou sobreposto, link inalcançável, rolagem lateral, cabeçalho cobrindo a faixa

### Objetivo

A Marta usa a fonte grande do celular. Se o "Ver ofertas" some cortado, ela não tem como chegar à campanha.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto (só leitura)
- Estado de partida: num produto de C1, 390 × 844

### Condições reais

| Dimensão | Valor |
| --- | --- |
| Dispositivo | celular 390 × 844 |
| Fonte | raiz a 130 % e a 200 % (`document.documentElement.style.fontSize`, refeito a cada carga — as alturas da faixa são em `rem`) |

### Categoria

Acessibilidade (visual) e Compatibilidade

### Metas

| Observável | Alvo | Aceitável |
| --- | --- | --- |
| rótulo do link | inteiro, visível e alcançável (toque e Tab) em cada aviso de texto com link | — |
| texto | nenhum texto da faixa cortado nem sobreposto | — |
| rolagem lateral | nenhuma | — |
| sobreposição | nenhum texto da faixa coberto pelo cabeçalho | — |
| linhas e altura | a 200 % a faixa pode passar de duas linhas e crescer além da altura da fonte padrão (Q-01) — registrar linhas e altura de cada aviso, sem veredito de falha por isso | — |

### Passos

1. Com a raiz a 130 %, espera cada aviso e tira screenshot
   - **Esperado:** dentro das metas
2. Com a raiz a 200 %, repete
   - **Esperado:** A1 com "Ver ofertas" inteiro e A2 com "Ver as peças" inteiro, os dois alcançáveis; nenhum texto cortado ou sobreposto; nenhuma rolagem lateral; o cabeçalho não cobre a faixa. O A2 (e qualquer outro) pode ocupar mais de duas linhas e a faixa crescer — não é bug (Q-01); registrar linhas e altura

### Esperado e fonte

Fonte: PRD RN-07 ("fonte do sistema a 200 % sem cortar o link"), CA-07; spec H-04, H-05; resposta de Q-01 (2026-11-13): a altura fixa vale só para a fonte padrão

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| zoom do navegador 200 % em 1440 | equivale a 720 de largura | sem rolagem lateral; setas alcançáveis |
