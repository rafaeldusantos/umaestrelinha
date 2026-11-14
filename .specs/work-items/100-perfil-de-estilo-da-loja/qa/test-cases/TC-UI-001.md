## TC-UI-001: O card do perfil e o modal da prévia seguem o protótipo do painel

**Tipo:** ui
**Prioridade:** P2
**Origem:** UC-01, UC-03 (protótipo do painel)
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passos 1 a 4
**Charter:** CH-07
**Situação:** ativo
**Automação:** target `manual` · status `na`
**Spec:** —
**Nota:** conferência contra o Claude Design

### Objetivo

O card é o que a dona vê e toca; se ele diverge do aprovado, a escolha fica menos clara.

### Pré-condições

- Conta: `admin-loja`
- Massa: S1 (Black Friday em uso)
- Estado de partida: `/admin/configuracoes/dados-da-loja`

### Condições reais

Os viewports dos frames do protótipo.

### Protótipo e tela

`Painel - Campanhas, faixa e perfil.html` › "Configurações · perfil de estilo" (`adm-faixa-perfil.jsx`), projeto
`4abe021d-d77e-4fe7-affd-524180315fa3` × o card e o modal.

### Propriedades a comparar

Estrutura (miniatura, rádio, nome em negrito, selo "Em uso", descrição, quatro amostras na ordem primary-strong,
primary, accent, ground-deep), textos literais, cores das amostras e do selo "Em uso" (estilo do selo verde de "pago"),
o aviso com relógio, as duas ações, o modal (título, subtítulo, largura até 960 px, "Fechar").

### Passos

1. Compara o card nos frames do protótipo
   - **Esperado:** igual depois de normalizar, fora as divergências decididas (CH-07 › Fora do escopo)
2. Abre a prévia e compara o modal
   - **Esperado:** igual, fora as decisões de H10

### Esperado e fonte

O card e o modal como no protótipo — fonte: protótipo do painel; spec › Design.

### Variações

| Variação            | Ação                       | Esperado                          |
| ------------------- | -------------------------- | --------------------------------- |
| abaixo de 1024 px   | redimensiona               | opções empilhadas (spec › Design) |
