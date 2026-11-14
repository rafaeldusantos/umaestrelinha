# CH-07 · design-check — o card do perfil, o modal da prévia e a Home de Black Friday

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | design-check                                                                  |
| Prioridade   | P2                                                                            |
| Persona      | PER-01 Adri                                                                   |
| Tour         | —                                                                             |
| Modo         | —                                                                             |
| Time-box     | 60 min · orçamento 50 ações                                                   |
| Mudança      | o card "Perfil de estilo da loja" e o modal da prévia (UC-01, UC-03); a Home no perfil Black Friday (RN-01, RN-06) |
| Viewport     | os frames do protótipo: painel em computador; a Home em computador e celular 390 |
| Massa        | **só lê** — perfil salvo = Black Friday (S1). Nunca salvar                    |
| Driver       | `—`                                                                           |
| Entrada      | `http://localhost:8083/admin/configuracoes/dados-da-loja` · logada como `admin-loja`; a Home em `http://localhost:8082/` numa aba nova |
| Jornadas     | J-01, J-03                                                                    |
| TC           | TC-UI-001, TC-UI-002                                                          |

## Missão

Conferir, tela a tela, o card, o modal e a Home de Black Friday contra o protótipo do Work Item, registrando cada
diferença com o valor do design e o observado.

## Fora do escopo

- **Divergências já decididas na costura** (spec › Design, "Divergências entre fontes") — não são diferença:
  1. o selo desenhado na Home é o da campanha (WI 102); o "-X%" comum segue o PRD
  2. a barra do frete grátis é `accent-strong` (`#9A7A45`), como no design
  3. sombras: o design só redefine a sombra suave; na loja todas leem a cor do perfil
  4. banners escuros do protótipo são placeholder — artifício
  5. ouro como texto sobre `primary` (link "Black Friday", cartão "20%") é dos WIs 101/102
  6. o texto do aviso tem a frase a mais de H7 ("Quem já está com a loja aberta vê ao trocar de página.")
  7. a faixa de avisos, "Joias em oferta" e o link "Black Friday" no menu são dos WIs 101/102
- **Decisões da execução**: o botão é "Salvar alterações" (`SettingsSaveButton`), não "Salvar"; o modal tem
  alternância Computador/Celular, Esc e foco (H10), que o design não desenha; a mensagem de sucesso é a de H8
- Estados que o design não desenha (carregando, salvando, erro, valor desconhecido): sem régua — CH-05
- Dados fictícios do protótipo (nomes de produto, preços, imagens)

## Design

**Fontes de design:**

- "Uma Estrelinha - Black Friday" · `claude_design` · projeto `4abe021d-d77e-4fe7-affd-524180315fa3`, arquivo
  `Black Friday - Home.html` (o perfil em `bf.css`, `.palco[data-tema="bf"]`; o painel do protótipo alterna
  Padrão/Black Friday e Computador/Celular 390) · de `item.md` › Insumos
- o mesmo projeto, arquivo `Painel - Campanhas, faixa e perfil.html`, tela **"Configurações · perfil de estilo"**
  (`adm-faixa-perfil.jsx`; escolher a tela no painel do protótipo) · de `item.md` › Insumos
- cópia publicada · `link` · https://claude.ai/artifact/2yUJyqwYr6tipVWQEh8xdd (páginas `home.html` e `painel.html`) —
  use só se o MCP do Claude Design não estiver na sessão · de `item.md` › Insumos

| Tela do app (rota)                                           | No design (frame, nó ou arquivo)                                   | Viewports com frame | Estados a conferir                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------- | ---------------------------------------------------- |
| `/admin/configuracoes/dados-da-loja` — card "Perfil de estilo da loja" | `Painel - Campanhas, faixa e perfil.html` › Configurações · perfil de estilo | computador (e o empilhamento abaixo de 1024, se o frame tiver) | Black Friday em uso; Padrão marcado e não salvo (Salvar habilitado); amostras (`primary-strong`, `primary`, `accent`, `ground-deep`) de cada perfil; aviso com relógio |
| modal "A loja com o perfil {nome}" (por "Ver a loja com este perfil") | mesma tela, sobreposição da prévia                          | computador          | título, subtítulo, largura até 960 px, rodapé "Fechar" |
| `/` — Home no perfil Black Friday                            | `Black Friday - Home.html` com o tema Black Friday                 | computador · celular 390 | os tokens por elemento (cabeçalho, faixa de departamentos, ícones, "Ver todos", preço, aba ativa, faixa de declaração, coração, subtítulos, rodapé, parcelas, círculo da busca, botões ouro, bordas, faixas claras, bordas de campo, sombra suave); a marca no tom escuro |
