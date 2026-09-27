/**
 * Vercel Serverless Function: Survey Sync Endpoint (/api/sync)
 * Demonstrates Network-First sync with IndexedDB offline queue
 */

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const handleSyncSuccess = (payload) => {
    const surveyId = (payload && payload.id) || `SRV-${Date.now()}`;
    return res.status(200).json({
      status: 'synced',
      serverId: `SRV-${Date.now()}`,
      clientSurveyId: surveyId,
      message: 'Khảo sát đã được lưu vào máy chủ trường VKU thành công!',
      timestamp: new Date().toISOString()
    });
  };

  if (req.method === 'POST') {
    if (req.body) {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) {}
      }
      return handleSyncSuccess(body);
    }

    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      try {
        const body = raw ? JSON.parse(raw) : {};
        handleSyncSuccess(body);
      } catch (e) {
        handleSyncSuccess({});
      }
    });
    return;
  }

  // GET response
  res.status(200).json({
    status: 'ready',
    endpoint: '/api/sync',
    description: 'VKU Field Survey Sync Endpoint'
  });
};
