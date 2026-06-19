param(
  [string]$Message = "Update training media system",
  [string]$Remote = "origin",
  [string]$Branch = "",
  [string]$UserName = "pisakron-netizen",
  [string]$UserEmail = "pisakron-netizen@users.noreply.github.com",
  [switch]$NoPull
)

$ErrorActionPreference = "Stop"

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)

  Write-Host ""
  Write-Host "git $($GitArgs -join ' ')" -ForegroundColor Cyan
  & git @GitArgs

  if ($LASTEXITCODE -ne 0) {
    throw "Git command failed: git $($GitArgs -join ' ')"
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is not installed or is not available in PATH."
}

$repoRoot = (& git rev-parse --show-toplevel 2>$null).Trim()
if (-not $repoRoot) {
  throw "This folder is not inside a Git repository."
}

Set-Location $repoRoot

if ($UserName) {
  Invoke-Git config user.name $UserName
}

if ($UserEmail) {
  Invoke-Git config user.email $UserEmail
}

$gitUserName = (& git config user.name 2>$null).Trim()
$gitUserEmail = (& git config user.email 2>$null).Trim()

if (-not $gitUserName -or -not $gitUserEmail) {
  throw "Git needs your commit name and email. Run this script again with -UserName `"Your Name`" -UserEmail `"you@example.com`", or set them once with git config --global user.name and git config --global user.email."
}

if (-not $Branch) {
  $Branch = (& git branch --show-current).Trim()
}

if (-not $Branch) {
  throw "Cannot push because this repository is in detached HEAD state. Pass -Branch explicitly."
}

$remoteUrl = (& git remote get-url $Remote 2>$null).Trim()
if (-not $remoteUrl) {
  throw "Remote '$Remote' was not found."
}

Write-Host "Repository: $repoRoot" -ForegroundColor Green
Write-Host "Remote:     $Remote ($remoteUrl)" -ForegroundColor Green
Write-Host "Branch:     $Branch" -ForegroundColor Green
Write-Host "Commit as:  $gitUserName <$gitUserEmail>" -ForegroundColor Green

Invoke-Git status --short
Invoke-Git add -A

& git diff --cached --quiet
$hasStagedChanges = $LASTEXITCODE -ne 0

if ($hasStagedChanges) {
  Invoke-Git commit -m $Message
} else {
  Write-Host ""
  Write-Host "No changes to commit. Continuing to push current branch." -ForegroundColor Yellow
}

if (-not $NoPull) {
  Invoke-Git pull --rebase $Remote $Branch
}

Invoke-Git push $Remote $Branch

Write-Host ""
Write-Host "Done. Changes are pushed to GitHub." -ForegroundColor Green
