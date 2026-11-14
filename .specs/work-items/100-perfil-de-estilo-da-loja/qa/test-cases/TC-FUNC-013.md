## TC-FUNC-013: Salvar o perfil sem conexão não diz que salvou, mantém o perfil em uso e salva na nova tentativa

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-01; spec H8, H9 (estados salvando, erro e sucesso)
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, ramo J-01b
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a falha se provoca cortando a rede (offline) ou abortando a requisição de gravação

### Objetivo

Se o card disser "Perfil salvo" quando não salvou, a dona encerra o assunto e a loja nunca veste a campanha.

### Pré-condições

- Conta: `admin-loja`
- Massa: perfil salvo conhecido (o deixado pelo TC-FUNC-012)
- Estado de partida: card aberto

### Condições reais

| Dimensão | Valor                               |
| -------- | ----------------------------------- |
| Rede     | cortada no momento de salvar        |

### Passos

1. Marca o outro perfil e corta a rede; salva
   - **Esperado:** nenhuma "Perfil salvo…"; uma indicação de falha (molde do painel); "Em uso" no perfil anterior
2. Devolve a rede e recarrega
   - **Esperado:** "Em uso" no perfil anterior; a loja numa aba nova no perfil anterior
3. Marca de novo e salva com rede
   - **Esperado:** "Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora."; "Em uso" no novo

### Esperado e fonte

Falha não aparece como sucesso; a mensagem de sucesso é a de H8 — fonte: spec H8, H9; PRD UC-01. O texto exato da
falha não tem fonte: só é achado se disser sucesso, se não disser nada, ou se culpar a pessoa.

### Variações

| Variação                         | Ação                                           | Esperado                                          |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| carregando                       | abre a seção com a rede lenta ou cortada       | as opções desabilitadas até a configuração chegar (H9) |
| duas abas                        | salva Black Friday numa, Padrão na outra       | depois de recarregar, "Em uso" nas duas = o que a loja mostra |
| clique duplo com rede lenta      | dois cliques em salvar                         | uma gravação; uma mensagem                        |
