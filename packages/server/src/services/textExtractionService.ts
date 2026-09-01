import fs from "fs";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionResult {
  fullText: string;
  pages: ExtractedPage[];
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    language?: string;
  };
}

class TextExtractionService {
  /**
   * Extract text from a file based on its MIME type
   */
  async extract(filePath: string, mimeType: string): Promise<ExtractionResult> {
    if (mimeType === "application/pdf") {
      return this.extractPdf(filePath);
    }

    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return this.extractDocx(filePath);
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  /**
   * Extract text from PDF with page-level granularity
   */
  private async extractPdf(filePath: string): Promise<ExtractionResult> {
    const buffer = fs.readFileSync(filePath);
    const pdf = await pdfParse(buffer);

    // pdf-parse gives us full text + page count
    // Split by page breaks (\f = form feed character)
    const rawPages = pdf.text.split("\f");
    const pages: ExtractedPage[] = rawPages
      .filter((p) => p.trim().length > 0)
      .map((text, index) => ({
        pageNumber: index + 1,
        text: text.trim(),
      }));

    return {
      fullText: pdf.text,
      pages,
      pageCount: pdf.numpages,
      metadata: {
        title: pdf.info?.Title || undefined,
        author: pdf.info?.Author || undefined,
      },
    };
  }

  /**
   * Extract text from DOCX
   * mammoth doesn't provide page numbers natively, so we treat the
   * whole document as a single page unless paragraph markers exist.
   */
  private async extractDocx(filePath: string): Promise<ExtractionResult> {
    const result = await mammoth.extractRawText({ path: filePath });
    const fullText = result.value;

    // DOCX doesn't have hard page breaks in plain text extraction.
    // We split by double newlines as approximate sections, but treat
    // the whole doc as page 1 for simplicity. A more sophisticated
    // approach would use mammoth.convertToHtml + parse page markers.
    const pages: ExtractedPage[] = [
      {
        pageNumber: 1,
        text: fullText.trim(),
      },
    ];

    return {
      fullText,
      pages,
      pageCount: 1,
      metadata: {},
    };
  }
}

export const textExtractionService = new TextExtractionService();
