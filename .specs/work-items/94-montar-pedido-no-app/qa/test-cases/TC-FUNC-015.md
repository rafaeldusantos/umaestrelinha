## TC-FUNC-015: Com a leitura fora do ar ou no limite, a Adri preenche à mão sem perder nada do que já fez

**Tipo:** functional
**Prioridade:** P0
**Origem:** UC-05 (D-11)
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-01, ramo J-01a
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** determinístico sem `ANTHROPIC_API_KEY` (a function responde 503) ou com a rede da function cortada

### Objetivo

A montagem nunca depende da IA.

### Pré-condições

- Conta: `admin-atelie`
- Massa: qualquer texto colado
- Estado de partida: passo 1, "Cliente nova", com nome e e-mail digitados; a `customer-parse` local sem a chave

### Condições reais

As da persona.

### Passos

1. Cola o texto e lê
   - **Esperado:** "A leitura está fora do ar agora. Feche e preencha à mão — nada do que você já fez se perde."; a folha aberta; "Preencher à mão"
2. Toca em "Preencher à mão"
   - **Esperado:** nome e e-mail como estavam
3. Segue a montagem até "Criar link"
   - **Esperado:** o pedido montado criado

### Esperado e fonte

"Leitura fora do ar (timeout, 5xx, sem chave) […] A montagem nunca depende da IA." — fonte: PRD › Ler os dados de uma mensagem.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| rede cai durante "Lendo o texto…" | corta a rede | a mesma frase de fora do ar; nada perdido |
| limite de leituras (30 em 10 min) | lê repetidas vezes, se o orçamento couber | uma frase no tom do app que diz para esperar ou preencher à mão; "Preencher à mão"; nada perdido (o texto exato não tem fonte — D-11) |
