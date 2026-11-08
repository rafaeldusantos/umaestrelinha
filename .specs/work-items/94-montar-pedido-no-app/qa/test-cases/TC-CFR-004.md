## TC-CFR-004: Rede que cai no meio da montagem não perde o que a Adri digitou e diz o próximo passo

**Tipo:** cfr
**Prioridade:** P1
**Origem:** exploratório — recuperação de erro e tom memorial nas telas novas (D-08)
**Autor:** dev
**Persona:** PER-03 Adri com a fonte grande
**Jornada:** J-01, J-04
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** —

### Objetivo

Uma falha nunca custa a montagem nem soa como alarme.

### Pré-condições

- Conta: `admin-atelie`
- Estado de partida: montagem com cliente, peças e descontos

### Condições reais

| Dimensão | Valor     |
| -------- | --------- |
| Rede     | instável (cortada e restaurada) |

### Categoria

Recuperação de erro e usabilidade (linguagem).

### Metas

| Observável | Alvo | Aceitável |
| ---------- | ---- | --------- |
| mensagem de falha | linguagem simples + próximo passo | — |
| o que foi digitado | preservado | — |
| UI otimista | nunca diz "Link criado."/"Link copiado." sem ter acontecido | — |
| tom | sem `!`, emoji, urgência ou linguagem festiva | — |

### Passos

1. Corta a rede em "Criar link", restaura e tenta de novo
   - **Esperado:** a falha com saída; depois um pedido montado só
2. Corta a rede em "Copiar link"/"Renovar prazo"/"Cancelar pedido"
   - **Esperado:** nada registrado no histórico sem ter acontecido; a frase de falha
3. Lê todos os textos novos
   - **Esperado:** o tom memorial

### Esperado e fonte

Fonte: cfr.md › Recuperação de erro; CLAUDE.md da raiz (registro memorial); spec D-08, D-20 (a frase da falha).

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| a sessão expira na montagem | espera, se o box couber | volta ao login e depois à montagem, com o rascunho das peças |
