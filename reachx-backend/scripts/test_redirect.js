function normalizeTarget(rawUrl) {
  try {
    let target = decodeURIComponent(rawUrl || "");

    for (let i = 0; i < 5; i++) {
      try {
        const parsed = new URL(target);
        const nested = parsed.searchParams.get("url");
        if (nested && /\/api\/track/i.test(parsed.pathname)) {
          target = decodeURIComponent(nested);
          continue;
        }
        break;
      } catch (e) {
        const apiIdx = target.indexOf("/api/track?");
        if (apiIdx !== -1) {
          const qs = target.slice(apiIdx + "/api/track?".length);
          const params = new URLSearchParams(qs);
          const nested = params.get("url");
          if (nested) {
            target = decodeURIComponent(nested);
            continue;
          }
        }
        break;
      }
    }

    target = target.replace(/^\s+|\s+$/g, "");
    if (!/^https?:\/\//i.test(target) && target) {
      target = `https://${target.replace(/^\/+/, "")}`;
    }
    return target;
  } catch (e) {
    return '/';
  }
}

const samples = [
  'proplusdata.co',
  'proplusdata.co/page',
  '/proplusdata.co',
  'https%3A%2F%2Fproplusdata.co',
  '/api/track?rid=R&cid=C&type=click&url=proplusdata.co',
  'https://gtmreach.proplusdata.co/api/track?rid=R&cid=C&type=click&url=proplusdata.co',
  'https://gtmreach.proplusdata.co/api/track?rid=R&cid=C&type=click&url=https%253A%252F%252Fproplusdata.co%252Fpage',
];

for (const s of samples) {
  console.log(s, '=>', normalizeTarget(s));
}
