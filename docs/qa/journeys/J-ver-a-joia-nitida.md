# J-ver-a-joia-nitida: a cliente vê a joia e os banners nítidos no celular, sem a loja pesar mais

Feature `87` (`.specs/features/87-qualidade-das-imagens/`, `IMG-01`..`IMG-08`, `IMG-15`..`IMG-17`).
Superfície: `apps/store` — palco da galeria do produto (celular e computador), zoom do computador, tela
cheia, banners da Home e a listagem de categoria (que **não** pode pesar mais). Área `LOJA`. Persona:
Cliente navegando pelo menu (`../personas.md`) — no celular de densidade 3 e, às vezes, no notebook.

```yaml
journey:
  id: J-ver-a-joia-nitida
  entry: [/, /<categoria>, /produtos/:slug]
  goal: enxergar o detalhe da peça (a resina, a mecha, a gravação) e a arte da campanha sem borrão, no celular
  exit: a foto principal e os banners de largura cheia chegam numa rendição de 1080, uma vez cada; a categoria segue em 720; o zoom do computador mostra uma foto de 1600 só depois do ponteiro
  side_effects: [nenhum dado gravado; só requisições ao render/image do Storage]
```

## Fluxo

```mermaid
flowchart TD
    A[Home no celular] --> B[Banners de largura cheia: Chamada principal, grade, coleção, Banner principal]
    B -->|toca num banner| C[Categoria]
    A -->|menu| C
    C --> C1[Cards em 720 — nenhum 1080]
    C --> D[Produto]
    D --> E{Dispositivo}
    E -->|celular| F[Palco: rendição de 1080, uma vez; preload casado]
    E -->|computador| G[Palco do computador: o mesmo par srcset/sizes]
    F --> F1[Arrasta para a foto 2: 1080 da foto 2]
    F --> H[Toca: tela cheia com o ORIGINAL]
    G --> G1[Ponteiro no palco: camada de zoom com 1600]
    G1 --> G2[Sai e volta: mesma URL, sem novo download]
    G --> G3[Clica: tela cheia]
    F1 --> K[FIM VERDADEIRO: a foto que a cliente vê é a de 1080 e foi baixada uma vez]
    G1 --> K
    D -.->|rede lenta: sai antes de a foto carregar| X1[Abandono: a página pesou ~1,8x na foto principal]
    C -.->|volta antes de abrir um produto| X2[Abandono: nada foi baixado além dos cards de 720]
```

## Dimensões (taxonomia)

| Dimensão | Coberto por |
| --- | --- |
| Caminho feliz | abrir produto no celular @3x; banners da Home; zoom no computador |
| Erro e borda | foto de fora do Storage (sem `srcset`, zoom com a URL inalterada); origem de 1024 pedida a 1080; produto sem foto |
| Dado | foto da Nuvemshop (1024) × foto enviada pelo painel (até 2400); arte de celular separada no Banner principal |
| Ambiente | DPR 1/2/3, 360/390/1440, 4G lento (o peso extra do LCP) |
| Acesso | sem mudança de nó; leitor de tela segue lendo o `alt` de antes — conferir que nada mudou |

**Limite do ambiente**: as artes de `home_sections` do banco local apontam para o Storage hospedado,
bloqueado por regra. Os banners são exercitados interceptando a leitura de `home_sections`/`home_section_items`
e trocando a URL por uma imagem do Storage local.
