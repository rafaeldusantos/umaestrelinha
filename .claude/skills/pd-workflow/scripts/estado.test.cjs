'use strict';

// node --test estado.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'estado.cjs');
const { estado, lerVeredito } = require(SCRIPT);

const criadas = [];
test.after(() => {
  for (const d of criadas) fs.rmSync(d, { recursive: true, force: true });
});

function montar(arquivos) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'estado-'));
  criadas.push(raiz);
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    const alvo = path.join(raiz, rel);
    fs.mkdirSync(path.dirname(alvo), { recursive: true });
    if (conteudo === null) fs.mkdirSync(alvo, { recursive: true });
    else fs.writeFileSync(alvo, conteudo);
  }
  return raiz;
}

function rodar(...args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

const ITEM_MD = `---
id: ACME-14
titulo: Single sign-on com Azure AD
tipo: feature            # feature | improvement | bug | incident | technical_debt
entrada: prd             # prd | descoberta | plano
fase: validation
criado: 2026-10-20
---
## Descrição
Quero entrar com a conta Microsoft.

## Insumos
- nenhum

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| prd-review r1 | 2026-10-21 | \`pass\` · 0 aplicados |
| handoff | 2026-10-22 | \`pass\` · 3 itens |
| fila | 2026-10-22 | aprovada · 01–02 |
| QA · Gate 1 — plano | 2026-10-29 | aprovado · 2 TC |

## Retomada (2026-11-14)
- texto livre depois da tabela
`;

const tarefa = (n, status) =>
  `## ${n} · [acme-web] Tarefa ${n}\n\n${status === undefined ? '' : `**Status:** ${status}\n`}\n**Objetivo.** algo. Status: não confundir.\n`;

const bug = (id, campos) =>
  '```json\n' +
  JSON.stringify({ schema: 'qa-issue/v1', id, title: `[Tela] quebra ${id}`, severity: 'high', priority: 'P1', type: 'functional', ...campos }, null, 2) +
  '\n```\n\n# ' + id + ' · [Tela] quebra\n';

const QA_REPORT = `# ACME-14 — Validation Report

**Build**: FAIL — none
**Lint**: PASS — none

| ID | Criterion | Test | Result | Status |
| -- | --------- | ---- | ------ | ------ |
| UC-01.1 | x | y | FAIL | MISSING |

### Bug BUG-1: algo

**Bug status**: open — aguardando reteste

## Overall Verdict

**Status**: PASS
`;

test('Work Item local completo', () => {
  const dir = montar({
    'item.md': ITEM_MD,
    'prd.md': '# PRD',
    'prd-review.md': '# parecer',
    'spec.md': '# spec',
    'waves.md': '# ondas',
    'qa-report.md': QA_REPORT,
    'tasks/01-botao.md': tarefa('01', 'done'),
    'tasks/02-logout.md': tarefa('02', 'done'),
    'tasks/10-fix.md': tarefa('10', 'in-progress'),
    'tasks/notas.txt': 'ignorado',
    'qa/test-plans/sso-test-plan.md': '```json\n{"schema":"qa-plan/v1"}\n```\n\n# Plano\n\n**Work Item:** ACME-14\n**Gate 1:** aprovado em 2026-10-29\n',
    'qa/test-plans/personas.md': '# Personas',
    'qa/sessions/CH-02-cfr.md': '# s',
    'qa/sessions/CH-01-login.md': '# s',
    'qa/sessions/2026-10-29/CH-01-login.md': '# rodada anterior',
    'qa/retest.md': '# Reteste',
    'qa/qa-result.md': '```json\n{"schema":"qa-result/v1","verdict":"fail"}\n```\n\n# Resultado\n\n**Gate 3:** confirmado em 2026-10-30\n',
    'qa/issues/BUG-001.md': bug('BUG-001', { status: 'open' }),
    'qa/issues/BUG-002.md': bug('BUG-002', { status: 'resolved', severity: 'low' }),
  });
  const r = estado(dir);
  assert.equal(r.existe, true);
  assert.equal(r.item_dir, path.resolve(dir));
  assert.deepEqual(r.item, {
    id: 'ACME-14',
    titulo: 'Single sign-on com Azure AD',
    tipo: 'feature',
    entrada: 'prd',
    fase: 'validation',
    gates: ['prd-review r1', 'handoff', 'fila', 'QA · Gate 1 — plano'],
  });
  assert.deepEqual(r.arquivos, {
    prd: true,
    discovery: false,
    prd_review: true,
    spec: true,
    plan: false,
    waves: true,
    qa_report: 'PASS',
    qa_report_existe: true,
    tasks_md_solto: false,
  });
  assert.deepEqual(r.tarefas, [
    { arquivo: '01-botao.md', status: 'done' },
    { arquivo: '02-logout.md', status: 'done' },
    { arquivo: '10-fix.md', status: 'in-progress' },
  ]);
  assert.deepEqual(r.bugs, [
    { arquivo: 'BUG-001.md', status: 'open', status_original: 'open', titulo: '[Tela] quebra BUG-001', severidade: 'high' },
    { arquivo: 'BUG-002.md', status: 'resolved', status_original: 'resolved', titulo: '[Tela] quebra BUG-002', severidade: 'low' },
  ]);
  assert.deepEqual(r.qa, {
    plano: 'sso-test-plan.md',
    gate1: 'aprovado',
    sessoes: ['CH-01-login.md', 'CH-02-cfr.md'],
    retest: true,
    resultado: true,
    gate3: 'confirmado',
  });
});

test('só item.md', () => {
  const dir = montar({
    'item.md': '---\nid: 103\ntitulo: "Joias em oferta: configurável"\ntipo: improvement\nentrada: descoberta\nfase: discovery\n---\n## Descrição\nx\n\n## Gates\n| gate | quando | resultado |\n| ---- | ------ | --------- |\n',
  });
  const r = estado(dir);
  assert.deepEqual(r.item, {
    id: '103',
    titulo: 'Joias em oferta: configurável',
    tipo: 'improvement',
    entrada: 'descoberta',
    fase: 'discovery',
    gates: [],
  });
  assert.equal(r.arquivos.prd, false);
  assert.equal(r.arquivos.qa_report, null);
  assert.equal(r.arquivos.qa_report_existe, false);
  assert.deepEqual(r.tarefas, []);
  assert.deepEqual(r.bugs, []);
  assert.equal(r.qa, null);
});

test('item.md com frontmatter malformado não derruba e vira null', () => {
  const sem = estado(montar({ 'item.md': '# só um título\n\n## Gates\n| gate | quando | resultado |\n|---|---|---|\n| handoff | 2026-10-22 | pass |\n' }));
  assert.deepEqual(sem.item, { id: null, titulo: null, tipo: null, entrada: null, fase: null, gates: ['handoff'] });
  const aberto = estado(montar({ 'item.md': '---\nid: WI-01\ntipo: bug\n## sem fechamento\n' }));
  assert.equal(aberto.item.id, null);
  assert.equal(aberto.item.tipo, null);
});

test('PD sem item.md', () => {
  const dir = montar({
    'prd.md': '# PRD',
    'spec.md': '# spec',
    'qa-report.md': '# Report\n\n## Overall Verdict\n\n**Status**: **PASS**\n',
    'tasks/01-portal.md': '## 01 · [web] Portal\n\n`UC-02` — PROD-278\n\n**Objetivo.** O cliente reabre.\n',
    'qa/test-plans/encerramento-test-plan.md': '# Plano de QA\n\n**Work Item:** PROD-278\n',
    'qa/sessions/CH-01-x.md': '# s',
    'qa/qa-result.md': '# Resultado\n\n### Gate técnico\n\n| Gate | Status | Resumo |\n',
    'qa/issues/BUG-001.md': bug('BUG-001', { status: 'invalid' }),
  });
  const r = estado(dir);
  assert.equal(r.item, null);
  assert.equal(r.arquivos.qa_report, 'PASS');
  assert.deepEqual(r.tarefas, [{ arquivo: '01-portal.md', status: null }]);
  assert.equal(r.bugs[0].status, 'invalid');
  assert.equal(r.qa.gate1, null);
  assert.equal(r.qa.gate3, null);
  assert.equal(r.qa.resultado, true);
  assert.equal(r.qa.retest, false);
});

test('tarefas com status mistos, sem linha de Status e com valor fora do enum', () => {
  const dir = montar({
    'item.md': ITEM_MD,
    'tasks/01-a.md': tarefa('01', 'done'),
    'tasks/02-b.md': tarefa('02', 'pending'),
    'tasks/03-c.md': tarefa('03', 'in-progress'),
    'tasks/04-d.md': tarefa('04'),
    'tasks/05-e.md': '## 05 · e\n\n**Status**: Done\n',
    'tasks/06-f.md': '## 06 · f\n\nStatus: blocked\n',
    'tasks/07-g.md': '## 07 · g\n\n```\n**Status:** done\n```\n',
    'tasks.md': '# fila antiga',
  });
  const r = estado(dir);
  assert.deepEqual(r.tarefas, [
    { arquivo: '01-a.md', status: 'done' },
    { arquivo: '02-b.md', status: 'pending' },
    { arquivo: '03-c.md', status: 'in-progress' },
    { arquivo: '04-d.md', status: null },
    { arquivo: '05-e.md', status: 'done' },
    { arquivo: '06-f.md', status: null, status_original: 'blocked' },
    { arquivo: '07-g.md', status: null },
  ]);
  assert.equal(r.arquivos.tasks_md_solto, true);
});

test('qa-report nas variações', () => {
  const casos = [
    ['**Status**: PASS', 'PASS'],
    ['**Status:** PASS', 'PASS'],
    ['Status: FAIL', 'FAIL'],
    ['**Status: PASS**', 'PASS'],
    ['**Status**: **PASS**', 'PASS'],
    ['**Status**: PARTIAL — C-02 depende de verificação visual', 'PARTIAL'],
    ['**Status**: PASS (com ressalva de base)', 'PASS'],
    ['**Veredito: PASS.**', 'PASS'],
    ['**Veredito**: ✅ **PASS** — com uma pendência', 'PASS'],
    ['**Verdict**: **FAIL**. Os bugs continuam', 'FAIL'],
    ['> **Veredicto Final:** ✅ **PASS**', 'PASS'],
    ['**Tipo**: technical_debt · **Data**: 2026-07-18 · **Veredito**: ✅ **PASS**', 'PASS'],
    ['**Resultado: PASS** · 2026-08-26', 'PASS'],
    ['**Status da Re-Validation 2**: FAIL', 'FAIL'],
    ['**Date**: 2026-07-23 · **Result**: ✅ PASS · **Branch**: `feature/x`', 'PASS'],
    ['## Veredito: ✅ **PASS** (com follow-ups documentados)', 'PASS'],
  ];
  for (const [linha, esperado] of casos) {
    assert.equal(lerVeredito(`# Report\n\n${linha}\n`), esperado, linha);
  }
  // o veredito final vale sobre um status anterior; Build, tabela, Bug status e código não contam
  assert.equal(lerVeredito('**Status**: FAIL\n\n## Re-Validation\n\n**Status**: PASS\n'), 'PASS');
  assert.equal(
    lerVeredito('## Overall Verdict\n\n**Status**: FAIL\n\n## Notas\n\n**Status**: corrigida pela T03, verde\n**Status**: PASS na tarefa 2\n'),
    'FAIL',
  );
  assert.equal(lerVeredito('**Build**: PASS\n**Lint**: FAIL\n| x | Status | PASS |\n**Bug status**: open\n'), null);
  assert.equal(lerVeredito('```\nStatus: FAIL\n```\n'), null);
  assert.equal(lerVeredito('**Status**: corrigida pela T03 e verde na Re-Validation.\n'), null);
  assert.equal(lerVeredito('## Veredito\n\n**PASS.** 7908/7908 testes verdes\n'), 'PASS');
  assert.equal(lerVeredito('# vazio\n'), null);
  // presente sem veredito legível: qa_report null, qa_report_existe true
  const r = estado(montar({ 'qa-report.md': '# só texto\n' }));
  assert.equal(r.arquivos.qa_report, null);
  assert.equal(r.arquivos.qa_report_existe, true);
});

test('bugs com status antigos e leitura tolerante', () => {
  const dir = montar({
    'qa/issues/BUG-001.md': bug('BUG-001', { status: 'still-open' }),
    'qa/issues/BUG-002.md': bug('BUG-002', { status: 'cannot-reproduce' }),
    'qa/issues/BUG-003.md': bug('BUG-003', { status: 'Resolved' }),
    'qa/issues/BUG-010.md': bug('BUG-010', { status: 'open' }),
    'qa/issues/BUG-001.qa-issue.md': bug('BUG-001', { status: 'open' }),
    'qa/issues/notas.md': '# não é bug',
  });
  const r = estado(dir);
  assert.deepEqual(
    r.bugs.map((b) => [b.arquivo, b.status, b.status_original]),
    [
      ['BUG-001.md', 'open', 'still-open'],
      ['BUG-002.md', 'resolved', 'cannot-reproduce'],
      ['BUG-003.md', 'resolved', 'Resolved'],
      ['BUG-010.md', 'open', 'open'],
    ],
  );
});

test('envelope ilegível vira status ilegivel', () => {
  const dir = montar({
    'qa/issues/BUG-001.md': '```json\n{ "id": "BUG-001", "status": "open", }\n```\n\n# BUG-001 · Quebrado\n',
    'qa/issues/BUG-002.md': '# BUG-002: Sem envelope\n\n**Severity:** High\n**Status:** resolved\n',
    'qa/issues/BUG-003.md': bug('BUG-003', { status: undefined }),
    'qa/issues/BUG-004.md': bug('BUG-004', { status: 'fixed' }),
    'qa/issues/BUG-005.md': '',
  });
  const r = estado(dir);
  assert.deepEqual(r.bugs, [
    { arquivo: 'BUG-001.md', status: 'ilegivel', status_original: null, titulo: 'Quebrado', severidade: null },
    { arquivo: 'BUG-002.md', status: 'ilegivel', status_original: null, titulo: 'Sem envelope', severidade: null },
    { arquivo: 'BUG-003.md', status: 'ilegivel', status_original: null, titulo: '[Tela] quebra BUG-003', severidade: 'high' },
    { arquivo: 'BUG-004.md', status: 'ilegivel', status_original: 'fixed', titulo: '[Tela] quebra BUG-004', severidade: 'high' },
    { arquivo: 'BUG-005.md', status: 'ilegivel', status_original: null, titulo: null, severidade: null },
  ]);
});

test('QA com gates pendentes e pastas vazias', () => {
  const dir = montar({
    'qa/test-plans/x-test-plan.md': '# Plano\n\n**Gate 1:** pendente\n',
    'qa/sessions': null,
    'qa/issues': null,
    'qa/qa-result.md': '# Resultado\n\n**Gate 3**: pendente\n',
    'tasks': null,
  });
  const r = estado(dir);
  assert.deepEqual(r.qa, { plano: 'x-test-plan.md', gate1: 'pendente', sessoes: [], retest: false, resultado: true, gate3: 'pendente' });
  assert.deepEqual(r.tarefas, []);
  assert.deepEqual(r.bugs, []);
});

test('CLI: pasta inexistente devolve existe false com código 0', () => {
  const alvo = path.join(os.tmpdir(), 'estado-nao-existe-' + process.pid);
  const r = rodar(alvo);
  assert.equal(r.code, 0);
  assert.deepEqual(JSON.parse(r.stdout), { item_dir: path.resolve(alvo), existe: false });
});

test('CLI: sem argumento sai com código 2 e mensagem no stderr', () => {
  const r = rodar();
  assert.equal(r.code, 2);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /uso: node estado\.cjs <ITEM_DIR>/);
});

test('CLI: um único JSON no stdout', () => {
  const dir = montar({ 'item.md': ITEM_MD, 'tasks/01-a.md': tarefa('01', 'pending') });
  const r = rodar(dir);
  assert.equal(r.code, 0);
  const json = JSON.parse(r.stdout);
  assert.equal(json.item.fase, 'validation');
  assert.deepEqual(json.tarefas, [{ arquivo: '01-a.md', status: 'pending' }]);
});
