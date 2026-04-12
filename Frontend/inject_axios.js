const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('axios.min.js')) {
    content = content.replace('<script src="js/api.js"></script>', '<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>\n  <script src="js/api.js"></script>');
    fs.writeFileSync(f, content);
  }
});
console.log('done');
