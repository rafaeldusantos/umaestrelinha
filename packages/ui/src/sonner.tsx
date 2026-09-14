import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          /*
           * `w-full` não é decoração. Um toast de conteúdo próprio (`toast.custom`) nasce com
           * `data-styled="false"`, e a largura do sonner (`width: var(--width)`) mora SÓ dentro da
           * regra `[data-styled="true"]` — o `<li>` fica sem largura nenhuma e vira shrink-to-fit,
           * cujo piso é o min-content do conteúdo. E `truncate` (que é `white-space: nowrap`)
           * contribui com a linha inteira: `min-w-0` dá piso zero ao item, nunca teto à
           * contribuição. É o mesmo defeito que `dialogGridTrack` guarda nos diálogos.
           *
           * Medido no navegador: o aviso de "adicionado ao carrinho" saía com 540px (680px no nome
           * mais longo do catálogo) dentro de um trilho de 356px, vazando 152px (292px) para FORA
           * da janela — e o vazamento não depende da largura da tela, porque o trilho é ancorado à
           * direita. Abaixo de 600px o próprio sonner declara `width: calc(100% - 32px)`, com
           * especificidade maior que esta classe: por isso o celular nunca mostrou o defeito.
           */
          toast:
            "group toast w-full group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
