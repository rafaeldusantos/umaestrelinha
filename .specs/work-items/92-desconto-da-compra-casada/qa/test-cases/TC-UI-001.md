## TC-UI-001: O bloco com "de/por" cabe em 390 × 844 a 100 %, 130 % e 200 % de fonte, sem rolagem horizontal nem pílula quebrada

**Tipo:** ui
**Prioridade:** P1
**Origem:** RNF-05
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passos 1–3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** jsdom não mede layout; a medida é do navegador real (`qa-report.md`, RNF-05)

### Objetivo

No celular, Marina lê o preço com desconto sem a página escorregar de lado nem o texto se encavalar.

### Pré-condições

- Conta: `anonima`
- Massa: M-01 (preço de quatro dígitos numa peça, se houver)
- Estado de partida: página de P

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | celular (390 × 844); 320 × 568 como borda        |
| Rede        | rápida                                           |
| Locale      | pt-BR                                            |
| Modalidade  | toque                                            |

### Protótipo e tela

`Produto - Compre Junto com desconto.html` (bloco) · `/produtos/:slug`.

### Propriedades a comparar

`document.documentElement.scrollWidth` ≤ 390; o "de/por" e "N% a menos levando junto" sem sobreposição e sem
quebrar dentro de pílula ou selo; a caixa de marcar com alvo ≥ 44 px; a barra fixa sem cobrir a linha do desconto.

### Passos

1. Medir a 100 %, 130 % e 200 % de fonte, com a corrente marcada
   - **Esperado:** nenhuma rolagem horizontal do `body`; nada cortado nem sobreposto
2. Repetir em 1440
   - **Esperado:** o mesmo, com a nota do computador

### Esperado e fonte

Fonte: `prd.md` RNF-05; `CLAUDE.md` › Mobile é o caso principal.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| 320 × 568 | medir | registrar; borda, não alvo |
