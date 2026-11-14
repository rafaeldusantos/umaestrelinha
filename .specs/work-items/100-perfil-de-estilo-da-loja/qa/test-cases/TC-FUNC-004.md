## TC-FUNC-004: Com Black Friday ligado, o painel e o app do ateliê continuam com as cores de sempre

**Tipo:** functional
**Prioridade:** P1
**Origem:** RN-02, CA-05
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 7
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** cor computada de poucos elementos, antes e depois de salvar

### Objetivo

O perfil é da vitrine da cliente. Se o painel ou o ateliê mudarem de cor, a dona perde a referência das telas onde
trabalha todo dia.

### Pré-condições

- Conta: `admin-loja` (a mesma no painel e no ateliê)
- Massa: anotadas com o Padrão salvo as cores computadas da sidebar e do botão primário do painel e do cabeçalho e
  da barra de abas da Início do ateliê; depois, Black Friday salvo (TC-FUNC-001)
- Estado de partida: painel aberto; ateliê em `http://localhost:8084`

### Condições reais

Ateliê em 390 × 844.

### Passos

1. Com Black Friday salvo, abre Pedidos e Dados da loja no painel
   - **Esperado:** as cores anotadas (tokens `--estrelinha-admin-*`), sem preto do perfil
2. Abre a Início e Pedidos no ateliê (entra com a mesma conta se pedir)
   - **Esperado:** as cores anotadas (o ateliê fica no Padrão)
3. Lê `document.documentElement.getAttribute('data-perfil')` nos dois apps
   - **Esperado:** ausente

### Esperado e fonte

Painel e ateliê não mudam de cor com o perfil ligado — fonte: PRD RN-02, CA-05.

### Variações

| Variação         | Ação                                     | Esperado                                  |
| ---------------- | ---------------------------------------- | ----------------------------------------- |
| prévia aberta    | abre "Ver a loja com este perfil"        | só o iframe muda; o painel ao redor não   |
