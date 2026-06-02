function rewriteLinksForTracking(html, recipientId, campaignId, appUrl) {
  // Rewrite click links
  let result = html.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, url, after) => {
      if (url.includes("/api/track") || url.includes("/api/unsubscribe")) return match;
      if (url.startsWith("mailto:") || url.startsWith("tel:")) return match;
      const trackUrl = `${appUrl}/api/track?rid=${recipientId}&cid=${campaignId}&type=click&url=${encodeURIComponent(url)}`;
      return `<a ${before}href="${trackUrl}"${after}>`;
    }
  );

  // Rewrite pixel folder pixel tags — inject rid and cid per recipient
  // Matches any img src containing /api/track?pid=
  result = result.replace(
    /src=["']([^"']*\/api\/track\?pid=([^&"']+)[^"']*)["']/gi,
    (match, url, pid) => {
      if (url.includes("rid=")) return match;
      const newUrl = `${appUrl}/api/track?pid=${pid}&rid=${recipientId}&cid=${campaignId}&type=open`;
      console.log(`[rewrite] pixel rewritten for recipient ${recipientId}: ${newUrl}`);
      return `src="${newUrl}"`;
    }
  );

  return result;
}

module.exports = { rewriteLinksForTracking };
