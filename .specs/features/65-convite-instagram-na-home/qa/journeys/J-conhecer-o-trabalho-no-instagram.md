# J-conhecer-o-trabalho-no-instagram — Conhecer o trabalho da Adri no Instagram

```mermaid
flowchart TD
    A[Entrada: link compartilhado abre a Home] --> B[Home carregando: esqueleto]
    B --> C[Home resolvida]
    C --> D{Aviso de cookies pendente?}
    D -->|sim| D1[Aviso de cookies no rodapé, sem convite]
    D1 -->|responde ou fecha| E
    D1 -.->|abre Preferências| D2[Folha de preferências; o convite espera]
    D2 --> E
    D -->|não| E[~3 s depois, o convite abre]
    E --> F[Efeito: estrelinha-instagram-invite gravada no localStorage]
    F --> G{O que ela faz}
    G -->|Ver o perfil no Instagram| H[Nova aba: instagram.com/umaestrelinha.adri; o convite fecha]
    G -->|X / Agora não / Esc / véu| I[O convite fecha; a Home fica onde estava]
    H --> J[Fim real: o perfil abre na aba nova, a aba da loja segue na Home sem o convite, e na próxima visita ele NÃO volta]
    I --> J
    C -.->|sai antes de 3 s| X1[Abandono: sem marca gravada; o convite aparece na próxima visita]
    E -.->|recarrega / volta / fecha a aba com o convite aberto| X2[Abandono: a marca já foi gravada ao abrir; ele não volta]
    A -.->|entra por outra rota: /produtos/:slug, /colecoes| N1[Sem convite fora da Home]
    A -.->|prévia do painel: iframe + ?preview=1| N2[Sem convite na prévia]
```

```yaml
journey:
  id: J-conhecer-o-trabalho-no-instagram
  name: Conhecer o trabalho da Adri no Instagram
  value_statement: "Quem chega à loja descobre onde acompanhar a joia sendo feita, sem ser pressionada e sem ser incomodada de novo"
  personas: [Luciana, Carla, Teresa]
  entry_points:
    - url: http://localhost:8082/
      origin: external-share
    - url: http://localhost:8082/produtos/<slug>
      origin: search
  actions:
    - step: 1
      verb: abre a Home pela primeira vez
      expected_observable: a Home carrega; se o aviso de cookies aparece, o convite ainda não
    - step: 2
      verb: responde ao aviso de cookies
      expected_observable: o aviso some, e uns 3 s depois de a Home resolver o convite sobe do rodapé (celular) ou aparece no centro (computador), sobre um véu escuro
    - step: 3
      verb: lê o convite
      expected_observable: "NO INSTAGRAM", "Acompanhe de perto o meu trabalho", o texto da Adri, "@umaestrelinha.adri" e as duas ações; nenhuma foto e nenhuma exclamação
    - step: 4
      verb: toca em "Ver o perfil no Instagram" (ou fecha)
      expected_observable: abre uma aba nova no perfil e o convite fecha (ou ele simplesmente fecha)
    - step: 5
      verb: volta à loja outro dia
      expected_observable: a Home abre sem o convite
  goal:
    observable: o perfil https://www.instagram.com/umaestrelinha.adri aberto numa aba nova, ou o convite dispensado
    side_effects: [localStorage estrelinha-instagram-invite gravada ao abrir]
  true_end_state: o perfil abre na aba nova; a aba da loja segue na Home, no mesmo ponto, sem o convite; e ao recarregar ou voltar outro dia, ele não aparece de novo
  exit:
    natural: o perfil do Instagram numa aba nova, com a loja ainda aberta na outra
  abandonment:
    - at_step: 1
      how: sai da Home antes de o convite abrir (menos de 3 s, ou com o aviso de cookies ainda sem resposta)
      resume: na próxima visita à Home o convite aparece, porque ainda não foi visto
    - at_step: 3
      how: recarrega, aperta voltar ou fecha a aba com o convite aberto, sem fechar nada
      resume: o convite não volta (a marca foi gravada ao abrir)
  crosses: [aviso de cookies (feature 61), bolha do WhatsApp, MobileNav, link do rodapé, Instagram (externo)]
```
