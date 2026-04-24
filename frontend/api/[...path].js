module.exports = async (req, res) => {
  const targetBase = process.env.BACKEND_API_BASE;

  if (!targetBase) {
    res.status(500).json({ error: 'Backend target is not configured' });
    return;
  }

  const rawPath = String((req.url || '/').split('?')[0]);
  const suffixPath = rawPath.replace(/^\/api\/?/, '');
  const pathSegments = suffixPath
    ? suffixPath.split('/').filter(Boolean).map((part) => decodeURIComponent(part))
    : [];

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, String(item)));
    } else if (value !== undefined) {
      query.append(key, String(value));
    }
  }

  const targetUrl = `${targetBase.replace(/\/$/, '')}/${pathSegments.join('/')}${query.toString() ? `?${query.toString()}` : ''}`;

  try {
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'] || 'application/json'
      },
      body
    });

    const responseBuffer = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);

    const contentType = upstream.headers.get('content-type');
    if (contentType) {
      res.setHeader('content-type', contentType);
    }

    const responseTime = upstream.headers.get('x-response-time');
    if (responseTime) {
      res.setHeader('x-response-time', responseTime);
    }

    res.send(responseBuffer);
  } catch (_err) {
    res.status(502).json({ error: 'Upstream backend unavailable' });
  }
};
