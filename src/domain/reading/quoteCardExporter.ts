import { HIGHLIGHT_SWATCHES, type StoryHighlight } from '../models';

/**
 * Mirrors Android QuoteCardExporter.kt:
 * Renders a 1080x1350 editorial PNG quote card on an HTML5 Canvas and supports
 * native iOS/Android sharing via `navigator.share({ files })` or direct PNG download.
 */
export async function renderQuoteCardPngBlob(
  highlight: StoryHighlight,
  storyMeta: { title: string; author: string }
): Promise<Blob> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D Canvas context unavailable');
  }

  const swatch = HIGHLIGHT_SWATCHES[highlight.color] ?? HIGHLIGHT_SWATCHES.TERRACOTTA;

  // Outer card background
  ctx.fillStyle = swatch.cardBgHex;
  ctx.fillRect(0, 0, width, height);

  // Inner editorial frame
  const pad = 76;
  ctx.strokeStyle = swatch.accentHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

  // Top accent bar
  ctx.fillStyle = swatch.accentHex;
  ctx.fillRect(pad + 64, pad + 72, 96, 8);

  // Brand header
  ctx.fillStyle = swatch.accentHex;
  ctx.font = '600 24px Inter, system-ui, sans-serif';
  ctx.fillText('FABLE LITERARY JOURNAL', pad + 64, pad + 124);

  // Decorative opening quote mark
  ctx.fillStyle = swatch.accentHex;
  ctx.font = '700 120px Literata, Georgia, serif';
  ctx.fillText('“', pad + 52, pad + 260);

  // Wrapped quote text
  ctx.fillStyle = swatch.cardInkHex;
  const quoteText = highlight.quoteText.trim();
  const fontSize = quoteText.length > 260 ? 38 : quoteText.length > 140 ? 44 : 52;
  const lineHeight = Math.round(fontSize * 1.45);
  ctx.font = `500 ${fontSize}px Literata, Georgia, serif`;

  const maxTextWidth = width - (pad + 64) * 2;
  const wrappedLines = wrapCanvasText(ctx, `“${quoteText}”`, maxTextWidth, 12);

  let cursorY = pad + 310;
  for (const line of wrappedLines) {
    ctx.fillText(line, pad + 64, cursorY);
    cursorY += lineHeight;
  }

  // Optional reader note
  if (highlight.note && highlight.note.trim().length > 0) {
    cursorY += 28;
    ctx.fillStyle = swatch.accentHex;
    ctx.font = 'italic 30px Inter, system-ui, sans-serif';
    const noteLines = wrapCanvasText(ctx, `Note: ${highlight.note.trim()}`, maxTextWidth, 3);
    for (const line of noteLines) {
      ctx.fillText(line, pad + 64, cursorY);
      cursorY += 42;
    }
  }

  // Footer divider & book metadata
  const footerY = height - pad - 150;
  ctx.strokeStyle = swatch.accentHex;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad + 64, footerY);
  ctx.lineTo(width - pad - 64, footerY);
  ctx.stroke();

  ctx.fillStyle = swatch.cardInkHex;
  ctx.font = '700 34px Literata, Georgia, serif';
  ctx.fillText(storyMeta.title.slice(0, 44), pad + 64, footerY + 56);

  ctx.fillStyle = swatch.accentHex;
  ctx.font = '500 26px Inter, system-ui, sans-serif';
  ctx.fillText(`${storyMeta.author} · ${highlight.chapterTitle}`, pad + 64, footerY + 98);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode quote card PNG'));
    }, 'image/png');
  });
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

export async function shareOrDownloadQuoteCard(
  highlight: StoryHighlight,
  storyMeta: { title: string; author: string }
): Promise<'shared' | 'downloaded'> {
  const blob = await renderQuoteCardPngBlob(highlight, storyMeta);
  const safeSlug = storyMeta.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'fable-quote';
  const filename = `${safeSlug}-quote.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      title: `${storyMeta.title}: Quote`,
      text: `“${highlight.quoteText}” (${storyMeta.title}, ${storyMeta.author})`,
      files: [file],
    });
    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return 'downloaded';
}
