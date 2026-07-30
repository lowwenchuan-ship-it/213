const { google } = require('googleapis');

function getDriveClient() {
  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  } catch (e) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY 环境变量不是有效的 JSON，请检查粘贴内容');
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

async function findFileByName(drive, name, folderId) {
  const safeName = name.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name='${safeName}' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  return res.data.files && res.data.files[0];
}

async function readJsonFile(drive, name, folderId, fallback) {
  const file = await findFileByName(drive, name, folderId);
  if (!file) return fallback;
  const res = await drive.files.get(
    { fileId: file.id, alt: 'media' },
    { responseType: 'text' }
  );
  try {
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  } catch (e) {
    return fallback;
  }
}

async function writeJsonFile(drive, name, folderId, data) {
  const file = await findFileByName(drive, name, folderId);
  const media = { mimeType: 'application/json', body: JSON.stringify(data, null, 2) };
  if (file) {
    await drive.files.update({ fileId: file.id, media });
  } else {
    await drive.files.create({
      requestBody: { name, parents: [folderId] },
      media,
    });
  }
}

module.exports = { getDriveClient, findFileByName, readJsonFile, writeJsonFile };
