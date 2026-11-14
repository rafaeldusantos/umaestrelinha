# CH-05 · Adri com uma configuração que a loja não conhece e a rede caindo ao salvar

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-01 Adri                                                                   |
| Tour         | Network                                                                       |
| Modo         | por técnica (adivinhação de erro)                                             |
| Time-box     | 60 min · orçamento 50 ações                                                   |
| Mudança      | valor desconhecido gravado ⇒ a loja abre no Padrão e o card mostra Padrão com "Em uso" (RN-07, CA-06; spec H9); estados do card que o design não desenha — carregando (opções desabilitadas), salvando, erro (molde `SettingsSaveButton`/`useSettingsSave`), sucesso com a frase de H8 |
| Viewport     | 1440 × 900                                                                    |
| Massa        | **altera** `appearance`. Parte de S2 (`{ "profile": "neon" }`, gravado pela thread por SQL local antes do lote); a sessão grava pelo card; a thread restaura S0 depois |
| Driver       | `—`                                                                           |
| Entrada      | `http://localhost:8082/` (a loja) e depois `http://localhost:8083/admin/configuracoes/dados-da-loja` · logada como `admin-loja` |
| Jornadas     | J-01 (ramos J-01b, J-01c)                                                     |
| TC           | TC-FUNC-012, TC-FUNC-013                                                      |

## Missão

Como a dona num dia de conexão ruim, achar qualquer jeito de o card dizer que salvou quando não salvou, de a loja
quebrar com uma configuração estranha, ou de a escolha ficar num estado que não é nem o salvo nem o marcado.

## Deve tentar

1. Com S2: abrir a loja numa aba nova (Home e um produto) — Padrão, sem erro na tela; abrir o card — Padrão marcado com
   "Em uso", Black Friday sem selo
2. Marcar Black Friday, cortar a rede (offline) e salvar: ler o que o card diz, o estado do botão e se "Em uso" mudou;
   devolver a rede, recarregar e conferir o que ficou salvo; salvar de novo com rede
3. Abrir a seção com a rede lenta ou cortada logo na carga: as opções ficam desabilitadas enquanto a configuração não
   chega (H9) e o card não mostra "Em uso" errado
4. Duas abas do painel na seção: salvar Black Friday numa e Padrão na outra; recarregar as duas e conferir que "Em uso"
   bate com o que a loja mostra numa aba nova

## Edge cases sugeridos

- Salvar e cortar a rede durante a gravação (antes da resposta)
- Clicar em Salvar duas vezes com a rede lenta
- Sair da seção com uma escolha marcada e não salva, e voltar
- Recarregar logo depois de uma falha
- A mensagem de erro em linguagem simples, com o que fazer

## Fora do escopo

- O texto exato da mensagem de erro: a fonte só diz "o molde do `useSettingsSave`" — registre a frase que aparece; só
  é achado se disser sucesso na falha, culpar a pessoa ou não dizer nada
- Valor desconhecido escrito por outro caminho que não a configuração (URL, `localStorage`): a loja não aceita perfil
  por parâmetro fora da prévia — não explore
- A prévia (CH-02) e o caminho feliz (CH-01)
- Outras chaves de `store_settings`
