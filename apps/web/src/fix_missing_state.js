import fs from 'fs';

const files = [
  'apps/web/src/features/billing/pages/PaymentsPage.tsx',
  'apps/web/src/features/billing/pages/ExpensesPage.tsx',
  'apps/web/src/features/billing/pages/DepositsPage.tsx',
  'apps/web/src/features/billing/pages/DayChargesPage.tsx',
  'apps/web/src/features/billing/pages/AdditionalChargesPage.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');

  // Add the state declaration
  // It usually comes after `const [page, setPage] = useState(1);`
  if (!content.includes('const [itemsPerPage, setItemsPerPage] = useState(')) {
    content = content.replace(
      /const\s+\[page,\s*setPage\]\s*=\s*useState\(1\);/,
      'const [page, setPage]               = useState(1);\n  const [itemsPerPage, setItemsPerPage] = useState(10);'
    );
  }

  // Replace `limit: 10` in hook calls
  content = content.replace(/limit:\s*10,/, 'limit: itemsPerPage,');

  // Replace `itemsPerPage={10}` in Pagination with `itemsPerPage={itemsPerPage}`
  content = content.replace(/itemsPerPage=\{10\}/g, 'itemsPerPage={itemsPerPage}');

  fs.writeFileSync(file, content, 'utf-8');
  console.log('Fixed', file);
}
