## TC-FUNC-005: A prévia mostra o texto e as peças do rascunho, na ordem que a dona arrumou, antes de salvar

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-01.1, CA-03.2, CA-05.1
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 5 e 7
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a prévia é onde a dona decide; regressão nela custa caro

### Objetivo

A dona vê como o bloco vai ficar enquanto escreve e arruma as peças, sem salvar para descobrir.

### Pré-condições

- Conta: `admin-loja`
- Massa: B-1 com "Dia das Mães" escolhida (no rascunho ou salva); P-1, P-2, P-3 marcadas
- Estado de partida: editor de B-1, prévia em Celular

### Condições reais

as da persona

### Passos

1. Escrever o título e a descrição
   - **Esperado:** campo de título e campo de descrição, cada um com rótulo; a prévia mostra o texto digitado, sem
     salvar
2. Escolher P-1, P-2, P-3
   - **Esperado:** a lista mostra posição, nome e remover em cada linha; a prévia mostra as três
3. Arrastar P-3 para o primeiro lugar
   - **Esperado:** a lista renumera; a prévia mostra P-3, P-1, P-2
4. Com os botões de subir/descer (se existirem) ou só pelo teclado, trocar P-1 e P-2 e destrocar
   - **Esperado:** a lista e a prévia acompanham
5. Remover P-2 e escolher de novo
   - **Esperado:** sai e volta no fim; a prévia acompanha

### Esperado e fonte

Com a campanha em vigência, a prévia mostra título, descrição e peças do rascunho antes de salvar; a lista se
reordena arrastando, com posição, nome e remover — fonte: PRD CA-01.1, CA-03.2, CA-05.1; spec.md D-01 (subir/descer
como alternativa ao arraste)

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| prévia em Computador | alternar o palco | o mesmo rascunho, sem recarregar a prévia |
| Cancelar | Cancelar depois do passo 5 | a lista volta ao que estava salvo; a prévia também |
