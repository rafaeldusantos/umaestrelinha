## TC-CFR-002: Só pelo teclado, a peça anuncia o desconto e o aviso de valor mudado é anunciado como alerta

**Tipo:** cfr
**Prioridade:** P1
**Origem:** CA-02.1, CA-04.3
**Autor:** dev
**Persona:** PER-05 Sônia
**Jornada:** J-01, passos 1–5
**Charter:** CH-08
**Situação:** ativo
**Automação:** target `manual` — status `na`
**Spec:** —
**Nota:** pela árvore de acessibilidade (snapshot); leitor de tela real fora

### Objetivo

Sônia sabe quanto cada peça custa levando junto sem enxergar o riscado.

### Pré-condições

- Conta: `anonima`
- Massa: M-01
- Estado de partida: página de P

### Condições reais

| Dimensão    | Valor                                            |
| ----------- | ------------------------------------------------ |
| Dispositivo | desktop (1440)                                   |
| Rede        | rápida                                           |
| Locale      | pt-BR                                            |
| Modalidade  | só-teclado                                       |

### Categoria

Acessibilidade.

### Metas (observável · alvo · aceitável)

| Observável | Alvo | Aceitável |
| --- | --- | --- |
| nome acessível da caixa da peça | termina com ", N% a menos levando junto" | — |
| preço com desconto | "de {cheio} por {junto}" lido como uma frase | — |
| aviso "o valor do seu pedido mudou" | `role="alert"`, foco alcançável nos dois botões | — |
| foco visível | em toda caixa e botão novos | — |

### Passos

1. Chegar à caixa da corrente pelo Tab e ler o snapshot
   - **Esperado:** o nome acessível com ", 15% a menos levando junto"; o preço "de R$ 79,90 por R$ 67,92"
2. Marcar com a barra de espaço e seguir pelo Tab até o botão de compra
   - **Esperado:** a linha do desconto e o total legíveis no snapshot; foco visível
3. Provocar o aviso do valor mudado e ler o snapshot
   - **Esperado:** um `alert` com o título e "Nada foi cobrado."; os dois botões alcançáveis pelo Tab

### Esperado e fonte

Fonte: `spec.md` › Design › Loja — Bloco (o nome acessível e o "de {cheio} por {junto}") e Checkout · o valor
mudou (`role="alert"`).

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| gaveta | Tab na linha da corrente | o "de/por" lido como frase |
