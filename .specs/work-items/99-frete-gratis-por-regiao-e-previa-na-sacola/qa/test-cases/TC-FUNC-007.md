## TC-FUNC-007: Finalizar Pedido abre a Entrega com o CEP, o endereço e a opção da sacola, esperando só o número

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-09 (PRD 97 UC-04)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passo 6
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** caminho principal da prévia; determinístico com a fixture (a busca do endereço vai ao ViaCEP)

### Objetivo

Luana não quer digitar o CEP de novo: o checkout tem de receber o que ela já fez na sacola.

### Pré-condições

- Conta: anonima
- Massa: uma peça; fixture A
- Estado de partida: gaveta com 01310-100 calculado e o PAC escolhido

### Condições reais

As da persona.

### Passos

1. Toca "Finalizar Pedido" e preenche o Contato
   - **Esperado:** o bloco Entrega aberto com o CEP 01310-100; rua, bairro, cidade e UF preenchidos pela busca
2. Olha abaixo do campo de CEP
   - **Esperado:** "Trazido da sua sacola · Bela Vista — São Paulo/SP"
3. Olha a forma de envio e o foco
   - **Esperado:** o PAC já marcado; o cursor no campo Número

### Esperado e fonte

CEP, endereço da busca, opção da gaveta marcada, a linha "Trazido da sua sacola" e o foco no Número — fonte: PRD 97
CA-09, UC-04; `spec.md` › Design › "Checkout · Entrega com o CEP da sacola".

### Variações

| Variação                          | Ação                                                | Esperado                                                      |
| --------------------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| Opção sumiu da cotação no checkout | troca a fixture por uma sem o PAC antes de ir ao checkout | a escolha é desfeita e ela escolhe outra                 |
| Digita outro CEP no checkout      | troca o CEP no bloco Entrega                        | a linha "Trazido da sua sacola" some e a escolha é desfeita    |
| Busca do CEP sem rede             | bloqueia `viacep.com.br`                            | a linha diz só "Trazido da sua sacola"; os campos ficam para ela preencher |
