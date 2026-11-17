## TC-FUNC-018: A peça marcada que a campanha não barateia não aparece no bloco, e o editor e a linha dizem por quê

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04.4
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-04, passo 1
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** depende de P-NB ("de" R$ 200,00 · "por" R$ 120,00, marcada a 10 %)

### Objetivo

A dona entende por que uma peça que ela escolheu da campanha não aparece no bloco: a campanha não a deixa mais
barata do que ela já está.

### Pré-condições

- Conta: `admin-loja`; a loja sem login
- Massa: P-NB marcada em "Dia das Mães" com 10 % (a campanha daria R$ 180,00 sobre o "de", acima do "por" R$ 120,00)
- Estado de partida: editor de B-1 aberto

### Condições reais

as da persona

### Passos

1. Procurar P-NB na busca do bloco e escolhê-la
   - **Esperado:** P-NB está na busca (é marcada); entra na lista
   - **Esperado:** o editor diz que P-NB não aparece no bloco porque a campanha não baixa o preço dela
2. Salvar e ler a linha de B-1
   - **Esperado:** a linha diz que P-NB não aparece por esse motivo
3. Recarregar a loja
   - **Esperado:** P-NB não está na fileira; nenhuma outra no lugar

### Esperado e fonte

Peça marcada cujo preço a campanha não baixa não aparece no bloco (como não aparece na vitrine), e o editor e a
linha dizem quais — fonte: PRD CA-04.4; WI 102 I-02

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| vitrine | abrir `/ofertas` | P-NB também não está lá (coerente com o bloco) |
