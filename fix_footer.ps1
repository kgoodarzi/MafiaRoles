# PowerShell script to fix the footer structure in all HTML files
# Get all HTML files in the current directory
$htmlFiles = Get-ChildItem -Filter "*.html"

foreach ($file in $htmlFiles) {
    Write-Host "Processing $($file.Name)..."
    
    # Read the file content
    $content = Get-Content -Path $file.FullName -Raw
    
    # Fix footer structure
    if ($content -match '<footer>[\s\r\n]*<p>&copy;.*?<\/p>[\s\r\n]*<p>Version \d+\.\d+\.\d+<\/p>[\s\r\n]*<\/footer>') {
        # Footer is already correct
        Write-Host "  Footer is already correct in $($file.Name), skipping..."
        continue
    }
    
    # Fix malformed version line
    if ($content -match '<footer>[\s\r\n]*<p>&copy;.*?<\/p>[\s\r\n]*<p>Version \d+\.\d+\.\d+<\/p>[\s\r\n]*') {
        # Replace entire footer with properly formatted one
        $newContent = $content -replace '(<footer>[\s\r\n]*<p>&copy;.*?<\/p>[\s\r\n]*<p>Version \d+\.\d+\.\d+<\/p>)[\s\r\n]*(</footer>|)', '$1
            </footer>'
        
        # Write the updated content back to the file
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "  Fixed footer structure in $($file.Name)"
    }
    # If footer has version but is malformed
    elseif ($content -match '<footer>[\s\r\n]*<p>&copy;.*?<\/p>[\s\r\n]*<p>Version') {
        $newContent = $content -replace '(<footer>[\s\r\n]*<p>&copy;.*?<\/p>[\s\r\n]*<p>Version [0-9.]+<\/p>)[\s\r\n]*(</footer>|)', '$1
            </footer>'
        
        # Write the updated content back to the file
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "  Fixed malformed footer in $($file.Name)"
    }
    # If footer doesn't have version at all
    else {
        $newContent = $content -replace '(<footer>[\s\r\n]*<p>&copy;.*?<\/p>)[\s\r\n]*(</footer>)', '$1
            <p>Version 1.0.0</p>
        $2'
        
        # Write the updated content back to the file
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "  Added version and fixed footer in $($file.Name)"
    }
}

Write-Host "All HTML files processed successfully!" 