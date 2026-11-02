## TC-FUNC-022: Com o app do ateliê em segundo plano, nenhuma leitura sai, e ao voltar ele relê

**Tipo:** functional
**Prioridade:** P1
**Origem:** §10.5, LAV-05
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-06, passo 5
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** visibilidade emulada trazendo outra aba à frente no contexto do app; contar as requisições da leitura

### Objetivo

O app guardado no bolso não gasta a bateria nem o pacote de dados da Adri.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01
- Estado de partida: `/ao-vivo` aberta e lendo

### Condições reais

as da persona

### Passos

1. Traz outra aba à frente (o app fica oculto) por 2 min
   - **Esperado:** nenhuma leitura ao vivo nem de movimento nesse tempo
2. Volta ao app
   - **Esperado:** relê logo ao voltar e retoma o ritmo de 15 s; o frescor volta a "Atualizado agora"
3. Repete no Início
   - **Esperado:** o cartão também não lê em segundo plano

### Esperado e fonte

Em segundo plano não sai leitura — fonte: PRD §10.5, LAV-05

### Variações

| Variação         | Ação                          | Esperado            |
| ---------------- | ----------------------------- | ------------------- |
| oculto por 10 s   | volta antes de uma leitura     | nenhuma leitura extra no meio |
