## TC-SEC-007: Se o acesso é retirado com a Loja ao vivo aberta, a próxima leitura cai na recusa e o número some

**Tipo:** security
**Prioridade:** P1
**Origem:** LAV-60
**Autor:** dev
**Persona:** PER-05 Marina
**Jornada:** J-06, ramo J-06b
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** duas personas em dois apps ao mesmo tempo (a Adri remove pelo painel); fica manual

### Objetivo

Tirar alguém do painel tira também a Loja ao vivo da tela dela, sem esperar ela sair.

### Pré-condições

- Conta: `admin-secundaria` com acesso; a Adri (`admin-atelie`) no painel :8083 › `/admin/usuarios`
- Massa: ambiente do CH-01; 1 cliente presente
- Estado de partida: Marina na Loja ao vivo, com os números

### Condições reais

as da persona

### Passos

1. A Adri usa "Remover do painel" na conta da Marina
   - **Esperado:** —
2. Marina espera na Loja ao vivo
   - **Esperado:** em até ~15 s (a leitura seguinte), a recusa do app; nenhum número antigo continua visível
3. Marina volta ao Início
   - **Esperado:** a recusa; o cartão "Agora na loja" não mostra o último número

### Esperado e fonte

A recusa na leitura seguinte, sem número — fonte: PRD LAV-60; spec D-10

### Variações

| Variação                 | Ação                                    | Esperado         |
| ------------------------ | --------------------------------------- | ---------------- |
| app em segundo plano      | remove com o app da Marina oculto; ela volta | a recusa ao voltar |
