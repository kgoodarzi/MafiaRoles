param(
    [string]$CommitMessage
)

if (-not $CommitMessage) {
    $CommitMessage = "Automated commit: Update project files"
    Write-Host "No commit message provided. Using default: '$CommitMessage'"
}

git add .
git commit -m "$CommitMessage"
git push