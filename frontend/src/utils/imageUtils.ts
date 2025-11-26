/**
 * Converts SVG image URLs to PNG format for React Native compatibility
 * React Native Image component doesn't support SVG files
 */
export const convertAvatarUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;
  
  // If it's already a PNG or other supported format, return as is
  if (url.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i)) {
    return url;
  }
  
  // Convert DiceBear SVG URLs to PNG
  if (url.includes('api.dicebear.com') && url.includes('/svg?')) {
    return url.replace('/svg?', '/png?');
  }
  
  // Convert any other SVG URLs (if backend serves them)
  if (url.includes('.svg') || url.includes('/svg?')) {
    // Try to convert to PNG if it's a DiceBear URL
    if (url.includes('dicebear.com')) {
      return url.replace('/svg?', '/png?').replace('.svg', '.png');
    }
    // For other SVG URLs, we can't convert them, so return null to show placeholder
    console.warn('SVG avatar URL cannot be converted:', url);
    return null;
  }
  
  return url;
};

