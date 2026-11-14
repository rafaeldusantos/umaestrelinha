## TC-UI-003: A Entrega do checkout recebendo o CEP da sacola segue o protótipo

**Tipo:** ui
**Prioridade:** P2
**Origem:** CA-09 (PRD 97 UC-04)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passo 6
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** conferência visual contra o protótipo da 97

### Objetivo

A linha "Trazido da sua sacola" é o que diz a Luana de onde veio o CEP; ela e o cartão da opção têm de ser os do
desenho.

### Pré-condições

- Conta: anonima
- Massa: uma peça; fixture A
- Estado de partida: gaveta com 01310-100 e o PAC escolhido

### Condições reais

390 × 844.

### Passos

1. Toca "Finalizar Pedido", preenche o Contato e confere o bloco Entrega
   - **Esperado:** como o protótipo do checkout

### Protótipo e tela

`Sacola - Prévia de frete.html` (`sf-checkout.jsx`, projeto "Uma Estrelinha - Loja", `69224d8a-…`; cópia migrada em
https://claude.ai/code/artifact/41e4046b-6433-4e30-9670-f714f2dc2b75) × `/checkout` › Entrega.

### Propriedades a comparar

- "Trazido da sua sacola · Bela Vista — São Paulo/SP": 13px, `ink-soft`, precedido de um ponto de 6px em `accent`,
  logo abaixo do campo de CEP
- O cartão da opção marcada igual ao da gaveta (borda `ink`, fundo `ground`)
- Ordem: CEP → linha → Rua, Bairro, Cidade, UF → Número (com o foco) → Forma de envio

### Esperado e fonte

Os valores acima — fonte: `spec.md` › Design › "Checkout · Entrega com o CEP da sacola".

### Variações

| Variação           | Ação         | Esperado                                         |
| ------------------ | ------------ | ------------------------------------------------ |
| Dados de exemplo   | —            | a faixa de R$ 300 do protótipo é exemplo; não é régua |
