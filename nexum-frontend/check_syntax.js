const parser = require('@babel/parser');
const fs = require('fs');

const files = [
  'app/dashboard/page.jsx','app/hr/page.jsx','app/contabilidad/page.jsx',
  'app/finanzas/page.jsx','app/costes/page.jsx','app/proyectos/page.jsx',
  'app/marketing/page.jsx','app/agente/page.jsx','app/documentos/page.jsx',
  'app/settings/page.jsx','app/admin/page.jsx'
];

let ok = 0, bad = 0;
for (const f of files) {
  try {
    const code = fs.readFileSync(f, 'utf8');
    parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
    console.log(`OK ${f}`);
    ok++;
  } catch (e) {
    const loc = e.loc ? `${e.loc.line}:${e.loc.column}` : '?';
    console.log(`FAIL ${f} (${loc}): ${e.message.split('\n')[0]}`);
    bad++;
  }
}
console.log(`\n${ok} OK, ${bad} con errores`);
