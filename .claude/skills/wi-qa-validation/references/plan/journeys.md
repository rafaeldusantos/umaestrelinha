# Jornadas

Jornada é a sequência de ações que entrega um valor a uma persona. Feature é unidade de engenharia; jornada
é unidade de valor. A feature pode funcionar isolada e a jornada em que ela vive estar quebrada na emenda —
é o que o teste por feature não pega.

Saída: `test-plans/journeys/J-NN-<slug>.md`, uma por jornada, pelo
[template](../../templates/plan/journey.md).

---

## 1. Anatomia

```
[entrada] → [passos] → [objetivo] → [saída]
                ↓
       [desvios e abandono]
```

| Parte        | O que é                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| **Entrada**  | como a persona chega: URL direta, link de e-mail, navegação interna, deep link, notificação           |
| **Passos**   | o que ela faz, em verbo de usuário, cada um com o que deve ver e em quanto tempo                     |
| **Objetivo** | o estado que prova o valor entregue — _"pedido registrado e confirmação visível"_, nunca _"clicou em enviar"_ |
| **Saída**    | onde ela termina depois do objetivo. A jornada acaba quando a persona sai, não quando a ação completa |
| **Desvios**  | onde ela pode pausar, escolher diferente, encontrar erro, abandonar e voltar depois                  |

## 2. Escolher as jornadas

As perguntas de risco, aplicadas ao que o Work Item muda:

- **O que gera receita?** checkout, assinatura, troca de forma de pagamento
- **O que mexe com dado sensível?** login, recuperação de senha, permissões, exportação, exclusão
- **O que é mais usado?** o verbo do produto — buscar, enviar, salvar, aprovar
- **Qual é a primeira impressão?** onboarding, landing → cadastro → primeira tarefa
- **Qual é o caminho de recuperação?** depois de pagamento recusado, sessão expirada, erro 5xx

Cada critério de aceite da fonte cai em ao menos uma jornada. Critério que não cabe em nenhuma vira TC
avulso, não jornada forçada.

## 3. Regras

1. **De 3 a 7 jornadas.** Menos é cobertura rasa; mais é sessão cansada e execução superficial. Work Item
   pequeno (bug, ajuste de tela) pode ter menos — diga por quê no plano
2. **Ao menos uma de abandono ou erro**: a persona desiste no meio, a ação falha e ela tenta de novo, a
   sessão expira e ela volta depois. É onde moram os bugs de maior impacto — carrinho que zera, sessão
   perdida, pedido fantasma, mensagem de "processando" que não é verdade
3. **Uma persona principal por jornada**, e uma secundária quando a jornada serve a duas. Jornada que só
   "funciona" para uma persona é achado, não feature
4. **Nome pelo valor, não pela tela.** _"Atualizar preferências de notificação e recebê-la"_, não
   _"Teste da página de configurações"_
5. **Passos em verbo de usuário**, não gravação de cliques. _"Escolhe o plano anual"_, não _"clica em
   `#plan-annual`"_
6. **Tempo por passo dentro da paciência da persona.** A soma não passa do que ela espera
7. **Marque os pontos de fricção previstos** no passo em que podem aparecer — vêm das hipóteses da persona
   e do que a fonte deixa em aberto
8. **Jornada que cruza fronteira** (outro time, outro serviço, provedor externo) se marca como tal: é onde
   regressão se esconde, porque ninguém é dono do contrato. Ganha prioridade na suíte de regressão
9. **IDs estáveis.** `J-NN`; em `revisar`, jornada existente mantém o ID e o arquivo

## 4. Caminho feliz e caminhos de abandono

Exemplo — _"Concluir a primeira compra"_:

| Caminho     | Sequência                                                                    | O que testa       |
| ----------- | ---------------------------------------------------------------------------- | ----------------- |
| Feliz       | navega → adiciona → checkout → paga → confirmação                            | o valor           |
| Abandono A  | navega → adiciona → checkout → vê frete inesperado → fecha a aba             | carrinho mantido  |
| Abandono B  | … → pagamento recusado → tenta outro cartão → conclui                        | resiliência       |
| Abandono C  | … → sessão expira → volta no dia seguinte → retoma                           | continuidade      |

Cada caminho de abandono é um ramo da jornada, não uma jornada nova: `J-01a`, `J-01b` no arquivo da
`J-01`.

## 5. Da jornada para o resto do plano

| Sai da jornada            | Vai para                                                                          |
| ------------------------- | --------------------------------------------------------------------------------- |
| o caminho feliz completo  | um `TC-JOURNEY-*` — candidato a `e2e` quando P0/P1 e determinístico               |
| um passo com regra própria | `TC-FUNC-*` ou `TC-UI-*`, com a origem no critério                               |
| um caminho de abandono    | um `TC-JOURNEY-*` próprio ou um passo do charter que explora a jornada            |
| a jornada inteira         | ao menos um charter a explora ([charters](../execution/charters.md))              |
| as fronteiras cruzadas    | a suíte de regressão ([regression.md](regression.md))                             |

## 6. Armadilhas

- **Sem caminho de abandono** — mapa sem desvio não acha os bugs que importam
- **Objetivo = clicar em enviar** — reescreva até o objetivo ser algo que a persona queria
- **Jornada com nome de tela** — é teste de feature com outro rótulo
- **Gravação de cliques** — jornada é sequência de intenções, não script de seletor
