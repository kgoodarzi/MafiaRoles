# PowerShell script to add version information to all HTML files
# Get all HTML files in the current directory
$htmlFiles = Get-ChildItem -Filter "*.html"

foreach ($file in $htmlFiles) {
    Write-Host "Processing $($file.Name)..."
    
    # Read the file content
    $content = Get-Content -Path $file.FullName -Raw
    
    # Check if the file already has version information
    if ($content -match '<p>Version \d+\.\d+\.\d+<\/p>') {
        Write-Host "  Version information already exists in $($file.Name), skipping..."
        continue
    }
    
    # Replace footer section with copyright and version (with proper indentation)
    $newContent = $content -replace '(<footer>[\s\r\n]*<p>&copy;.*?<\/p>[\s\r\n]*)(</footer>)', '$1            <p>Version 1.0.0</p>
        $2'
    
    # Write the updated content back to the file
    Set-Content -Path $file.FullName -Value $newContent
    
    Write-Host "  Added version 1.0.0 to $($file.Name)"
}

Write-Host "All HTML files processed successfully!" 