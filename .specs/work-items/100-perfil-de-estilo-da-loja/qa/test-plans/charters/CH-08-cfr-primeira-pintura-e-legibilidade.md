# CH-08 · CFR — a primeira pintura e a legibilidade da loja de Black Friday

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | cfr                                                                           |
| Prioridade   | P1                                                                            |
| Persona      | PER-05 Marta                                                                  |
| Tour         | —                                                                             |
| Modo         | —                                                                             |
| Time-box     | 45 min · orçamento 35 ações                                                   |
| Mudança      | o primeiro HTML já com o perfil, nenhuma pintura com a paleta Padrão antes, em rede lenta (CA-02, RN-04); os pisos de legibilidade no perfil novo (RN-03, CA-04) |
| Viewport     | 390 × 844 e 1440 × 900; fonte do sistema a 130 % e 200 %                      |
| Massa        | **só lê** — perfil salvo = Black Friday (S1)                                  |
| Driver       | `cli` (`playwright-cli`) — precisa de `page.route` com `route.fetch()` + `route.fulfill` para escrever `data-perfil` no documento como a função `api/page` faz, e de Slow 4G + CPU 4× por CDP antes do `goto`; o `agent-browser` não limita rede nem CPU |
| Entrada      | o build servido (`vite preview`, porta do Ambiente) `/` · sem login           |
| Jornadas     | J-03, J-03a                                                                   |
| TC           | TC-CFR-001, TC-CFR-002                                                        |

## Missão

Como quem usa a loja com rede lenta e fonte grande, conferir que a Black Friday chega pintada desde o primeiro quadro e
que nenhum texto do perfil novo fica abaixo do piso de legibilidade.

## Deve tentar

1. Slow 4G + CPU 4×, documento da Home com `data-perfil="black-friday"`: registrar, quadro a quadro (screenshots em
   sequência ou `requestAnimationFrame` gravando a cor do cabeçalho desde o `DOMContentLoaded`), a cor computada do
   cabeçalho e do fundo do botão primário — nunca `#283A4A`/`#34495E` antes de `#0D0C0B`/`#1C1A18`; FCP e CLS
   (`PerformanceObserver`, `buffered: true`)
2. A mesma medida num produto e com o documento em `padrao` + perfil salvo Black Friday (J-03a): a carga fica em
   ardósia, sem trocar sozinha; ao trocar de página passa ao preto sem salto de layout
3. Contraste nas telas de J-03 (Home, produto, sacola, checkout) no Black Friday, em 390 e 1440: texto corrido,
   subtítulos (`ink-soft`), parcelas, rodapé, texto sobre o botão ouro, texto do selo "-X%", texto sobre o cabeçalho
4. Fonte do sistema a 130 % e 200 % (`document.documentElement.style.fontSize`, refeito a cada carga): nada sobrepõe,
   nada corta, sem rolagem horizontal do body; foco visível com Tab sobre o cabeçalho e os botões ouro

## Edge cases sugeridos

- Movimento reduzido (`reducedMotion: reduce`) na troca de página
- Tema escuro do sistema (`colorScheme: dark`) — a loja não tem tema escuro; só não pode quebrar o perfil
- O mesmo produto em 1440 com o documento em `black-friday` e sem atributo (comparar a primeira pintura)

## Fora do escopo

- O cache de borda real (`HIT`, 5 min / 1 hora) e a Vercel servindo `/` pela função — só na produção
- O painel (card e prévia: acessibilidade no CH-02)
- Contraste de elementos que o perfil não muda (selos de situação do pedido, verde do WhatsApp) — pré-existente
- Leitor de tela real (VoiceOver, TalkBack) — fora do browser da sessão
- Lighthouse e auditoria WCAG completa

## CFR

**Jornadas:** J-03, J-03a — a maior superfície da mudança é a loja da cliente pintada no perfil novo, e o risco de
"cor mudando diante da cliente" mora na carga.

| Categoria             | Na rodada | Por quê, se fora                                                                |
| --------------------- | --------- | ------------------------------------------------------------------------------- |
| Usabilidade           | não       | a mudança é só cor; a usabilidade do card é do CH-01/CH-02                      |
| Acessibilidade        | sim       |                                                                                 |
| Performance percebida | sim       |                                                                                 |
| Compatibilidade       | sim       |                                                                                 |
| Recuperação de erro   | não       | não há caminho de falha nesta superfície da loja (a leitura que falha está em teste da Validation) |
| Paridade com produção | sim       | sempre — é a condição da rodada; o documento interceptado substitui a função `api/page` (registrar no cabeçalho do log) |
