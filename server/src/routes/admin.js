const express = require('express');
const router = express.Router();
const db = require('../models/db');

// 创建新抽奖会话
router.post('/sessions', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: '抽奖名称不能为空' });
    }
    
    // 检查是否有进行中的抽奖
    const currentSession = await db.getCurrentSession();
    if (currentSession) {
      return res.status(400).json({ error: '当前已有进行中的抽奖，请先关闭' });
    }
    
    const sessionId = await db.createSession(name);
    res.json({ 
      success: true, 
      data: { id: sessionId, name, status: 'ongoing' },
      message: '抽奖会话创建成功'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取当前抽奖会话
router.get('/sessions/current', async (req, res) => {
  try {
    const session = await db.getCurrentSession();
    if (!session) {
      return res.json({ success: true, data: null });
    }
    
    const stats = await db.getSessionStats(session.id);
    res.json({ 
      success: true, 
      data: { ...session, ...stats }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取所有抽奖会话
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await db.getAllSessions();
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 关闭抽奖会话
router.post('/sessions/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    await db.closeSession(id);
    res.json({ success: true, message: '抽奖会话已关闭' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 初始化默认奖项
router.post('/sessions/:id/init-rounds', async (req, res) => {
  try {
    const { id } = req.params;
    const { defaultRounds } = require('../utils/helpers');
    
    // 删除现有轮次
    const existingRounds = await db.getRoundsBySession(id);
    for (const round of existingRounds) {
      await db.deleteRound(round.id);
    }
    
    // 创建默认轮次
    for (const round of defaultRounds) {
      await db.createRound(id, round.name, round.quantity, round.order_num);
    }
    
    const rounds = await db.getRoundsBySession(id);
    res.json({ 
      success: true, 
      data: rounds,
      message: '默认奖项已初始化'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取轮次列表
router.get('/sessions/:id/rounds', async (req, res) => {
  try {
    const { id } = req.params;
    const rounds = await db.getRoundsBySession(id);
    res.json({ success: true, data: rounds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建轮次
router.post('/sessions/:id/rounds', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, order_num, allow_repeat } = req.body;
    
    if (!name || !quantity || !order_num) {
      return res.status(400).json({ error: '请填写完整的轮次信息' });
    }
    
    const result = await db.createRound(id, name, quantity, order_num, allow_repeat || 0);
    res.json({ 
      success: true, 
      data: { id: result.lastID },
      message: '轮次创建成功'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新轮次
router.put('/rounds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, order_num, allow_repeat } = req.body;
    
    await db.updateRound(id, { name, quantity, order_num, allow_repeat });
    res.json({ success: true, message: '轮次更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除轮次
router.delete('/rounds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteRound(id);
    res.json({ success: true, message: '轮次删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;