## TC-FUNC-007: Cada variação aparece com o percentual sobre o próprio preço

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05
**Autor:** dev
**Persona:** PER-02 Marina
**Jornada:** J-03, passo 5
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** pedido de automação E2E

### Objetivo

Quem troca a variação na página vê o preço com desconto daquela variação, não o da primeira nem um desconto fixo.

### Pré-condições

- Conta: `anonima`
- Massa: Black Friday em vigência; M-B (variações de preços diferentes) marcada em 15 %
- Estado de partida: página de M-B

### Condições reais

as da persona

### Passos

1. Escolhe a variação mais barata
   - **Esperado:** o preço com 15 % sobre o preço dela e o cheio dela riscado
2. Escolhe a variação mais cara
   - **Esperado:** o preço com 15 % sobre o preço dela; o riscado muda junto
3. Acrescenta a mais cara à sacola
   - **Esperado:** a sacola com o mesmo valor da página para aquela variação

### Esperado e fonte

Cada variação com o percentual sobre o próprio preço — fonte: PRD CA-05, UC-03 ("Vale para todas as variações da
peça, cada uma sobre o próprio preço").

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| cartão | olha o cartão de M-B em `/ofertas` | o preço mostrado é o da variação que o cartão exibe, com 15 % |
| variação pausada | (se houver) uma variação esgotada | sem preço de campanha estranho; segue a regra de sempre da loja |
