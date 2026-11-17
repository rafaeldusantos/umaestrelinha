## TC-FUNC-005: Uma cor que deixa o rótulo ilegível no seu fundo é recusada antes de gravar, com a medida na frase

**Tipo:** functional
**Prioridade:** P1
**Origem:** C-07
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** J-01, ramo J-01a
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a recusa é a única contenção do contraste (a cor vai por `style`, sem guarda na loja); determinística; pedido de automação E2E — conferir também que nenhuma requisição de gravação sai

### Objetivo

A dona não consegue, nem sem querer, publicar um rótulo que a cliente não lê — e, recusada, entende o motivo e o que fazer.

### Pré-condições

- Conta: `admin`
- Massa: item C, sem cor
- Estado de partida: editor do item C aberto, perfil Padrão

### Condições reais

as da persona.

### Passos

1. Na barra, digita `#8A5A2B` (≈1,6:1 sobre `#34495E`)
   - **Esperado:** a medida em vermelho, abaixo de 4,5:1
2. Clica em Salvar
   - **Esperado:** a recusa na área de recusa do editor (`editor-recusa`), nomeando a barra do computador e trazendo a medida (`N,NN:1`); nada gravado; o código digitado continua no campo
3. Recarrega e reabre o item C
   - **Esperado:** item C sem cor na barra (nada gravou)
4. Ajusta o código até a medida passar de 4,5:1 e salva
   - **Esperado:** medida verde; gravado

### Esperado e fonte

Cor abaixo de 4,5:1 sobre o fundo da superfície recusada antes de gravar, com a razão e a medida na frase; Salvar não grava — fonte: `plan.md` C-07, Design › Editor do item.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| lista branca | na lista, `#E8C77A` (≈1,6:1 sobre branco) | recusa nomeando a lista do celular, com a medida; nada gravado |
| as duas ilegíveis | barra `#8A5A2B` e lista `#E8C77A` juntas | recusa; nada gravado |
| no piso | ajustar até a medida mostrar exatamente 4,5:1 | aceita (verde) |
| a mesma cor serve a uma e não à outra | `#8A5A2B` na lista (aceita) e na barra (recusada) | cada campo julgado contra o seu fundo |
| duplo clique no Salvar | dois cliques com a recusa visível | nenhuma gravação |
