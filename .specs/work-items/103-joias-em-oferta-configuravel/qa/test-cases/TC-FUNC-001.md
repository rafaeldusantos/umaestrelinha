## TC-FUNC-001: O bloco que ainda não tem campanha não aparece na loja, mesmo ligado, e a linha e o editor pedem a escolha

**Tipo:** functional
**Prioridade:** P0
**Origem:** CA-02.4, RNF-01
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 1
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** é o primeiro contato da dona com o WI depois da migration (D-02); determinístico

### Objetivo

Depois da atualização, o bloco "Joias em oferta" de hoje fica sem campanha e sai da loja. A dona precisa entender
pelo painel que ele não aparece e o que fazer — senão acha que a loja quebrou.

### Pré-condições

- Conta: `admin-loja` no painel
- Massa: B-1 ligado, sem campanha (estado depois da migration)
- Estado de partida: `/admin/home`; uma aba da loja (`:8082`) sem login

### Condições reais

as da persona; a aba da loja em 390 × 844

### Passos

1. Ler a linha de B-1 na lista da Home
   - **Esperado:** a linha diz que o bloco está sem campanha, que não aparece na loja, e pede para escolher uma
     campanha — mesmo com o interruptor ligado
2. Recarregar a Home da loja e descer até onde o bloco ficava
   - **Esperado:** nenhum bloco "Joias em oferta"; nenhum espaço vazio ou esqueleto no lugar dele
3. Abrir B-1
   - **Esperado:** o editor diz que o bloco está sem campanha e pede a escolha; a busca de peças não está
     disponível e a tela diz por quê

### Esperado e fonte

Bloco sem campanha não aparece na loja e o painel pede a escolha; sem campanha valendo, o bloco não reserva espaço
— fonte: PRD CA-02.4, RNF-01; spec.md D-02 (a migration não grava campanha no bloco de hoje)

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| desligar e religar B-1 | alternar o interruptor | a linha continua dizendo que não aparece; a loja continua sem o bloco |
| loja em 1440 | repetir o passo 2 | o mesmo |
