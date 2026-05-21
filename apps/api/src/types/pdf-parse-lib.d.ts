// Ambient declaration for the pdf-parse inner library entrypoint.
// We import 'pdf-parse/lib/pdf-parse.js' directly to bypass the package's
// index.js, which runs debug code on import and throws under ESM. @types/pdf-parse
// only declares the bare 'pdf-parse' specifier, so we alias the subpath to it.
declare module 'pdf-parse/lib/pdf-parse.js' {
  import PdfParse = require('pdf-parse');
  export default PdfParse;
}
