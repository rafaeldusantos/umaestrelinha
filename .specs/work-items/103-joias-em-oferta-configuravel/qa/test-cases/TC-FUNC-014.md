## TC-FUNC-014: O bloco cuja campanha foi apagada some da loja e pede a escolha com a mesma mensagem do bloco sem campanha

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.5
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, ramo J-03b
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** apagar campanha zera a escolha do bloco sem apagar o bloco (F1)

### Objetivo

Se a dona apaga uma campanha que tinha bloco, a Home não quebra e o painel diz o que fazer com o bloco.

### Pré-condições

- Conta: `admin-loja`
- Massa: B-3 com C-X (TC-FUNC-013); C-X sem pedidos
- Estado de partida: `/admin/campanhas`; aba da loja sem login

### Condições reais

as da persona

### Passos

1. Apagar "QA103 Ano Novo" no cadastro
   - **Esperado:** a campanha some do cadastro
2. Voltar a `/admin/home` e ler a linha de B-3
   - **Esperado:** B-3 continua na lista; a linha diz que está sem campanha, que não aparece na loja, e pede a
     escolha — **a mesma mensagem** que B-2 tinha quando acabou de nascer (TC-FUNC-009)
3. Abrir B-3
   - **Esperado:** o editor diz que está sem campanha e pede a escolha; a busca de peças indisponível com o motivo
4. Recarregar a loja
   - **Esperado:** a Home de pé, só com B-1

### Esperado e fonte

Campanha escolhida apagada ⇒ bloco sem campanha, fora da loja, com a mesma mensagem do bloco que nunca teve
campanha — fonte: PRD CA-02.5; spec.md F1

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| B-3 ligado | ligar B-3 antes do passo 4 | a loja continua só com B-1 |
