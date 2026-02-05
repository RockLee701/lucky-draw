const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
    initDatabase();
  }
});

// 将db方法Promise化
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const exec = (sql) => {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// 初始化数据库表
const initDatabase = async () => {
  try {
    await exec(`
      CREATE TABLE IF NOT EXISTS lottery_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'preparing',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS rounds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        order_num INTEGER NOT NULL,
        allow_repeat BOOLEAN DEFAULT 0,
        is_completed BOOLEAN DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES lottery_sessions(id)
      );

      CREATE TABLE IF NOT EXISTS participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        name TEXT NOT NULL,
        department TEXT,
        phone TEXT,
        device_id TEXT,
        join_method TEXT DEFAULT 'import',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES lottery_sessions(id)
      );

      CREATE TABLE IF NOT EXISTS winners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        participant_id INTEGER,
        round_id INTEGER,
        won_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES lottery_sessions(id),
        FOREIGN KEY (participant_id) REFERENCES participants(id),
        FOREIGN KEY (round_id) REFERENCES rounds(id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_participant_session_device 
      ON participants(session_id, device_id) WHERE device_id IS NOT NULL;
    `);
    console.log('数据库表初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
  }
};

// 数据库操作方法
const dbModel = {
  // 抽奖会话相关
  createSession: async (name) => {
    const result = await run('INSERT INTO lottery_sessions (name, status) VALUES (?, ?)', [name, 'ongoing']);
    return result.lastID;
  },

  getCurrentSession: async () => {
    return await get('SELECT * FROM lottery_sessions WHERE status = ? ORDER BY created_at DESC LIMIT 1', ['ongoing']);
  },

  getAllSessions: async () => {
    return await all('SELECT * FROM lottery_sessions ORDER BY created_at DESC');
  },

  closeSession: async (id) => {
    await run('UPDATE lottery_sessions SET status = ?, closed_at = ? WHERE id = ?', ['completed', new Date().toISOString(), id]);
  },

  getSessionById: async (id) => {
    return await get('SELECT * FROM lottery_sessions WHERE id = ?', [id]);
  },

  // 轮次相关
  createRound: async (sessionId, name, quantity, orderNum, allowRepeat = 0) => {
    return await run('INSERT INTO rounds (session_id, name, quantity, order_num, allow_repeat) VALUES (?, ?, ?, ?, ?)', 
      [sessionId, name, quantity, orderNum, allowRepeat]);
  },

  getRoundsBySession: async (sessionId) => {
    return await all('SELECT * FROM rounds WHERE session_id = ? ORDER BY order_num ASC', [sessionId]);
  },

  getRoundById: async (id) => {
    return await get('SELECT * FROM rounds WHERE id = ?', [id]);
  },

  updateRound: async (id, data) => {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(id);
    return await run(`UPDATE rounds SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  deleteRound: async (id) => {
    return await run('DELETE FROM rounds WHERE id = ?', [id]);
  },

  markRoundCompleted: async (id) => {
    return await run('UPDATE rounds SET is_completed = 1 WHERE id = ?', [id]);
  },

  // 参与者相关
  createParticipant: async (sessionId, name, department, phone, deviceId = null, joinMethod = 'import') => {
    try {
      const result = await run(
        'INSERT INTO participants (session_id, name, department, phone, device_id, join_method) VALUES (?, ?, ?, ?, ?, ?)',
        [sessionId, name, department, phone, deviceId, joinMethod]
      );
      return result;
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('该设备已参与本次抽奖');
      }
      throw error;
    }
  },

  getParticipantsBySession: async (sessionId) => {
    return await all('SELECT * FROM participants WHERE session_id = ? AND is_active = 1', [sessionId]);
  },

  getParticipantById: async (id) => {
    return await get('SELECT * FROM participants WHERE id = ?', [id]);
  },

  getParticipantByDeviceAndSession: async (deviceId, sessionId) => {
    return await get('SELECT * FROM participants WHERE device_id = ? AND session_id = ?', [deviceId, sessionId]);
  },

  updateParticipant: async (id, data) => {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(id);
    return await run(`UPDATE participants SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  deleteParticipant: async (id) => {
    return await run('DELETE FROM participants WHERE id = ?', [id]);
  },

  clearParticipants: async (sessionId) => {
    return await run('DELETE FROM participants WHERE session_id = ?', [sessionId]);
  },

  // 中奖记录相关
  createWinner: async (sessionId, participantId, roundId) => {
    return await run('INSERT INTO winners (session_id, participant_id, round_id) VALUES (?, ?, ?)', 
      [sessionId, participantId, roundId]);
  },

  getWinnersBySession: async (sessionId) => {
    return await all(`
      SELECT w.*, p.name, p.department, r.name as round_name 
      FROM winners w 
      JOIN participants p ON w.participant_id = p.id 
      JOIN rounds r ON w.round_id = r.id 
      WHERE w.session_id = ? 
      ORDER BY w.won_at DESC
    `, [sessionId]);
  },

  getWinnersByRound: async (roundId) => {
    return await all(`
      SELECT w.*, p.name, p.department 
      FROM winners w 
      JOIN participants p ON w.participant_id = p.id 
      WHERE w.round_id = ?
    `, [roundId]);
  },

  checkParticipantWon: async (sessionId, participantId) => {
    const result = await get('SELECT COUNT(*) as count FROM winners WHERE session_id = ? AND participant_id = ?', 
      [sessionId, participantId]);
    return result.count > 0;
  },

  getAvailableParticipants: async (sessionId, allowRepeat = false) => {
    if (allowRepeat) {
      return await all('SELECT * FROM participants WHERE session_id = ? AND is_active = 1', [sessionId]);
    } else {
      return await all(`
        SELECT p.* FROM participants p 
        WHERE p.session_id = ? AND p.is_active = 1 
        AND p.id NOT IN (SELECT participant_id FROM winners WHERE session_id = ?)
      `, [sessionId, sessionId]);
    }
  },

  // 获取统计数据
  getSessionStats: async (sessionId) => {
    const participantCount = (await get('SELECT COUNT(*) as count FROM participants WHERE session_id = ?', [sessionId])).count;
    const winnerCount = (await get('SELECT COUNT(*) as count FROM winners WHERE session_id = ?', [sessionId])).count;
    const roundCount = (await get('SELECT COUNT(*) as count FROM rounds WHERE session_id = ?', [sessionId])).count;
    const completedRounds = (await get('SELECT COUNT(*) as count FROM rounds WHERE session_id = ? AND is_completed = 1', [sessionId])).count;
    
    return {
      participantCount,
      winnerCount,
      roundCount,
      completedRounds
    };
  }
};

module.exports = dbModel;