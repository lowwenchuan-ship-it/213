const { Readable } = require('stream');
const { getDriveClient } = require('./lib/drive');
const { requireAuth, json } = require('./lib/auth');

exports.handler = async (event) => {
  const payload = requireAuth(event);
  if (!payload) return json(401, { error: '请先登录' });

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const drive = getDriveClient();

  try {
    if (event.httpMethod === 'POST') {
      const { filename, mimeType, base64 } = JSON.parse(event.body || '{}');
      if (!base64) return json(400, { error: '缺少图片内容' });
      const buffer = Buffer.from(base64, 'base64');
      const res = await drive.files.create({
        requestBody: { name: filename || 'photo_' + Date.now() + '.jpg', parents: [folderId] },
        media: { mimeType: mimeType || 'image/jpeg', body: Readable.from(buffer) },
        fields: 'id',
      });
      return json(200, { fileId: res.data.id });
    }

    if (event.httpMethod === 'GET') {
      const fileId = event.queryStringParameters && event.queryStringParameters.fileId;
      if (!fileId) return json(400, { error: '缺少 fileId' });
      const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      const buf = Buffer.from(res.data);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'private, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
        body: buf.toString('base64'),
        isBase64Encoded: true,
      };
    }

    if (event.httpMethod === 'DELETE') {
      const fileId = event.queryStringParameters && event.queryStringParameters.fileId;
      if (!fileId) return json(400, { error: '缺少 fileId' });
      await drive.files.delete({ fileId });
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return json(500, { error: '服务器错误：' + e.message });
  }
};
