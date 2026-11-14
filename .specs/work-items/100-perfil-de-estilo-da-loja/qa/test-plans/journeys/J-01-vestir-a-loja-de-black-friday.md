# J-01 · Vestir a loja de Black Friday pelo painel e ver a loja em preto e ouro

**Valor:** a dona liga a campanha sozinha, confere antes e vê a loja da cliente mudar de cor sem deploy — e só a loja.
**Persona:** PER-01 Adri (principal) · —
**Prioridade:** P0
**Critérios de origem:** UC-01, UC-03, RN-02, RN-04 (próxima página), RN-05 (o aviso), CA-05, CA-07
**Charters:** CH-01 (caminho feliz) · CH-02 (J-01a) · CH-05 (J-01b, J-01c) · **TC:** TC-JOURNEY-001, TC-FUNC-001,
TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-FUNC-006, TC-FUNC-012, TC-FUNC-013

## Entrada

| Origem             | URL / caminho                                         | Estado de partida                                 |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------- |
| navegação interna  | `http://localhost:8083/admin` → Configurações → Dados da loja | logada como `admin-loja`; perfil salvo = Padrão |

## Passos

| #  | A persona…                                                       | Deve ver                                                                                     | Em até | Fricção prevista                                   | TC           |
| -- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------- | ------------ |
| 1  | abre Configurações → Dados da loja e rola até o fim              | o card "Perfil de estilo da loja", último da seção, com Padrão marcado e "Em uso"            | 10 s   | o card fica abaixo da dobra                        | TC-FUNC-003  |
| 2  | lê o card                                                        | o texto de que só as cores mudam e o aviso de 5 minutos / 1 hora                             | 15 s   | não lê o aviso                                     | TC-FUNC-003  |
| 3  | escolhe "Black Friday"                                           | a opção marcada; "Em uso" continua no Padrão; Salvar habilitado                              | 3 s    | acha que já ligou ao marcar                        | TC-FUNC-003  |
| 4  | toca "Ver a loja com este perfil"                                | o modal "A loja com o perfil Black Friday" com a Home em preto e ouro                       | 5 s    | a prévia demora a carregar                         | TC-FUNC-005  |
| 5  | fecha a prévia e salva                                           | "Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora."; "Em uso" passa ao Black Friday | 3 s | —                                                  | TC-FUNC-001  |
| 6  | abre a loja numa aba nova                                        | a Home em preto e ouro, com os mesmos textos e blocos                                        | 5 s    | —                                                  | TC-FUNC-001  |
| 7  | volta ao painel e abre o app do ateliê                           | o painel e o ateliê com as cores de sempre                                                   | 10 s   | —                                                  | TC-FUNC-004  |

**Tempo total esperado:** ~50 s — dentro da paciência dela (120 s por tela).

## Objetivo

- **Observável:** a Home aberta numa aba nova pinta com o perfil Black Friday (cabeçalho `#0D0C0B`, `primary`
  `#1C1A18`, ouro `#C2A063`) e o card mostra "Em uso" no Black Friday
- **Efeitos colaterais:** `store_settings` `appearance = { profile: 'black-friday' }`; nenhuma outra configuração muda

## Saída

- **Natural:** Adri volta ao painel com o card mostrando o Black Friday em uso

## Desvios e abandono

| Ramo  | No passo | Quando                                       | A persona…                                   | Deve acontecer                                                                     | TC                       |
| ----- | -------- | -------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| J-01a | 4        | não gosta do que vê na prévia                | fecha pelo "Fechar", pelo fundo ou pelo Esc e sai sem salvar | nada é gravado; a loja publicada continua no Padrão; "Em uso" segue no Padrão | TC-FUNC-006              |
| J-01b | 5        | a conexão cai ao salvar                      | tenta salvar de novo depois                  | não aparece "Perfil salvo"; a falha é dita; o perfil salvo continua o anterior; a segunda tentativa salva | TC-FUNC-013 |
| J-01c | 1        | a configuração gravada tem um valor que a loja não conhece | abre o card                     | o card mostra Padrão com "Em uso", sem erro; a loja abre no Padrão                 | TC-FUNC-012              |

## Fronteiras

Nenhuma fora do monorepo. Cruza dois apps (painel → loja) pela configuração `store_settings` e pelo `postMessage` da
prévia (painel :8083 → iframe da loja :8082).

## Modos de falha

- Salvar grava outra chave junto (perde a faixa de avisos, o frete, os dados da loja)
- O painel ou o ateliê passam a pintar com o perfil da loja
- A prévia grava o perfil sem a dona salvar
