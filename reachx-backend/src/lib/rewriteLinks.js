function buildTrackUrl(appUrl, recipientId, campaignId, url) {
  return `${appUrl}/api/track?rid=${recipientId}&cid=${campaignId}&type=click&url=${encodeURIComponent(url)}`;
}

function shouldSkipTracking(url) {
  if (!url) return true;
  if (url.includes("/api/track") || url.includes("/api/unsubscribe")) return true;
  if (url.startsWith("mailto:") || url.startsWith("tel:")) return true;
  return false;
}

function rewriteLinksForTracking(html, recipientId, campaignId, appUrl) {
  let result = html;

  // Rewrite standard anchor links.
  result = result.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, url, after) => {
      if (shouldSkipTracking(url)) return match;
      return `<a ${before}href="${buildTrackUrl(appUrl, recipientId, campaignId, url)}"${after}>`;
    }
  );

  // Rewrite image links created by editors as image attributes such as href/data-link/link/data-url/xlink:href/data-href.
  result = result.replace(
    /<img\b([^>]*?)(?:\s(href|data-link|link|data-url|data-href|xlink:href)=(["'])([^"']+)\3)([^>]*?)>/gi,
    (match, before, attrName, quote, url, after) => {
      if (shouldSkipTracking(url)) return match;
      const trackedUrl = buildTrackUrl(appUrl, recipientId, campaignId, url);
      const attrs = [before, after].filter(Boolean).join(" ").trim();
      return `<a href="${trackedUrl}" style="display:inline-block;text-decoration:none;border:0;" target="_blank"><img${attrs ? ` ${attrs}` : ""}></a>`;
    }
  );

  // Rewrite pixel folder pixel tags inject rid and cid per recipient.
  result = result.replace(
    /src=["']([^"']*\/api\/track\?pid=([^&"']+)[^"']*)["']/gi,
    (match, url, pid) => {
      if (url.includes("rid=")) return match;
      const newUrl = `${appUrl}/api/track?pid=${pid}&rid=${recipientId}&cid=${campaignId}&type=open`;
      return `src="${newUrl}"`;
    }
  );

  return result;
}

module.exports = { rewriteLinksForTracking };
