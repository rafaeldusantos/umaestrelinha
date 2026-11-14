#!/usr/bin/env node
'use strict';

// Fatos do disco de um Work Item, em JSON, sem decidir nada.
// Uso: node <caminho>/estado.cjs <ITEM_DIR>
// Serve aos dois backends: no productdock, item, status de tarefa e gates do QA vêm null,
// e a skill completa pelo backend. Nunca falha por arquivo ausente ou malformado.

const fs = require('fs');
const path = require('path');

const STATUS_TAREFA = new Set(['pending', 'in-progress', 'done']);
const STATUS_BUG = {
  open: 'open',
  'still-open': 'open',
  resolved: 'resolved',
  'cannot-reproduce': 'resolved',
  invalid: 'invalid',
};

function lerTexto(arquivo) {
  try {
    return fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  } catch {
    return null;
  }
}

function ehArquivo(arquivo) {
  try {
    return fs.statSync(arquivo).isFile();
  } catch {
    return false;
  }
}

function ehPasta(pasta) {
  try {
    return fs.statSync(pasta).isDirectory();
  } catch {
    return false;
  }
}

// Arquivos .md do primeiro nível da pasta, em ordem. Subpastas ficam de fora.
function listarMd(pasta, filtro) {
  try {
    return fs
      .readdirSync(pasta, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
      .map((e) => e.name)
      .filter((nome) => (filtro ? filtro(nome) : true))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  } catch {
    return [];
  }
}

// Linhas fora de blocos cercados por ``` ou ~~~.
function linhasForaDeCerca(texto) {
  const saida = [];
  let cerca = null;
  for (const linha of texto.split('\n')) {
    const m = linha.match(/^\s*(`{3,}|~{3,})/);
    if (m) {
      if (cerca === null) cerca = m[1][0];
      else if (m[1][0] === cerca) cerca = null;
      continue;
    }
    if (cerca === null) saida.push(linha);
  }
  return saida;
}

function limparValorYaml(bruto) {
  let v = bruto.trim();
  if (v.startsWith('"') || v.startsWith("'")) {
    const q = v[0];
    const fim = v.indexOf(q, 1);
    return fim > 0 ? v.slice(1, fim) : v.slice(1);
  }
  v = v.replace(/\s+#.*$/, '').trim();
  return v === '' ? null : v;
}

// Frontmatter YAML simples (chave: valor). Sem o par de `---`, devolve null.
function lerFrontmatter(texto) {
  const linhas = texto.split('\n');
  if (!linhas.length || linhas[0].trim() !== '---') return null;
  const campos = {};
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (linha.trim() === '---' || linha.trim() === '...') return campos;
    const m = linha.match(/^([A-Za-z_][\w-]*)\s*:(.*)$/);
    if (m) campos[m[1].toLowerCase()] = limparValorYaml(m[2]);
  }
  return null;
}

function lerGates(texto) {
  const linhas = linhasForaDeCerca(texto);
  const inicio = linhas.findIndex((l) => /^#{1,6}\s+Gates\s*$/i.test(l.trim()));
  if (inicio < 0) return [];
  const gates = [];
  let cabecalho = true;
  for (let i = inicio + 1; i < linhas.length; i++) {
    const l = linhas[i].trim();
    if (/^#{1,6}\s/.test(l)) break;
    if (!l.startsWith('|')) {
      if (gates.length || !cabecalho) break;
      continue;
    }
    const celulas = l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (celulas.every((c) => /^:?-{2,}:?$/.test(c) || c === '')) continue;
    if (cabecalho) {
      cabecalho = false;
      if (/^gate$/i.test(celulas[0])) continue;
    }
    const nome = celulas[0].replace(/[`*]/g, '').trim();
    if (nome) gates.push(nome);
  }
  return gates;
}

function lerItem(itemDir) {
  const texto = lerTexto(path.join(itemDir, 'item.md'));
  if (texto === null) return null;
  const fm = lerFrontmatter(texto) || {};
  const campo = (k) => (fm[k] === undefined ? null : fm[k]);
  return {
    id: campo('id'),
    titulo: campo('titulo') ?? campo('title'),
    tipo: campo('tipo'),
    entrada: campo('entrada'),
    fase: campo('fase'),
    gates: lerGates(texto),
  };
}

const ROTULO_VEREDITO =
  /(^|[^\p{L}\p{N}_-])(status|veredito|veredicto|verdict|resultado|result)(?![\p{L}\p{N}_])([^:\n]{0,40}):(.*)$/iu;

// Veredito do qa-report.md: PASS · FAIL · PARTIAL, ou null.
// Aceita **Status**: PASS, **Status:** PASS, Status: PASS, **Veredito**: ✅ **PASS**,
// "Status da Re-Validation 2: PASS", "## Veredito: PASS" e afins. Ignora tabelas, blocos de código,
// "Bug status". Vale o último dado sob uma seção de veredito (Overall Verdict, Veredito…); sem ela, o
// último do arquivo; sem rótulo nenhum, a linha da seção de veredito que começa por PASS/FAIL/PARTIAL.
function lerVeredito(texto) {
  let naSecaoVeredito = false;
  let ultimo = null;
  let ultimoNaSecao = null;
  let soltoNaSecao = null;
  for (const bruta of linhasForaDeCerca(texto)) {
    let linha = bruta.trim();
    const titulo = linha.match(/^#{1,6}\s+(.*)$/);
    if (titulo) {
      naSecaoVeredito = /overall verdict|veredit|veredict|verdict/i.test(titulo[1]);
      linha = titulo[1];
    }
    if (linha.startsWith('|')) continue;
    const plano = linha.replace(/\*+/g, '').replace(/^[>\-+\s]+/, '');
    let valor = null;
    const m = plano.match(ROTULO_VEREDITO);
    if (m) {
      const antes = plano.slice(0, m.index + m[1].length);
      if (!/\bbug\s*$/i.test(antes)) {
        const t = m[4].match(/\b(PASS|FAIL|PARTIAL)\b/);
        if (t) valor = t[1];
      }
    } else if (naSecaoVeredito && !titulo) {
      const t = plano.match(/^[^\p{L}\p{N}]*(PASS|FAIL|PARTIAL)\b/u);
      if (t) soltoNaSecao = t[1];
    }
    if (valor) {
      ultimo = valor;
      if (naSecaoVeredito) ultimoNaSecao = valor;
    }
  }
  return ultimoNaSecao || ultimo || soltoNaSecao || null;
}

function lerStatusTarefa(texto) {
  for (const linha of linhasForaDeCerca(texto)) {
    const m = linha.trim().match(/^\*{0,2}Status\*{0,2}\s*:\s*\*{0,2}\s*(.*)$/i);
    if (m) {
      const bruto = m[1].replace(/[`*]/g, '').trim().split(/\s+/)[0] || '';
      const valor = bruto.toLowerCase();
      return STATUS_TAREFA.has(valor) ? { status: valor } : { status: null, status_original: bruto || null };
    }
  }
  return { status: null };
}

function lerTarefas(itemDir) {
  const pasta = path.join(itemDir, 'tasks');
  return listarMd(pasta).map((arquivo) => {
    const texto = lerTexto(path.join(pasta, arquivo));
    return { arquivo, ...(texto === null ? { status: null } : lerStatusTarefa(texto)) };
  });
}

// Envelope qa-issue/v1: o primeiro bloco ```json do arquivo.
function lerEnvelope(texto) {
  const m = texto.match(/^[ \t]*```json[ \t]*\n([\s\S]*?)\n[ \t]*```/m);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[1]);
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null;
  } catch {
    return null;
  }
}

function tituloDoCorpo(texto, arquivo) {
  const id = arquivo.replace(/\.md$/i, '');
  for (const linha of linhasForaDeCerca(texto)) {
    const m = linha.match(/^#\s+(.*)$/);
    if (m) {
      const t = m[1].trim();
      const sem = t.replace(new RegExp('^' + id.replace(/[-]/g, '\\-') + '\\s*[·:—-]\\s*', 'i'), '').trim();
      return sem || t;
    }
  }
  return null;
}

function texto(v) {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function lerBug(pasta, arquivo) {
  const conteudo = lerTexto(path.join(pasta, arquivo));
  const env = conteudo === null ? null : lerEnvelope(conteudo);
  const original = env ? texto(env.status) : null;
  const normalizado = original ? STATUS_BUG[original.toLowerCase()] : undefined;
  return {
    arquivo,
    status: normalizado || 'ilegivel',
    status_original: original,
    titulo: (env && texto(env.title)) || (conteudo !== null ? tituloDoCorpo(conteudo, arquivo) : null),
    severidade: env ? texto(env.severity) : null,
  };
}

function lerBugs(itemDir) {
  const pasta = path.join(itemDir, 'qa', 'issues');
  return listarMd(pasta, (nome) => /^BUG-\d+\.md$/i.test(nome)).map((arquivo) => lerBug(pasta, arquivo));
}

// Cabeçalho **Gate N:** <valor> do corpo de um artefato do QA.
function lerGateQa(texto, n, valores) {
  if (texto === null) return null;
  const re = new RegExp('^\\*{0,2}Gate\\s+' + n + '\\*{0,2}\\s*:\\s*\\*{0,2}\\s*([\\p{L}-]+)', 'iu');
  for (const linha of linhasForaDeCerca(texto)) {
    const m = linha.trim().match(re);
    if (m) {
      const v = m[1].toLowerCase();
      return valores.includes(v) ? v : null;
    }
  }
  return null;
}

function lerQa(itemDir) {
  const qaDir = path.join(itemDir, 'qa');
  if (!ehPasta(qaDir)) return null;
  const planos = listarMd(path.join(qaDir, 'test-plans'), (nome) => /-test-plan\.md$/i.test(nome));
  const plano = planos.length ? planos[0] : null;
  const textoPlano = plano ? lerTexto(path.join(qaDir, 'test-plans', plano)) : null;
  const resultado = ehArquivo(path.join(qaDir, 'qa-result.md'));
  const textoResultado = resultado ? lerTexto(path.join(qaDir, 'qa-result.md')) : null;
  return {
    plano,
    gate1: lerGateQa(textoPlano, 1, ['aprovado', 'pendente']),
    sessoes: listarMd(path.join(qaDir, 'sessions')),
    retest: ehArquivo(path.join(qaDir, 'retest.md')),
    resultado,
    gate3: lerGateQa(textoResultado, 3, ['confirmado', 'pendente']),
  };
}

function lerArquivos(itemDir) {
  const existe = (nome) => ehArquivo(path.join(itemDir, nome));
  const textoReport = lerTexto(path.join(itemDir, 'qa-report.md'));
  return {
    prd: existe('prd.md'),
    discovery: existe('discovery.md'),
    prd_review: existe('prd-review.md'),
    spec: existe('spec.md'),
    plan: existe('plan.md'),
    waves: existe('waves.md'),
    qa_report: textoReport === null ? null : lerVeredito(textoReport),
    qa_report_existe: textoReport !== null,
    tasks_md_solto: existe('tasks.md'),
  };
}

function seguro(fn, padrao) {
  try {
    return fn();
  } catch {
    return padrao;
  }
}

function estado(itemDirArg) {
  const itemDir = path.resolve(itemDirArg);
  if (!ehPasta(itemDir)) return { item_dir: itemDir, existe: false };
  return {
    item_dir: itemDir,
    existe: true,
    item: seguro(() => lerItem(itemDir), null),
    arquivos: seguro(() => lerArquivos(itemDir), null),
    tarefas: seguro(() => lerTarefas(itemDir), []),
    bugs: seguro(() => lerBugs(itemDir), []),
    qa: seguro(() => lerQa(itemDir), null),
  };
}

module.exports = { estado, lerVeredito, lerFrontmatter, lerGates, lerStatusTarefa, lerEnvelope };

if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) {
    process.stderr.write('uso: node estado.cjs <ITEM_DIR>\n');
    process.exit(2);
  }
  process.stdout.write(JSON.stringify(estado(arg), null, 2) + '\n');
}
