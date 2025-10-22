# PowerShell pre-push hook for Windows
# Usage: copy this file to .git/hooks/pre-push.ps1 and ensure Git calls PowerShell for hooks.
# You can create a small shim at .git/hooks/pre-push that calls: pwsh -File hooks/pre-push.ps1

$branch = git rev-parse --abbrev-ref HEAD
$commitId = git rev-parse --short HEAD
$stagedDiff = git diff --staged

$payload = @{ branch = $branch; commitId = $commitId; diff = $stagedDiff } | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri 'http://localhost:8080/git-hook' -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 10
    Write-Host "Code analysis sent to frontend (http://localhost:8080/git-hook) for branch=$branch commit=$commitId"
} catch {
    try {
        Invoke-RestMethod -Uri 'http://localhost:3001/git-hook' -Method Post -ContentType 'application/json' -Body $payload -TimeoutSec 10
        Write-Host "Code analysis sent to backend (http://localhost:3001/git-hook) for branch=$branch commit=$commitId"
    } catch {
        Write-Host "Failed to send analysis to both frontend and backend: $_" -ForegroundColor Red
        exit 1
    }
}
