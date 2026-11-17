## TC-FUNC-016: A peça escolhida despublicada ou apagada some da loja, e o painel conta e nomeia a peça

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04.1, CA-04.3
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-04, passo 4
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a loja se confere como visitante (D-04: sessão de admin enxerga peça despublicada)

### Objetivo

Quando uma peça escolhida sai do ar, a cliente não a vê e a dona sabe qual foi, sem caçar na lista.

### Pré-condições

- Conta: `admin-loja` no painel; a loja **sem login**
- Massa: B-1 com P-FORA e P-APAG escolhidas (TC-FUNC-015 feito)
- Estado de partida: fora do editor de B-1

### Condições reais

as da persona

### Passos

1. Despublicar P-FORA no cadastro do produto
   - **Esperado:** a peça fica fora do ar
2. Recarregar a loja
   - **Esperado:** P-FORA não está na fileira; nenhuma outra no lugar
3. Ler a linha de B-1 na Home do painel
   - **Esperado:** "N das M saíram do ar" (com N e M certos), nomeando P-FORA
4. Apagar P-APAG em `/admin/produtos`
   - **Esperado:** a peça some do catálogo
5. Recarregar a loja; ler a linha de B-1; reabrir o editor de B-1
   - **Esperado:** na loja, P-APAG não está; a linha conta as duas que saíram; no editor, P-APAG sai da lista e é
     nomeada **como apagada**; P-FORA nomeada como fora do ar
6. Salvar se o editor abrir alterado; republicar P-FORA (fim do CH-05)

### Esperado e fonte

Peça escolhida despublicada ou apagada não aparece na loja e o painel conta "N das M saíram do ar", nomeando; a
apagada sai da lista ao abrir, nomeada como apagada — fonte: PRD CA-04.1, CA-04.3

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| republicar | republicar P-FORA e recarregar a loja | P-FORA volta ao lugar dela na fileira; a contagem da linha cai |
