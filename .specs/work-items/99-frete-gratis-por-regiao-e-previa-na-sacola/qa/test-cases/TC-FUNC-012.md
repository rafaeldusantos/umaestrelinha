## TC-FUNC-012: Sem CEP e acima da faixa, a sacola diz "Frete grátis para Sul e Sudeste" e nunca "liberado"

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-15 (PRD 99 UC-07; `spec.md` D-01)
**Autor:** dev
**Persona:** PER-02 Cida
**Jornada:** J-02, passo 1
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a promessa sem destino é o risco central da campanha; determinístico

### Objetivo

Cida montou a sacola acima de R$ 450; antes de saber o CEP dela, a loja não pode dizer que o frete grátis está
garantido.

### Pré-condições

- Conta: cliente-salvador
- Massa: Sul + Sudeste, R$ 450; peças que somem ≥ R$ 450
- Estado de partida: gaveta aberta, sem CEP (rascunho vazio)

### Condições reais

As da persona.

### Passos

1. Olha o topo da gaveta
   - **Esperado:** destaque em ouro com o ✓ e "Frete grátis para Sul e Sudeste" + ⓘ; sem barra; nenhuma ocorrência de
     "liberado" em toda a gaveta; nenhuma opção zerada (não há opções sem CEP)
2. Toca no ⓘ
   - **Esperado:** a regra (R$ 450,00, Sul com PR, SC, RS e Sudeste com SP, RJ, MG, ES) seguida de "Informe o CEP abaixo
     para confirmar."
3. Segue ao checkout sem calcular e confere o Resumo antes do CEP
   - **Esperado:** nenhum frete grátis concedido sem destino

### Esperado e fonte

Destaque em ouro, "Frete grátis para Sul e Sudeste", nenhum "liberado" sem CEP com regiões limitadas — fonte: PRD 99
CA-15, UC-07, RN-14; `spec.md` D-01.

### Variações

| Variação                         | Ação                                   | Esperado                                  |
| -------------------------------- | -------------------------------------- | ----------------------------------------- |
| CEP de nenhuma região (00000-000) | calcula com ele                        | a faixa fica como sem CEP: nenhum "liberado" |
| CEP incompleto                   | 4 dígitos no campo, sem calcular        | idem                                      |
