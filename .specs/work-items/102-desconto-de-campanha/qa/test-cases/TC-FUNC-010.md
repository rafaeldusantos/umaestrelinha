## TC-FUNC-010: Tirar da campanha um percentual que peças usam é recusado com a contagem

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-08
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, passo 5 (e J-02b)
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** recusa determinística com texto literal; pedido de automação E2E

### Objetivo

A dona não consegue, sem querer, deixar peças marcadas com um percentual que a campanha não oferece mais, e a tela
diz quantas peças precisam mudar e leva a elas.

### Pré-condições

- Conta: `admin-loja`
- Massa: campanha "Natal" (agendada) com 10 e 15 %; as peças de M-G marcadas em 15 % (TC-FUNC-021)
- Estado de partida: a edição de "Natal"

### Condições reais

as da persona

### Passos

1. Olha as pílulas de percentual
   - **Esperado:** 15 % com a contagem das peças de M-G ("{n} peças"); 10 % com "nenhuma peça"
2. Toca em "Tirar 15%"
   - **Esperado:** "{n} peças usam 15%. Mude essas peças para outro percentual (ou tire da campanha) antes de tirar o 15%." e o link "Ver as peças com 15%"; o 15 % continua lá
3. Segue "Ver as peças com 15%"
   - **Esperado:** `/admin/produtos` filtrada pela campanha Natal e por 15 %, mostrando as peças de M-G
4. Volta e tira o 10 %
   - **Esperado:** aceito (nenhuma peça usa); não salvar se a campanha precisar dele depois

### Esperado e fonte

Recusa com a contagem e o caminho às peças — fonte: PRD CA-08, UC-02; `spec.md` › Painel · Campanha · editar e
H-09/H-10.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| uma peça só | com 1 peça em 15 % | "1 peça usa 15%…" no singular |
| acrescentar | acrescenta 20 % | aceito, sem contagem ("nenhuma peça") |
| na Black Friday | olha (sem tirar) o 15 % da BF | contagem 1 peça (M-B) |
