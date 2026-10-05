# Rasteriza a assinatura NEGATIVA para o cabeçalho dos e-mails (feature 60, AD-045).
#
# Por que PNG: o Gmail remove SVG (inline e em <img>) e o Outlook desktop não o renderiza.
# Mesma toolchain de _raster-icons.ps1 — WPF, que existe nesta máquina sem instalar nada.
#
# O que sai, e por quê:
#   - 606 x 132, exatamente 3x a caixa exibida no e-mail (202 x 44, EMAIL_BRAND em
#     supabase/functions/send-notification/render/layout.ts). 3x cobre o celular de alta densidade.
#   - Fundo #283A4A (primary-strong, a cor da faixa) gravado em TODOS os pixels. Se o modo escuro de
#     um cliente clarear a faixa, um PNG transparente com traço claro desapareceria; opaco, a marca
#     continua num retângulo da cor certa.
#   - Traço #F7F3EC (on-primary), com a espessura de cada <path> do SVG-fonte: espessura é geometria
#     nesta marca, e um Pen por papel de traço preserva o desenho.
#
# O arquivo é IMUTÁVEL depois de publicado: e-mails entregues apontam para ele para sempre. Este
# script se recusa a sobrescrever; arte nova entra como v2, com o caminho novo em EMAIL_BRAND.
Add-Type -AssemblyName PresentationCore, PresentationFramework, WindowsBase

$repo = "C:\Projetos\uma-estrelinha\store"
$src  = "$repo\.specs\brand\uma-estrelinha\uma-estrelinha-assinatura-negativo.svg"
$dir  = "$repo\apps\store\public\email"
$out  = "$dir\assinatura-v1@3x.png"

if (Test-Path $out) {
  throw "$out ja existe e e IMUTAVEL (AD-045). Arte nova vai para assinatura-v2@3x.png."
}
New-Item -ItemType Directory -Force $dir | Out-Null

# A máquina está em pt-BR: [double]"2.4" viraria 24. Parse invariante, sempre.
$inv = [System.Globalization.CultureInfo]::InvariantCulture

$svg = Get-Content $src -Raw
$vb  = [regex]::Match($svg, 'viewBox="0 0 ([\d.]+) ([\d.]+)"')
$vbW = [double]::Parse($vb.Groups[1].Value, $inv)
$vbH = [double]::Parse($vb.Groups[2].Value, $inv)

# Os <path> podem quebrar linha dentro do `d` — (?s) para o ponto atravessar.
$paths = [regex]::Matches($svg, '(?s)<path d="([^"]+)"[^>]*?stroke-width="([\d.]+)"')
if ($paths.Count -lt 1) { throw "nenhum <path> com stroke-width em $src" }

$W = 606
$H = 132
$k = $W / $vbW
$offY = ($H - $vbH * $k) / 2

$placa = [System.Windows.Media.ColorConverter]::ConvertFromString('#283A4A')  # primary-strong
$traco = [System.Windows.Media.ColorConverter]::ConvertFromString('#F7F3EC')  # on-primary

$visual = New-Object System.Windows.Media.DrawingVisual
$ctx = $visual.RenderOpen()
$ctx.DrawRectangle((New-Object System.Windows.Media.SolidColorBrush $placa), $null, (New-Object System.Windows.Rect 0, 0, $W, $H))

# `Geometry.Parse` devolve geometria CONGELADA — a transformação vai no contexto.
$ctx.PushTransform((New-Object System.Windows.Media.TranslateTransform 0, $offY))
$ctx.PushTransform((New-Object System.Windows.Media.ScaleTransform $k, $k))
foreach ($p in $paths) {
  $geo = [System.Windows.Media.Geometry]::Parse(($p.Groups[1].Value -replace '\s+', ' ').Trim())
  $sw  = [double]::Parse($p.Groups[2].Value, $inv)
  $pen = New-Object System.Windows.Media.Pen (New-Object System.Windows.Media.SolidColorBrush $traco), $sw
  $pen.StartLineCap = [System.Windows.Media.PenLineCap]::Round
  $pen.EndLineCap   = [System.Windows.Media.PenLineCap]::Round
  $pen.LineJoin     = [System.Windows.Media.PenLineJoin]::Round
  $ctx.DrawGeometry($null, $pen, $geo)
  "traço {0} -> {1}px no arquivo, {2}px exibido" -f $sw, [math]::Round($sw * $k, 2), [math]::Round($sw * $k / 3, 2)
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

"{0}  {1}x{2}  {3} bytes" -f (Split-Path $out -Leaf), $W, $H, (Get-Item $out).Length
