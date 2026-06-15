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
  if (content.includes('<Pagination')) {
    let issueStr = [];

    // Check for hardcoded itemsPerPage = 10
    if (/const\s+itemsPerPage\s*=\s*\d+;/.test(content)) {
      issueStr.push('Hardcoded const itemsPerPage');
    }
    
    // Check for empty onLimitChange={() => {}}
    if (/onLimitChange=\{\(\)\s*=>\s*\{\}\}/.test(content) || /onLimitChange=\{\(l\)\s*=>\s*\{\}\}/.test(content)) {
      issueStr.push('Empty onLimitChange');
    }

    // Check for useMemo slicing without itemsPerPage in deps
    const useMemoMatches = [...content.matchAll(/useMemo\(\s*\(\)\s*=>\s*\{[^}]*slice\([^}]*\)[^}]*\},\s*\[([^\]]+)\]/g)];
    for (const match of useMemoMatches) {
      const deps = match[1];
      if (!deps.includes('itemsPerPage')) {
        issueStr.push('Missing itemsPerPage in useMemo deps');
      }
    }

    if (issueStr.length > 0) {
      issues.push({ file, issues: issueStr });
    }
  }
}

console.log(JSON.stringify(issues, null, 2));
