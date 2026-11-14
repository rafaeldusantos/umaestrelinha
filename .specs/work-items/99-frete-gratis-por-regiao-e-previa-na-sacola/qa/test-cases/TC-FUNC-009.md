## TC-FUNC-009: Mudar a sacola depois do cálculo refaz a cotação com o mesmo CEP e mantém a escolha com o preço novo

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-10 (PRD 97 UC-05; `spec.md` D-13)
**Autor:** dev
**Persona:** PER-04 Teresa
**Jornada:** J-05, passo 6 (e J-01, ramo J-01c)
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a troca de fixture simula o preço novo da cotação

### Objetivo

Teresa muda a quantidade depois de escolher o frete: ela precisa ver o frete certo para a sacola nova sem refazer
tudo.

### Pré-condições

- Conta: cliente-com-endereco
- Massa: uma peça abaixo de R$ 450; fixtures A e B
- Estado de partida: gaveta com 90010-000 calculado e o SEDEX escolhido (fixture A)

### Condições reais

Fonte da raiz a 200 %.

### Passos

1. Troca a rota da cotação para a fixture B e aumenta a quantidade em 1 (ainda abaixo da faixa)
   - **Esperado:** uma nova consulta com o mesmo CEP; o SEDEX continua escolhido, agora com o preço da fixture B; o
     Total acompanha
2. Aumenta até passar de R$ 450
   - **Esperado:** a faixa vira "Frete grátis liberado"; a mais barata sai "Grátis"; o SEDEX escolhido continua cobrado
3. Diminui até voltar abaixo de R$ 450
   - **Esperado:** a faixa volta a "Faltam R$ X"; nada fica "Grátis"; o Total soma o frete
4. Troca a rota por uma resposta sem o SEDEX e muda a quantidade
   - **Esperado:** na gaveta, a escolha volta à mais barata

### Esperado e fonte

Recota com o mesmo CEP; a opção continua com o preço novo se existir, senão volta à mais barata; faixa e "Grátis"
acompanham o subtotal — fonte: PRD 97 CA-10, UC-05; `spec.md` D-13.

### Variações

| Variação              | Ação                                         | Esperado                                          |
| --------------------- | -------------------------------------------- | ------------------------------------------------- |
| Remove a peça e põe outra | remove e acrescenta outra peça           | recota com o mesmo CEP                            |
| Esvazia a sacola      | remove tudo e acrescenta de novo             | a gaveta vazia de hoje; ao voltar, o CEP continua guardado |
| Mudança no checkout   | muda a quantidade e vai ao checkout          | o checkout mostra o preço novo da mesma opção      |
