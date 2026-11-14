## TC-FUNC-012: Com um valor de perfil que a loja não conhece, a loja abre no Padrão e o card mostra o Padrão em uso

**Tipo:** functional
**Prioridade:** P1
**Origem:** RN-07, CA-06
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, ramo J-01c
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a massa (valor desconhecido) só se grava por SQL local — a automação precisará do mesmo passo de preparo

### Objetivo

Um valor estranho na configuração (resto de uma versão, erro de digitação no banco) não pode quebrar a loja nem deixar
a dona sem saber o que está valendo.

### Pré-condições

- Conta: `admin-loja`
- Massa: `appearance = { "profile": "neon" }` (S2), gravado pela thread por SQL local
- Estado de partida: nenhuma aba aberta

### Condições reais

As da persona.

### Passos

1. Abre a loja (Home e um produto)
   - **Esperado:** a paleta Padrão (cabeçalho `#283A4A`); nenhuma mensagem de erro
2. Abre o card no painel
   - **Esperado:** "Padrão" marcado com "Em uso"; "Black Friday" sem selo; nenhum erro
3. Lê o botão de salvar
   - **Esperado:** registre o estado (desabilitado é o esperado se marcado = salvo normalizado)

### Esperado e fonte

Valor desconhecido ⇒ Padrão, sem erro, na loja e no card — fonte: PRD RN-07, CA-06; spec H9.

### Variações

| Variação           | Ação                                | Esperado                                   |
| ------------------ | ----------------------------------- | ------------------------------------------ |
| salvar a partir dele | marca Black Friday e salva        | grava `black-friday`; a loja nova página em Black Friday |
