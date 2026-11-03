## TC-FUNC-030: A dona reordena as peças da lista e a loja mostra a nova ordem

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.2
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-03, passo 3
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** cruza painel e loja

### Objetivo

A ordem em que a dona quer que a cliente veja as correntes é a ordem da loja.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-02 em uso em M-01
- Estado de partida: editor de M-02; M-01 aberto na loja em outra aba

### Condições reais

As da persona.

### Passos

1. Mover a 3ª peça para o topo com "Subir" e outra pela alça de arrastar; salvar
   - **Esperado:** a numeração atualiza; "Subir" desabilitado na primeira e "Descer" na última; "Lista salva."
2. Recarregar M-01 e marcar "Correntes"
   - **Esperado:** as peças na nova ordem

### Esperado e fonte

Fonte: PRD CA-01.2.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| só teclado | reordena pelos botões com Tab e Enter | funciona sem mouse |
