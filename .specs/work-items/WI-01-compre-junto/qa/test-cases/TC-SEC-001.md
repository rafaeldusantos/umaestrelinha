## TC-SEC-001: As telas do Compre Junto no painel só abrem para quem tem acesso de administradora

**Tipo:** security
**Prioridade:** P1
**Origem:** RNF-07
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-03
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** acesso negado visível; quatro rotas novas

### Objetivo

As listas e o relatório de vendas não ficam expostos a quem não é da loja.

### Pré-condições

- Conta: `admin-painel` (e depois deslogada)
- Massa: M-02
- Estado de partida: painel aberto

### Condições reais

As da persona.

### Passos

1. Sair do painel e abrir direto `/admin/compre-junto`, `/admin/compre-junto/adesao`, `/admin/compre-junto/listas/nova` e `/admin/compre-junto/listas/<id de M-02>`
   - **Esperado:** em todas, a tela de login do painel; nenhum dado da lista ou do relatório aparece
2. Entrar com `admin-painel`
   - **Esperado:** as quatro telas abrem

### Esperado e fonte

"Configuração gravável só pela dona" — fonte: PRD RNF-07.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| sair em outra aba | sai na aba B com o editor aberto na A e salva na A | registrar: a gravação é recusada e o painel diz o porquê |
