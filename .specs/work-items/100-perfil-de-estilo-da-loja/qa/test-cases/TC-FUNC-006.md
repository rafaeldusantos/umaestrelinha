## TC-FUNC-006: Fechar a prévia por qualquer caminho não muda o perfil marcado, o salvo nem a loja publicada

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-07
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, ramo J-01a
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** os três fechamentos e o voltar do navegador, determinísticos

### Objetivo

Desistir tem de ser seguro: a dona fecha a prévia porque não gostou e espera que nada tenha acontecido.

### Pré-condições

- Conta: `admin-loja`
- Massa: perfil salvo = Padrão
- Estado de partida: Black Friday marcado e não salvo, modal da prévia aberto

### Condições reais

As da persona.

### Passos

1. Fecha pelo "Fechar"
   - **Esperado:** o modal some; Black Friday continua marcado; "Em uso" no Padrão; salvar habilitado
2. Reabre e fecha clicando no fundo
   - **Esperado:** o mesmo
3. Reabre e fecha com Esc
   - **Esperado:** o mesmo; o foco volta a "Ver a loja com este perfil"
4. Clica dentro do iframe com o modal aberto
   - **Esperado:** o modal não fecha
5. Abre a loja numa aba nova
   - **Esperado:** Padrão

### Esperado e fonte

Fechar não muda o escolhido nem o salvo, e a loja publicada não muda — fonte: PRD CA-07; spec › Design (modal), H10.

### Variações

| Variação                   | Ação                                   | Esperado                                                      |
| -------------------------- | -------------------------------------- | ------------------------------------------------------------- |
| voltar do navegador        | com o modal aberto, volta              | nada gravado; a loja publicada no Padrão                      |
| recarregar com o modal aberto | F5                                  | a seção volta com o salvo (Padrão) marcado; nada gravado      |
