## TC-FUNC-020: Se só uma das leituras falha, só a parte dela mostra a falha, e a outra continua de pé

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-06, passo 2
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** bloquear por rota só a leitura ao vivo, depois só a do movimento

### Objetivo

Uma falha na presença não pode tirar da Adri os números de Acessos, nem o contrário.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01; 1 cliente presente
- Estado de partida: `/ao-vivo`

### Condições reais

as da persona

### Passos

1. Bloqueia só a leitura ao vivo e relê
   - **Esperado:** os blocos A–E com "Não consegui carregar." e "Tentar de novo"; Acessos com os números
2. Desbloqueia; bloqueia só a leitura do movimento e relê
   - **Esperado:** Acessos com a falha; os blocos A–E com os números
3. No Início, bloqueia só a leitura ao vivo
   - **Esperado:** só o cartão "Agora na loja" com a falha; a faixa de movimento com os números

### Esperado e fonte

Falha por leitura, a outra de pé — fonte: PRD LAV-03; spec Testes ("falha de uma leitura com a outra de pé") e D-20

### Variações

| Variação               | Ação                      | Esperado                                  |
| ---------------------- | ------------------------- | ----------------------------------------- |
| frescor com uma falhando | lê a linha "Atualizado…" | diz a idade da leitura mais antiga das duas |
