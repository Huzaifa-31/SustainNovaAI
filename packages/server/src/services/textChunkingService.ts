import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ExtractedPage } from "./textExtractionService";

export interface TextChunk {
  chunkIndex: number;
  text: string;
  pageStart: number;
  pageEnd: number;
  sectionTitle?: string;
  tokenCount: number;
}

// Architecture: 512 tokens, 64-token overlap
const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 64;

// Rough token estimation: ~4 chars per token for English text
const CHARS_PER_TOKEN = 4;

class TextChunkingService {
  private splitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE * CHARS_PER_TOKEN, // Convert tokens to approximate chars
      chunkOverlap: CHUNK_OVERLAP * CHARS_PER_TOKEN,
      separators: ["\n\n", "\n", ". ", " ", ""],
      lengthFunction: (text: string) => Math.ceil(text.length / CHARS_PER_TOKEN),
    });
  }

  /**
   * Split extracted pages into chunks with page metadata
   */
  async chunkPages(pages: ExtractedPage[]): Promise<TextChunk[]> {
    const chunks: TextChunk[] = [];
    let globalIndex = 0;

    for (const page of pages) {
      if (!page.text.trim()) continue;

      const splits = await this.splitter.splitText(page.text);

      for (const text of splits) {
        if (!text.trim()) continue;

        chunks.push({
          chunkIndex: globalIndex,
          text: text.trim(),
          pageStart: page.pageNumber,
          pageEnd: page.pageNumber,
          sectionTitle: this.detectSectionTitle(text),
          tokenCount: Math.ceil(text.length / CHARS_PER_TOKEN),
        });

        globalIndex++;
      }
    }

    return chunks;
  }

  /**
   * Split full text (for DOCX where we don't have page boundaries)
   */
  async chunkText(fullText: string): Promise<TextChunk[]> {
    if (!fullText.trim()) return [];

    const splits = await this.splitter.splitText(fullText);
    const chunks: TextChunk[] = [];
    let index = 0;

    for (const text of splits) {
      if (!text.trim()) continue;

      chunks.push({
        chunkIndex: index,
        text: text.trim(),
        pageStart: 1,
        pageEnd: 1,
        sectionTitle: this.detectSectionTitle(text),
        tokenCount: Math.ceil(text.length / CHARS_PER_TOKEN),
      });

      index++;
    }

    return chunks;
  }

  /**
   * Try to detect a section title from the beginning of a chunk.
   * Heuristic: short uppercase or title-case lines before body text.
   */
  private detectSectionTitle(text: string): string | undefined {
    const lines = text.split("\n");
    if (lines.length < 2) return undefined;

    const firstLine = lines[0].trim();
    // If first line is short and looks like a heading (all caps or title case)
    if (
      firstLine.length > 0 &&
      firstLine.length < 80 &&
      (firstLine === firstLine.toUpperCase() ||
        /^[A-Z][a-zA-Z\s&:/-]+$/.test(firstLine))
    ) {
      return firstLine;
    }

    return undefined;
  }
}

export const textChunkingService = new TextChunkingService();
