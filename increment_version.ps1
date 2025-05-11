# PowerShell script to increment version number of an HTML file
param (
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

# Check if file exists
if (-not (Test-Path $FilePath)) {
    Write-Host "Error: File $FilePath does not exist."
    exit 1
}

# Read the file content
$content = Get-Content -Path $FilePath -Raw

# Check if the file has version information
if (-not ($content -match '<p>Version (\d+)\.(\d+)\.(\d+)<\/p>')) {
    Write-Host "Error: No version information found in $FilePath."
    exit 1
}

# Extract version components
$major = [int]$matches[1]
$minor = [int]$matches[2]
$patch = [int]$matches[3]

# Increment patch version
$newPatch = $patch + 1
$newVersion = "$major.$minor.$newPatch"

# Replace the version string
$newContent = $content -replace '<p>Version \d+\.\d+\.\d+<\/p>', "<p>Version $newVersion</p>"

# Write the updated content back to the file
Set-Content -Path $FilePath -Value $newContent

Write-Host "Updated $FilePath to version $newVersion" 