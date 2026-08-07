const fs = require('fs');
const txt = fs.readFileSync('all_git_log.txt', 'utf16le');
const match = txt.match(/client_id[:=]\s*['"`](.+?googleusercontent\.com)['"`]/i);
console.log(match ? match[1] : 'NOT FOUND');
