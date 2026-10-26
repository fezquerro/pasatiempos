# Genera los iconos PNG de la app (Windows PowerShell + System.Drawing)
# Uso: powershell -File tools\iconos.ps1
Add-Type -AssemblyName System.Drawing
$dest = Join-Path $PSScriptRoot "..\icons"

function Icono([int]$t, [string]$nombre, [double]$margen) {
  $bmp = New-Object System.Drawing.Bitmap $t, $t
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $fondo = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point $t, $t), ([System.Drawing.Color]::FromArgb(255, 35, 64, 110)), ([System.Drawing.Color]::FromArgb(255, 22, 38, 68))
  $g.FillRectangle($fondo, 0, 0, $t, $t)

  $colores = @(
    [System.Drawing.Color]::FromArgb(255, 83, 160, 98),
    [System.Drawing.Color]::FromArgb(255, 222, 180, 60),
    [System.Drawing.Color]::FromArgb(255, 245, 245, 240),
    [System.Drawing.Color]::FromArgb(255, 222, 92, 80)
  )
  $letras = @('Ñ', 'A', '9', 'E')
  $texto = @('White', 'White', 'Black', 'White')
  $m = $t * $margen
  $hueco = $t * 0.05
  $lado = ($t - 2 * $m - $hueco) / 2
  $fuente = New-Object System.Drawing.Font 'Segoe UI', ([single]($lado * 0.55)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
  for ($i = 0; $i -lt 4; $i++) {
    $x = $m + ($i % 2) * ($lado + $hueco)
    $y = $m + [math]::Floor($i / 2) * ($lado + $hueco)
    $r = $lado * 0.16
    $ruta = New-Object System.Drawing.Drawing2D.GraphicsPath
    $ruta.AddArc($x, $y, 2 * $r, 2 * $r, 180, 90)
    $ruta.AddArc($x + $lado - 2 * $r, $y, 2 * $r, 2 * $r, 270, 90)
    $ruta.AddArc($x + $lado - 2 * $r, $y + $lado - 2 * $r, 2 * $r, 2 * $r, 0, 90)
    $ruta.AddArc($x, $y + $lado - 2 * $r, 2 * $r, 2 * $r, 90, 90)
    $ruta.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush $colores[$i]), $ruta)
    $pincel = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromName($texto[$i]))
    $g.DrawString($letras[$i], $fuente, $pincel, (New-Object System.Drawing.RectangleF $x, ($y + $lado * 0.03), $lado, $lado), $sf)
  }
  $bmp.Save((Join-Path $dest $nombre), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Icono 180 'apple-touch-icon.png' 0.14
Icono 192 'icon-192.png' 0.14
Icono 512 'icon-512.png' 0.14
Icono 512 'icon-maskable-512.png' 0.22
