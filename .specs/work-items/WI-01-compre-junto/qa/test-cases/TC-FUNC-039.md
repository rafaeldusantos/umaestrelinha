## TC-FUNC-039: Gravar uma joia não apaga nem altera o Compre Junto de outra

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.6
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-03, ramo J-03d
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** perda de curadoria seria silenciosa; P1

### Objetivo

A dona edita uma joia sem desfazer o trabalho que fez em outra.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01 e M-03 com Compre Junto diferentes
- Estado de partida: aba "Compre junto" de M-01

### Condições reais

As da persona.

### Passos

1. Anotar os adicionais de M-03
   - **Esperado:** —
2. Em M-01, tirar um adicional, trocar outro e salvar; depois salvar também a aba Geral de M-01
   - **Esperado:** "Compre Junto salvo."
3. Abrir a aba de M-03 e a página de M-03 na loja
   - **Esperado:** os adicionais de M-03 iguais aos anotados

### Esperado e fonte

Fonte: PRD CA-02.6.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| duplicar M-01 | duplica o produto (se o painel oferecer) e grava | o original não muda |
