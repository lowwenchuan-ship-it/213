const bcrypt = require('bcryptjs');
const { getDriveClient, readJsonFile, writeJsonFile } = require('./lib/drive');
const { sign, json } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { username, password } = JSON.parse(event.body || '{}');
    if (!username || !password) return json(400, { error: '请输入账号和密码' });

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const drive = getDriveClient();
    let users = await readJsonFile(drive, 'users.json', folderId, null);

    // 第一次使用：还没有任何账号，用环境变量里设定的初始管理员账号自举
    if (!users || users.length === 0) {
      if (
        process.env.BOOTSTRAP_ADMIN_USER &&
        username === process.env.BOOTSTRAP_ADMIN_USER &&
        password === process.env.BOOTSTRAP_ADMIN_PASSWORD
      ) {
        const hash = bcrypt.hashSync(password, 10);
        const newUser = { id: 'u_' + Date.now(), username, passwordHash: hash, role: 'admin' };
        users = [newUser];
        await writeJsonFile(drive, 'users.json', folderId, users);
        const token = sign({ sub: newUser.id, username, role: 'admin' });
        return json(200, { token, username, role: 'admin' });
      }
      return json(401, { error: '账号或密码不对' });
    }

    const user = users.find((u) => u.username === username);
    if (!user) return json(401, { error: '账号或密码不对' });

    const ok = bcrypt.compareSync(password, user.passwordHash);
    if (!ok) return json(401, { error: '账号或密码不对' });

    const token = sign({ sub: user.id, username: user.username, role: user.role || 'member' });
    return json(200, { token, username: user.username, role: user.role || 'member' });
  } catch (e) {
    console.error(e);
    return json(500, { error: '服务器错误：' + e.message });
  }
};
