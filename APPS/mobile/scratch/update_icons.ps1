Add-Type -AssemblyName System.Drawing
$sourcePath = "D:\NEW SPH FRESH\Version\app\app\APPS\mobile\assets\app_icon.png"
$srcImg = [System.Drawing.Image]::FromFile($sourcePath)

$densities = @{
    'mipmap-mdpi'    = 48
    'mipmap-hdpi'    = 72
    'mipmap-xhdpi'   = 96
    'mipmap-xxhdpi'  = 144
    'mipmap-xxxhdpi' = 192
}

$resBase = "D:\NEW SPH FRESH\Version\app\app\APPS\mobile\android\app\src\main\res"

foreach ($folder in $densities.Keys) {
    $size = $densities[$folder]
    $destDir = Join-Path $resBase $folder
    if (Test-Path $destDir) {
        $bmp = New-Object System.Drawing.Bitmap $size, $size
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($srcImg, 0, 0, $size, $size)
        $g.Dispose()

        $launcherPath = Join-Path $destDir "ic_launcher.png"
        $roundPath = Join-Path $destDir "ic_launcher_round.png"
        $forePath = Join-Path $destDir "ic_launcher_foreground.png"

        if (Test-Path $launcherPath) { [System.IO.File]::Delete($launcherPath) }
        if (Test-Path $roundPath) { [System.IO.File]::Delete($roundPath) }
        if (Test-Path $forePath) { [System.IO.File]::Delete($forePath) }

        $bmp.Save($launcherPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Save($forePath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        Write-Output "Updated $folder ($size x $size)"
    }
}
$srcImg.Dispose()
Write-Output "All mipmap launcher icons successfully updated with app_icon.png!"
