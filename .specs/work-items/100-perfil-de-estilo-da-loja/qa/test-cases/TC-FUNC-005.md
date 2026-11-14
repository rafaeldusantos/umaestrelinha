## TC-FUNC-005: "Ver a loja com este perfil" mostra a loja no perfil marcado, sem salvar

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-03, CA-07
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 4
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** o iframe é de outra origem (:8082); a cor dentro dele se confere por screenshot ou abrindo o `src` do iframe

### Objetivo

A dona quer ver antes de ligar. Se a prévia mostra outro perfil, ou grava, ela decide às cegas.

### Pré-condições

- Conta: `admin-loja`
- Massa: perfil salvo = Padrão (S0)
- Estado de partida: card à vista, Padrão marcado

### Condições reais

As da persona.

### Passos

1. Marca Black Friday, sem salvar, e toca "Ver a loja com este perfil"
   - **Esperado:** modal "A loja com o perfil Black Friday", subtítulo "Prévia, sem salvar. A loja publicada não
     muda.", a Home num iframe em preto e ouro, rodapé "Fechar"
2. Alterna Computador / Celular
   - **Esperado:** o quadro muda de largura; a loja continua no Black Friday
3. Fecha, marca Padrão e abre de novo
   - **Esperado:** título "A loja com o perfil Padrão", loja em ardósia
4. Abre a loja publicada numa aba nova
   - **Esperado:** Padrão; "Em uso" continua no Padrão

### Esperado e fonte

A prévia mostra o perfil escolhido e não salvo — fonte: PRD UC-03, CA-07; spec › Design (modal), H10.

### Variações

| Variação                       | Ação                                    | Esperado                                       |
| ------------------------------ | --------------------------------------- | ---------------------------------------------- |
| navegar dentro do iframe       | toca num produto na prévia              | o produto também no perfil marcado             |
| trocar a opção com o modal fechado | marca e reabre três vezes            | a prévia acompanha a opção marcada a cada vez  |
