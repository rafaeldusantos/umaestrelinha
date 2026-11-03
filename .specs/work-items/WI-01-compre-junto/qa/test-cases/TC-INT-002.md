## TC-INT-002: O Compre Junto antigo de cada joia vira adicionais do tipo peça, até três, na mesma ordem

**Tipo:** integration
**Prioridade:** P1
**Origem:** CA-02.8
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** n/a
**Charter:** CH-03 (não executado na sessão: fica com o Dev)
**Situação:** ativo
**Automação:** target `integration` · status `missing`
**Spec:** —
**Nota:** a conversão é da migration; o banco local tem 0 de 734 produtos com o campo antigo preenchido (spec › Decisões, 18), então não há o que ver no navegador. Provado pelo probe `02-conversao.sh` e por `compreJuntoConversaoSchema.test.ts`; a contagem real é conferida pelo usuário em produção antes do deploy

### Objetivo

A curadoria que a dona já tinha feito no card antigo não se perde.

### Pré-condições

- Conta: `admin-painel`
- Massa: produto com o Compre Junto antigo preenchido (inclusive com mais de 3 peças e com um id que não existe) antes da migration
- Estado de partida: migration de conversão aplicada no banco local

### Condições reais

As da persona.

### Passos

1. Abrir a aba "Compre junto" do produto convertido
   - **Esperado:** até 3 adicionais do tipo "Uma peça só", na ordem antiga, sem variações marcadas e sem "some com"; ids inexistentes descartados
2. Reaplicar a migration
   - **Esperado:** nada duplica

### Esperado e fonte

Fonte: PRD CA-02.8; spec › Decisões, 18.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| — | — | — |
