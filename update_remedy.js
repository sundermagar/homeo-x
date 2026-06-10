const fs = require('fs');
const file = '/Users/apple/Documents/worksarea/homeo-x/apps/web/src/features/medical-case/components/remedy-chart-session.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Lines to remove (0-indexed)
// Top header + inline form: 242-450
// Action header: 469
// Action column body: 556-626
// Replace colspan 7 with 6: 633
// End modals + image upload tab + pagination wrapper end: 652-794

lines[633] = lines[633].replace('colSpan={7}', 'colSpan={6}');

let newLines = [];
for (let i = 0; i < lines.length; i++) {
  if (i >= 242 && i <= 450) continue;
  if (i === 469) continue;
  if (i >= 556 && i <= 626) continue;
  if (i >= 652 && i <= 794) continue;
  newLines.push(lines[i]);
}

fs.writeFileSync(file, newLines.join('\n'));
console.log('Done');
