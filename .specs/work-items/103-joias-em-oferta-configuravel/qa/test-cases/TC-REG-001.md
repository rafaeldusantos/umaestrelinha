## TC-REG-001: Para a visitante, o selo, o preço, a sacola e /ofertas da campanha em vigência continuam como antes

**Tipo:** regression
**Prioridade:** P0
**Origem:** CA-06.1 (spec.md D-03: o conserto troca só a fonte da leitura; para a visitante nada muda)
**Autor:** dev
**Persona:** PER-03 Adri, conferindo a loja (antes de entrar na conta)
**Jornada:** J-05, passo 1
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a troca da leitura da campanha alcança selo, preço, sacola e vitrine de todas as clientes; regressão P0

### Objetivo

A cliente que não está logada continua vendo o desconto da campanha em vigência como via antes do WI — no cartão,
na página, na sacola e em `/ofertas`.

### Pré-condições

- Conta: `anonima` (a loja sem login)
- Massa: C-VIG em vigência com M-A e P-1 marcadas; C-AGE com P-AGE; C-ENC com M-A; C-DES com P-AGE (criada no começo do CH-03)
- Estado de partida: loja sem login, sacola vazia

### Condições reais

as da persona

### O que mudou

A loja passou a ler a campanha em vigência e as marcações por uma leitura que aplica a vigência no banco (D-07),
no lugar das tabelas de campanha. Alcança o bloco da Home, o selo e o preço dos cartões e da página, a sacola e o
recorte de `/ofertas`.

### Pontos de contato com outras jornadas

J-02 (a cliente no bloco), a compra com oferta da WI 102 (sacola e checkout) e `/ofertas`.

### Passos

1. Abrir a página de M-A
   - **Esperado:** o selo de "Dia das Mães", o preço da campanha e o cheio riscado — nada de "Black Friday"
2. Abrir a página de P-AGE
   - **Esperado:** sem selo; o preço cadastrado, sem riscado
3. Abrir `/ofertas`
   - **Esperado:** as peças de "Dia das Mães" (entre elas M-A e P-1), sem P-AGE
4. Pôr M-A na sacola
   - **Esperado:** a sacola com o preço da campanha que a página mostrou

### Esperado e fonte

Para a visitante, selo, preço, sacola e vitrine continuam iguais e só com a campanha em vigência — fonte: spec.md
D-03; PRD CA-06.1; comportamento entregue pela WI 102

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| cartão da coleção | abrir a coleção de M-A | o cartão de M-A com a faixa de "Dia das Mães" |
| computador | repetir o passo 3 em 1440 × 900 | o mesmo conjunto de peças |
