$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8088/')
$listener.Start()
Write-Output "HTTP server started on http://localhost:8088/"
$root = "C:\Users\Administrator\.gemini\antigravity-ide\scratch\doze-opo-shop"
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        $rel = $req.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
        $file = Join-Path $root $rel
        if (Test-Path $file -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            if ($ext -eq '.html') { $res.ContentType = 'text/html; charset=utf-8' }
            elseif ($ext -eq '.css') { $res.ContentType = 'text/css; charset=utf-8' }
            elseif ($ext -eq '.js') { $res.ContentType = 'application/javascript; charset=utf-8' }
            elseif ($ext -eq '.jpg' -or $ext -eq '.jpeg') { $res.ContentType = 'image/jpeg' }
            elseif ($ext -eq '.png') { $res.ContentType = 'image/png' }
            elseif ($ext -eq '.svg') { $res.ContentType = 'image/svg+xml' }
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.OutputStream.Close()
    } catch {
        # ignore client disconnect
    }
}
