## TC-FUNC-006: A prévia mostra a faixa como a cliente vê, no celular e no computador, e anda de aviso em aviso pelos botões sem girar sozinha

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a prévia é a loja num iframe; conferível pelo frame

### Objetivo

A Adri só confia no que vê antes de publicar. A prévia tem de mostrar o rascunho, inclusive o que ainda não foi salvo.

### Pré-condições

- Conta: `admin-loja`
- Massa: os quatro avisos do manifesto; loja (:8082) de pé — a prévia carrega a loja
- Estado de partida: em `/admin/faixa-de-avisos`, faixa ligada

### Condições reais

as da persona

### Passos

1. Olha o card "Como a cliente vê"
   - **Esperado:** a prévia abre no Celular (390), com a faixa acima do cabeçalho da loja e o A1; "Aviso 1 de 4"; a faixa não troca sozinha depois de 10 s
2. Usa "Próximo aviso" duas vezes
   - **Esperado:** "Aviso 3 de 4" e o A3 na faixa da prévia
3. Edita o texto do A3 sem salvar
   - **Esperado:** a prévia mostra o texto novo em instantes, sem recarregar a página
4. Troca para Computador
   - **Esperado:** a faixa de 48 px com setas nas pontas, o mesmo aviso
5. Usa "Aviso anterior" e "Próximo aviso" de novo, depois de ter trocado o aviso aberto
   - **Esperado:** os botões continuam respondendo (não ficam inertes depois de um "mostre o aviso N")
6. Desfaz a edição do A3 (devolve o texto do manifesto)

### Esperado e fonte

A prévia é a loja com o rascunho, nos dois tamanhos, com "Aviso N de M" e sem giro — fonte: PRD UC-03 ("Prévia: a faixa como a cliente vê, nos dois tamanhos"); spec PR-5, H-21, H-22, I-07; qa-report (Observações: setas depois de "mostre o aviso N")

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| faixa desligada | desliga o interruptor sem salvar | prévia: "A faixa está desligada: a loja abre sem ela." e os botões somem |
| um aviso só | com um aviso só no rascunho | sem "Aviso anterior"/"Próximo aviso" |
| corpo da Home vazio na prévia | observa abaixo do cabeçalho | é o combinado (H-22): faixa e cabeçalho sobre corpo vazio — não é achado |
