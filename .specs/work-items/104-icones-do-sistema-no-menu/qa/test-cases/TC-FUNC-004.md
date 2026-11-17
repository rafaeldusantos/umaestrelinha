## TC-FUNC-004: A prévia ao lado mostra o ícone do sistema e a cor de cada fundo antes de gravar

**Tipo:** functional
**Prioridade:** P1
**Origem:** C-03, C-06
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** J-01, passo 5
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a prévia é a loja num iframe; conferível pelo conteúdo do frame; pedido de automação E2E

### Objetivo

A dona decide pela prévia: se ela não mostra o ícone e a cor antes de gravar, a dona grava às cegas.

### Pré-condições

- Conta: `admin`
- Massa: item A
- Estado de partida: editor do item A aberto, com a Etiqueta e as duas cores escolhidas e **não salvas**; `VITE_STORE_URL` configurada (palco com a loja)

### Condições reais

as da persona.

### Passos

1. Olha a prévia em Celular
   - **Esperado:** a folha aberta, o item A com a Etiqueta e o rótulo em `#8A5A2B`
2. Troca para Computador
   - **Esperado:** a barra com o item A, a Etiqueta e o rótulo em `#E8C77A`
3. Troca a cor da barra para outra válida (ex.: `#F2E1B6`), olha, e volta a `#E8C77A` antes de salvar
   - **Esperado:** a prévia de Computador acompanha as duas trocas, sem recarregar o quadro

### Esperado e fonte

A prévia do painel desenha o ícone do sistema e o efeito da cor — fonte: `plan.md` C-03 ("e na prévia do painel"), Design › Editor do item ("a prévia ao lado mostra o efeito").

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| regressão da prévia | mudar só o nome de um item sem cor | a prévia segue atualizando como antes |
| cor recusada | digitar uma cor ilegível | registrar o que a prévia mostra — nenhuma fonte decide (🟡 do plano) |
| tela cheia | modo tela cheia do palco em Computador | ícone e cor iguais a 100% |
