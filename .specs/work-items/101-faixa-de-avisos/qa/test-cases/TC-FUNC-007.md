## TC-FUNC-007: A tela lembra o tom da loja e avisa que a faixa pode levar até uma hora para mudar

**Tipo:** functional
**Prioridade:** P1
**Origem:** RN-03, CA-08, UC-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 1 e 6
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** textos literais da fonte

### Objetivo

A Adri liga a faixa e abre a loja: se ela não sabe do atraso, acha que não funcionou e liga e desliga de novo. E o tom memorial da loja vale também na faixa.

### Pré-condições

- Conta: `admin-loja`
- Massa: a faixa do manifesto
- Estado de partida: em `/admin/faixa-de-avisos`

### Condições reais

as da persona

### Passos

1. Lê o subtítulo da tela
   - **Esperado:** "A faixa fina acima do cabeçalho, em todas as páginas da loja (menos o checkout). Um aviso por vez, trocando a cada 6 segundos."
2. Lê a ajuda do card "Avisos"
   - **Esperado:** "Sem contagem regressiva, sem “últimas unidades” e sem exclamação: o tom da loja vale aqui também."
3. Abre "Tipo do aviso"
   - **Esperado:** só "Texto" e "Imagem" — nenhum tipo de contagem regressiva, estoque ou prova social
4. Lê a ajuda ao lado do interruptor e salva qualquer alteração
   - **Esperado:** ao lado do interruptor, o aviso de que pode levar até uma hora; depois de salvar, "Salvo. Pode levar até uma hora para a faixa aparecer ou sumir em todas as páginas da loja."

### Esperado e fonte

Fonte: PRD RN-03, UC-03 ("O texto de ajuda lembra o tom"), O que a dona ganha §3 (atraso avisado ao lado do interruptor); spec H-14, H-15, Design (ajuda do card)

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| texto com exclamação | escreve "Black Friday!" no destaque | aceito (o painel não impede o texto livre, RN-03) — não é achado |
