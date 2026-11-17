## TC-FUNC-006: Salvar mostra "Salvo" sem recarregar a prévia, e a linha do bloco diz a campanha e o estado

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-01.2, CA-02.3
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 8
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** salvar é o passo que prova a gravação; "não desmonta" se confere pelo quadro da prévia não recarregar

### Objetivo

A dona sabe que salvou, continua no editor com a prévia no mesmo lugar, e a lista diz de qual campanha o bloco é.

### Pré-condições

- Conta: `admin-loja`
- Massa: rascunho de B-1 com "Dia das Mães", título, descrição e P-3, P-1, P-2
- Estado de partida: editor de B-1 com alterações não salvas

### Condições reais

as da persona

### Passos

1. Salvar
   - **Esperado:** o selo "Salvo" no lugar de "Alterações não salvas"; a tela continua no editor
   - **Esperado:** a prévia não pisca nem volta ao topo (não recarrega)
2. Voltar à lista da Home
   - **Esperado:** a linha de B-1 diz "Dia das Mães" e o estado (em vigência)
3. Recarregar o painel e reabrir B-1
   - **Esperado:** campanha, título, descrição e peças como salvos

### Esperado e fonte

Recibo "Salvo" sem desmontar a prévia; a linha diz a campanha escolhida e o estado — fonte: PRD CA-01.2, CA-02.3

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| duplo clique em Salvar | dois cliques seguidos | uma gravação só; a lista sem peça duplicada |
| mexer depois de salvar | alterar um caractere do título | o selo volta a "Alterações não salvas" |
