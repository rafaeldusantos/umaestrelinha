## TC-FUNC-003: O ícone do sistema e as cores do rótulo continuam gravados depois de recarregar o painel

**Tipo:** functional
**Prioridade:** P0
**Origem:** C-05, C-06
**Autor:** dev
**Persona:** PER-01 Adri, a dona
**Jornada:** J-01, passo 7
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** perda de dado é o maior risco do contrato entre camadas; determinístico; pedido de automação E2E

### Objetivo

O que a dona gravou volta igual — e não some quando ela muda outra coisa no item depois. Perder a cor em silêncio é perda de dado dela.

### Pré-condições

- Conta: `admin`
- Massa: item A gravado com Etiqueta, barra `#E8C77A`, lista `#8A5A2B` (TC-JOURNEY-001)
- Estado de partida: `/admin/menu` aberta

### Condições reais

as da persona.

### Passos

1. Recarrega a página e reabre o item A
   - **Esperado:** a Etiqueta marcada; barra `#E8C77A` e lista `#8A5A2B` nos campos hex e no seletor de cor, com a medida verde
2. Muda só o nome do item A e salva; recarrega e reabre
   - **Esperado:** nome novo, e a Etiqueta e as duas cores continuam
3. Devolve o nome original e salva
   - **Esperado:** gravado; ícone e cores intactos

### Esperado e fonte

A chave do sistema e as cores gravadas no documento v2 são lidas iguais pelo painel — fonte: `plan.md` C-05, C-06; Riscos (`parseRoot` esquecendo o campo faz a cor sumir e a próxima gravação a apaga).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| recarregar logo depois de Salvar | salvar e recarregar em seguida | o que foi salvo aparece; nada pela metade |
| item com uma cor só | item B (só lista `#8A5A2B`) recarregado | lista `#8A5A2B`, barra vazia/padrão |
| duplo clique no Salvar | dois cliques seguidos | uma gravação, sem erro de conflito |
