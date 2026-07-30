const { getDriveClient, readJsonFile, writeJsonFile } = require('./lib/drive');
const { requireAuth, json } = require('./lib/auth');

exports.handler = async (event) => {
  const payload = requireAuth(event);
  if (!payload) return json(401, { error: '请先登录' });

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const drive = getDriveClient();

  try {
    if (event.httpMethod === 'GET') {
      const data = await readJsonFile(drive, 'data.json', folderId, { categories: [], properties: [] });
      return json(200, data);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const data = {
        categories: Array.isArray(body.categories) ? body.categories : [],
        properties: Array.isArray(body.properties) ? body.properties : [],
      };
      await writeJsonFile(drive, 'data.json', folderId, data);
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return json(500, { error: '服务器错误：' + e.message });
  }
};
