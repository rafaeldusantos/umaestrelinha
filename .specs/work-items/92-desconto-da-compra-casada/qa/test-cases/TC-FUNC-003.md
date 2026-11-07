## TC-FUNC-003: Mudar só o percentual conta como alteração e grava; sem mudança, salvar não escreve

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.3
**Autor:** dev
**Persona:** PER-02 Adri (painel)
**Jornada:** J-02, passo 4 e ramo J-02b
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a "não escrita" se confere pela ausência de requisição de gravação de `product_buy_together` na rede do navegador

### Objetivo

A dona muda só o desconto e ele fica gravado; abrir e salvar sem mudar nada não mexe em nada.

### Pré-condições

- Conta: `admin-painel`
- Massa: M-01 com a corrente avulsa a 15 %
- Estado de partida: aba "Compre junto" de P

### Condições reais

As da persona.

### Passos

1. Trocar só o percentual da corrente avulsa de 15 para 12
   - **Esperado:** o formulário indica alteração não salva e o Salvar fica disponível
2. Salvar e recarregar
   - **Esperado:** 12 gravado; nada mais do adicional mudou (ordem, peça, lista)
3. Sem mudar nada, salvar de novo
   - **Esperado:** nenhuma gravação do Compre Junto sai para o banco

### Esperado e fonte

Fonte: `prd.md` CA-01.3.

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| mudar e voltar ao valor anterior | 15 → 12 → 15 | sem alteração a salvar |
| sair da página com alteração | trocar para 12 e navegar | o aviso de alterações não salvas de sempre |
