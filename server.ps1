$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $PSScriptRoot) { $PSScriptRoot = (Get-Location).Path }
$root = $PSScriptRoot

$port = 8088
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Error "Failed to start listener on $prefix : $_"
    exit 1
}

Write-Output "HTTP server started on $prefix"
Write-Output "Serving files from: $root"

$mimeTypes = @{
    '.html'  = 'text/html; charset=utf-8'
    '.htm'   = 'text/html; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.js'    = 'application/javascript; charset=utf-8'
    '.json'  = 'application/json; charset=utf-8'
    '.jpg'   = 'image/jpeg'
    '.jpeg'  = 'image/jpeg'
    '.png'   = 'image/png'
    '.gif'   = 'image/gif'
    '.webp'  = 'image/webp'
    '.svg'   = 'image/svg+xml'
    '.ico'   = 'image/x-icon'
    '.woff'  = 'font/woff'
    '.woff2' = 'font/woff2'
    '.ttf'   = 'font/ttf'
    '.otf'   = 'font/otf'
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response

        $res.Headers.Add("Access-Control-Allow-Origin", "*")

        $rel = [System.Uri]::UnescapeDataString($req.Url.LocalPath).TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
        $rel = $rel -replace '/', [System.IO.Path]::DirectorySeparatorChar
        $file = Join-Path $root $rel

        if (Test-Path $file -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            if ($mimeTypes.ContainsKey($ext)) {
                $res.ContentType = $mimeTypes[$ext]
            } else {
                $res.ContentType = 'application/octet-stream'
            }
            $res.ContentLength64 = $bytes.Length
            if ($req.HttpMethod -ne 'HEAD') {
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        } else {
            $res.StatusCode = 404
            $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rel")
            $res.ContentType = "text/plain; charset=utf-8"
            $res.ContentLength64 = $notFoundBytes.Length
            if ($req.HttpMethod -ne 'HEAD') {
                $res.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
            }
        }
        $res.OutputStream.Close()
    } catch {
        # ignore client disconnect
    }
}
