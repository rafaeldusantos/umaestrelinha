## TC-JOURNEY-001: Adri veste a loja de Black Friday pelo painel e depois devolve ao Padrão

**Tipo:** journey
**Prioridade:** P0
**Origem:** UC-01, UC-02, CA-03
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01 e J-02, da entrada ao objetivo
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a jornada inteira do valor; determinística no local

### Objetivo

A dona consegue, sozinha e sem deploy, ligar e desligar a campanha — o pedido inteiro do Work Item.

### Pré-condições

- Conta: `admin-loja`
- Massa: perfil salvo = Padrão (S0)
- Estado de partida: `http://localhost:8083/admin`

### Condições reais

As da persona.

### Entrada

Navegação interna: painel → Configurações → Dados da loja.

### Passos com tempo

| # | A persona…                              | Deve ver                                               | Em até |
| - | --------------------------------------- | ------------------------------------------------------ | ------ |
| 1 | chega ao card                           | o card, último da seção, Padrão em uso                  | 10 s   |
| 2 | marca Black Friday, confere na prévia, fecha | a loja em preto e ouro no modal                    | 15 s   |
| 3 | salva                                   | "Perfil salvo…"; Black Friday em uso                   | 3 s    |
| 4 | abre a loja numa aba nova               | preto e ouro                                           | 5 s    |
| 5 | volta ao card, marca Padrão, salva      | "Perfil salvo…"; Padrão em uso                         | 5 s    |
| 6 | abre a loja numa aba nova               | ardósia e ouro, com o mesmo conteúdo                   | 5 s    |

### Objetivo e efeitos

- **Objetivo:** a loja muda de cor e volta, só pela chave
- **Efeitos:** `appearance` vai a `black-friday` e volta a `padrao`; nenhuma outra configuração muda

### Caminho de abandono

J-01a — confere na prévia e desiste sem salvar: nada gravado (TC-FUNC-006, CH-02).

### Passos

1. Percorre a tabela acima
   - **Esperado:** cada linha dentro do tempo, sem ajuda externa

### Esperado e fonte

Ligar e voltar pela mesma chave, sem deploy e sem perder conteúdo — fonte: PRD "O que a dona ganha", UC-01, UC-02, CA-03.

### Variações

| Variação | Ação                      | Esperado                       |
| -------- | ------------------------- | ------------------------------ |
| celular  | a mesma jornada em 390    | o card empilhado, mesmo resultado |
