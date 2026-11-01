# Personas

A persona responde _"quem eu sou agora, enquanto testo isto?"_. Sessão sem persona escorrega para a cabeça
de quem desenvolveu — testa o que o sistema faz, não o que uma pessoa tentaria. Cada persona acha defeitos
diferentes: a nova acha atrito de onboarding, a avançada acha atalho quebrado, a mobile acha alvo de toque
pequeno.

Saída: `test-plans/personas.md`, pelo [template](../../templates/plan/personas.md).

---

## 1. Os seis arquétipos

Toda persona do plano parte de **um** arquétipo, e ganha nome, objetivo e contexto do Work Item.

| Arquétipo                           | Familiaridade | Motivação                         | Dispositivo típico                               | Paciência                                                | O que revela                                                                                              |
| ----------------------------------- | ------------- | --------------------------------- | ------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Novo usuário**                    | nenhuma       | avaliar se vale usar              | qualquer — muitas vezes celular                  | muito baixa (~60 s confuso, sai)                         | ação principal pouco clara, estado vazio sem orientação, texto confuso, campo obrigatório sem exemplo     |
| **Usuário avançado**                | diária        | fazer rápido                      | desktop, teclado, várias abas                    | zero para lentidão, alta para feio                       | atalho quebrado, operação em lote que perde estado, falta de desfazer, perda de estado entre abas         |
| **Usuário ocasional**               | algumas vezes | cumprir uma tarefa e sair         | alterna celular e notebook                       | moderada                                                 | "cadê aquele botão?", sessão que cai, rascunho que não voltou, continuidade entre dispositivos            |
| **Usuário mobile**                  | qualquer      | ação rápida, uma mão, em trânsito | viewport pequena, toque, rede lenta              | baixa — fecha no layout shift                            | alvo de toque < 44 px, quebra a 375 px, elemento fixo cobrindo conteúdo, zoom indesejado, falha de rede   |
| **Usuário de tecnologia assistiva** | qualquer      | usar em pé de igualdade           | leitor de tela, só teclado, zoom, alto contraste | presa à tarefa — sai se o anúncio é incompreensível      | rótulo ausente, foco preso, ordem de tab quebrada, informação só por cor, conteúdo dinâmico não anunciado |
| **Usuário em recuperação**          | qualquer      | ver se já foi corrigido           | o mesmo em que falhou                            | muito baixa — qualquer sinal da falha anterior e desiste | erro antigo em cache, tela de falha que volta, dado meio corrigido, "desculpe" sem próximo passo          |

Os arquétipos descrevem **o modo de usar**, não o perfil de acesso. Perfil e permissão (admin, operador,
convidado) são um campo à parte — um "usuário avançado" pode ser admin ou operador.

> No Playwright (MCP ou CLI), a tecnologia assistiva se simula por **teclado** e pela **árvore de acessibilidade**
> (snapshot). Leitor de tela real (VoiceOver, NVDA, TalkBack) fica fora — diga isso no plano quando a
> persona depender dele.

## 2. Escolher pela superfície

Para cada superfície que o Work Item toca: _quem mais se machuca se isto falhar?_ — essa é a obrigatória.

| Superfície                      | Obrigatória            | Recomendada                        |
| ------------------------------- | ---------------------- | ---------------------------------- |
| Onboarding / primeiro acesso    | Novo usuário           | Usuário mobile                     |
| Configurações / conta           | Usuário ocasional      | Usuário avançado                   |
| Operação em lote / dashboard    | Usuário avançado       | Usuário ocasional                  |
| Funcionalidade só mobile        | Usuário mobile         | Usuário de tecnologia assistiva    |
| Página de erro / recuperação    | Usuário em recuperação | Novo usuário                       |
| Página pública / landing        | Novo usuário           | Usuário de tecnologia assistiva    |
| Formulário longo                | Usuário ocasional      | Usuário mobile (autopreenchimento) |
| Wizard de vários passos         | Novo usuário           | Usuário avançado (atalhos, pular)  |
| Correção de bug (WI tipo `bug`) | Usuário em recuperação | a persona do bug original          |

## 3. Regras

1. **No mínimo três personas**, cobrindo as superfícies do Work Item. Menos que isso deixa segmento sem
   verificação — se for o caso, diga por quê na seção de riscos do plano
2. **Ao menos uma fora do caminho feliz:** novo usuário, mobile, tecnologia assistiva, permissão restrita
   ou em recuperação
3. **Cada persona tem um motivo para estar ali:** um objetivo que o Work Item entrega a ela. Persona sem
   jornada no plano sai do plano
4. **Diga a conta.** Para cada persona: `anonima`, ou o slug do perfil de acesso de que precisa
   (`admin-tenant`, `operador-sem-exclusao`), no formato do [contrato](../shared/contrato-qa.md#personas-e-contas).
   A credencial é `QA_<CONTA>_USUARIO` / `QA_<CONTA>_SENHA` — o plano nunca traz o valor
5. **Três hipóteses de fricção por persona**, escritas antes da execução: o que essa pessoa provavelmente
   vai tropeçar nesta superfície. Hipótese que não se confirma também é resultado
6. **Persona não coberta, só com motivo.** Arquétipo relevante para a superfície e deixado de fora vai na
   seção de riscos ("usuário avançado não coberto: a tela é de uso eventual")
7. **IDs estáveis.** `PER-NN`, na ordem em que entram; em `revisar`, persona existente mantém o ID

## 4. Atributos

| Campo           | Valores                                                        |
| --------------- | -------------------------------------------------------------- |
| `arquétipo`     | um dos seis                                                    |
| `objetivo`      | uma frase: o que ela veio fazer                                |
| `contexto`      | onde, quando, com que pressa, com que histórico                |
| `familiaridade` | `nenhuma` · `ocasional` · `diária`                             |
| `dispositivo`   | `desktop` (1280 px) · `tablet` (768 px) · `celular` (375 px)   |
| `rede`          | `rápida` · `lenta` · `instável`                                |
| `modalidade`    | `mouse-teclado` · `toque` · `só-teclado` · `leitor-de-tela`    |
| `locale`        | `pt-BR`, `en-US`… — o do público do Work Item                  |
| `paciência`     | segundos até desistir                                          |
| `conta`         | `anonima` · slug do perfil de acesso (`operador-sem-exclusao`) |
| `fricção`       | as três hipóteses                                              |

O explorer usa `dispositivo` como viewport e `paciência` como régua: passo que funciona mas estoura a
paciência da persona é achado.

## 5. Armadilhas

- **"Um usuário qualquer"** — persona genérica gera teste genérico. Escolha um arquétipo
- **Persona de conveniência** — escolher a persona que combina com o que você já queria testar. A persona
  vem primeiro; ela escolhe o teste
- **Persona como etiqueta** — pôr o nome da persona num teste que não muda nada por causa dela
- **Trocar de persona no meio do charter** — um charter, uma persona, do começo ao fim
