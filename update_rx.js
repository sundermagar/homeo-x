const fs = require('fs');
const file = '/Users/apple/Documents/worksarea/homeo-x/apps/web/src/features/medical-case/pages/case-detail-page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace('ChevronRight, Plus, Package,', 'ChevronRight, ChevronUp, ChevronDown, Plus, Package,');

// 2. Add State
content = content.replace('const [editingVitals, setEditingVitals] = useState<any>(null);', 
  'const [editingVitals, setEditingVitals] = useState<any>(null);\n  const [collapsedRx, setCollapsedRx] = useState<Record<string, boolean>>({});');

// 3. Extract the RX block
const rxStartMarker = '{/* Prescriptions Table */}';
const rxEndMarker = '{/* If no data for this date at all */}';
const rxStartIndex = content.indexOf(rxStartMarker);
const rxEndIndex = content.indexOf(rxEndMarker);

if (rxStartIndex > -1 && rxEndIndex > -1) {
    let rxBlock = content.substring(rxStartIndex, rxEndIndex);
    content = content.substring(0, rxStartIndex) + content.substring(rxEndIndex);
    
    // Modify rxBlock to be collapsible
    const oldCondition = '{data.rxItems.length > 0 && (';
    const newCondition = `{data.rxItems.length > 0 && (
                        <div style={{ marginBottom: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                          <div 
                            onClick={() => setCollapsedRx(prev => ({ ...prev, [dateKey]: !prev[dateKey] }))}
                            style={{ padding: '12px 18px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: collapsedRx[dateKey] ? 'none' : '1px solid #e2e8f0' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <Pill size={14} /> Prescriptions
                            </div>
                            <div style={{ color: '#94a3b8' }}>
                              {collapsedRx[dateKey] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                            </div>
                          </div>
                          {!collapsedRx[dateKey] && (
                            <div style={{ overflowX: 'auto' }}>`;
    
    rxBlock = rxBlock.replace(oldCondition, newCondition);
    
    const oldClosing = `</table>\n                        </div>\n                      )}`;
    const newClosing = `</table>\n                            </div>\n                          )}\n                        </div>\n                      )}`;
    rxBlock = rxBlock.replace(oldClosing, newClosing);
    // Try a more robust closing replacement if the exact formatting differs
    if (rxBlock.indexOf('!collapsedRx[dateKey]') > -1 && rxBlock.indexOf(newClosing) === -1) {
       // Replace the last closing brace
       const lastDiv = '</div>\n                      )}';
       const lastIdx = rxBlock.lastIndexOf(lastDiv);
       if (lastIdx > -1) {
           rxBlock = rxBlock.substring(0, lastIdx) + '</div>\n                          )}\n                        </div>\n                      )}\n';
       }
    }

    // 4. Inject rxBlock above Diagnosis block
    const diagInsertIndex = content.indexOf('const soapDiagnosis =');
    if (diagInsertIndex > -1) {
        const actualDiagInsertIndex = content.indexOf('{soapDiagnosis.length > 0 && (', diagInsertIndex);
        if (actualDiagInsertIndex > -1) {
            content = content.substring(0, actualDiagInsertIndex) + rxBlock + '\n                      ' + content.substring(actualDiagInsertIndex);
        }
    }
    
    fs.writeFileSync(file, content);
    console.log('Successfully moved and updated prescriptions block.');
} else {
    console.log('Could not find rx block markers.');
}
