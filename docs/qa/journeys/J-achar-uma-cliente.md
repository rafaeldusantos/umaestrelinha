# J-achar-uma-cliente — Achar uma cliente na lista do ateliê

Feature `76` (`MAC-01`..`MAC-13`, `MAC-28`..`MAC-38`). A pergunta da Adri: *"quem é esta pessoa que me escreveu, e como falo com ela?"*. A lista lê `customer_list` pareada com `atelie_clock` (`lerComPapel`), ordena por atividade (não por gasto), tem dois recortes além de Todas e busca por nome, e-mail ou telefone (dígitos). **Só leitura.** Tom memorial: nenhum ranking, nenhum "VIP", o material que a pessoa confiou não aparece.

```mermaid
flowchart TD
    A1[Entrada: aba Clientes] --> L0
    A2[Entrada: /clientes?recorte=em-aberto ou recorrentes colado ou F5] --> L0
    L0[Esqueleto, aba Clientes marcada] -->|customer_list e atelie_clock respondem| L[Contagem do servidor, chips, busca, linhas de 25]
    L0 -->|42501| R[Recusa da 72, nenhuma linha, nem a do cache]
    L0 -->|rede ou 500| F[Não consegui carregar as clientes. + Tentar de novo, nunca zero]
    L0 -->|base vazia| E0[Ainda não há clientes.]
    L --> C[Toca um chip] --> C2[URL ?recorte= por substituição, contagem do servidor, selo Em aberto nas mesmas linhas]
    C2 -->|ninguém no recorte| E1[Ninguém com pedido em aberto agora. + Limpar]
    L --> B[Digita na busca, 300 ms] --> B2[Filtra por nome, e-mail, telefone por dígitos; termo só em memória]
    B2 -->|nada acha| E2[Não achei ninguém com termo + Limpar]
    L --> M[Rola até o fim] --> M2[Carregar mais por cursor, sem repetir nem pular, id repetido descartado]
    M2 -->|página seguinte falha| M3[Falha no rodapé + Tentar de novo, lista intacta]
    L --> P[Puxa para atualizar ou volta ao app] --> P2[Relê; Atualizado às do lido_em da RPC]
    L --> T[Toca uma linha] --> FICHA[J-ver-uma-cliente]
    FICHA --> V[Voltar] --> V2[Mesma lista: recorte, busca e rolagem]
    L -.->|troca de conta ou sai| X[Abandono: nada da conta anterior na tela, cache limpo]
    L --> END[True end: a mesma contagem e as mesmas pessoas de /admin/clientes nos mesmos recortes, e a Adri achou a pessoa sem o computador]
```

```yaml
journey:
  id: J-achar-uma-cliente
  name: Achar uma cliente no celular
  value_statement: "A Adri acha quem lhe escreveu pelo nome, e-mail ou telefone, sem abrir o notebook, e sem que o app diga um número falso"
  personas: [Adri no celular, Equipe com TalkBack, Cliente com conta da loja]
  entry_points:
    - url: /clientes
      origin: in-app-nav
    - url: /clientes?recorte=em-aberto
      origin: external-share
  actions:
    - step: 1
      verb: abre Clientes
      expected_observable: contagem do servidor, 25 linhas, ordem por atividade mais recente, nulos por último
    - step: 2
      verb: busca por pedaço do telefone digitado com máscara
      expected_observable: acha a pessoa pelos dígitos; o termo não vai à URL
    - step: 3
      verb: troca de recorte
      expected_observable: contagem e linhas batem com o painel; selo Em aberto nas mesmas linhas
    - step: 4
      verb: rola e carrega mais
      expected_observable: nenhum id repetido, falha de página só no rodapé
    - step: 5
      verb: abre uma linha e volta
      expected_observable: mesmo recorte, busca e rolagem
  goal:
    observable: lista e contagens iguais às de /admin/clientes nos recortes equivalentes
    side_effects: [nenhuma escrita; nenhum dado da cliente em URL, history.state, armazenamento ou console]
  true_end_state: depois de recarregar, o recorte da URL vale e a busca recomeça vazia; voltar da ficha devolve ao ponto
  exit:
    natural: abre uma ficha ou sai do app
  abandonment:
    - at_step: 4
      how: perde a rede no meio da rolagem
      resume: Tentar de novo no rodapé continua sem repetir linha
  crosses: [PostgREST customer_list, RPC atelie_clock, painel /admin/clientes]
```

## Varredura da taxonomia

| Dimensão | Onde |
| --- | --- |
| Jornada | `MAD-clientes-abrir-a-lista`, `MAD-clientes-voltar-mantem-lista` |
| Funcional | `MAD-clientes-buscar-nome-email-telefone`, `MAD-clientes-recortes-e-selo`, `MAD-clientes-carregar-mais-sem-repetir`, `MAD-clientes-bate-com-o-painel` |
| Experiencial | `MAD-clientes-tom-memorial`, `MAD-clientes-com-leitor-de-tela` |
| Borda/erro/vazio | `MAD-clientes-estados-vazios`, `MAD-clientes-leitura-falha-sem-zero`, `MAD-clientes-linha-sem-nome-sem-compra` |
| Transversal | `MAD-clientes-conta-sem-papel-nao-ve`, `MAD-clientes-privacidade-nada-no-aparelho`, `MAD-clientes-fonte-grande-e-telas-estreitas`, `MAD-clientes-teclado-e-voltar-do-android`, `MAD-clientes-troca-de-conta-limpa-tela` |
