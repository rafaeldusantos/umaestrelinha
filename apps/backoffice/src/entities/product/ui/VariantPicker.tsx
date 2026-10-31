// A escolha da variação de uma peça na montagem da proposta (feature 89, `MON-05`).
//
// É uma LISTA de linhas, não uma vitrine (`AD-019`): rótulo, preço e estoque — sem foto. Quem mostra
// como a peça fica é a loja. Cada linha é um botão de 44px com `role="radio"` dentro de um
// `radiogroup`: a escolha é uma só, e um leitor de tela precisa ouvir qual está marcada.
//
// **O estoque aparece sempre** (`MON-05`). A linha que não pode ser vendida agora
// (`disponivel === false`: política `track` e estoque zero) fica desabilitada, dizendo por quê — a
// loja também não a venderia, e o link morreria na conclusão (`CON-09`). A variação sem preço também
// é desabilitada: o servidor recusaria a gravação ("não consegui precificar").
//
// **Lista longa recolhe depois da escolha.** Achado na prova em navegador da T27: uma peça do
// catálogo real tem 108 variações, e a lista seguia aberta depois da escolha — a linha da proposta
// media 6.732px em 1440, e a peça seguinte ficava a dezenas de telas de distância. Acima de
// `VARIACOES_SEMPRE_ABERTAS`, escolher recolhe a lista para a escolhida e um "Trocar variação".
// Lista curta continua aberta: recolher três linhas esconderia mais do que economiza.
//
// **O grupo é UMA parada de Tab** (QA da 89, `BUG-20261031-variacoes-da-peca-sao-cem-paradas-de-tab`):
// a peça de 108 variações eram 108 Tabs até sair da lista. Só uma linha tem `tabIndex 0` — a
// escolhida, ou a primeira habilitada — e as setas (e Home/End) levam o foco entre as habilitadas,
// dando a volta nas pontas. // SPEC_DEVIATION (padrão de grupo de rádio): a seta MOVE o foco e não
// escolhe; escolhe-se com Enter ou Espaço. Escolher recolhe a lista longa, e recolher a cada seta
// tiraria as outras opções de baixo do teclado.

import { formatPrice } from "@estrelinha/core/formatters";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@estrelinha/ui/lib/utils";
import type { StockPolicy } from "@estrelinha/supabase/types";
import type { VariacaoDaPeca } from "../api/useProductVariants";
import { textoDoEstoque } from "../lib/estoque";

export interface VariantPickerProps {
  /** O nome acessível do grupo — "Variação de <peça>". */
  rotulo: string;
  variacoes: readonly VariacaoDaPeca[];
  politica: StockPolicy;
  escolhida: string | null;
  onEscolher: (variacao: VariacaoDaPeca) => void;
}

/** Até quantas linhas a lista fica sempre aberta, mesmo com uma escolhida. */
export const VARIACOES_SEMPRE_ABERTAS = 6;

const VariantPicker = ({
  rotulo,
  variacoes,
  politica,
  escolhida,
  onEscolher,
}: VariantPickerProps) => {
  const [aberta, setAberta] = useState(false);
  // A escolha nova recolhe de novo: o "Trocar" vale para uma troca, não para sempre.
  useEffect(() => setAberta(false), [escolhida]);
  /** A linha que o teclado está apontando (a única com `tabIndex 0`); `null` = a de partida. */
  const [apontada, setApontada] = useState<string | null>(null);
  const botoes = useRef(new Map<string, HTMLButtonElement>());

  if (variacoes.length === 0) {
    return (
      <p
        data-testid="sem-variacao-ativa"
        className="text-xs text-muted-foreground"
      >
        Nenhuma variação ativa desta peça.
      </p>
    );
  }

  const marcada = variacoes.find((v) => v.id === escolhida);
  const recolhida =
    !aberta && !!marcada && variacoes.length > VARIACOES_SEMPRE_ABERTAS;
  const visiveis = recolhida ? [marcada] : variacoes;
  const habilitadas = visiveis.filter((v) => v.disponivel && v.preco !== null);
  const parada =
    habilitadas.find((v) => v.id === apontada) ??
    habilitadas.find((v) => v.id === escolhida) ??
    habilitadas[0] ??
    null;

  const aoTeclar = (evento: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const i = habilitadas.findIndex((v) => v.id === id);
    if (i < 0 || habilitadas.length === 0) return;
    const n = habilitadas.length;
    let destino: number | null = null;
    if (evento.key === "ArrowDown" || evento.key === "ArrowRight") destino = (i + 1) % n;
    else if (evento.key === "ArrowUp" || evento.key === "ArrowLeft") destino = (i - 1 + n) % n;
    else if (evento.key === "Home") destino = 0;
    else if (evento.key === "End") destino = n - 1;
    if (destino === null) return;
    evento.preventDefault();
    const alvo = habilitadas[destino];
    setApontada(alvo.id);
    botoes.current.get(alvo.id)?.focus();
  };

  return (
    <div className="space-y-1.5">
      <div role="radiogroup" aria-label={rotulo} className="space-y-1.5">
        {visiveis.map((v) => {
          const semPreco = v.preco === null;
          const desabilitada = !v.disponivel || semPreco;
          const marcada = v.id === escolhida;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={marcada}
              disabled={desabilitada}
              tabIndex={parada?.id === v.id ? 0 : -1}
              ref={(no) => {
                if (no) botoes.current.set(v.id, no);
                else botoes.current.delete(v.id);
              }}
              onKeyDown={(evento) => aoTeclar(evento, v.id)}
              onClick={() => onEscolher(v)}
              data-testid="opcao-de-variacao"
              className={cn(
                "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm",
                "transition-colors motion-reduce:transition-none",
                marcada
                  ? "border-primary bg-primary/10"
                  : "border-input hover:bg-muted/50",
                desabilitada &&
                  "cursor-not-allowed opacity-60 hover:bg-transparent",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block break-words font-medium text-foreground">
                  {v.rotulo}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {semPreco
                    ? "Sem preço cadastrado"
                    : textoDoEstoque(v, politica)}
                </span>
              </span>
              {!semPreco && (
                <span className="shrink-0 tabular-nums text-sm text-foreground">
                  {formatPrice(v.preco as number)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {recolhida && (
        <button
          type="button"
          onClick={() => setAberta(true)}
          className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Trocar variação ({variacoes.length} opções)
        </button>
      )}
    </div>
  );
};

export default VariantPicker;
