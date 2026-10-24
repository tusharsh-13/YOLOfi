$release = Invoke-RestMethod 'https://api.github.com/repos/foundry-rs/foundry/releases/latest'
$asset = $release.assets | Where-Object { $_.name -like '*win32*amd64*' -and $_.name -like '*.zip' }
$url = $asset.browser_download_url
Write-Host "Downloading from: $url"
Invoke-WebRequest -Uri $url -OutFile 'foundry.zip'
Expand-Archive -Path 'foundry.zip' -DestinationPath 'foundry' -Force
$env:PATH += ";$PWD\foundry"
Write-Host "Foundry installed to $PWD\foundry"