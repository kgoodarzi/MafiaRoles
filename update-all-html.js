const fs = require('fs');
const path = require('path');

// List of files to update
const htmlFiles = [
  'index.html',
  'player-selection.html',
  'roles.html',
  'about.html',
  'role-selection.html',
  'game.html',
  'summary.html',
  'add-player.html',
  'edit-player.html'
];

// Skip test files
const skipFiles = ['test-supabase.html', 'font-test.html'];

// Pattern to search for and replace
const oldPattern = `<!-- Supabase JS -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <!-- Simplified database connection -->
    <script>
        // Simple database connection
        if (!window.SUPABASE_URL) {
            window.SUPABASE_URL = 'https://isagurhfcktnnldvntse.supabase.co';
            window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzYWd1cmhmY2t0bm5sZHZudHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNTY4NTAsImV4cCI6MjA1OTkzMjg1MH0.WYOhUCj5wD7AUCuxpDerOkwV_XvBAGapTEztRoJC2Q0';
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            try {
                console.log('Initializing Supabase client...');
                if (!window.supabase) {
                    window.supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
                    console.log('Supabase client initialized successfully');
                } else {
                    console.log('Using existing Supabase client');
                }
            } catch (error) {
                console.error('Error initializing Supabase client:', error);
            }
        });
    </script>`;

const newPattern = `<!-- Supabase JS -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <!-- Supabase initialization -->
    <script src="supabase-init.js"></script>
    <!-- Connection status -->
    <script src="connection-status.js"></script>`;

// Update files
htmlFiles.forEach(file => {
    if (skipFiles.includes(file)) {
        console.log(`Skipping ${file} as it's in the skip list`);
        return;
    }
    
    try {
        // Read file
        let content = fs.readFileSync(file, 'utf8');
        
        // Check if it has the old pattern or a variation of it
        if (content.includes('<!-- Simplified database connection -->')) {
            // Replace the pattern - this handles different indentation
            let updated = content.replace(/<!-- Supabase JS -->\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>\s*<!-- Simplified database connection -->\s*<script>[\s\S]*?<\/script>/m, newPattern);
            
            // Write back to file
            fs.writeFileSync(file, updated, 'utf8');
            console.log(`Updated ${file} successfully`);
        } else if (content.includes('<!-- Supabase JS -->')) {
            // Already updated or different format
            console.log(`File ${file} doesn't match the pattern, checking if it needs updating`);
            
            // Check if it already has supabase-init.js
            if (content.includes('supabase-init.js')) {
                console.log(`File ${file} already updated`);
            } else {
                // Replace just the script tag
                let updated = content.replace(/<!-- Supabase JS -->\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>/m, newPattern);
                fs.writeFileSync(file, updated, 'utf8');
                console.log(`Updated ${file} with new pattern`);
            }
        } else {
            console.log(`File ${file} doesn't have Supabase JS tag, skipping`);
        }
    } catch (error) {
        console.error(`Error updating ${file}:`, error);
    }
});

console.log('Update complete!'); 