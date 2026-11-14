## TC-CFR-002: Em 390 e em 1440, a sacola com o frete não rola de lado, todo alvo tem 44 px e o rodapé fica na tela

**Tipo:** cfr
**Prioridade:** P1
**Origem:** CA-13 (PRD 97; RN-11)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passos 1 a 4; J-02, passo 2
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** medida de layout no navegador

### Objetivo

Luana usa o dedo, numa tela estreita: nenhum controle novo da gaveta pode ser pequeno demais ou empurrar a tela de lado.

### Pré-condições

- Conta: anonima
- Massa: uma peça; fixture A
- Estado de partida: gaveta aberta

### Condições reais

390 × 844 e 1440 × 900.

### Passos

1. Em 390, com a lista aberta e depois recolhida, mede `scrollWidth` do documento e da gaveta
   - **Esperado:** sem rolagem horizontal do corpo
2. Mede a área de toque do campo de CEP, de "Calcular", de "Trocar CEP", de cada opção, da linha recolhida, do cupom
   recolhido, do ⓘ e de "Finalizar Pedido"
   - **Esperado:** ≥ 44 px de altura (o ⓘ, pela área ampliada — um toque a ~13 px do círculo ainda o aciona)
3. Confere o rodapé
   - **Esperado:** o rodapé inteiro dentro da altura da tela, rolando por dentro se precisar
4. Repete 1 e 3 em 1440 × 900
   - **Esperado:** idem; a gaveta com a largura de até 440 px

### Categoria

Compatibilidade (viewport) e acessibilidade (alvo de toque).

### Metas

| Observável           | Alvo         | Aceitável |
| -------------------- | ------------ | --------- |
| rolagem horizontal   | nenhuma      | —         |
| alvo de toque        | ≥ 44 px      | —         |
| rodapé               | dentro da tela | rola por dentro |

### Esperado e fonte

PRD 97 CA-13, RN-11; PRD 99 M-03.

### Variações

| Variação         | Ação                 | Esperado                               |
| ---------------- | -------------------- | -------------------------------------- |
| 320 × 568        | viewport mínima       | botão "Finalizar Pedido" alcançável    |
| Grupos do RS     | com 90010-000         | o grupo "Retirar em" sem estourar       |
