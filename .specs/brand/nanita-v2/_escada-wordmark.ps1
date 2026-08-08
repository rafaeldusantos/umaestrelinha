# Rasteriza o wordmark em larguras de header reais, para achar onde a fileira de marcas embola.
Add-Type -AssemblyName PresentationCore, PresentationFramework, WindowsBase

$dir = "C:\Users\RAFAEL~1.SAN\AppData\Local\Temp\claude\c--Projetos-nanapin-store\b30bbc4f-db8c-4dde-bd63-b971c5ed0ffb\scratchpad"
$svg = Get-Content "$dir\nanita-wordmark.svg" -Raw
$d = ([regex]::Match($svg, '<path fill-rule="evenodd" d="([^"]+)"')).Groups[1].Value
$vb = ([regex]::Match($svg, 'viewBox="0 0 ([\d.]+) ([\d.]+)"'))
# A máquina está em pt-BR: [double]"690.06" viraria 69006. Parse invariante, sempre.
$inv = [System.Globalization.CultureInfo]::InvariantCulture
$vw = [double]::Parse($vb.Groups[1].Value, $inv)
$vh = [double]::Parse($vb.Groups[2].Value, $inv)
"viewBox: $vw x $vh   (proporção $([math]::Round($vw/$vh,2)):1)"

$ink   = New-Object System.Windows.Media.SolidColorBrush ([System.Windows.Media.ColorConverter]::ConvertFromString('#F1678D'))
$paper = New-Object System.Windows.Media.SolidColorBrush ([System.Windows.Media.ColorConverter]::ConvertFromString('#F9F1EE'))

# larguras de header plausíveis + duas abaixo do razoável, para ver o limite
$widths = 72, 90, 110, 132, 150, 180
$pad = 12
$totalH = 0
foreach ($w in $widths) { $totalH += [int]($w * $vh / $vw) + $pad * 2 }

$visual = New-Object System.Windows.Media.DrawingVisual
$dc = $visual.RenderOpen()
$dc.DrawRectangle($paper, $null, (New-Object System.Windows.Rect 0, 0, 260, $totalH))
$y = 0
foreach ($w in $widths) {
  $h = $w * $vh / $vw
  # F0 = even-odd. O padrão do mini-language do WPF é nonzero, que fecharia os contadores.
  $geo = [System.Windows.Media.Geometry]::Parse("F0 $d").Clone()
  $tg = New-Object System.Windows.Media.TransformGroup
  $tg.Children.Add((New-Object System.Windows.Media.ScaleTransform ($w / $vw), ($w / $vw)))
  $tg.Children.Add((New-Object System.Windows.Media.TranslateTransform 16, ($y + $pad)))
  $geo.Transform = $tg
  $dc.DrawGeometry($ink, $null, $geo)
  $y += [int]$h + $pad * 2
}
$dc.Close()

$rtb = New-Object System.Windows.Media.Imaging.RenderTargetBitmap 260, $totalH, 96, 96, ([System.Windows.Media.PixelFormats]::Pbgra32)
$rtb.Render($visual)
$enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
[void]$enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($rtb))
$fs = [System.IO.File]::Create("$dir\wordmark-escada.png")
$enc.Save($fs); $fs.Dispose()

foreach ($w in $widths) {
  $h = [math]::Round($w * $vh / $vw, 1)
  $stroke = [math]::Round(33 * $w / $vw, 2)
  $rect = [math]::Round(29 * $w / $vw, 2)
  $diam = [math]::Round(44 * $w / $vw, 2)
  "largura {0,3}px -> altura {1,5}px | haste {2,4}px | barra {3,4}px | losango {4,4}px" -f $w, $h, $stroke, $rect, $diam
}
