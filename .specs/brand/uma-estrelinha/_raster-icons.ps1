# Rasteriza os ícones da Uma Estrelinha a partir do símbolo reduzido.
# Mesma toolchain da marca anterior: WPF, que é o que existe nesta máquina sem
# instalar nada.
#
# A diferença estrutural: esta marca é TRAÇO, não preenchimento. Onde a anterior
# chamava DrawGeometry com um Brush, aqui vai um Pen — e a espessura do Pen é a
# geometria, não um enfeite.
Add-Type -AssemblyName PresentationCore, PresentationFramework, WindowsBase

$repo = "C:\Projetos\uma-estrelinha\store"
$out  = "$repo\apps\store\public"

# A máquina está em pt-BR: [double]"8.0" viraria 80. Parse invariante, sempre.
$inv = [System.Globalization.CultureInfo]::InvariantCulture

$svg = Get-Content "$repo\.specs\brand\uma-estrelinha\uma-estrelinha-simbolo-16.svg" -Raw
$d   = ([regex]::Match($svg, '<path d="([^"]+)"')).Groups[1].Value
$sw  = [double]::Parse(([regex]::Match($svg, 'stroke-width="([\d.]+)"')).Groups[1].Value, $inv)

$VB = 100.0   # o viewBox do símbolo reduzido é 0 0 100 100

$placa = [System.Windows.Media.ColorConverter]::ConvertFromString('#283A4A')  # primary-strong
$traco = [System.Windows.Media.ColorConverter]::ConvertFromString('#F7F3EC')  # on-primary

function Render-Icon {
  param([int]$Size, [Nullable[double]]$CornerPct, [string]$Path)

  # Sangrado: a arte ocupa o quadro inteiro. É o que dá o traço mais grosso, e
  # o extremo deste desenho (a ponta da estrela) fica na diagonal — canto
  # arredondado grande obrigaria a encolher.
  $scale = $Size / $VB

  $visual = New-Object System.Windows.Media.DrawingVisual
  $ctx = $visual.RenderOpen()

  $rect = New-Object System.Windows.Rect 0, 0, $Size, $Size
  $brushBase = New-Object System.Windows.Media.SolidColorBrush $placa
  if ($null -eq $CornerPct) {
    $ctx.DrawRectangle($brushBase, $null, $rect)
  } else {
    $r = $Size * $CornerPct
    $ctx.DrawRoundedRectangle($brushBase, $null, $rect, $r, $r)
  }

  # `Geometry.Parse` devolve geometria CONGELADA — atribuir `.Transform` nela
  # lança. A transformação vai no contexto.
  $geo = [System.Windows.Media.Geometry]::Parse($d)
  $pen = New-Object System.Windows.Media.Pen (New-Object System.Windows.Media.SolidColorBrush $traco), $sw
  $pen.StartLineCap = [System.Windows.Media.PenLineCap]::Round
  $pen.EndLineCap   = [System.Windows.Media.PenLineCap]::Round
  $pen.LineJoin     = [System.Windows.Media.PenLineJoin]::Round

  $ctx.PushTransform((New-Object System.Windows.Media.ScaleTransform $scale, $scale))
  $ctx.DrawGeometry($null, $pen, $geo)
  $ctx.Pop()

  $ctx.Close()

  $bmp = New-Object System.Windows.Media.Imaging.RenderTargetBitmap $Size, $Size, 96, 96, ([System.Windows.Media.PixelFormats]::Pbgra32)
  $bmp.Render($visual)

  $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bmp))
  $fs = [System.IO.File]::Create($Path)
  $enc.Save($fs)
  $fs.Close()

  "{0,-24} {1}x{1}  traço {2}px" -f (Split-Path $Path -Leaf), $Size, [math]::Round($sw * $scale, 2)
}

# Canto de 6% — a aba do navegador, que não recorta nada
Render-Icon -Size 16  -CornerPct 0.06 -Path "$out\favicon-16.png"
Render-Icon -Size 32  -CornerPct 0.06 -Path "$out\favicon-32.png"
Render-Icon -Size 48  -CornerPct 0.06 -Path "$out\favicon-48.png"
Render-Icon -Size 512 -CornerPct 0.06 -Path "$out\icon-512.png"

# Sangrado — o iOS aplica a própria máscara
Render-Icon -Size 180 -CornerPct $null -Path "$out\apple-touch-icon.png"
