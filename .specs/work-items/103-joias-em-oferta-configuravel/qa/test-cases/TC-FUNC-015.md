## TC-FUNC-015: A peça tirada da campanha some do bloco sem substituta e sai da lista ao abrir o editor, que abre alterado

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04.2, CA-04.3
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-04, passos 2–3
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a vaga fica vazia (o painel avisa, a loja pula); determinístico

### Objetivo

A cliente não vê no bloco uma peça que saiu da campanha, nem uma peça que a dona não escolheu no lugar dela; a
dona descobre ao abrir o editor qual saiu.

### Pré-condições

- Conta: `admin-loja` no painel; a loja sem login
- Massa: B-1 salvo com P-3, P-1, P-2, P-TIRA, P-FORA, P-APAG, P-NB (passo 1 do CH-05)
- Estado de partida: fora do editor de B-1

### Condições reais

as da persona; a loja em 390 × 844

### Passos

1. Na aba Preço e estoque de P-TIRA, tirá-la de "Dia das Mães" e salvar o produto
   - **Esperado:** a peça fica sem "Dia das Mães"
2. Recarregar a loja e olhar a fileira de B-1
   - **Esperado:** P-TIRA não está; as outras escolhidas que valem continuam na ordem; nenhuma peça que a dona não
     escolheu entrou no lugar
3. Reabrir o editor de B-1
   - **Esperado:** depois de carregar, P-TIRA não está mais na lista; o editor diz que P-TIRA saiu (tirada da
     campanha) e que a remoção vale quando salvar; o editor abre como alterado
4. Salvar
   - **Esperado:** "Salvo"; reabrir não repete o aviso

### Esperado e fonte

Peça escolhida tirada da campanha não aparece no bloco e a vaga não é completada; ao abrir, sai da lista, o editor
diz qual saiu e que vale ao salvar, e abre alterado — fonte: PRD CA-04.2, CA-04.3

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| fechar sem salvar | no passo 4, Cancelar e reabrir | o aviso e a pendência voltam |
| sair e voltar | no passo 3, ir para outra página do painel e voltar ao editor | a pendência continua dita |
