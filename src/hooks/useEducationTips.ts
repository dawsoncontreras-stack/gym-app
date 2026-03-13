import { useMemo } from 'react';
import type { StackStatusView, Product } from '../lib/types';

export type EducationTip = {
  productId: string;
  productName: string;
  heading: string;
  snippet: string;
};

/**
 * Extract contextual education tips from products the user is tracking.
 * Pulls the first ## heading + following paragraph from education_markdown.
 * Returns at most 3 tips, prioritizing items by status (active first).
 */
export function useEducationTips(
  stackItems: StackStatusView[] | undefined,
  products: Product[] | undefined
): EducationTip[] {
  return useMemo(() => {
    if (!stackItems || !products || stackItems.length === 0) return [];

    // Build a map of products with education content
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Sort stack items: active/running_low first (they're using it now)
    const sorted = [...stackItems].sort((a, b) => {
      const priority: Record<string, number> = {
        active: 0,
        running_low: 1,
        arriving: 2,
        reorder: 3,
      };
      return (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
    });

    const tips: EducationTip[] = [];

    for (const item of sorted) {
      if (tips.length >= 3) break;

      const product = productMap.get(item.product_id);
      if (!product?.education_markdown) continue;

      const tip = extractFirstTip(product.education_markdown);
      if (!tip) continue;

      tips.push({
        productId: product.id,
        productName: product.name,
        heading: tip.heading,
        snippet: tip.snippet,
      });
    }

    return tips;
  }, [stackItems, products]);
}

/**
 * Extract the first heading + following content (up to ~120 chars) from markdown.
 */
function extractFirstTip(
  markdown: string
): { heading: string; snippet: string } | null {
  const lines = markdown.split('\n');
  let heading: string | null = null;
  const snippetLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      // If we already have heading + snippet content, stop at paragraph break
      if (heading && snippetLines.length > 0) break;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      if (heading && snippetLines.length > 0) break; // We have one complete tip
      heading = trimmed.slice(3);
      continue;
    }

    if (heading) {
      // Strip markdown formatting for snippet
      const clean = trimmed
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/^- /, '');
      snippetLines.push(clean);
    }
  }

  if (!heading || snippetLines.length === 0) return null;

  let snippet = snippetLines.join(' ');
  if (snippet.length > 120) {
    snippet = snippet.slice(0, 117) + '...';
  }

  return { heading, snippet };
}
