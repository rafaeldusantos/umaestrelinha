# J-montar-o-menu-da-loja: a dona monta o menu da loja item por item

Feature `86` (`MNM-01`..`MNM-41`, `AD-068`). Superfície: `/admin/menu` (`MenuTree`, `MenuTargetPicker`,
`MenuItemEditor`, `MenuBannerEditor`, `MenuRemoveConfirm`, `MenuLivePreview`), gravando
`store_settings.menu` `{ version: 2, items }`. Área `PNL`. Persona principal: Adri montando o menu.

```yaml
journey:
  id: J-montar-o-menu-da-loja
  entry: [/admin/menu (sidebar Loja → Menu da loja), /admin/menu aberto em duas abas]
  goal: o menu gravado tem os itens, a ordem, os nomes, os ícones, os submenus e as chaves por dispositivo que ela escolheu
  exit: recarregar /admin/menu mostra o mesmo documento, e a loja (8082) desenha o mesmo que a prévia
  side_effects: [update store_settings where key='menu' and updated_at=visto, upload de arte em home-images/menu (banners), nenhuma escrita em categories]
```

```mermaid
flowchart TD
    A[Abre /admin/menu] --> L{Leitura}
    L -->|falha| E1[Faixa de erro + Tentar de novo — nunca o vazio]
    E1 -->|Tentar de novo| L
    L -->|ok, sem v2 no banco| B[Lista = o menu de hoje, convertido do legado — nada gravado]
    L -->|ok, v2 vazio| V[Vazio: Adicionar item ao menu]
    L -->|ok, v2| C[Lista só com os itens do menu, na ordem da loja]
    B --> C
    V --> P
    C --> P[Adicionar item ao menu]
    P --> P1{Seletor}
    P1 -->|Categoria| P2[Busca sem acento; Já está no menu desabilitado]
    P1 -->|Página da loja| P3[Lista de páginas ou Outro endereço da loja]
    P3 -->|endereço externo, vazio ou que não é rota| R1[Recusa com motivo, nada gravado]
    P2 --> S[Salvando… → Salvo; item no fim; filhas ativas no submenu]
    P3 --> S
    C --> ED[Editar nome, ícone e banners]
    ED -->|nome próprio vazio ou > 40| R2[Recusa com motivo]
    ED --> S
    C --> MV[Reordenar: arraste ou ⋯ Mover para cima/baixo]
    MV --> S
    C --> SM[Submenu: adicionar, tirar, reordenar]
    SM -->|24 itens| R3[Adicionar desabilitado com motivo]
    SM -->|categoria já neste submenu| R4[Já está neste submenu]
    SM --> S
    C --> CH[Chaves Computador / Celular]
    CH --> S
    C --> RM[⋯ Remover do menu]
    RM --> RC{Confirmação nomeia item e quantos filhos saem}
    RC -->|Cancelar| C
    RC -->|Remover| S
    S -->|rede falha| E2[Volta ao estado anterior + não salvou — nunca Salvo]
    S -->|outra janela gravou antes| E3[O menu mudou em outra janela — recarregue; documento local volta]
    S --> PV[Prévia Computador/Celular acompanha sem recarregar o iframe]
    PV --> FIM[FIM VERDADEIRO: recarregar mostra o mesmo; loja 390 e 1440 igual à prévia; categories.sort_order intocada]
    C -.->|sai sem mexer| X1[Abandono: nada gravado; loja segue com o menu de hoje]
    P1 -.->|fecha o seletor| X2[Abandono: nada muda]
    E2 -.->|desiste| X3[Abandono: o menu gravado continua o anterior]
```

Ramos de ciclo de vida: categoria referenciada **desativada** ⇒ selo "Categoria inativa — não aparece na
loja"; **apagada** ⇒ "Categoria apagada" com a única ação "Remover do menu"; link externo gravado antes da
`86` ⇒ editável (nome, ordem, remover), mas não se cria outro.

Dimensões (taxonomia): caminho feliz (montar do zero, primeiro acesso legado, editar); erro (leitura que
falha, gravação que falha, endereço inválido, nome vazio); concorrência (duas abas, toque duplo em
Adicionar/Remover, ações seguidas na fila); acesso (teclado, foco nos diálogos e na folha de baixo, nomes
acessíveis das chaves e do "⋯", fonte 130/200 %, `prefers-reduced-motion`); dado (categoria inativa/apagada,
repetida, submenu de 24, nome de 40, link externo legado, banners vindos de `categories.menu_banners`).
