const bcrypt = require('bcryptjs');
const { getDriveClient, readJsonFile, writeJsonFile } = require('./lib/drive');
const { requireAuth, json } = require('./lib/auth');

exports.handler = async (event) => {
  const payload = requireAuth(event);
  if (!payload) return json(401, { error: '请先登录' });
  if (payload.role !== 'admin') return json(403, { error: '只有管理员能管理账号' });

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const drive = getDriveClient();

  try {
    let users = await readJsonFile(drive, 'users.json', folderId, []);

    if (event.httpMethod === 'GET') {
      return json(200, users.map((u) => ({ id: u.id, username: u.username, role: u.role || 'member' })));
    }

    if (event.httpMethod === 'POST') {
      const { username, password, role } = JSON.parse(event.body || '{}');
      if (!username || !password) return json(400, { error: '请填写账号和密码' });
      if (users.find((u) => u.username === username)) return json(400, { error: '这个账号名已经存在' });
      const hash = bcrypt.hashSync(password, 10);
      users.push({
        id: 'u_' + Date.now(),
        username,
        passwordHash: hash,
        role: role === 'admin' ? 'admin' : 'member',
      });
      await writeJsonFile(drive, 'users.json', folderId, users);
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (id === payload.sub) return json(400, { error: '不能删除自己当前登录的账号' });
      users = users.filter((u) => u.id !== id);
      await writeJsonFile(drive, 'users.json', folderId, users);
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return json(500, { error: '服务器错误：' + e.message });
  }
};
