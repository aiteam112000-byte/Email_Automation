function rewriteLinksForTracking(html, recipientId, campaignId, appUrl) {
  return html.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, url, after) => {
      if (url.includes("/api/track") || url.includes("/api/unsubscribe")) return match;
      if (url.startsWith("mailto:") || url.startsWith("tel:")) return match;
      const trackUrl = `${appUrl}/api/track?rid=${recipientId}&cid=${campaignId}&type=click&url=${encodeURIComponent(url)}`;
      return `<a ${before}href="${trackUrl}"${after}>`;
    }
  );
}

module.exports = { rewriteLinksForTracking };
