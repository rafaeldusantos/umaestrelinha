# CH-01 · Adri liga o Black Friday, confere a loja e volta ao Padrão

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-01 Adri                                                                   |
| Tour         | Feature                                                                       |
| Modo         | por cenário (J-01 e J-02)                                                     |
| Time-box     | 90 min · orçamento 70 ações                                                   |
| Mudança      | o card "Perfil de estilo da loja" em Configurações → Dados da loja (UC-01, UC-02, RN-05 no aviso), a loja pintando no perfil salvo na próxima página aberta (UC-01, RN-04), voltar ao Padrão sem perder conteúdo (UC-02, CA-03), painel e ateliê sem mudar de cor (RN-02, CA-05) |
| Viewport     | 1440 × 900 (o painel da Adri); a loja aberta também em 390 × 844 no passo da Home |
| Massa        | **altera** `store_settings.appearance`: parte do Padrão, grava Black Friday, termina no Padrão. Só lê o resto |
| Driver       | `—`                                                                           |
| Entrada      | `http://localhost:8083/admin` · logada como `admin-loja`, perfil salvo = Padrão (estado S0 do Ambiente) |
| Jornadas     | J-01, J-02                                                                    |
| TC           | TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004            |

## Missão

Como a dona, confirmar que dá para vestir a loja de Black Friday por uma escolha em Configurações, ver a loja da
cliente em preto e ouro na próxima página aberta — com o painel e o ateliê intocados — e depois voltar ao Padrão pela
mesma escolha sem que nada do que ela montou se perca.

## Deve tentar

1. Antes de mexer: anotar o que a Home mostra (blocos, um texto, o menu, um preço, a faixa de avisos se houver) e as
   cores computadas do cabeçalho e do botão primário da loja, do cabeçalho do painel e da Início do ateliê
2. Marcar Black Friday e conferir que **marcar não salva** (o "Em uso" fica no Padrão, Salvar habilita); salvar e ler a
   mensagem; abrir a loja numa aba **nova** e conferir o perfil na Home (390 e 1440) e numa página de produto
3. Com Black Friday salvo, conferir o painel (Dados da loja, Pedidos, a sidebar) e o app do ateliê
   (`http://localhost:8084`, mesma conta) contra as cores anotadas
4. Marcar Padrão e salvar; abrir a loja numa aba nova; conferir as cores de volta às anotadas e todo o conteúdo do
   passo 1 no lugar; conferir no painel que Dados da loja, a faixa de avisos e o frete não mudaram

## Edge cases sugeridos

- Clicar no cartão inteiro da opção, não no rádio (o design diz que o cartão é clicável)
- Marcar Black Friday e depois Padrão de novo sem salvar: Salvar volta a ficar desabilitado
- Duplo clique em Salvar
- Recarregar o painel logo depois de salvar: "Em uso" continua no perfil salvo
- Ler o aviso: os dois prazos (5 minutos produto/categoria, 1 hora o resto) e a frase de quem já está com a loja aberta
- Salvar com o perfil igual ao salvo (deve ser impossível — botão desabilitado)

## Fora do escopo

- **A aba da loja que já estava aberta antes de salvar**: no dev server o `<html>` sai sem `data-perfil` (estado "não
  sei", spec R2) e a configuração decide; o comportamento de "loja aberta" se confere com o documento interceptado no
  CH-03. Não abra conclusão sobre ela aqui
- **Pintura em ardósia por um instante antes do preto** ao abrir a loja **no dev server**: esperado sem o atributo do
  servidor (R2); a primeira pintura de verdade é do CH-08. Não é achado aqui
- O prazo real de 5 min / 1 hora do cache de borda (só existe na Vercel)
- A prévia além de abrir e fechar uma vez (é do CH-02)
- Valor desconhecido e falha ao salvar (CH-05)
- As outras seções de Configurações, a faixa de avisos (WI 101) e o selo de campanha (WI 102) — só se conferem como
  "não mudaram"; o que estiver estranho nelas é sugestão de backlog
- O rótulo do botão é "Salvar alterações" (o `SettingsSaveButton` do painel) e não "Salvar" como no design — decisão da
  T07, não achado
