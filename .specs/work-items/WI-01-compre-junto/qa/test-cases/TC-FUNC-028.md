## TC-FUNC-028: Uma forma gravada desconhecida é tratada como "Na linha" e a página não quebra

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-09.4
**Autor:** dev
**Persona:** PER-03 Helena
**Jornada:** J-04, ramo J-04b
**Charter:** CH-06 (não executado na sessão: fica com o Dev)
**Situação:** ativo
**Automação:** target `integration` · status `missing`
**Spec:** —
**Nota:** a persona não consegue gravar um valor fora das três pelo painel; o estado exige escrita direta no banco ou interceptar a leitura de `store_settings`. Já coberto por `settings.test.ts` e `ProductPageBuyTogetherForma.test.tsx` (qa-report)

### Objetivo

Um dado estragado na configuração não tira a joia da vitrine.

### Pré-condições

- Conta: anonima
- Massa: M-01; `store_settings.buy_together.form` com um valor fora de `inline`/`sheet`/`formula`
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Abrir M-01
   - **Esperado:** a página de pé; o bloco na forma "Na linha"

### Esperado e fonte

Fonte: PRD CA-09.4.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| painel com o valor desconhecido | abre o menu Compre Junto | "Na linha" marcada |
