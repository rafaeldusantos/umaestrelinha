# Rasteriza os ícones da Nanita a partir do monograma canônico.
# Mesma toolchain de `.specs/brand/nanita-v2/_escada-wordmark.ps1`: WPF, que é o
# que existe nesta máquina sem instalar nada.
#
# `F0` na frente do path é obrigatório: é o `fill-rule="evenodd"` do SVG. Sem
# ele o contador do N é pintado por cima e a letra sai maciça.
Add-Type -AssemblyName PresentationCore, PresentationFramework, WindowsBase

$repo = "C:\Projetos\nanapin-store"
$out  = "$repo\apps\store\public"

# A máquina está em pt-BR: [double]"126.87" viraria 12687. Parse invariante, sempre.
$inv = [System.Globalization.CultureInfo]::InvariantCulture

$svg = Get-Content "$repo\.specs\brand\nanita-v2\nanita-monogram-n.svg" -Raw
$d   = ([regex]::Match($svg, '<path[^>]*\sd="([^"]+)"')).Groups[1].Value

$VBW = 126.87
$VBH = 160.18
$STEM = 31.59 / $VBW   # a haste esquerda do N — 24,9% da largura

$carimbo = [System.Windows.Media.ColorConverter]::ConvertFromString('#F1678D')
$grafite = [System.Windows.Media.ColorConverter]::ConvertFromString('#2E2028')

function Render-Icon {
  param([int]$Size, [double]$StemAt16, [Nullable[double]]$CornerPct, [string]$Path)

  $scale = ($StemAt16 / $STEM / 16.0) * ($Size / $VBW)
  $w = $VBW * $scale
  $h = $VBH * $scale
  $x = ($Size - $w) / 2.0
  $y = ($Size - $h) / 2.0

  $visual = New-Object System.Windows.Media.DrawingVisual
  $ctx = $visual.RenderOpen()

  # Base
  $rect = New-Object System.Windows.Rect 0, 0, $Size, $Size
  $brushBase = New-Object System.Windows.Media.SolidColorBrush $carimbo
  if ($null -eq $CornerPct) {
    $ctx.DrawRectangle($brushBase, $null, $rect)
  } else {
    $r = $Size * $CornerPct
    $ctx.DrawRoundedRectangle($brushBase, $null, $rect, $r, $r)
  }

  # O N. `Geometry.Parse` devolve geometria CONGELADA — atribuir `.Transform`
  # nela falha em silêncio útil (lança), então a transformação vai no contexto.
  $geo = [System.Windows.Media.Geometry]::Parse("F0 $d")
  $tg = New-Object System.Windows.Media.TransformGroup
  $tg.Children.Add((New-Object System.Windows.Media.ScaleTransform $scale, $scale))
  $tg.Children.Add((New-Object System.Windows.Media.TranslateTransform $x, $y))
  $ctx.PushTransform($tg)
  $ctx.DrawGeometry((New-Object System.Windows.Media.SolidColorBrush $grafite), $null, $geo)
  $ctx.Pop()

  $ctx.Close()

  $bmp = New-Object System.Windows.Media.Imaging.RenderTargetBitmap $Size, $Size, 96, 96, ([System.Windows.Media.PixelFormats]::Pbgra32)
  $bmp.Render($visual)

  $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bmp))
  $fs = [System.IO.File]::Create($Path)
  $enc.Save($fs)
  $fs.Close()

  "{0,-28} {1}x{1}  haste {2}px  escala {3}" -f (Split-Path $Path -Leaf), $Size, $StemAt16, [math]::Round($scale, 4)
}

# Squircle (canto 28%) — aba do navegador e ícone grande
Render-Icon -Size 16  -StemAt16 2.5 -CornerPct 0.28 -Path "$out\favicon-16.png"
Render-Icon -Size 32  -StemAt16 2.5 -CornerPct 0.28 -Path "$out\favicon-32.png"
Render-Icon -Size 48  -StemAt16 2.5 -CornerPct 0.28 -Path "$out\favicon-48.png"
Render-Icon -Size 512 -StemAt16 2.5 -CornerPct 0.28 -Path "$out\icon-512.png"

# Quadrado sangrado — o iOS aplica a própria máscara
Render-Icon -Size 180 -StemAt16 2.6 -CornerPct $null -Path "$out\apple-touch-icon.png"
