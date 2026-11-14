## TC-FUNC-002: A sacola mostra as mesmas opções, preços e prazos que o checkout, sem nova consulta

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-03 (PRD 97; RN-01, RN-02)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passos 3 e 6
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** determinístico com a cotação interceptada; a contagem de chamadas sai da rede da página

### Objetivo

O frete que Luana vê na sacola tem de ser o mesmo que o checkout vai mostrar; prazos diferentes para o mesmo CEP
fariam ela desconfiar dos dois.

### Pré-condições

- Conta: anonima
- Massa: uma peça abaixo de R$ 450; cotação interceptada com a fixture A
- Estado de partida: gaveta aberta, sem CEP

### Condições reais

As da persona.

### Passos

1. Digita 01310-100 e toca "Calcular"
   - **Esperado:** o cabeçalho "Frete para 01310-100 · São Paulo/SP" com "Trocar CEP"; as opções da fixture como
     cartões de rádio (PAC · Correios e SEDEX · Correios), cada uma com "Chega entre … e …" e o valor
2. Anota nome, prazo, valor e ordem de cada opção; toca "Finalizar Pedido" e preenche o Contato
   - **Esperado:** o bloco Entrega lista as mesmas opções, com os mesmos nomes, prazos, valores e na mesma ordem
3. Confere a rede desde o passo 1
   - **Esperado:** uma única chamada a `melhor-envio` para 01310-100 com esta sacola — o checkout não consultou de novo

### Esperado e fonte

Mesmas opções, preços e prazos na gaveta e no bloco Entrega, e a segunda leitura sem nova chamada — fonte: PRD 97
CA-03, RN-01, RN-02.

### Variações

| Variação                         | Ação                                              | Esperado                                       |
| -------------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| Opção com preço zero na resposta | troca a fixture por uma com uma opção a `"0"`      | a opção de preço zero não aparece em nenhum dos dois |
| 1440 × 900                       | repete em desktop                                 | mesmas opções e a mesma ordem                  |
| Busca do CEP sem rede (ViaCEP)   | bloqueia `viacep.com.br` e calcula                | o cabeçalho sai só com o CEP, sem a cidade     |
