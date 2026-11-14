## TC-FUNC-019: Com as cinco regiões marcadas o frete grátis funciona como antes, e com o interruptor desligado nada sai grátis

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-19, CA-06 (PRD 99 RN-15, UC-07; PRD 97 RN-03; `spec.md` D-01, D-02)
**Autor:** dev
**Persona:** PER-03 Adri
**Jornada:** J-03, passo 2 (ramo J-03b)
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** muda `store_settings`; restaurar ao terminar

### Objetivo

O deploy não pode mudar nada para quem não escolheu região: com as cinco, a loja se comporta como antes; e desligar a
campanha tem de desligá-la em todo lugar.

### Pré-condições

- Conta: admin-loja
- Massa: as cinco regiões, interruptor ligado, faixa R$ 450,00; fixture A na aba da loja
- Estado de partida: o painel em Frete e Material; a loja numa segunda aba com uma sacola ≥ R$ 450

### Condições reais

As da persona.

### Passos

1. Na loja, sem CEP
   - **Esperado:** "Frete grátis liberado" (com as cinco regiões, sem CEP também é liberado); o ⓘ sem falar de região
2. Calcula com 40020-000 e depois com 69900-000 (AC)
   - **Esperado:** "Frete grátis liberado" e a mais barata "Grátis" nos dois
3. No painel, desliga o interruptor (com nenhuma região marcada) e salva
   - **Esperado:** grava (desligado com lista vazia é gravável)
4. Na loja, recarrega e calcula com 01310-100
   - **Esperado:** nenhuma faixa de frete grátis; nenhuma opção "Grátis"
5. Religa com Sul e Sudeste e R$ 450 e salva (a massa que a rodada precisa)
   - **Esperado:** gravado

### Esperado e fonte

Com as cinco regiões o comportamento é o de antes para qualquer CEP; com o interruptor desligado, nenhuma opção
grátis — fonte: PRD 99 CA-19, RN-15, UC-07; PRD 97 CA-06; `spec.md` D-01, D-02.

### Variações

| Variação                  | Ação                                     | Esperado                                       |
| ------------------------- | ---------------------------------------- | ---------------------------------------------- |
| Barra de confiança         | com as cinco, olha a Home                 | o anúncio sem região, como antes               |
