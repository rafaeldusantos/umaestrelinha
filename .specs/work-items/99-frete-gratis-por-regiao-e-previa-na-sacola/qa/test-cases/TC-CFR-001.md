## TC-CFR-001: No celular, o rodapé da sacola com o frete escolhido cabe em até 270 px sem nota abaixo do Total, e a 200 % rola por dentro sem cortar o CEP nem o valor

**Tipo:** cfr
**Prioridade:** P1
**Origem:** CA-23, CA-08 (PRD 99 M-06, M-07; PRD 97 RN-11)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passos 3 e 4
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** medida de layout que a Validation deixou para o navegador (jsdom não mede)

### Objetivo

O rodapé que tomava a tela inteira foi o motivo da v2: Luana precisa ver as peças, e Teresa, com a fonte grande, ler o
CEP e o valor.

### Pré-condições

- Conta: anonima
- Massa: uma peça; fixture A
- Estado de partida: gaveta aberta

### Condições reais

390 × 844; fonte da raiz a 100 % e a 200 %.

### Passos

1. A 100 %, sem CEP, mede a altura do rodapé
   - **Esperado:** ~244 px (régua de apoio); nenhuma nota abaixo do Total
2. Calcula com 01310-100, escolhe o PAC (recolhido) e mede
   - **Esperado:** rodapé ≤ 270 px; nenhuma nota abaixo do Total; `scrollWidth` do documento = 390
3. Com as opções abertas, mede
   - **Esperado:** o rodapé dentro da tela (pode passar de 270 enquanto ela escolhe; as peças rolam acima); nenhuma nota
4. A 200 %, repete os passos 2 e 3
   - **Esperado:** o rodapé pode crescer e rolar por dentro; o CEP na linha recolhida e o valor da opção inteiros (nunca
     cortados ou com reticências); sem rolagem horizontal

### Categoria

Compatibilidade (viewport e fonte) e usabilidade (minimalismo).

### Metas

| Observável                         | Alvo                  | Aceitável                     |
| ---------------------------------- | --------------------- | ----------------------------- |
| altura do rodapé, frete escolhido, 100 % | ≤ 270 px        | — (acima é `fail`)            |
| nota abaixo do Total               | nenhuma, em todo estado | —                           |
| rolagem horizontal                 | nenhuma               | —                             |
| CEP e valor a 200 %                | inteiros              | quebrando em duas linhas      |

### Esperado e fonte

PRD 99 CA-23, M-06, M-07; PRD 97 RN-11.

### Variações

| Variação  | Ação                    | Esperado                                    |
| --------- | ----------------------- | ------------------------------------------- |
| 130 %     | repete o passo 2 a 130 % | sem corte; altura registrada                |
| Com cupom | aplica um cupom de valor | as linhas de desconto não criam nota abaixo do Total |
