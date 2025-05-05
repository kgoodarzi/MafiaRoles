# PowerShell script to get Supabase buckets

$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzYWd1cmhmY2t0bm5sZHZudHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNTY4NTAsImV4cCI6MjA1OTkzMjg1MH0.WYOhUCj5wD7AUCuxpDerOkwV_XvBAGapTEztRoJC2Q0"
$supabaseUrl = "https://isagurhfcktnnldvntse.supabase.co"

$headers = @{
    "apikey" = $apiKey
    "Authorization" = "Bearer $apiKey"
}

$buckets = Invoke-RestMethod -Uri "$supabaseUrl/storage/v1/bucket" -Headers $headers
$buckets | Format-Table id, name, public, created_at 