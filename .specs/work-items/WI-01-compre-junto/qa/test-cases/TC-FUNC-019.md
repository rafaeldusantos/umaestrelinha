## TC-FUNC-019: No pedido, cada adicional diz que acompanha a joia — na confirmação, em Minha Conta e no painel

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05.2
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-02, passo 6
**Charter:** CH-02 (o trecho de Minha Conta, em CH-05 com PER-04)
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** cruza loja e painel no mesmo banco; Minha Conta exige entrar por código (Mailpit local)

### Objetivo

Depois de comprar, a cliente e a dona leem no pedido o que foi comprado junto.

### Pré-condições

- Conta: anonima (convidada); `admin-painel` para o painel
- Massa: pedido criado em TC-JOURNEY-002 (M-01 com dois adicionais)
- Estado de partida: pedido criado

### Condições reais

As da persona; o painel em 1440.

### Passos

1. Abrir `/pedido/:id`
   - **Esperado:** cada item adicional com a frase de que acompanha o <nome de M-01>
2. Entrar em Minha Conta com o e-mail do pedido (código no Mailpit, :54444) e abrir o pedido
   - **Esperado:** a mesma frase nos adicionais
3. No painel, abrir o pedido
   - **Esperado:** cada item adicional com a linha de texto de que acompanha o principal

### Esperado e fonte

Fonte: PRD CA-05.2.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| peça que acompanha duas joias do pedido | pedido com M-01 e M-03 e a mesma corrente | "acompanha o <M-01> e o <M-03>" |
