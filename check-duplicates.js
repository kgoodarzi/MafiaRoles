const fs = require('fs');

// List of files to check
const htmlFiles = fs.readdirSync('.').filter(file => file.endsWith('.html'));

// Check each file for duplicate scripts
htmlFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for connection-status.js
    const connectionStatusCount = (content.match(/connection-status\.js/g) || []).length;
    if (connectionStatusCount > 1) {
      console.log(`${file} has ${connectionStatusCount} references to connection-status.js`);
    }
    
    // Check for supabase-init.js
    const supabaseInitCount = (content.match(/supabase-init\.js/g) || []).length;
    if (supabaseInitCount > 1) {
      console.log(`${file} has ${supabaseInitCount} references to supabase-init.js`);
    }
    
    // Check for duplicate database.js
    const databaseJsCount = (content.match(/database\.js/g) || []).length;
    if (databaseJsCount > 1) {
      console.log(`${file} has ${databaseJsCount} references to database.js`);
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
});

console.log('Check complete.'); 