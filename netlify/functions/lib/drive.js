const { google } = require('googleapis');

function getDriveClient() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('缺少 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN 环境变量');
  }
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function findFolderByName(drive, name, parentId) {
  const safeName = name.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name='${safeName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  return res.data.files && res.data.files[0];
}

async function findOrCreateFolder(drive, name, parentId) {
  const existing = await findFolderByName(drive, name, parentId);
  if (existing) return existing.id;
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  return res.data.id;
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

module.exports = { getDriveClient, findFileByName, readJsonFile, writeJsonFile, findOrCreateFolder };
