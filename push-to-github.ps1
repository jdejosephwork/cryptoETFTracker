# Run this script to create the GitHub repo and push your code.
# You'll be prompted to log in to GitHub the first time.

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Set-Location $PSScriptRoot

# Step 1: Log in to GitHub (opens browser - do this once)
Write-Host "Logging in to GitHub..." -ForegroundColor Cyan
gh auth login -h github.com -p https -w

if ($LASTEXITCODE -ne 0) {
    Write-Host "Login failed or cancelled. Run 'gh auth login' manually." -ForegroundColor Red
    exit 1
}

# Step 2: Create repo and push
Write-Host "`nCreating repo and pushing code..." -ForegroundColor Cyan
gh repo create cryptoETFTracker --public --source=. --remote=origin --push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDone! Your repo is at: https://github.com/$((gh api user -q .login))/cryptoETFTracker" -ForegroundColor Green
} else {
    Write-Host "`nRepo may already exist. Try: git remote add origin https://github.com/YOUR_USERNAME/cryptoETFTracker.git" -ForegroundColor Yellow
    Write-Host "Then: git branch -M main; git push -u origin main" -ForegroundColor Yellow
}
