# Revisão — Design (rodada 3)

Veredito: APROVADO

Conferi os cinco achados da rodada 2 contra a `## Resposta do autor` e o `design.md` atual. Os cinco
estão resolvidos e nenhum volta:

- R1, a tradução de erro da porta, está em §4.5. O status 401/403 não decide sozinho: ele passa por
  `conferirPapel()`. Rede vira falha, e os casos obrigatórios incluem "403 com papel de pé não é
  recusa" e o mutante "403 ⇒ recusa direta". Conferi no código: `conferirPapel`
  (`apps/mobile-adm/src/shared/api/lerComPapel.ts`) lança o erro da RPC com `42501`, resolve quando
  o papel está de pé e lança sem código quando a falha é de rede. O `recusa()` de
  `features/order-actions/api/gravarAcao.ts` existe como descrito e vai para um helper em
  `shared/api/`, em vez de ser copiado. O design manda 401 para `conferirPapel` em vez de deixá-lo
  com o `AuthProvider`. A escolha é válida: a regra "só `42501` vira recusa" continua de pé.
- R2: em §4.2 a metade e-mail é o `forEvent` de hoje na mesma ordem (`invalid_from` primeiro), e a
  metade push confere o estado por conta própria.
- R3: a linha "Exceção no ramo push" de §5 bate com o `try/catch` de §4.2.
- R4: §4.3 e §4.4 usam a mesma assinatura, `claim_push_test(p_user_id uuid, p_endpoint text)
  returns boolean`, na ordem trava → confere → grava.
- R5: em §4.5, se `navigate()` rejeitar, o worker cai em `openWindow`, e o teste do `vm` cobre os
  três casos.

## Achados

### R1 — §5 ainda diz que todo 401/403 da porta vira a recusa (menor)
- Onde: `design.md` §5, linha "Porta recusa (401/403) | A recusa de acesso da `72` | A tela de
  acesso".
- Problema: §4.5 passou a dizer que 401/403 só vira recusa quando `conferirPapel` responde `42501`.
  Com o papel de pé, com falta de rede ou com 5xx, vira falha. A tabela de erros manteve a frase da
  rodada anterior, e as duas seções se contradizem. É o mesmo tipo de desalinhamento que o R3 da r2
  apontou na linha da exceção.
- Cenário: quem escrever as tasks a partir de §5 pode testar "403 ⇒ tela de acesso". Esse é
  justamente o mutante que §4.5 manda matar.
- Sugestão: trocar a linha por duas. "401/403 com `conferirPapel` em `42501` ⇒ recusa da `72`".
  "401/403 com papel de pé, ou sem rede ⇒ a frase de falha da ação (`MAN-16`, `MAN-32`)".

## Conferido sem achado
- O ramo push só existe em `dispatchTrigger`. `send-notification/dispatch.ts:379` chama `forEvent`
  sem `channel` dentro do laço do gatilho, e `dispatchEventFull` (:354–360, a porta `send`) não
  chega a ele. A ação `notify` da `send-notification` usa `dispatchTrigger` (`handlers.ts:163`),
  então `owner_material_incoming` também alcança o push.
- No app, nenhum arquivo de produção chama `functions.invoke` hoje. A notificação de `gravarAcao` sai
  de `core`, por `triggerOrderNotification`. `portaDeAvisos.ts` como único chamador, aceito no
  `escritaSoPelaPorta` por entrada literal, é coerente com o guarda. Usar `conferirPapel` importado
  de `lerComPapel.ts` não abre uma segunda chamada `rpc(` no app.
- Todo requisito MAN-01..42 tem lugar no design. As emendas `MAN-09`, `MAN-24`, `MAN-35` e `MAN-42`
  estão refletidas na `spec.md`. Nada no design vai além do escopo da spec.
- As decisões AD-004/005/008/017/032/034/056/058/059 são respeitadas, e `AD-062` não substitui
  nenhuma delas.

## Resposta do autor
