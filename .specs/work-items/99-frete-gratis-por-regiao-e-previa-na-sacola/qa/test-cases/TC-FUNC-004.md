## TC-FUNC-004: Escolher uma opção recolhe a lista numa linha, e tocar na linha reabre as opções

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05 (PRD 97, com M-05 do PRD 99)
**Autor:** dev
**Persona:** PER-01 Luana
**Jornada:** J-01, passo 4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** estado de componente determinístico

### Objetivo

Depois de escolher, Luana quer o espaço das peças de volta, sem perder de vista o que escolheu e com um jeito óbvio de
mudar.

### Pré-condições

- Conta: anonima
- Massa: uma peça; fixture A
- Estado de partida: gaveta com as opções abertas para 01310-100

### Condições reais

As da persona.

### Passos

1. Toca no SEDEX
   - **Esperado:** a lista recolhe numa linha: ícone de envio, "SEDEX · Correios", embaixo "Chega entre … · CEP
     01310-100" (pode quebrar em duas linhas, nunca cortar o CEP), o valor e o chevron
2. Toca na linha recolhida
   - **Esperado:** as opções reabrem, o SEDEX marcado
3. Toca no PAC
   - **Esperado:** recolhe de novo, agora com o PAC e o valor dele; o Total acompanha

### Esperado e fonte

Tocar numa opção recolhe numa linha com serviço, prazo, CEP e valor; tocar na linha reabre — fonte: PRD 97 CA-05,
UC-02; PRD 99 M-05; `spec.md` › Design › "Frete escolhido recolhido".

### Variações

| Variação         | Ação                                         | Esperado                                               |
| ---------------- | -------------------------------------------- | ------------------------------------------------------ |
| Teclado          | em 1440, Tab até as opções e Espaço numa     | escolhe e recolhe; Enter na linha reabre               |
| Nome acessível   | lê a linha recolhida na árvore de acessibilidade | "Frete: PAC, … para o CEP 01310-100. Ver as opções" (com o valor ou "grátis"), recolhida |
