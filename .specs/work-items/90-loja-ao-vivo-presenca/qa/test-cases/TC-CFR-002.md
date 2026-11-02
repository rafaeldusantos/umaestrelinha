## TC-CFR-002: Com "reduzir movimento" ligado, as barras não animam e o ponto dourado não pulsa

**Tipo:** cfr
**Prioridade:** P1
**Origem:** LAV-64, LAV-02
**Autor:** dev
**Persona:** PER-02 Adri à noite, fonte 200 %
**Jornada:** J-02
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** observação de movimento com `reducedMotion: reduce` e sem ele

### Objetivo

Movimento na tela cansa a Adri à noite; a tela de acompanhamento não deve se mexer à toa.

### Pré-condições

- Conta: `admin-atelie`
- Massa: 2 clientes presentes; uma delas muda de estado durante o caso
- Estado de partida: `/ao-vivo`

### Condições reais

`reducedMotion: reduce`

### Passos

1. Uma cliente vai da joia à sacola; observa as barras de "O que estão fazendo" e "De onde vieram" mudarem de largura
   - **Esperado:** a largura muda de uma vez, sem transição
2. Sem a redução, repete
   - **Esperado:** a largura pode transicionar; os estados finais são os mesmos
3. Observa o ponto dourado do cartão e do bloco A por 10 s
   - **Esperado:** parado nos dois modos

### Categoria

Acessibilidade (movimento reduzido).

### Metas

| Observável                     | Alvo          | Aceitável     |
| ------------------------------ | ------------- | ------------- |
| transição de largura reduzida   | nenhuma       | nenhuma       |
| ponto dourado                   | estático      | estático      |

### Esperado e fonte

Barras sem animar a largura com movimento reduzido; ponto estático — fonte: PRD LAV-64, LAV-02

### Variações

| Variação  | Ação             | Esperado     |
| --------- | ---------------- | ------------ |
| tema escuro | `colorScheme: dark` | nada some ou fica invisível |
