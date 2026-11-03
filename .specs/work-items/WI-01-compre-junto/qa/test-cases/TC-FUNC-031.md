## TC-FUNC-031: A dona escolhe quais variações de cada peça valem, e nenhuma marcada vale todas as ativas

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.3, CA-02.2
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-03, passos 3 e 6
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** vale para a peça da lista e para o adicional "Uma peça só"

### Objetivo

A cliente só vê os comprimentos ou acabamentos que a dona decidiu oferecer junto.

### Pré-condições

- Conta: `admin-painel`
- Massa: peça de M-02 com ≥ 3 variações ativas; adicional A2 de M-01 com peça de ≥ 3 variações
- Estado de partida: editor de M-02; loja em outra aba

### Condições reais

As da persona.

### Passos

1. Numa peça da lista, "Escolher quais" e marcar 2 de N; salvar
   - **Esperado:** a peça mostra "2 de N"
2. Na loja, escolher essa peça
   - **Esperado:** só as 2 variações liberadas
3. Voltar a "Oferecer todas" (nenhuma marcada); salvar
   - **Esperado:** "todas as ativas (N)"; a loja oferece as N ativas
4. Repetir no adicional "Uma peça só" de M-01
   - **Esperado:** mesmo comportamento

### Esperado e fonte

Fonte: PRD CA-01.3, CA-02.2.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| variação nova criada depois | cria uma variação na peça com "todas" | a loja passa a oferecê-la ("inclusive as que você criar depois") |
