## TC-UI-002: Em 1440 × 900 a faixa tem 48 px, setas de 44 px nas pontas e nenhuma rolagem lateral

**Tipo:** ui
**Prioridade:** P1
**Origem:** CA-07, UC-01
**Autor:** dev
**Persona:** PER-04 Rodrigo
**Jornada:** J-03, passo 1
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** medida de layout em navegador

### Objetivo

No computador a faixa tem de ser fina e firme: 48 px, as setas fáceis de acertar, nada pulando entre os avisos.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto (só leitura)
- Estado de partida: em C1

### Condições reais

as da persona (1440 × 900)

### Protótipo e tela

`Black Friday - Home.html` (`FaixaTopo`, `.faixa*` em `bf.css`) × a faixa da loja em C1

### Propriedades a comparar

| Propriedade | Esperado |
| --- | --- |
| altura da faixa | 48 px com cada um dos quatro avisos |
| setas | alvo de pelo menos 44 × 44 px, nas pontas do miolo |
| miolo | centralizado, no máximo 1280 px |
| rolagem lateral | nenhuma |
| texto | uma linha, sem corte, com o rótulo do link inteiro |

### Passos

1. Mede a altura da faixa com cada aviso
   - **Esperado:** 48 px, sempre
2. Mede a caixa de clique das duas setas
   - **Esperado:** ≥ 44 × 44
3. Mede a rolagem lateral
   - **Esperado:** nenhuma

### Esperado e fonte

Fonte: PRD UC-01 ("no computador, 48 px"; setas com alvo de 44 px), CA-07; spec Design (miolo de 1280, setas 32 × 40 com alvo de 44)

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| zoom do navegador 200 % | equivale a 720 de largura | sem rolagem lateral; texto inteiro (pode ganhar linha) |
