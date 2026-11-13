## TC-FUNC-010: Página aberta antes da troca não empurra o conteúdo: a vaga fica, ou falta, até a próxima página

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-08, RN-02
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-05, ramo J-05a
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o documento HTML é interceptado no navegador e `data-faixa` é escrito no `<html>`, como a função `api/page` faz (provado na integração da T02) — método de Q-02, respondida. Driver `agent-browser`, com `network route` da URL exata respondendo com o documento marcado (Ambiente da execução). O prazo real de 5 min / 1 h é do cache da Vercel e fica fora

### Objetivo

Entre a Adri ligar ou desligar e o cache da loja renovar, há páginas servidas com a resposta antiga. Nenhuma delas pode mostrar a faixa empurrando a página da cliente.

### Pré-condições

- Conta: `admin-loja` no painel; a loja é lida sem login
- Massa: a faixa do manifesto
- Estado de partida: a loja aberta pelo driver com o documento interceptado e marcado; a sonda da rota de documento passou (a página abre como página e `document.documentElement.dataset.faixa` lê o valor)

### Condições reais

| Dimensão | Valor |
| --- | --- |
| Dispositivo | celular (390 × 844) |
| Rede | local, sem limite (o `agent-browser` não limita rede); o "nada se move" é lido pelas entradas de `layout-shift` (`vitals` ou `PerformanceObserver` com `buffered: true`), não a olho. O CLS em rede lenta é TC-CFR-001 |

### Passos

1. Com a faixa **desligada** no painel, abre a Home com o documento marcado `data-faixa="1"` (a página da hora anterior, quando estava ligada)
   - **Esperado:** desde a primeira pintura há uma vaga ouro acima do cabeçalho, sem texto; nada abaixo dela se move enquanto a página carrega
2. Toca num link interno (uma categoria)
   - **Esperado:** na página nova a faixa não existe e o cabeçalho está no topo (a troca de página já move o conteúdo — não é salto)
3. Com a faixa **ligada** no painel, abre a Home com o documento marcado `data-faixa="0"`
   - **Esperado:** nenhuma faixa nesta página, nem depois de a configuração chegar; nada se move
4. Toca num link interno
   - **Esperado:** na página nova a faixa aparece, acima do cabeçalho
5. Abre a Home com o documento marcado `data-faixa="1"` e a faixa ligada
   - **Esperado:** a vaga já está lá na primeira pintura e o A1 aparece dentro dela sem a página mudar de altura

### Esperado e fonte

Na carga, o atributo decide; depois da primeira troca de rota, decide a configuração; nunca um salto — fonte: PRD RN-02, CA-08; spec H-02, H-03, I-09

### Variações

| Variação | Ação | Esperado |
| --- | --- | --- |
| voltar à primeira página | depois do passo 2, usa o voltar do navegador | a decisão continua com a configuração (sem faixa), não volta ao atributo |
| sem atributo | documento sem `data-faixa` (como no dev; sem a rota) | decide a configuração; registrar se a faixa entra empurrando a página — é o estado "não sei" e não conta como falha de CA-06 |
| checkout com `data-faixa="1"` | abre `/checkout` com o documento marcado | nenhuma faixa e nenhuma vaga (H-02) |
