## TC-FUNC-018: O painel recusa o frete grátis ligado sem região, e Sul + Sudeste salvo vale na loja sem deploy

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-20 (PRD 99 UC-12, RN-15; `spec.md` D-02, D-08)
**Autor:** dev
**Persona:** PER-03 Adri
**Jornada:** J-03, passos 1, 3, 4 e 5
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** muda `store_settings`: a automação precisa restaurar a configuração ao terminar

### Objetivo

Adri configura a campanha da Black Friday sozinha; o painel tem de impedir a configuração sem efeito e a loja tem de
obedecer ao salvar.

### Pré-condições

- Conta: admin-loja
- Massa: `store_settings.shipping` com as cinco regiões (o padrão), interruptor ligado, faixa R$ 450,00
- Estado de partida: `/admin/configuracoes/frete-e-material` aberto; a loja numa segunda aba com uma sacola ≥ R$ 450

### Condições reais

As da persona (1440 × 900).

### Passos

1. Olha o card do frete grátis
   - **Esperado:** "Regiões com frete grátis" com cinco caixas (Norte, Nordeste, Centro-Oeste, Sudeste, Sul), as cinco
     marcadas, e o texto de ajuda dizendo os estados de cada região
2. Desmarca as cinco e salva
   - **Esperado:** o salvar é recusado com o motivo (é preciso escolher ao menos uma região, ou desligar o frete
     grátis); recarregando o painel, as cinco continuam marcadas
3. Marca só Sul e Sudeste e salva
   - **Esperado:** a confirmação de salvo; recarregando, só as duas marcadas
4. Na aba da loja, recarrega e calcula com 40020-000, depois com 01310-100
   - **Esperado:** BA: "Frete grátis só para Sul e Sudeste" e o frete cobrado; SP: "Frete grátis liberado" — sem deploy

### Esperado e fonte

Desmarcar todas com o interruptor ligado recusa com o motivo; Sul + Sudeste vale na loja sem deploy — fonte: PRD 99
CA-20, UC-12; `spec.md` D-02, D-08.

### Variações

| Variação                   | Ação                                               | Esperado                                         |
| -------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| Faixa em zero              | interruptor ligado, faixa 0, salva                  | a recusa antiga da faixa continua                |
| Duas abas do painel        | salva Sul+Sudeste numa e só Sul na outra, recarrega | o último salvo vale e as duas mostram o mesmo    |
| Seção em 390 × 844         | abre a seção no celular                            | as caixas e a ajuda sem rolagem horizontal; caixas com alvo confortável |
