## TC-FUNC-013: Duas abas gravando a mesma campanha: a segunda é recusada com a frase do outro bloco e o rascunho fica na tela

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.6, CA-01.5
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, ramo J-03a
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** duas abas com a lista de campanhas carregada antes da outra gravar; determinístico com dois contextos

### Objetivo

Mesmo com o painel aberto em duas abas, a Home não fica com dois blocos da mesma campanha — e a dona não perde o que
escreveu quando a gravação é recusada.

### Pré-condições

- Conta: `admin-loja`
- Massa: C-X ("QA103 Ano Novo") criada no cadastro (agendada, 26/12–31/12, 10 %, ligada); B-3 acrescentado pela bandeja, sem campanha; B-2 com "Natal"
- Estado de partida: aba A no editor de B-3 e aba B no editor de B-2, as duas abertas **depois** de C-X existir

### Condições reais

as da persona

### Passos

1. Aba A: escolher "QA103 Ano Novo" em B-3 e salvar
   - **Esperado:** "Salvo"
2. Aba B, sem recarregar: trocar "Natal" por "QA103 Ano Novo" em B-2 (a lista desta aba ainda a oferece) e salvar
   - **Esperado:** não grava; a recusa diz a posição e o título de B-3 — a mesma frase que o seletor diria —,
     anunciada como alerta
   - **Esperado:** o rascunho de B-2 continua na tela (campanha trocada, título, peças que ficaram)
3. Cancelar na aba B e recarregar
   - **Esperado:** B-2 continua com "Natal"; B-3 com "QA103 Ano Novo"

### Esperado e fonte

Duas gravações da mesma campanha colidem e a segunda é recusada com a frase da campanha já usada; a falha de
gravação mantém o que a dona digitou — fonte: PRD CA-02.6, CA-01.5

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| recarregar a aba B depois da recusa | recarregar com o rascunho na tela | o seletor passa a mostrar "QA103 Ano Novo" desabilitada, com a posição e o título de B-3 |
