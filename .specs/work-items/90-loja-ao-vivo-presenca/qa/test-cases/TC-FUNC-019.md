## TC-FUNC-019: Com a loja ainda não medida, o cartão e a Loja ao vivo dizem isso, com a frase de Acessos

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, ramo J-01b
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** estado provocado tirando o `production_host` do banco local; restaurar depois

### Objetivo

Antes do domínio próprio, a loja não conta ninguém; "Ninguém na loja agora" seria mentira e a Adri acharia que
a loja está vazia.

### Pré-condições

- Conta: `admin-atelie`
- Massa: `store_settings.analytics.production_host` ausente no banco local
- Estado de partida: Início

### Condições reais

as da persona

### Passos

1. Lê o cartão "Agora na loja"
   - **Esperado:** a mesma frase que a seção Acessos usa para "ainda não medida"; nenhum número e nunca "Ninguém na loja agora"
2. Abre a Loja ao vivo
   - **Esperado:** o bloco "Agora na loja" e a seção Acessos com a mesma frase; nenhum número de presença
3. Restaura o `production_host` e relê
   - **Esperado:** o cartão volta ao número ou a "Ninguém na loja agora"

### Esperado e fonte

A frase de Acessos no lugar de "Ninguém na loja agora" — fonte: PRD LAV-03; spec D-11

### Variações

| Variação                     | Ação                                    | Esperado        |
| ---------------------------- | --------------------------------------- | --------------- |
| host gravado de outro domínio | `production_host` com um domínio que não é o local | a mesma frase de não medida |
