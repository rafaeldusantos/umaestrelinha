# Reteste — 101-faixa-de-avisos (rodada 2, confirmação)

| Campo      | Valor                                                                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rodada     | 2026-11-13 · início 15:18 · fim 15:25                                                                                                                                                         |
| Ambiente   | painel http://localhost:8083/admin/faixa-de-avisos · loja http://localhost:8082 (dev server) e http://localhost:4173 (vite preview) · HEAD f649a843 (build não exposto na tela) · Chromium headless: agent-browser 0.39.1 (BUG-001) e playwright-cli 0.1.24 (BUG-002) |
| Bugs lidos | 2 de `issues/` com status `open`                                                                                                                                                              |

Contagem: resolved 2 · still-open 0 · cannot-reproduce 0 · blocked 0

Rotas abortadas a sessão inteira: `*.supabase.co` e `**/g/collect*`. As requisições a esses hosts aparecem no
console como `net::ERR_FAILED`, que é o bloqueio funcionando. Nenhuma escapou.

## BUG-001 · [Aviso de imagem] Falta do texto alternativo só aparece depois das duas artes — a dona

| Campo      | Valor                                              |
| ---------- | -------------------------------------------------- |
| Resultado  | resolved                                           |
| Persona    | PER-01 Adri · conta: `admin-loja` (variáveis `QA_ADMIN_LOJA_*`) |
| Passos de  | `issues/BUG-001.md`                                |
| Tentativas | 2 · 2                                              |
| Viewport   | 1440 × 900                                         |

**Passos seguidos**, a partir de um estado limpo (sessão nova, login, tela recarregada entre as tentativas):

1. Entrar no painel como `admin-loja` e abrir LOJA › Faixa de avisos (faixa ligada, A1..A4)
2. "+ Adicionar aviso", depois "Tipo do aviso" = Imagem (vira o 5º aviso)
3. Enviar `arte-1440x48.png` em "Enviar arte · 1440 × 48", sem a arte do celular e com o texto alternativo vazio
4. Ler as recusas
5. Enviar `arte-780x96.png` em "Enviar arte · 780 × 96", com o alternativo ainda vazio, e depois só com espaços

**Esperado:** no passo 4, as duas recusas juntas (arte do celular e "Descreva a arte: é o que o leitor de tela e
o Google leem."), a barra com "Corrija o que está marcado para salvar." e o Salvar desabilitado.

**Observado:** nas duas tentativas, depois do envio da arte do computador (a miniatura carregou, naturalWidth 1440),
aparecem juntos os alertas "5º aviso: envie a arte do celular." e "5º aviso: Descreva a arte: é o que o leitor
de tela e o Google leem.". A barra mostra "Corrija o que está marcado para salvar." e o Salvar fica desabilitado.
Antes do envio, o aviso vazio já mostrava as três recusas juntas (computador, celular e alternativo). No passo 5,
sai só a recusa do celular e fica a do alternativo. Com o alternativo só com espaços, a recusa continua. Com
"Black Friday reteste", nenhuma recusa fica e o Salvar habilita. Nada foi salvo: a tela foi recarregada, e a
lista voltou a A1..A4 com o Salvar desabilitado.

**Entorno:**

| Onde                      | Resultado | Nota                                                                                                                                                       |
| ------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Passo anterior da jornada | ok        | Ao trocar para Imagem, o aviso vazio lista as 3 recusas juntas. O envio mostra "Enviando…" e depois a miniatura                                              |
| Passo seguinte da jornada | ok        | A arte do celular tira só a recusa dela. O alternativo preenchido tira a última, e o Salvar habilita                                                         |
| Mesma ação com outro dado | ok        | Na ordem inversa (só a arte do computador e depois o alternativo preenchido), sai só a recusa do alternativo. `arte-errada.txt` no celular: "formato não aceito — use PNG, JPG ou WebP", e a recusa do celular continua |
| Aviso de texto            | ok (sem mudança) | Continua com um motivo por vez, como o T06 decidiu de propósito. Vai como observação em N-1                                                          |

**Evidência:**

- `screenshots/retest-BUG-001.png`: 1ª tentativa, arte do computador enviada, alternativo vazio, as duas recusas
  na tela
- `screenshots/retest-BUG-001-tentativa-2.png`: 2ª tentativa, a partir de um estado limpo, mesmo resultado
- `screenshots/retest-BUG-001-duas-artes.png`: as duas artes enviadas, só a recusa do alternativo
- console: `nada` (sem erro na tela do painel) · rede: o envio da arte vai ao Storage local
  (`127.0.0.1:54441/storage/v1/object/public/home-images/…`)

**Por quê:** n/a

## BUG-002 · [Faixa da loja] Ligada, não aparece ao navegar a partir de página servida sem ela — a cliente

| Campo      | Valor                                                  |
| ---------- | ------------------------------------------------------ |
| Resultado  | resolved                                               |
| Persona    | PER-02 Bia (cliente) · conta: `anonima` (sem login)    |
| Passos de  | `issues/BUG-002.md`                                    |
| Tentativas | 2 · 5 (2 no :4173, 3 no :8082)                         |
| Viewport   | 390 × 844, e uma tentativa em 1440 × 900               |

A faixa já estava ligada (A1..A4) e não foi tocada. O passo 1 do bug não precisou ser refeito.

**Passos seguidos:** a partir de um estado limpo (contexto novo do playwright-cli, sem perfil). Driver
`playwright-cli`, porque o `network route --body` do agent-browser responde com um corpo JSON fixo. O documento
foi servido por `context.route` na URL exata e `route.fulfill({ path })`, só para `resourceType() === 'document'`.
Scripts e CSS seguiram para o servidor. A permissão `local-network-access` foi dada à origem antes do `goto`.

1. Documento marcado: o :4173 recapturado por `curl -s http://localhost:4173/` e gravado como
   `scratchpad/wi/101/doc/preview-home-0.html`. O :8082 recapturado como `dev-home-0.html`, idêntico ao `home-0.html`
   da rodada 1 a menos do atributo. Os dois com `data-faixa="0"` no `<html>`
2. Abrir a Home. `document.documentElement.dataset.faixa === "0"`, sem `#avisos-da-loja`, `<header>` em y = 0. Está
   correto
3. Clicar num link interno (troca de rota, sem recarga: o `<html>` continua com o `data-faixa="0"` do documento
   roteado)
4. Olhar o topo e seguir para mais uma página

**Esperado:** a partir da primeira troca de rota, a faixa aparece acima do cabeçalho com os avisos ligados, e
continua nas páginas seguintes.

**Observado:**

| # | Servidor   | Viewport   | Entrada (marcada `0`) | Troca de rota                                   | `<html>` depois   | `#avisos-da-loja`               | `<header>` y |
| - | ---------- | ---------- | --------------------- | ----------------------------------------------- | ----------------- | ------------------------------- | ------------ |
| 1 | :4173      | 390 × 844  | `/`                   | menu › "Colar e correntes" (categoria)          | `data-faixa="0"`  | existe, A1 "Black Friday…"      | 52           |
|   |            |            |                       | › produto "Corrente Masculina em Prata 925"     | `data-faixa="0"`  | existe, girando (A3 no momento) | 52           |
|   |            |            |                       | › "Início" de volta a `/`                       | `data-faixa="0"`  | existe                          | 52           |
| 2 | :4173      | 390 × 844  | `/`                   | rodapé "Novidades" › `/busca?sort=novidades`    | `data-faixa="0"`  | existe                          | 52           |
| 3 | :8082      | 390 × 844  | `/`                   | rodapé "Novidades" › `/busca?sort=novidades`, que é o caminho do bug | `data-faixa="0"` | existe, A1 | 52 |
|   |            |            |                       | › "Início" de volta a `/`                       | `data-faixa="0"`  | existe                          | 52           |
| 4 | :8082      | 390 × 844  | `/`                   | rodapé "Coleções" › `/busca`                    | `data-faixa="0"`  | existe                          | 52           |
| 5 | :8082      | 1440 × 900 | `/joias-afetivas` (`c1-0.html`) | › produto "Pingente Afetivo Barquinho com Cabelo" | `data-faixa="0"` | existe, A1 | 48 |

Na carga, nos cinco casos, não houve faixa e o `<header>` ficou em y = 0. Isso está certo. A partir da primeira
troca de rota, a faixa apareceu em todos, e continuou nas páginas seguintes. O atributo no `<html>` não muda
(continua `"0"`), mas ele já não decide. O defeito da rodada 1 não se reproduziu em nenhum dos dois servidores,
nem pelo mesmo caminho do bug. Isso fica de acordo com a hipótese do implementador: o método de interceptação da
rodada 1 falhou, e o produto não.

**Entorno:**

| Onde                      | Resultado | Nota                                                                                                         |
| ------------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| Passo anterior da jornada | ok        | Carga marcada `0`: sem faixa, sem vaga, header em y = 0, nos dois servidores                                   |
| Passo seguinte da jornada | ok        | A faixa continua na 2ª e na 3ª página (produto e volta à Home), girando entre os avisos                        |
| Mesma ação com outro dado | ok        | Entrada por categoria (`c1-0`) em 1440 × 900: a faixa aparece no produto (header y = 48). Controle `home-1` no :8082: a faixa aparece na carga (y = 52) e continua em `/busca` |

O caso simétrico (faixa desligada com a página marcada `"1"`) não foi testado: é do CH-05.

**Evidência:**

- `screenshots/retest-BUG-002.png`: :4173, depois da troca de rota Home (`0`) › categoria, com a faixa na tela
- `screenshots/retest-BUG-002-preview-home-0.png`: :4173, a Home marcada `0` na carga, sem faixa (a partida)
- `screenshots/retest-BUG-002-preview-produto.png`: :4173, a faixa continua no produto
- `screenshots/retest-BUG-002-preview-busca.png`: :4173, 2ª tentativa, `/busca?sort=novidades` com a faixa
- `screenshots/retest-BUG-002-dev-home-0.png`: :8082, a Home marcada `0` na carga, sem faixa
- `screenshots/retest-BUG-002-dev-busca.png`: :8082, o caminho exato do bug, `/busca?sort=novidades` com a faixa
- `screenshots/retest-BUG-002-dev-c1-produto-1440.png`: :8082 em 1440 × 900, categoria `0` › produto, com a faixa
- console: só `net::ERR_FAILED` dos hosts abortados (`*.supabase.co` imagens das seções, `g/collect`), nenhum
  outro erro · rede: `nada` além disso

**Por quê:** n/a

## Achados novos no entorno

### N-1 · [Aviso de texto] As recusas aparecem uma de cada vez, como no BUG-001 — a dona

| Campo              | Valor                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Perto de           | BUG-001                                                                                                       |
| Persona            | PER-01 Adri                                                                                                   |
| Jornada e passo    | J-01, passo de montar o aviso de texto                                                                        |
| Gravidade proposta | low. É a mesma fricção do BUG-001, numa combinação menos provável (rótulo preenchido com o aviso vazio). É comportamento antigo e foi mantido de propósito no T06 ("o aviso de texto continua com um motivo só", implement-log, T06). Não foi o fix que quebrou. Fica para o triager decidir se vira bug ou se é aceito como decisão |
| Reproduziu         | sim (2 de 2)                                                                                                  |

**Passos para reproduzir**, a partir de um estado limpo:

1. Painel › Faixa de avisos › "+ Adicionar aviso" (tipo Texto)
2. Preencher só "Rótulo do link" = "Ver ofertas" (trecho, texto e destino vazios)
3. Ler as recusas, depois preencher "Trecho em destaque" = "Reteste"

**Esperado:** no passo 2, as duas recusas juntas: "escreva o trecho em destaque ou o texto…" e "Sem destino, o
rótulo do link não aparece.". **Fonte:** a mesma regra que o BUG-001 firmou ("corrigir tudo de uma vez"), mais
a spec H-19 e as recusas do aviso de texto na spec.

**Observado:** no passo 2 aparece só "5º aviso: escreva o trecho em destaque ou o texto. Um aviso vazio não
aparece na loja.". Depois de preencher o trecho, essa recusa sai e só então aparece "5º aviso: Sem destino, o
rótulo do link não aparece.". O Salvar fica desabilitado o tempo todo, e nada errado é gravado. O rascunho foi
descartado com uma recarga.

**Evidência:** `screenshots/retest-BUG-001-texto-um-motivo.png`: o rótulo preenchido, sem destino, e uma recusa só
na tela.

Nota de ambiente, que não é achado: cada tentativa do BUG-001 enviou as artes ao Storage local (bucket
`home-images`), e os objetos ficaram órfãos porque nada foi salvo. Não foram apagados: o briefing proíbe mexer em
dado pela API.
