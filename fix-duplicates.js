const fs = require('fs');

// List of files to check and fix
const htmlFiles = [
  'about.html',
  'role-selection.html',
  'game.html',
  'summary.html',
  'edit-player.html'
];

// Fix each file with duplicate references
htmlFiles.forEach(file => {
  try {
    console.log(`Processing ${file}...`);
    
    // Read file
    let content = fs.readFileSync(file, 'utf8');
    
    // Check for duplicate connection-status.js
    const connectionStatusCount = (content.match(/connection-status\.js/g) || []).length;
    if (connectionStatusCount > 1) {
      console.log(`  - ${file} has ${connectionStatusCount} references to connection-status.js, fixing...`);
      
      // Remove duplicate reference - this pattern searches for any script tag that includes connection-status.js
      // that comes after the first one
      const pattern = /(<script\s+src="connection-status\.js"><\/script>[\s\n]*)(.*?)(<script\s+src="connection-status\.js"><\/script>)/s;
      
      // Another pattern to check for <!-- Connection Status --> style comments
      const commentPattern = /(<!-- Connection status -->[\s\n]*<script\s+src="connection-status\.js"><\/script>[\s\n]*)(.*?)(<!-- Connection Status -->[\s\n]*<script\s+src="connection-status\.js"><\/script>)/si;
      
      if (content.match(pattern)) {
        content = content.replace(pattern, "$1$2");
        console.log(`  - Fixed using pattern 1`);
      } else if (content.match(commentPattern)) {
        content = content.replace(commentPattern, "$1$2");
        console.log(`  - Fixed using pattern 2`);
      } else {
        // Just remove the second occurrence with its comment
        content = content.replace(/<!-- Connection Status -->[\s\n]*<script\s+src="connection-status\.js"><\/script>/i, "");
        console.log(`  - Removed second occurrence`);
      }
      
      // Write the fixed content back to the file
      fs.writeFileSync(file, content, 'utf8');
      console.log(`  - Updated ${file}`);
    } else {
      console.log(`  - ${file} has no duplicate references, skipping`);
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
});

console.log('Fix complete, running check again...');

// Check again to see if all duplicates are fixed
htmlFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const connectionStatusCount = (content.match(/connection-status\.js/g) || []).length;
    if (connectionStatusCount > 1) {
      console.log(`WARN: ${file} still has ${connectionStatusCount} references to connection-status.js`);
    } else {
      console.log(`OK: ${file} is fixed`);
    }
  } catch (err) {
    console.error(`Error checking ${file}:`, err);
  }
}); 