declare module 'pdf-parse' {
  interface PDFParseResult {
    text: string
    numpages: number
    info: Record<string, unknown>
    metadata: Record<string, unknown>
    version: string
  }
  function pdfParse(data: Buffer | ArrayBuffer): Promise<PDFParseResult>
  export default pdfParse
}