## TC-FUNC-018: O cartão do Início mostra traços ao carregar, a falha com "Tentar de novo" e "Ninguém na loja agora" sem esconder o gráfico

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, ramos J-01a e J-01c
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** carregando com a leitura atrasada por rota; falha com a leitura bloqueada

### Objetivo

O cartão nunca some e nunca inventa número: a Adri sabe se está carregando, se falhou ou se não há ninguém.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01
- Estado de partida: Início

### Condições reais

rede lenta para o passo 1

### Passos

1. Atrasa a leitura ao vivo 3 s e abre o Início
   - **Esperado:** traços no lugar do número e do gráfico; o cartão ocupa o mesmo lugar
2. Bloqueia a leitura ao vivo e relê (puxar para atualizar)
   - **Esperado:** "Não consegui carregar." e "Tentar de novo" no cartão; o resto do Início funciona
3. Desbloqueia e toca em "Tentar de novo"
   - **Esperado:** o número volta
4. Sem ninguém na loja
   - **Esperado:** "Ninguém na loja agora", com o mini gráfico de 15 barras visível; o cartão continua no lugar
5. Repete 1–4 na Loja ao vivo (bloco A)
   - **Esperado:** traços, falha com "Tentar de novo" e o vazio, com as mesmas frases

### Esperado e fonte

Traços, a frase de falha do app, o vazio com gráfico, o cartão nunca escondido — fonte: PRD LAV-03; spec D-20

### Variações

| Variação       | Ação                      | Esperado               |
| -------------- | ------------------------- | ---------------------- |
| toque duplo     | dois toques rápidos em "Tentar de novo" | uma releitura, sem erro |
