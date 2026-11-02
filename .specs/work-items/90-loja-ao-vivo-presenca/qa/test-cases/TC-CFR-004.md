## TC-CFR-004: Nenhum texto da Loja ao vivo grita ou apressa, em nenhum estado

**Tipo:** cfr
**Prioridade:** P2
**Origem:** exploratório — tom memorial do PRD §1 e §9 sobre todos os estados novos
**Autor:** dev
**Persona:** PER-02 Adri à noite, fonte 200 %
**Jornada:** J-01, J-02
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** leitura de cada texto visível

### Objetivo

A Adri lida com o luto de quem compra; a tela de acompanhamento não pode soar como painel de vendas ansioso.

### Pré-condições

- Conta: `admin-atelie`
- Massa: estados cheio, vazio, falha, não medida e com alguém no checkout
- Estado de partida: Início

### Condições reais

as da persona

### Passos

1. Lê todos os textos do cartão e da Loja ao vivo em cada estado
   - **Esperado:** nenhuma exclamação, nenhum emoji, nenhum "corra", "não perca", "últimas"; "últimos" só como janela ("últimos 5 minutos", "últimos 30 min")
2. Lê a nota do checkout
   - **Esperado:** sem prazo e sem urgência

### Categoria

Usabilidade (linguagem do usuário).

### Metas

| Observável                | Alvo    | Aceitável |
| ------------------------- | ------- | --------- |
| exclamação, emoji, urgência | nenhuma | nenhuma  |

### Esperado e fonte

Sem exclamação, sem emoji, sem urgência — fonte: PRD §1, §9; spec D-17 ("últimos" só como janela)

### Variações

| Variação   | Ação           | Esperado     |
| ---------- | -------------- | ------------ |
| 1 pessoa    | lê "1 pessoa"  | singular certo em todo lugar |
