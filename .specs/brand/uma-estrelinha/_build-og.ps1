# Gera `apps/store/public/og-image.png` — o card de compartilhamento (1200x630).
#
# Ate a T35 a `og:image` apontava para um bucket do template original
# (`storage.googleapis.com/gpt-engineer-file-uploads/...`): arte de outro
# produto, servida por um CDN de terceiro que ninguem deste projeto controla.
#
# ── Por que o LOCKUP aqui, e so aqui ────────────────────────────────────────
#
# O piso do lockup completo e 600px de largura (a assinatura mede 1,5 em 900 =
# 0,167% da largura; abaixo de 600 o traco nao chega a 1px e sai como cinza de
# antialias). Nenhuma superficie de TELA da loja comporta isso: a coluna de
# marca do rodape tem 337px e a viewport de projeto, 390. O card social tem
# 1200 — e a primeira superficie do produto onde o degrau 1 da escada cabe de
# verdade. A 720px de largura o traco rende 4,8px.
#
# Mesma toolchain do `_raster-icons.ps1`: WPF, Pen (nao Brush), porque esta
# marca e TRACO. Rode da raiz:
#
#     powershell -ExecutionPolicy Bypass -File .specs/brand/uma-estrelinha/_build-og.ps1
Add-Type -AssemblyName PresentationCore, PresentationFramework, WindowsBase

$repo = "C:\Projetos\uma-estrelinha\store"
$out  = "$repo\apps\store\public\og-image.png"
$src  = "$repo\.specs\brand\uma-estrelinha\uma-estrelinha-lockup.svg"

# A maquina esta em pt-BR: [double]"6.02" viraria 602. Parse invariante, sempre.
$inv = [System.Globalization.CultureInfo]::InvariantCulture

$svg = Get-Content $src -Raw
$vb  = ([regex]::Match($svg, 'viewBox="0 0 ([\d.]+) ([\d.]+)"'))
$vbW = [double]::Parse($vb.Groups[1].Value, $inv)
$vbH = [double]::Parse($vb.Groups[2].Value, $inv)

# Um <path> por PAPEL DE TRACO (o que a T24 consolidou): cada um tem a sua
# espessura, e a espessura e geometria.
$paths = [regex]::Matches($svg, '<path d="([^"]+)"[^>]*stroke="(#[0-9A-Fa-f]{6})"[^>]*stroke-width="([\d.]+)"')

$W = 1200
$H = 630
$MARCA = 720.0   # largura da arte no card — 120px acima do piso de 600

$GROUND = [System.Windows.Media.ColorConverter]::ConvertFromString('#FAF8F4')  # o chao da loja

$scale = $MARCA / $vbW
$x = ($W - $MARCA) / 2
$y = ($H - $vbH * $scale) / 2

$visual = New-Object System.Windows.Media.DrawingVisual
$ctx = $visual.RenderOpen()

$ctx.DrawRectangle((New-Object System.Windows.Media.SolidColorBrush $GROUND), $null, (New-Object System.Windows.Rect 0, 0, $W, $H))

$ctx.PushTransform((New-Object System.Windows.Media.TranslateTransform $x, $y))
$ctx.PushTransform((New-Object System.Windows.Media.ScaleTransform $scale, $scale))

foreach ($p in $paths) {
  $d  = $p.Groups[1].Value
  $cor = [System.Windows.Media.ColorConverter]::ConvertFromString($p.Groups[2].Value)
  $sw = [double]::Parse($p.Groups[3].Value, $inv)

  # `Geometry.Parse` devolve geometria CONGELADA — atribuir `.Transform` lanca.
  $geo = [System.Windows.Media.Geometry]::Parse($d)
  $pen = New-Object System.Windows.Media.Pen (New-Object System.Windows.Media.SolidColorBrush $cor), $sw
  $pen.StartLineCap = [System.Windows.Media.PenLineCap]::Round
  $pen.EndLineCap   = [System.Windows.Media.PenLineCap]::Round
  $pen.LineJoin     = [System.Windows.Media.PenLineJoin]::Round
  $ctx.DrawGeometry($null, $pen, $geo)

  "path traco {0} -> {1}px no card" -f $sw, [math]::Round($sw * $scale, 2)
}

$ctx.Pop()
$ctx.Pop()
$ctx.Close()

$bmp = New-Object System.Windows.Media.Imaging.RenderTargetBitmap $W, $H, 96, 96, ([System.Windows.Media.PixelFormats]::Pbgra32)
$bmp.Render($visual)

$enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
$enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bmp))
$fs = [System.IO.File]::Create($out)
$enc.Save($fs)
$fs.Close()

"og-image.png  {0}x{1}  marca {2}px de largura" -f $W, $H, $MARCA
