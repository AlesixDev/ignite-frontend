// Shared emoji shortcode ↔ unicode mapping

export const emojiMap = new Map();
let emojiDataLoaded = false;

export const loadEmojiData = async () => {
  if (emojiDataLoaded) return;

  try {
    const response = await fetch('https://cdn.jsdelivr.net/npm/emojibase-data@latest/en/data.json');
    const data = await response.json();

    data.forEach((emoji) => {
      if (emoji.emoji && emoji.label) {
        const shortcode = `:${emoji.label.toLowerCase().replace(/\s+/g, '_')}:`;
        emojiMap.set(shortcode, emoji.emoji);
      }

      if (emoji.emoji && emoji.aliases) {
        emoji.aliases.forEach((alias) => {
          const shortcode = `:${alias.toLowerCase().replace(/\s+/g, '_')}:`;
          if (!emojiMap.has(shortcode)) {
            emojiMap.set(shortcode, emoji.emoji);
          }
        });
      }
    });

    emojiDataLoaded = true;
  } catch (error) {
    console.warn('Failed to load emoji data from CDN:', error);
  }
};

// Start loading emoji data on module load (non-blocking)
loadEmojiData();

export const registerEmoji = (label, emoji) => {
  const shortcode = `:${label.toLowerCase().replace(/\s+/g, '_')}:`;
  if (!emojiMap.has(shortcode)) {
    emojiMap.set(shortcode, emoji);
  }
};

export const convertEmojiShortcodes = (text) => {
  return text.replace(/:[\w_+-]+:/g, (match) => {
    return emojiMap.get(match) || match;
  });
};
