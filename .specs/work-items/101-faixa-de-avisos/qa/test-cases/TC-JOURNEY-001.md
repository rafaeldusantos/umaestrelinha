## TC-JOURNEY-001: Vinda do anúncio no celular, a cliente vê a Black Friday na página do produto e chega às ofertas pela faixa

**Tipo:** journey
**Prioridade:** P0
**Origem:** CA-01, UC-01
**Autor:** dev
**Persona:** PER-02 Bia
**Jornada:** J-02, todos os passos
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o caminho feliz da jornada principal; deep link determinístico

### Objetivo

É a razão do Work Item: quem cai direto num produto, sem passar pela Home, descobre que há campanha e chega a ela em um toque.

### Pré-condições

- Conta: `anonima`
- Massa: a faixa do manifesto, ligada (só leitura)
- Estado de partida: navegador sem histórico da loja

### Condições reais

as da persona (celular 390 × 844, toque, rede lenta)

### Entrada

| Origem | URL / caminho | Estado de partida |
| --- | --- | --- |
| deep link (anúncio) | `/produtos/<slug de um produto de C2>` | sem sessão, sacola vazia |

### Passos com tempo

| # | A persona… | Deve ver | Em até |
| -- | --- | --- | --- |
| 1 | abre o link do anúncio | o produto, com a faixa ouro acima do cabeçalho e o A1 legível em até duas linhas | 4 s |
| 2 | lê o aviso | o aviso inteiro antes da troca (6 s) | 6 s |
| 3 | toca na faixa | abre C1 (destino do A1), com a faixa ainda lá em cima | 3 s |
| 4 | rola a categoria | a faixa sai da tela com o conteúdo; o cabeçalho segue utilizável | — |

### Objetivo e efeitos

- **Observável:** a Bia está em C1, a página da campanha, tendo partido de um produto
- **Efeitos colaterais:** nenhum

### Caminho de abandono

| Ramo | Quando | Deve acontecer |
| --- | --- | --- |
| J-02a | a página demora (rede lenta) e ela já começa a rolar | a faixa não empurra o que ela está lendo (ver TC-CFR-001) |
| J-02b | ela ignora a faixa e vai ao checkout | lá a faixa não aparece (TC-FUNC-011) |

### Esperado e fonte

Fonte: PRD O problema, UC-01, CA-01, D-01
