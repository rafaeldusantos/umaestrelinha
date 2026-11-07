## TC-SMOKE-002: Levar o conjunto põe a corrente na sacola com a linha "Desconto do Compre Junto" e o total do bloco

**Tipo:** smoke
**Prioridade:** P0
**Origem:** CA-02.4, CA-03.8
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-01, passo 4
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o caminho de dinheiro mínimo: bloco → sacola com o mesmo número

### Objetivo

Confirmar em dois minutos que o desconto do bloco chega à sacola com o mesmo valor.

### Pré-condições

- Conta: `anonima`
- Massa: M-01; sem promoção nem cupom valendo para a corrente
- Estado de partida: página de P, sacola vazia

### Condições reais

As da persona.

### Passos

1. Marcar a corrente avulsa (15 %) e anotar o "Total do conjunto" do bloco
   - **Esperado:** o total já descontado, com "Desconto do Compre Junto − R$ X" acima
2. Tocar no botão de compra
   - **Esperado:** a sacola abre com a corrente em "de/por" e o rodapé com "Desconto do Compre Junto − R$ X"
3. Comparar o Total da sacola com o total do bloco
   - **Esperado:** o mesmo valor, ao centavo

### Esperado e fonte

Bloco = sacola sem promoção nem cupom, e a mesma linha "Desconto do Compre Junto" — fonte: `prd.md` CA-02.4, CA-03.8.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| computador (1440) | repetir | o mesmo total na nota do computador e na sacola |
