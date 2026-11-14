## TC-FUNC-011: Com CEP do Rio Grande do Sul, a sacola oferece a retirada no escritório sem marcá-la

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-07 (PRD 97 UC-02, RN-07)
**Autor:** dev
**Persona:** PER-04 Teresa
**Jornada:** J-05, passos 3 e 4
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** depende do endereço do escritório preenchido no banco local (massa)

### Objetivo

Teresa mora em Porto Alegre e pode retirar no escritório; ela precisa ver a opção, decidir sozinha, e ter a escolha
levada ao checkout.

### Pré-condições

- Conta: cliente-com-endereco
- Massa: retirada ligada e endereço do escritório completo (`store_settings`, Frete e Material › Material); fixture A
- Estado de partida: gaveta com uma peça, sem CEP

### Condições reais

Fonte da raiz a 200 %.

### Passos

1. Calcula com 90010-000
   - **Esperado:** os grupos "Envio a domicílio" (PAC, SEDEX) e "Retirar em" (o endereço do escritório); a mais barata
     de domicílio marcada; a retirada **não** marcada
2. Escolhe a retirada
   - **Esperado:** a lista recolhe; o resumo diz "Retirada no escritório · Grátis"; o Total sem frete
3. Segue ao checkout
   - **Esperado:** a retirada marcada no bloco Entrega e "Retirada no escritório" no Resumo

### Esperado e fonte

Grupos "Envio a domicílio" e "Retirar em"; a retirada nunca vem marcada; escolhida, "Retirada no escritório · Grátis"
— fonte: PRD 97 CA-07, UC-02, RN-07.

### Variações

| Variação             | Ação                                      | Esperado                                    |
| -------------------- | ----------------------------------------- | ------------------------------------------- |
| CEP de fora do RS    | calcula com 01310-100                     | nenhum grupo "Retirar em"                   |
| Troca o CEP          | com a retirada escolhida, toca "Trocar CEP" e calcula com 01310-100 | a retirada desfeita, a mais barata marcada |
