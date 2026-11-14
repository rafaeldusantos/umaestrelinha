# J-04 · Reencontrar a loja de sempre quando o perfil é o Padrão

**Valor:** a cliente que volta encontra exatamente a loja que conhece — a troca de mecanismo das cores é invisível.
**Persona:** PER-04 Lúcia (principal) · —
**Prioridade:** P0
**Critérios de origem:** CA-01, RN-01 (no Padrão nenhum componente muda de papel), RN-06, RN-08
**Charters:** CH-06 · **TC:** TC-REG-001, TC-SMOKE-001

## Entrada

| Origem | URL / caminho            | Estado de partida                                                               |
| ------ | ------------------------ | ------------------------------------------------------------------------------- |
| direta | `http://localhost:8082/` | perfil salvo = Padrão (ou ausente); a referência de antes do WI em `http://localhost:8092`; o pedido PIX pendente da `cliente-qa` criado pela thread (manifesto da massa) |

## Passos

| # | A persona…                                         | Deve ver                                                                 | Em até | Fricção prevista                      | TC           |
| - | -------------------------------------------------- | ------------------------------------------------------------------------ | ------ | ------------------------------------- | ------------ |
| 1 | abre a Home no celular                             | a Home de sempre, cor por cor igual à referência                         | 4 s    | um tom levemente diferente            | TC-SMOKE-001, TC-REG-001 |
| 2 | passa por categoria, produto e sacola              | iguais à referência, inclusive o selo "-X%" e a barra do frete em ardósia | 15 s  | sombra ou transparência mudou         | TC-REG-001   |
| 3 | vai ao checkout, à conta e à confirmação do pedido dela (`/pedido/:id` do manifesto) | iguais à referência                    | 30 s   | —                                     | TC-REG-001   |
| 4 | repete Home, categoria, produto e checkout no computador | iguais à referência                                                | 20 s   | —                                     | TC-REG-001   |

**Tempo total esperado:** ~75 s.

## Objetivo

- **Observável:** em cada tela, as cores computadas dos elementos de referência (cabeçalho, faixa de departamentos,
  botão primário, link, preço, selo "-X%", barra do frete, borda de campo, rodapé, marca, sombra de um cartão) são
  iguais às da referência
- **Efeitos colaterais:** —

## Saída

- **Natural:** Lúcia fica na conta dela

## Desvios e abandono

| Ramo  | No passo | Quando                                          | A persona…              | Deve acontecer                                     | TC         |
| ----- | -------- | ----------------------------------------------- | ----------------------- | -------------------------------------------------- | ---------- |
| J-04a | 1        | a configuração de perfil não existe no banco    | abre a loja             | Padrão, idêntico à referência (o local nasce sem a chave) | TC-REG-001 |

## Fronteiras

Nenhuma.

## Modos de falha

- O Padrão deixa de ser o de hoje num token, numa opacidade ou numa sombra — passa em teste e a cliente sente
