// Prova direta: o centro de cada contador tem de dar cobertura 0 no vetor E no raster.
import fs from "node:fs";
const DIR = "C:/Users/RAFAEL~1.SAN/AppData/Local/Temp/claude/c--Projetos-nanapin-store/b30bbc4f-db8c-4dde-bd63-b971c5ed0ffb/scratchpad";
const svg = fs.readFileSync(`${DIR}/nanita-logo.svg`, "utf8");
const ds = [...svg.matchAll(/<path fill-rule="evenodd" d="([^"]+)"/g)].map((m) => m[1]);
const OFF = { x: 155.48, y: 363.96281250000004 };

function polys(d) {
  const toks = d.match(/[MLCZ]|-?\d*\.?\d+/g);
  const out = []; let cur = null, x = 0, y = 0, cmd = null, i = 0;
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/[MLCZ]/.test(toks[i])) { cmd = toks[i]; i++; if (cmd === "Z") { cur = null; cmd = null; continue; } }
    if (cmd === "M") { x = num(); y = num(); cur = [[x, y]]; out.push(cur); cmd = "L"; }
    else if (cmd === "L") { x = num(); y = num(); cur.push([x, y]); }
    else if (cmd === "C") { const a=num(),b=num(),c=num(),e=num(),f=num(),g=num();
      for (let k=1;k<=20;k++){const t=k/20,u=1-t;cur.push([u*u*u*x+3*u*u*t*a+3*u*t*t*c+t*t*t*f, u*u*u*y+3*u*u*t*b+3*u*t*t*e+t*t*t*g]);} x=f; y=g; }
    else i++;
  }
  return out;
}
// cruzamentos numa varredura horizontal -> paridade decide dentro/fora (even-odd)
function inside(all, px, py) {
  let n = 0;
  for (const poly of all) for (let k = 0; k < poly.length; k++) {
    const a = poly[k], b = poly[(k + 1) % poly.length];
    if ((py >= a[1] && py < b[1]) || (py >= b[1] && py < a[1])) {
      if (a[0] + (py - a[1]) * (b[0] - a[0]) / (b[1] - a[1]) > px) n++;
    }
  }
  return n % 2 === 1;
}
const pinkPolys = polys(ds[0]), mauvePolys = polys(ds[1]);

// centros medidos no raster de origem (coordenadas de 1000px), convertidos para o viewBox
const alvos = [
  ["contador do a1 (Nanita)", 360, 425, pinkPolys],
  ["contador do a2 (Nanita)", 778, 425, pinkPolys],
  ["contador do P", 172, 572, mauvePolys],
  ["contador do R", 273, 572, mauvePolys],
  ["contador do O (PERS.)", 774, 580, mauvePolys],
  ["contador do A (PERS.)", 379, 585, mauvePolys],
  ["contador do D", 721, 580, mauvePolys],
  ["haste do i (deve ser TINTA)", 589, 420, pinkPolys],
  ["haste do P (deve ser TINTA)", 160, 580, mauvePolys],
];
let ok = true;
for (const [nome, sx, sy, set] of alvos) {
  const dentro = inside(set, sx - OFF.x, sy - OFF.y);
  const esperado = nome.includes("TINTA");
  const bom = dentro === esperado;
  if (!bom) ok = false;
  console.log(`${bom ? "ok  " : "FALHA"} ${nome.padEnd(30)} ${dentro ? "tinta" : "vazio"}`);
}
console.log(ok ? "\nTodos os contadores estão abertos." : "\nAinda tem contador fechado.");
