Add-Type -AssemblyName System.Drawing

$srcPath = Resolve-Path "./icons/vku-logo.jpg"
$iconsDir = Resolve-Path "./icons"

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$srcW = $srcBmp.Width
$srcH = $srcBmp.Height

# Function to render icon with high quality
function Create-PWA-Icon {
    param(
        [int]$canvasSize,
        [int]$logoW,
        [int]$logoH,
        [string]$outFileName
    )

    $destBmp = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)

    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Fill canvas with crisp white
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $g.FillRectangle($brush, 0, 0, $canvasSize, $canvasSize)

    # Center position
    $x = ($canvasSize - $logoW) / 2
    $y = ($canvasSize - $logoH) / 2

    $destRect = New-Object System.Drawing.Rectangle($x, $y, $logoW, $logoH)
    $g.DrawImage($srcBmp, $destRect, 0, 0, $srcW, $srcH, [System.Drawing.GraphicsUnit]::Pixel)

    $outPath = Join-Path $iconsDir $outFileName
    $destBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $brush.Dispose()
    $destBmp.Dispose()
    Write-Output "Created: $outFileName ($canvasSize x $canvasSize)"
}

# 1. icon-512.png (512x512)
# Logo width 440, height 440 * 160 / 250 = 282
Create-PWA-Icon -canvasSize 512 -logoW 440 -logoH 282 -outFileName "icon-512.png"

# 2. icon-192.png (192x192)
# Logo width 165, height 165 * 160 / 250 = 106
Create-PWA-Icon -canvasSize 192 -logoW 165 -logoH 106 -outFileName "icon-192.png"

# 3. icon-maskable.png (512x512, safe area inside circle radius 204px)
# Logo width 330, height 330 * 160 / 250 = 211
Create-PWA-Icon -canvasSize 512 -logoW 330 -logoH 211 -outFileName "icon-maskable.png"

# 4. vku-logo.png (Clean PNG direct from source, width 500, height 320)
$logoBmp = New-Object System.Drawing.Bitmap(500, 320, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gLogo = [System.Drawing.Graphics]::FromImage($logoBmp)
$gLogo.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gLogo.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gLogo.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gLogo.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$gLogo.FillRectangle($whiteBrush, 0, 0, 500, 320)
$gLogo.DrawImage($srcBmp, 0, 0, 500, 320)
$logoBmp.Save((Join-Path $iconsDir "vku-logo.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$gLogo.Dispose()
$whiteBrush.Dispose()
$logoBmp.Dispose()
Write-Output "Created: vku-logo.png (500 x 320)"

$srcBmp.Dispose()
Write-Output "All PNG icons successfully generated!"
