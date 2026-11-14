# CFR — requisitos transversais

As qualidades que nenhuma feature tem como dona e que o usuário percebe: usabilidade, acessibilidade,
performance percebida, compatibilidade, recuperação de erro, paridade com produção. O QA real-user as
confere **sobre jornadas reais** — CFR sem fluxo produz achado raso.

É uma checagem curta, não auditoria: conformidade WCAG completa, Lighthouse e orçamento de performance são de
ferramenta e etapa próprias.

---

## Como rodar

O charter `cfr` traz as **2 jornadas** de maior superfície — **1** em Work Item pequeno — e as categorias
da rodada. O CFR confere **a superfície da Mudança**: o elemento que o Work Item não tocou não entra, nem
quando aparece na mesma tela. O que você notar fora dela é `pré-existente` — vai ao log, sem achado.

1. **Refaça cada jornada como auditoria**, não como verificação da jornada — ela já foi explorada nos
   outros charters
2. **Em cada passo, pergunte as categorias** do charter, e marque cada uma:

   | Marca      | Quando                                                                |
   | ---------- | --------------------------------------------------------------------- |
   | `pass`     | atende o item ou o alvo                                               |
   | `friction` | funciona, mas atrapalha a persona — fora do alvo, confuso, lento      |
   | `fail`     | impede a persona, ou a engana (diz sucesso quando falhou, perde dado) |

3. **Um achado por `friction` ou `fail`**, com o item, a jornada e o passo. Gravidade pelo impacto na persona
   ([severity.md](../triage/severity.md)), não pela categoria
4. **Categoria cortada** só com o porquê no log (a mudança não toca layout, não há formulário…)
5. **Time-box: 45 minutos — 35 ações.** O que não coube vai para Fora da cobertura

## 1. Usabilidade — heurísticas de Nielsen

- [ ] **Status visível** — toda ação tem retorno em até 1 s
- [ ] **Linguagem do usuário** — nada de "Entidade criada", "Request 200 OK"
- [ ] **Controle e liberdade** — dá para desfazer, cancelar ou sair de toda ação confirmada
- [ ] **Consistência** — o mesmo nome e o mesmo ícone para a mesma coisa na superfície
- [ ] **Prevenção de erro** — confirmação em ação irreversível, validação antes do envio
- [ ] **Reconhecer em vez de lembrar** — nada a memorizar de uma tela anterior
- [ ] **Atalho para quem usa muito** — ação repetida tem atalho de teclado, quando a fonte pede
- [ ] **Minimalismo** — cada palavra, botão e imagem faz sentido ali
- [ ] **Mensagem de erro útil** — linguagem simples e um próximo passo concreto
- [ ] **Ajuda** — há caminho para ajuda a partir do estado de falha

## 2. Acessibilidade — checagem rápida WCAG 2.1 AA

O snapshot de acessibilidade do [browser](browser.md#snapshot) é a ferramenta principal: mostra papel, nome
acessível e estrutura do jeito que a tecnologia assistiva vê.

**Teclado**

- [ ] Todo elemento interativo é alcançável com Tab
- [ ] A ordem do Tab segue a ordem visual
- [ ] Foco visível em todo elemento focável — screenshot depois do Tab
- [ ] Esc fecha modal; Enter aciona a ação principal
- [ ] Sem armadilha de teclado — sempre dá para sair com Tab

**Estrutura e nomes** (pelo snapshot)

- [ ] Hierarquia de títulos lógica, com um `h1`
- [ ] Campo com rótulo associado — placeholder não é rótulo
- [ ] Botão e link com nome que descreve a ação — "clique aqui" e ícone sem nome falham
- [ ] Imagem com texto alternativo, ou marcada como decorativa
- [ ] Mensagem dinâmica (toast, erro, modal) aparece como `alert`, `status` ou região viva

**Visual**

- [ ] Cor não é o único sinal — erro não é só vermelho, sucesso não é só verde
- [ ] Contraste do texto ≥ 4.5:1 (≥ 3:1 para texto grande: 24 px, ou 18,66 px em negrito) — pelas cores
      computadas, ver [browser.md](browser.md#valores-computados)
- [ ] Sem quebra a 200% de zoom — viewport de 640 px de largura equivale a 1280 a 200%
- [ ] Movimento reduzido respeitado — sem animação decorativa com `reducedMotion: reduce`

Leitor de tela real não roda no browser da sessão: registre em Fora da cobertura quando o charter pedir.

## 3. Performance percebida

O que o usuário sente, não o que a ferramenta sintética reporta.

| Observável            | Alvo                                               | Aceitável | Como medir                                                                         |
| --------------------- | -------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| Primeira pintura útil | < 2 s                                              | < 4 s     | `first-contentful-paint` pelos [valores computados](browser.md#valores-computados) |
| Pronto para interagir | < 3 s                                              | < 6 s     | tempo até o primeiro clique produzir efeito                                        |
| Retorno do botão      | mudança visível no snapshot logo depois do clique  | —         | desabilitado, spinner, texto trocado                                               |
| Spinner               | ação de mais de 300 ms mostra que está trabalhando | —         | snapshot durante a espera                                                          |
| UI otimista           | reconcilia na falha                                | —         | cortar a rede no envio ([browser.md](browser.md#rede-offline))                     |
| Ação longa (> 2 s)    | progresso, cancelar ou "ainda trabalhando"         | —         | observar                                                                           |

Com tempo: dentro do alvo é `pass`, até o aceitável é `friction`, além dele é `fail`. Sem tempo: o retorno
ausente é `fail` quando leva a persona a repetir a ação ou desistir; senão, `friction`.

## 4. Compatibilidade

| Camada    | Mínimo                                               | No browser da sessão                                                                 |
| --------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Viewport  | **1280 · 768 · 375**                                 | `browser_resize` / `resize` — 1280×800 · 768×1024 · 375×812                          |
| Tema      | claro e escuro                                       | `browser_emulate_media` `colorScheme` / `set-color-scheme`                           |
| Movimento | com e sem redução                                    | `browser_emulate_media` `reducedMotion` / `set-reduced-motion`                       |
| Browser   | Chrome, Safari, Firefox; Safari iOS e Chrome Android | só o engine que o driver abriu — registre qual; os demais vão para Fora da cobertura |

Mudança que toca CSS ou layout: os três viewports são obrigatórios. Em cada um: nada transborda na
horizontal, nada se sobrepõe, todo botão é alcançável, texto não corta. Divergência é achado; gravidade pelo
impacto, não pelo viewport.

## 5. Recuperação de erro

Para cada caminho de falha encontrado na rodada:

- [ ] Explicação em linguagem simples — sem stack trace, sem código sozinho
- [ ] Próximo passo concreto — tentar de novo, voltar, falar com o suporte
- [ ] O que a persona digitou é preservado
- [ ] Diz se a falha é passageira ou permanente
- [ ] Em perda de dado, diz o que se perdeu

Falha sem recuperação é `fail`.

**Sinais de confiança** — a parte de segurança que o usuário vê, não varredura de vulnerabilidade:

- [ ] Dado sensível mascarado na tela (senha, cartão, documento)
- [ ] Sessão que expira avisa e devolve a persona ao ponto onde estava
- [ ] Ação de outra persona ou de outra conta não aparece para esta
- [ ] Nenhum segredo, token ou dado pessoal no console ou na URL

## 6. Paridade com produção

Não é item a marcar por passo: é a condição da rodada, registrada no cabeçalho do log.

- [ ] Build igual ao artefato que vai a produção — não "funciona na minha máquina"
- [ ] O caminho de login que o usuário real usa (SSO, OAuth), não um atalho de teste
- [ ] Os serviços reais de backend, não mock local
- [ ] Cookies de terceiros habilitados

Desvio é registrado, não escondido: paridade quebrada enfraquece o resultado, e a triagem precisa saber.

## Anti-padrões

- **Auditoria completa na janela do QA** — fique na checagem curta
- **CFR do app inteiro** — contraste, foco e anúncio de elementos que o Work Item não mudou. É backlog, não
  esta rodada
- **Pular CFR porque "a feature funciona"** — a feature funcionar e as qualidades se sustentarem são
  afirmações diferentes
- **CFR antes das jornadas** — CFR é lente sobre fluxo real
- **Tratar os sinais de confiança como teste de segurança** — isso é de outra disciplina
