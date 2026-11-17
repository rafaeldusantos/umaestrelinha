## TC-SEC-001: Com a sessão de admin aberta na loja, bloco, selo, preço e /ofertas mostram só a campanha em vigência

**Tipo:** security
**Prioridade:** P0
**Origem:** CA-06.1, RNF-03
**Autor:** dev
**Persona:** PER-03 Adri, conferindo a loja
**Jornada:** J-05, passos 2–3
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o defeito X-01 foi provado no banco local (F9); este caso prova o conserto pela tela

### Objetivo

A dona, logada na loja, vê a mesma vitrine que a cliente — e não toma a "Natal" agendada, a "Black Friday"
encerrada ou uma campanha desligada como se estivessem valendo.

### Pré-condições

- Conta: `admin-loja`, logada **na loja** (`:8082`)
- Massa: a mesma do TC-REG-001, com as anotações dele como régua
- Estado de partida: TC-REG-001 feito sem login; então entrar na loja com `admin-loja` (código pelo Mailpit, ou senha)

### Condições reais

as da persona

### Passos

1. Abrir a Home
   - **Esperado:** o bloco B-1 com os percentuais de "Dia das Mães"; nenhum bloco nem cartão de "Natal", "Black
     Friday" ou "QA103 Desligada"
2. Abrir a página de M-A
   - **Esperado:** o mesmo selo e o mesmo preço do TC-REG-001 ("Dia das Mães"), nunca os 20 % da "Black Friday"
3. Abrir a página de P-AGE
   - **Esperado:** sem selo e com o preço cadastrado — nem a "Natal" (agendada), nem a "QA103 Desligada" (30 %)
4. Abrir `/ofertas`
   - **Esperado:** o mesmo conjunto do TC-REG-001, sem P-AGE
5. Abrir a sacola
   - **Esperado:** M-A com o preço do TC-REG-001

### Esperado e fonte

Com sessão de admin, bloco, selo e preços mostram só a campanha em vigência — nunca agendada, encerrada ou desligada
— fonte: PRD CA-06.1; a vigência decidida pelo banco, não pelo aparelho — RNF-03

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| recarregar | recarregar a página de P-AGE logada | sem selo, também depois de carregar tudo |
| link direto | abrir `/produtos/<slug de P-AGE>` numa aba nova logada | o mesmo |
| sair | sair da conta na loja e reabrir a Home | igual ao TC-REG-001 |
