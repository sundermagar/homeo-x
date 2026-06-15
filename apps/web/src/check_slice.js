import fs from 'fs';
import path from 'path';

function findFiles(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, filter, fileList);
    } else if (filter.test(filePath)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allTsx = findFiles('apps/web/src', /\.tsx$/);
const issues = [];

for (const file of allTsx) {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('Pagination') && content.includes('.slice(')) {
    // Check if itemsPerPage is missing in useMemo deps
    // Or if it's not even using useMemo
    
    // For every .slice() call, let's see if itemsPerPage is used in it
    if (content.includes('itemsPerPage') || content.includes('PAGE_SIZE')) {
      const match = content.match(/useMemo\([\s\S]*?slice\([\s\S]*?\]\);/g);
      if (match) {
        for (const m of match) {
          if (!m.includes('itemsPerPage') && !m.includes('PAGE_SIZE')) {
            issues.push({ file, type: 'Missing itemsPerPage in useMemo deps' });
          }
        }
      } else {
        // Maybe it's not using useMemo?
        if (!content.includes('useMemo')) {
          issues.push({ file, type: 'slice without useMemo' });
        } else {
            // let's manually inspect these
            issues.push({ file, type: 'Needs manual check' });
        }
      }
    }
  }
}

console.log(JSON.stringify(issues, null, 2));
