import { View, Text } from 'react-native';

/**
 * Minimal markdown renderer for education content.
 * Supports: ## headings, **bold**, - bullet lists, \n\n paragraphs.
 * No external dependencies — keeps the bundle lean.
 */
export default function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines (paragraph breaks)
    if (line.trim() === '') continue;

    // ## Heading
    if (line.startsWith('## ')) {
      elements.push(
        <Text key={key++} className="text-base font-bold text-ink mt-4 mb-1">
          {line.slice(3)}
        </Text>
      );
      continue;
    }

    // - Bullet item
    if (line.startsWith('- ')) {
      elements.push(
        <View key={key++} className="flex-row mt-1 pl-2">
          <Text className="text-sm text-ink-secondary mr-2">•</Text>
          <Text className="text-sm text-ink-secondary flex-1">
            {renderInline(line.slice(2))}
          </Text>
        </View>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <Text key={key++} className="text-sm text-ink-secondary mt-2 leading-5">
        {renderInline(line)}
      </Text>
    );
  }

  return <View>{elements}</View>;
}

/** Render **bold** segments within a line */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}
