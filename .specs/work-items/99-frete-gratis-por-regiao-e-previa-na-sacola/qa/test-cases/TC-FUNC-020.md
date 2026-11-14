## TC-FUNC-020: A barra de confiança, o aviso de entrada e a página do produto dizem a região do frete grátis, e a página do produto não zera frete

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-24 (PRD 99 UC-11; `spec.md` D-16)
**Autor:** dev
**Persona:** PER-04 Teresa
**Jornada:** J-05, passos 1 e 2
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** textos derivados da configuração; determinístico

### Objetivo

Toda superfície que anuncia o frete grátis precisa dizer para onde ele vale, para nenhuma cliente fora da região ser
atraída por uma promessa que não é dela.

### Pré-condições

- Conta: deslogada no passo 1; `cliente-com-endereco` para entrar
- Massa: Sul + Sudeste, R$ 450; fixture A
- Estado de partida: `/`, deslogada

### Condições reais

Fonte da raiz a 200 %.

### Passos

1. Lê a barra de confiança da Home
   - **Esperado:** o anúncio do frete grátis com a faixa e "· para Sul e Sudeste"
2. Abre o aviso de entrar na conta (o `AuthOverlay` da loja)
   - **Esperado:** onde ele anuncia o frete grátis, a região junto ("para Sul e Sudeste")
3. Abre um produto e calcula o frete com 01310-100 no cálculo da página
   - **Esperado:** uma linha de texto com a faixa e a região; as opções com o preço da cotação, nenhuma "Grátis" nem
     riscada, mesmo se o preço da peça passar de R$ 450

### Esperado e fonte

A região aparece nas três superfícies, lida da configuração; a página do produto não zera nem risca frete — fonte: PRD
99 CA-24, UC-11; `spec.md` D-16.

### Variações

| Variação                 | Ação                                         | Esperado                                         |
| ------------------------ | -------------------------------------------- | ------------------------------------------------ |
| A 200 %                  | confere as três                               | texto quebra em linha, nunca cortado             |
| Com as cinco regiões      | (só se o CH-05 deixar as cinco — não é o caso nesta rodada) | os textos não falam de região |
