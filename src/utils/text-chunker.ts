/**
 * Splits Chinese text into chunks to respect API limits and maintain natural boundaries.
 * Prefers splitting at paragraphs, then natural sentence boundaries.
 */

const MAX_CHUNK_LENGTH = 1000; // Safe limit under TTS API limits

export function chunkChineseText(text: string): string[] {
  if (!text) return [];

  const chunks: string[] = [];
  let currentChunk = '';

  // First, split by paragraphs
  const paragraphs = text.split(/\n+/);

  for (const paragraph of paragraphs) {
    const p = paragraph.trim();
    if (!p) continue;

    // If a single paragraph is larger than MAX_CHUNK_LENGTH, we need to split by sentences
    if (currentChunk.length + p.length > MAX_CHUNK_LENGTH && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = '';
    }

    if (p.length > MAX_CHUNK_LENGTH) {
      // Split by common Chinese punctuation
      const sentences = p.split(/([。？！；?!;])/);
      
      let sentenceBuffer = '';
      for (let i = 0; i < sentences.length; i += 2) {
        const sentence = sentences[i];
        const punctuation = i + 1 < sentences.length ? sentences[i + 1] : '';
        const fullSentence = sentence + punctuation;

        if (sentenceBuffer.length + fullSentence.length > MAX_CHUNK_LENGTH) {
          if (sentenceBuffer.length > 0) {
            chunks.push(sentenceBuffer);
            sentenceBuffer = '';
          }
        }
        sentenceBuffer += fullSentence;
      }
      
      if (sentenceBuffer.length > 0) {
        if (currentChunk.length + sentenceBuffer.length > MAX_CHUNK_LENGTH) {
          chunks.push(currentChunk);
          currentChunk = sentenceBuffer;
        } else {
          currentChunk += (currentChunk ? '\n' : '') + sentenceBuffer;
        }
      }

    } else {
      currentChunk += (currentChunk ? '\n' : '') + p;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
