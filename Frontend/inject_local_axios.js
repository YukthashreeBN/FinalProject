const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js')) {
    content = content.replace('https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js', 'js/axios.min.js');
    fs.writeFileSync(f, content);
  }
});
console.log('done replacing with local axios');
