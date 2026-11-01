#!/usr/bin/env node
'use strict';

// Servidor efêmero do handoff da wi-workflow — a página dos gates de review técnico
// (descoberta, PRD Tech Review, principal, perguntas do plano; e as perguntas da wi-qa-validation).
//
// Serve a página do que exige decisão do humano;
// a fila não passa por aqui. A página é obrigatória: quando ela não pode ser entregue, o gate
// BLOQUEIA — não há queda automática para o chat. Recebe as respostas,
// grava answers.json e SAI. É a saída do processo que devolve o controle à sessão —
// por isso ele nunca fica vivo depois do envio.
//
//   node server.cjs --dir <pasta> [--port 8477] [--timeout 45] [--no-open]
//
// --dir      pasta com handoff.json; answers.json é gravado nela
// --port     primeira porta a tentar em 127.0.0.1 (padrão 8477); ocupada, ele anda sozinho
//            até --port+7
// --timeout  minutos até desistir (padrão 45)
// --no-open  não abre o browser
//
// Ele valida o handoff.json antes de subir e imprime o próximo passo em toda saída, para que a
// skill não precise carregar essa mecânica em prosa.
//
// Só atende requisição cujo Host é local, e o POST exige content-type JSON e origem local: a página
// fica exposta num socket que qualquer aba do browser alcança, e as respostas entram no contexto da
// sessão verbatim.
//
// Saída:
//   0  respostas gravadas em <dir>/answers.json, e ecoadas no stdout
//   2  timeout — ninguém enviou
//   3  nenhuma porta livre na faixa
//   4  erro de uso (--dir ausente, handoff.json ilegível ou inválido)
//   5  erro inesperado — nada foi respondido

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const UI_DIR = __dirname;
const MAX_BODY = 1024 * 1024;
const TENTATIVAS_DE_PORTA = 8;
const PORTA_MAX = 65535;
const HOSTS_LOCAIS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

const INLINE =
  'o gate BLOQUEIA: a fase não avança e nenhum Default se aplica. Diga ao humano como resolver ' +
  '(Node ≥ 18, uma porta livre na faixa, rodar de novo) e pare. Só se o humano pedir explicitamente ' +
  'para responder no chat, apresente os mesmos itens inline, todos num turno só. O gate nunca se pula.';

const PROXIMO = {
  2: `PRÓXIMO PASSO: o gate não foi respondido no prazo — suba de novo o mesmo handoff.json quando o humano voltar; ${INLINE}`,
  3: `PRÓXIMO PASSO: sem porta livre — libere uma porta da faixa ou rode de novo com --port <outra>; ${INLINE}`,
  4: `PRÓXIMO PASSO: corrija o handoff.json e rode de novo. Persistindo, ${INLINE}`,
  5: `PRÓXIMO PASSO: o servidor morreu sem receber resposta — rode de novo; persistindo, ${INLINE}`,
};

// Rede de segurança: qualquer erro não previsto ainda sai com código documentado e com o próximo
// passo impresso. Morrer calado deixaria a sessão sem gate e sem instrução.
function morteInesperada(err) {
  process.stderr.write(`erro inesperado: ${(err && err.stack) || err}\n`);
  process.stderr.write(PROXIMO[5] + '\n');
  process.exit(5);
}
process.on('uncaughtException', morteInesperada);
process.on('unhandledRejection', morteInesperada);

function parseArgs(argv) {
  const out = { port: 8477, timeout: 45, open: true, dir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') out.dir = argv[++i];
    else if (a === '--port') out.port = Number(argv[++i]);
    else if (a === '--timeout') out.timeout = Number(argv[++i]);
    else if (a === '--no-open') out.open = false;
  }
  return out;
}

function die(code, msg) {
  process.stderr.write(msg + '\n');
  if (PROXIMO[code]) process.stderr.write(PROXIMO[code] + '\n');
  process.exit(code);
}

const args = parseArgs(process.argv.slice(2));

if (!args.dir) die(4, 'uso: node server.cjs --dir <pasta> [--port N] [--timeout MIN] [--no-open]');
if (!Number.isInteger(args.port) || args.port < 1024 || args.port > 65535) die(4, `porta inválida: ${args.port}`);
if (!Number.isFinite(args.timeout) || args.timeout <= 0) die(4, `timeout inválido: ${args.timeout}`);

const dir = path.resolve(args.dir);
const handoffPath = path.join(dir, 'handoff.json');
const answersPath = path.join(dir, 'answers.json');

// O contrato do handoff.json é conferido aqui, e não pedido em prosa à skill: chave desconhecida
// é typo, e corpo que não fecha com `Muda`/`Default` é item que não diz o que a resposta muda.
function validar(h) {
  const e = [];
  const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const texto = (v) => typeof v === 'string' && v.trim() !== '';

  if (!objeto(h)) return ['raiz: esperava um objeto'];

  Object.keys(h).forEach((k) => {
    if (k !== 'wi' && k !== 'itens') e.push(`raiz: chave desconhecida "${k}"`);
  });
  if (!texto(h.wi)) e.push('raiz: "wi" é o ID do Work Item, string não vazia');
  if (!Array.isArray(h.itens) || h.itens.length === 0) {
    e.push('raiz: "itens" é uma lista não vazia — handoff sem item não sobe servidor, resolve-se no CLI');
    return e;
  }

  const conhecidas = ['id', 'titulo', 'corpo', 'sugestoes', 'obrigatorio', 'placeholder'];
  const vistos = new Set();

  h.itens.forEach((it, i) => {
    const onde = `itens[${i}]`;
    if (!objeto(it)) return e.push(`${onde}: esperava um objeto`);

    Object.keys(it).forEach((k) => {
      if (!conhecidas.includes(k)) e.push(`${onde}: chave desconhecida "${k}"`);
    });

    if (!texto(it.id)) e.push(`${onde}: "id" é string não vazia`);
    else if (vistos.has(it.id)) e.push(`${onde}: "id" repetido — ${it.id}`);
    else vistos.add(it.id);

    if (!texto(it.titulo)) e.push(`${onde}: "titulo" é string não vazia, o que exige decisão em uma linha`);
    if ('obrigatorio' in it && typeof it.obrigatorio !== 'boolean') e.push(`${onde}: "obrigatorio" é booleano`);
    if ('placeholder' in it && typeof it.placeholder !== 'string') e.push(`${onde}: "placeholder" é string`);
    if ('sugestoes' in it && (!Array.isArray(it.sugestoes) || !it.sugestoes.every(texto))) {
      e.push(`${onde}: "sugestoes" é lista de strings não vazias`);
    }

    if (!Array.isArray(it.corpo) || it.corpo.length === 0) {
      return e.push(`${onde}: "corpo" é uma lista não vazia de { "rotulo": "…", "valor": "…" }`);
    }
    it.corpo.forEach((p, j) => {
      if (!objeto(p) || !texto(p.rotulo) || typeof p.valor !== 'string') {
        e.push(`${onde}.corpo[${j}]: esperava { "rotulo": "…", "valor": "…" }`);
      }
    });

    const opcional = it.obrigatorio === false;
    const fecha = opcional ? 'Default' : 'Muda';
    const ultimo = it.corpo[it.corpo.length - 1];
    if (!objeto(ultimo) || ultimo.rotulo !== fecha) {
      e.push(
        `${onde}: o corpo fecha com um par de rótulo "${fecha}" — ` +
          (opcional ? 'o que você faz sem resposta' : 'o que a resposta altera na fila')
      );
    }
  });

  return e;
}

let handoffRaw;
let handoff;
try {
  handoffRaw = fs.readFileSync(handoffPath, 'utf8');
  handoff = JSON.parse(handoffRaw);
} catch (err) {
  die(4, `não consegui ler ${handoffPath}: ${err.message}`);
}

const erros = validar(handoff);
if (erros.length) die(4, `handoff.json inválido:\n  - ${erros.join('\n  - ')}`);

// answers.json de uma rodada anterior no mesmo --dir seria lido como resposta desta.
try {
  fs.rmSync(answersPath, { force: true });
} catch (err) {
  die(4, `não consegui limpar ${answersPath}: ${err.message}`);
}

let indexHtml;
try {
  indexHtml = fs.readFileSync(path.join(UI_DIR, 'index.html'), 'utf8');
} catch (err) {
  die(4, `não consegui ler o template: ${err.message}`);
}

function send(res, status, type, body) {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(body);
}

// O Host chega do cliente, e não do socket: sem conferi-lo, um domínio que resolva para 127.0.0.1
// (DNS rebinding) lê o handoff.json e responde o gate pelo humano.
function hostLocal(valor) {
  if (!valor) return false;
  let h = valor.trim().toLowerCase();
  if (h.startsWith('[')) h = h.slice(0, h.indexOf(']') + 1);
  else if (h.split(':').length === 2) h = h.split(':')[0];
  return HOSTS_LOCAIS.has(h);
}

// Origin ausente é cliente que não é browser — curl, teste — e esse não é vetor de CSRF.
function origemLocal(origin) {
  if (!origin) return true;
  try {
    const u = new URL(origin);
    return (u.protocol === 'http:' || u.protocol === 'https:') && hostLocal(u.host);
  } catch {
    return false;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('corpo grande demais'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

let finishing = false;
let timer = null;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');

  if (!hostLocal(req.headers.host)) {
    return send(res, 421, 'text/plain; charset=utf-8', 'host não é local');
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return send(res, 200, 'text/html; charset=utf-8', indexHtml);
  }

  if (req.method === 'GET' && url.pathname === '/handoff.json') {
    return send(res, 200, 'application/json; charset=utf-8', handoffRaw);
  }

  if (req.method === 'POST' && url.pathname === '/answers') {
    if (finishing) return send(res, 409, 'application/json', '{"erro":"já enviado"}');

    // text/plain é exatamente o que um <form> cross-site manda sem preflight.
    const tipo = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (tipo !== 'application/json') {
      return send(res, 415, 'application/json; charset=utf-8', '{"erro":"content-type precisa ser application/json"}');
    }
    if (!origemLocal(req.headers.origin)) {
      return send(res, 403, 'application/json; charset=utf-8', '{"erro":"origem não permitida"}');
    }

    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch (err) {
      return send(res, 400, 'application/json; charset=utf-8', JSON.stringify({ erro: err.message }));
    }
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      return send(res, 400, 'application/json; charset=utf-8', '{"erro":"corpo precisa ser um objeto JSON"}');
    }
    payload.enviadoEm = new Date().toISOString();
    const serializado = JSON.stringify(payload, null, 2) + '\n';
    try {
      fs.writeFileSync(answersPath, serializado, 'utf8');
    } catch (err) {
      return send(res, 500, 'application/json; charset=utf-8', JSON.stringify({ erro: err.message }));
    }
    finishing = true;
    send(res, 200, 'application/json; charset=utf-8', '{"ok":true}');

    // Ecoa as respostas: a sessão não precisa de uma leitura a mais para retomar.
    process.stdout.write(`respostas gravadas em ${answersPath}\n\n${serializado}\n`);
    const respondidos = new Set((payload.respostas || []).map((r) => r && r.id));
    const embranco = handoff.itens.filter((it) => !respondidos.has(it.id)).map((it) => it.id);
    if (embranco.length) {
      process.stdout.write(`sem resposta, era opcional: ${embranco.join(', ')} — vale o Default que você declarou\n`);
    }
    process.stdout.write('PRÓXIMO PASSO: aplique estas respostas ao contexto, verbatim, diga no CLI o que elas dissolveram e o que segue travado, registre o gate no item.md e siga ao próximo passo da fase.\n');

    clearTimeout(timer);
    setTimeout(() => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 1000).unref();
    }, 150);
    return;
  }

  send(res, 404, 'text/plain; charset=utf-8', 'não encontrado');
});

let tentativa = 0;

server.on('error', (err) => {
  const ocupada = err.code === 'EADDRINUSE' || err.code === 'EACCES';
  const proxima = args.port + tentativa + 1;
  if (ocupada && tentativa < TENTATIVAS_DE_PORTA - 1 && proxima <= PORTA_MAX) {
    tentativa++;
    server.listen(proxima, '127.0.0.1');
    return;
  }
  if (ocupada) {
    const ultima = Math.min(args.port + TENTATIVAS_DE_PORTA - 1, PORTA_MAX);
    die(3, `portas ${args.port}–${ultima} indisponíveis (${err.code})`);
  }
  die(4, `erro no servidor: ${err.message}`);
});

function openBrowser(url) {
  try {
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    else if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    /* o humano abre na mão pela URL impressa */
  }
}

server.listen(args.port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}/`;
  process.stdout.write(`handoff em ${url} — ${handoff.itens.length} item(ns), ${args.timeout} min\n`);
  if (args.open) openBrowser(url);

  timer = setTimeout(() => {
    process.stderr.write(`timeout de ${args.timeout} min sem resposta\n`);
    process.stderr.write(PROXIMO[2] + '\n');
    server.close(() => process.exit(2));
    setTimeout(() => process.exit(2), 1000).unref();
  }, args.timeout * 60 * 1000);
});
