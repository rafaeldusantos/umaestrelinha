## TC-FUNC-022: Se a leitura dos adicionais falha, o bloco não aparece e a página continua de pé

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-07.3
**Autor:** dev
**Persona:** PER-04 Sônia
**Jornada:** J-05, ramo J-05b
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a automação derruba só a leitura dos adicionais por interceptação de rede

### Objetivo

Um problema no Compre Junto nunca impede a cliente de comprar a joia.

### Pré-condições

- Conta: anonima
- Massa: M-01
- Estado de partida: sacola vazia; a leitura dos adicionais respondendo erro (rede cortada só para ela)

### Condições reais

As da persona.

### Passos

1. Abrir M-01 com a leitura dos adicionais falhando
   - **Esperado:** a página carrega inteira; sem bloco e sem esqueleto preso; botão "Adicionar à sacola"
2. Comprar o pingente
   - **Esperado:** o pingente entra na sacola

### Esperado e fonte

Fonte: PRD CA-07.3.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| rede volta | restaura a rede e recarrega | o bloco aparece |
