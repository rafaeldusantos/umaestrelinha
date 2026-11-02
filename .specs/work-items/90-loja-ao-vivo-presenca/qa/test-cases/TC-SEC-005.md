## TC-SEC-005: Nada na Loja ao vivo identifica a cliente que está na loja

**Tipo:** security
**Prioridade:** P1
**Origem:** LAV-65
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02, passo 7
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** varredura visual e da árvore de acessibilidade em todos os blocos, com uma cliente logada de nome conhecido

### Objetivo

Quem está na loja pode estar de luto; a Adri acompanha o movimento sem saber quem é cada pessoa.

### Pré-condições

- Conta: `admin-atelie`; cliente logada na loja com nome e e-mail conhecidos (cliente de teste do banco local)
- Massa: ambiente do CH-01
- Estado de partida: `/ao-vivo`

### Condições reais

as da persona

### Passos

1. A cliente logada abre uma joia, põe na sacola e vai ao checkout preenchendo os dados
   - **Esperado:** ela aparece nos números
2. Procura o nome, o e-mail, o telefone ou a cidade dela no cartão do Início, nos blocos A–E, em Acessos, no título da aba e na URL
   - **Esperado:** nada disso em lugar nenhum
3. Lê a árvore de acessibilidade da tela
   - **Esperado:** nenhum nome acessível com dado dela

### Esperado e fonte

A tela nunca mostra nome, e-mail, cidade ou o que identifique uma pessoa — fonte: PRD LAV-65, §11 ("Juliana está na loja" fora)

### Variações

| Variação                | Ação                          | Esperado          |
| ----------------------- | ----------------------------- | ----------------- |
| uma única cliente na loja | só ela na loja                | os números dizem 1, nada além disso |
