# Templates de e-mail de auth — auditoria e fechamento Specification

## Problem Statement

Os 3 templates de e-mail de auth (`supabase/templates/{magic_link,confirmation,recovery}.html`)
existem desde a feature `20`, têm a identidade da loja e nunca tiveram teste nem guarda de
divergência — nenhum comando lê `supabase/templates/`. Em 2026-09-19 o SMTP do auth foi ativado em
produção sem os templates colados no dashboard: o GoTrue está entregando o e-mail **padrão**, em
inglês, com **link**, enquanto a loja chama `verifyOtp` e pede um **código de 6 dígitos**. A cliente
recebe algo, tenta entrar e não consegue — é regressão ativa de login, registrada no `CLAUDE.md` raiz
(*Estado conhecido*, primeiro item). Fechar essa lacuna, com os 3 arquivos auditados e prontos para
colar, é o que resolve o problema.

## Goals

- [ ] Os 3 templates auditados contra `DESIGN.md`, `authSenderDomain.test.ts` e `brandScan.test.ts`,
      com toda lacuna concreta fechada (preheader ausente).
- [ ] Um guarda de disco (molde `icons.test.ts`) impedindo os 3 templates de divergirem entre si ou
      da paleta declarada em `layout.ts` — hoje nenhum teste alcança `supabase/templates/`.
- [ ] Entregável final: os 3 HTMLs prontos para colar (sem o bloco de comentário) + a tabela de
      assunto por template, para o usuário colar no dashboard Supabase.

## Out of Scope

| Item | Motivo |
| --- | --- |
| SMTP local (`[auth.email.smtp]` no `config.toml`) | Decisão `O2` da feature `52`, revogada por escolha do usuário — não reabrir |
| Templates de `Change Email Address`, `Invite user`, `Reauthentication` | Inalcançáveis: a loja só dispara `signInWithOtp` e `resetPasswordForEmail` (medido no `validation.md` da `52` e em `apps/store/CLAUDE.md`) |
| Reescrever o texto/tom dos 3 templates | Já conforme a identidade e o tom memorial (`DESIGN.md` §1); só lacunas concretas (preheader) são fechadas |
| Comparação estrutural completa entre `emailShell()` (`layout.ts`, TS) e o casco HTML estático de auth | Famílias de arquivo diferentes — string gerada em Deno vs HTML colado à mão num dashboard sem build step. Só a **paleta compartilhada** é testável sem duplicar a lógica de render (ver AET-03) |
| Unificar os 3 templates num gerador (molde `_gen-paths.mjs`) | Sem precedente de consumidor para arquivo colado à mão em dashboard externo (a CLI não tem `config push`/`config pull` para isto). Cópia deliberada + guarda que compara é o padrão que o `CLAUDE.md` raiz já autoriza ("defeito 01", regra 3) |
| Colar os templates no dashboard, ativar SMTP, pedir um código real | Ações do usuário — são a prova de fecho declarada, fora do que o código resolve sozinho |
| Validar entrega/DKIM/reputação, ou que Gmail/Outlook respeitam o preheader | Fora do alcance de qualquer teste deste repositório (mesma classe de limitação que `Email check` já declara para o Resend) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Texto do preheader | Reaproveitar literalmente a primeira frase do parágrafo de abertura já existente em cada template | Evita inventar copy nova numa marca com restrição de tom memorial (`DESIGN.md` §1); a frase já foi aprovada na feature `20` | y — assumido, sinalizado no fecho para o usuário revisar |
| Técnica de preheader | `display:none` inline (sem `<style>`) + filler de espaços Unicode, sem cor declarada (invisível, então não entra na régua de paleta) | Técnica padrão de e-mail; compatível com "tudo inline, sem `<style>`, sem webfont" | y |
| Nome e local do guarda novo | `authEmailTemplates.test.ts` em `apps/store/src/shared/lib/__tests__/` | Segue `authSenderDomain.test.ts` (mesmo prefixo `auth`, mesmo assunto) e a convenção do repo de guardas que leem `supabase/**` do disco morarem na suíte da loja "por acidente de origem" (`materialTransitions`, `homeSections`, `faqSchema`, `menuSchema`, etc.) | y |
| Decisão sobre os 4 donos do casco (3 HTML + `layout.ts`) | Cópia deliberada nos 3 HTML, comparados entre si pelo guarda; a paleta (não a estrutura) é comparada contra `layout.ts`, lido como **texto**, nunca importado/executado | `CLAUDE.md` raiz já autoriza cópia deliberada com guarda que lê os dois do disco e compara; importar `layout.ts` num teste do workspace da loja cruzaria fronteira de workspace sem precedente — os guardas existentes sempre leem `supabase/**` como texto, nunca como módulo | y |
| A "divergência de 3×1 ocorrências de `#B8945F`" relatada pelo usuário | Não é defeito: é o comentário de documentação (só `magic_link.html` carrega a explicação completa da paleta; os outros dois apontam para ele). O HTML renderizável tem 1 ocorrência em cada um dos 3 | Confirmado por leitura direta e `grep` com números de linha antes de escrever qualquer código | y |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

**Adendo pós-verificação (mesma sessão, antes do commit)**: o usuário pediu para humanizar o rodapé,
citando a Adri por nome. O rodapé dos 3 templates mudou de "Uma Estrelinha — eternizando suas
lembranças." para **"Adri Muniz, eternizando suas lembranças."** — cópia zero-invenção: é a mesma
frase já ao vivo no rodapé de todo o site (`apps/store/src/widgets/footer/ui/Footer.tsx`). O corpo
(título, parágrafo de abertura, nota final) não mudou, de propósito — são e-mails de código de
acesso, e o registro de precedência da marca (`AboutPage`, CTAs de WhatsApp) já mostra que "Adri"
entra como assinatura curta, não como carta em primeira pessoa, quando o contexto é funcional/rápido.
`authEmailTemplates.test.ts` continua verde sem alteração de régua: a troca é idêntica nos 3 arquivos,
então o casco (AET-05) segue byte-idêntico.

---

## User Stories

### P1: Os 3 templates fecham a regressão de login e ganham guarda ⭐ MVP

**User Story**: Como Adri (dona da loja), quero que o e-mail de código de acesso chegue com a cara da
loja e com os 6 dígitos que a tela pede, para que uma cliente que acabou de perder alguém não fique
presa numa tela de login que não reconhece o que recebeu.

**Why P1**: É a única entrega desta feature — resolve a regressão de login ativa registrada no
`CLAUDE.md` raiz.

**Acceptance Criteria**:

1. **AET-01** — WHEN qualquer um dos 3 templates (`magic_link.html`, `confirmation.html`,
   `recovery.html`) é lido THEN SHALL conter `{{ .Token }}` e SHALL NOT conter `{{ .ConfirmationURL }}`.
2. **AET-02** — WHEN qualquer um dos 3 templates é lido THEN SHALL NOT conter `<style`, `<link`,
   `@font-face` nem `<script` (sem webfont, sem CSS externo — só inline, `DESIGN.md` §3).
3. **AET-03** — WHEN uma cor hexadecimal de 6 dígitos aparece no corpo renderizável de qualquer um
   dos 3 templates (fora do comentário de documentação do topo) THEN SHALL pertencer ao conjunto de
   hex declarado em `ESTRELINHA` (`supabase/functions/send-notification/render/layout.ts`, lido como
   texto).
4. **AET-04** — WHEN `#B8945F` (accent) aparece em qualquer um dos 3 templates THEN SHALL NOT estar
   associado a uma declaração `color:` — só a `background:`/fio já em uso (`DESIGN.md` §2, "accent
   nunca é texto sobre claro").
5. **AET-05** — WHEN o casco dos 3 templates (tabela externa, faixa de cabeçalho com wordmark e fio,
   abertura do card, abertura da célula de corpo, caixa do código, rodapé) é comparado excluindo as 3
   regiões de conteúdo que legitimamente variam por template (título `<h1>`, parágrafo de abertura,
   nota final) THEN SHALL ser byte-idêntico nos 3 arquivos.
6. **AET-06** — WHEN qualquer um dos 3 templates é lido THEN SHALL conter um bloco de preheader
   oculto (`display:none` inline, sem `<style>`) com texto não vazio e distinto por template,
   derivado literalmente do parágrafo de abertura já existente no mesmo arquivo.
7. **AET-07** — WHEN a feature fecha THEN o usuário SHALL receber os 3 HTMLs sem o bloco de
   comentário do topo (não serve ao dashboard) e a tabela de assunto por template (já gravada em
   `config.toml`, nunca empurrada para produção) para colagem manual.

**Independent Test**: Rodar `authEmailTemplates.test.ts` e ler os 3 arquivos; a prova de fecho real
(fora do escopo do código) é pedir um código na loja depois de colar os 3 no dashboard e ver a cara
da marca com 6 dígitos.

---

## Edge Cases

- WHEN o guarda varre `supabase/templates/` THEN a contagem de arquivos `.html` encontrados SHALL
  ser exatamente 3 — âncora contra varredura vazia (caminho errado) passando em silêncio.
- WHEN o comentário de topo é removido para a régua de casco (AET-05) THEN a remoção SHALL
  normalizar CRLF antes de qualquer regex (lição `L-031`) e cobrir comentário de linha e de bloco na
  mesma varredura, caso um dia apareça um comentário de linha citando um caminho com `**`
  (`BL-027`).
- WHEN a paleta de `layout.ts` é extraída THEN a extração SHALL ser por regex sobre o texto do
  arquivo, nunca por `import`/execução — cruzar a fronteira do workspace `supabase/functions` a
  partir de um teste de `apps/store` não tem precedente no repositório e arriscaria resolução de
  módulo Deno-específica dentro do vitest da loja.
- WHEN um hex de 6 dígitos aparece seguido de mais caracteres hex (ex.: um alpha channel de 8
  dígitos) THEN a régua SHALL não confundir o prefixo de 6 com um match válido — mesmo princípio da
  lição `L-034` (limite de token), aplicado a literais de cor.
- WHEN o `authSenderDomain.test.ts` já existente varre este diretório THEN nenhum texto novo desta
  feature (incluindo o preheader e qualquer nota de auditoria) SHALL grafar o subdomínio antigo por
  extenso — descrever a forma proibida, nunca escrevê-la (regra já registrada no `CLAUDE.md` raiz,
  mordida duas vezes pela documentação da feature `52`).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AET-01 | P1 | Execute | Verified |
| AET-02 | P1 | Execute | Verified |
| AET-03 | P1 | Execute | Verified |
| AET-04 | P1 | Execute | Verified |
| AET-05 | P1 | Execute | Verified |
| AET-06 | P1 | Execute | Verified |
| AET-07 | P1 | Execute | Verified |

**Coverage:** 7 total, 7 mapped to tasks (Execute inline, ver seção abaixo), 0 unmapped. Verificação
independente (`validation.md`): **PASS**, 6/6 ACs testáveis por código com evidência `file:line`,
sensor de mutação 6/6 mortos, 0 sobreviventes. AET-07 é entregável de chat, sem teste (correto).

---

## Success Criteria

- [ ] `authEmailTemplates.test.ts` novo, verde, cobrindo AET-01..06.
- [ ] Suíte completa da loja sem regressão (baseline de entrada: `3493/220`, lint `2/2` no store,
      tipos `0`).
- [ ] Os 3 HTMLs entregues ao usuário sem o bloco de comentário, prontos para colar, com a tabela de
      assunto (AET-07).
- [ ] `CLAUDE.md` raiz atualizado: a entrada de regressão de login em *Estado conhecido* passa a
      dizer que os 3 templates estão prontos e só falta a ação manual do usuário (colar no dashboard
      + pedir um código real).
