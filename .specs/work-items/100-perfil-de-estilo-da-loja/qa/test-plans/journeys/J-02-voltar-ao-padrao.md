# J-02 · Devolver a loja ao Padrão depois da campanha, sem perder nada

**Valor:** a dona encerra a Black Friday pela mesma chave e a loja volta exatamente à de sempre, com tudo o que ela montou.
**Persona:** PER-01 Adri (principal) · —
**Prioridade:** P0
**Critérios de origem:** UC-02, CA-03
**Charters:** CH-01 · **TC:** TC-FUNC-002, TC-JOURNEY-001

## Entrada

| Origem            | URL / caminho                                   | Estado de partida                                       |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------- |
| navegação interna | `http://localhost:8083/admin/configuracoes/dados-da-loja` | logada como `admin-loja`; perfil salvo = Black Friday (deixado pela J-01) |

## Passos

| # | A persona…                                  | Deve ver                                                                   | Em até | Fricção prevista                    | TC          |
| - | ------------------------------------------- | -------------------------------------------------------------------------- | ------ | ----------------------------------- | ----------- |
| 1 | anota o que a Home mostra hoje (blocos, textos, menu, um preço) | a Home em preto e ouro                                | 15 s   | —                                   | TC-FUNC-002 |
| 2 | no card, marca "Padrão" e salva             | "Perfil salvo…"; "Em uso" no Padrão                                        | 5 s    | teme que "voltar" apague algo       | TC-FUNC-002 |
| 3 | abre a loja numa aba nova                   | a Home em ardósia e ouro, com os mesmos blocos, textos, menu e preços      | 5 s    | —                                   | TC-FUNC-002 |
| 4 | confere a faixa de avisos, o menu e os dados da loja no painel | iguais aos de antes de ligar o Black Friday             | 20 s   | —                                   | TC-FUNC-002 |

**Tempo total esperado:** ~45 s — dentro da paciência dela.

## Objetivo

- **Observável:** a loja pinta com a paleta Padrão (cabeçalho `#283A4A`, `primary` `#34495E`) e todo conteúdo anotado
  no passo 1 está lá
- **Efeitos colaterais:** `appearance = { profile: 'padrao' }`; nenhuma outra chave de `store_settings` mudou

## Saída

- **Natural:** Adri fecha a aba da loja e segue no painel

## Desvios e abandono

| Ramo  | No passo | Quando                             | A persona…                     | Deve acontecer                                   | TC          |
| ----- | -------- | ---------------------------------- | ------------------------------ | ------------------------------------------------ | ----------- |
| J-02a | 2        | marca Padrão e desiste antes de salvar | sai da seção e volta       | o salvo continua Black Friday; nada foi gravado  | TC-FUNC-003 |

## Fronteiras

Nenhuma.

## Modos de falha

- Voltar ao Padrão regrava ou apaga outra chave de configuração
- A loja volta a um Padrão que não é o de hoje (tom, sombra, opacidade diferentes)
