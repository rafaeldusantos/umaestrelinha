## TC-SMOKE-001: A Adri abre o Início e a Loja ao vivo e as duas carregam sem falha

**Tipo:** smoke
**Prioridade:** P0
**Origem:** LAV-01, LAV-03, LAV-62
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 1 e 4
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a conferência mais curta de que o cartão e a tela novos não quebram o build; não depende de presença

### Objetivo

Antes de qualquer outra sessão, saber que a Adri chega ao cartão "Agora na loja" e à Loja ao vivo sem tela de
falha.

### Pré-condições

- Conta: `admin-atelie`
- Massa: nenhuma (com ou sem cliente na loja)
- Estado de partida: app aberto em http://localhost:8084/, logada

### Condições reais

as da persona

### Passos

1. Abre o Início
   - **Esperado:** em até 3 s, o cartão "Agora na loja" com um número de pessoas ou "Ninguém na loja agora", nunca "Não consegui carregar."
2. Toca no cartão
   - **Esperado:** a tela com o título "Loja ao vivo" e os blocos "Agora na loja", "O que estão fazendo", "Joias sendo vistas agora", "De onde vieram", "No celular" e "Acessos"
3. Toca em "Voltar"
   - **Esperado:** de volta ao Início, com o cartão

### Esperado e fonte

O cartão e a tela carregam com os seis blocos — fonte: PRD §5.1, §5.2, LAV-62

### Variações

| Variação         | Ação                    | Esperado                       |
| ---------------- | ----------------------- | ------------------------------ |
| 1440 de largura  | repete os três passos   | mesmo resultado, sem rolar de lado |
