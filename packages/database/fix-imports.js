const fs = require('fs');
const path = require('path');

function processDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      processDir(p);
    } else if (file.endsWith('.ts')) {
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/from\s+['"](\.\/[^'"]+)\.js['"]/g, "from '$1'");
      fs.writeFileSync(p, content);
    }
  });
}

processDir('./packages/database/src/schema');
