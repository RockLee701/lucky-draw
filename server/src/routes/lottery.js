const express = require('express');
const router = express.Router();
const db = require('../models/db');

// 获取当前可抽奖的轮次
router.get('/current-round', async (req, res) => {
  try {
    const session = await db.getCurrentSession();
    if (!session) {
      return res.status(404).json({ error: '当前没有进行中的抽奖' });
    }
    
    const rounds = await db.getRoundsBySession(session.id);
    const currentRound = rounds.find(r => !r.is_completed);
    
    if (!currentRound) {
      return res.json({ 
        success: true, 
        data: null,
        message: '所有轮次已完成'
      });
    }
    
    // 获取已中奖人数
    const winners = await db.getWinnersByRound(currentRound.id);
    const remaining = currentRound.quantity - winners.length;
    
    res.json({ 
      success: true, 
      data: {
        ...currentRound,
        winners_count: winners.length,
        remaining: remaining
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取可抽奖的参与者
router.get('/available-participants', async (req, res) => {
  try {
    const session = await db.getCurrentSession();
    if (!session) {
      return res.status(404).json({ error: '当前没有进行中的抽奖' });
    }
    
    const { roundId } = req.query;
    let allowRepeat = false;
    
    if (roundId) {
      const round = await db.getRoundById(roundId);
      if (round) {
        allowRepeat = round.allow_repeat === 1;
      }
    }
    
    const participants = await db.getAvailableParticipants(session.id, allowRepeat);
    res.json({ success: true, data: participants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 执行抽奖
router.post('/draw', async (req, res) => {
  try {
    const { roundId, count = 1 } = req.body;
    const session = await db.getCurrentSession();
    
    if (!session) {
      return res.status(404).json({ error: '当前没有进行中的抽奖' });
    }
    
    const round = await db.getRoundById(roundId);
    if (!round) {
      return res.status(404).json({ error: '轮次不存在' });
    }
    
    if (round.session_id !== session.id) {
      return res.status(400).json({ error: '轮次不属于当前抽奖' });
    }
    
    if (round.is_completed) {
      return res.status(400).json({ error: '该轮次已完成' });
    }
    
    // 获取已中奖人数
    const existingWinners = await db.getWinnersByRound(roundId);
    const remainingToDraw = round.quantity - existingWinners.length;
    
    if (remainingToDraw <= 0) {
      return res.status(400).json({ error: '该轮次已抽满' });
    }
    
    const drawCount = Math.min(count, remainingToDraw);
    
    // 获取可抽奖的参与者
    const allowRepeat = round.allow_repeat === 1;
    const availableParticipants = await db.getAvailableParticipants(session.id, allowRepeat);
    
    if (availableParticipants.length === 0) {
      return res.status(400).json({ error: '没有可抽奖的参与者' });
    }
    
    if (availableParticipants.length < drawCount) {
      return res.status(400).json({ error: `可抽奖人数不足，当前只有 ${availableParticipants.length} 人` });
    }
    
    // 随机抽取
    const shuffled = [...availableParticipants].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, drawCount);
    
    // 保存中奖记录
    const winners = [];
    for (const participant of selected) {
      const result = await db.createWinner(session.id, participant.id, roundId);
      winners.push({
        id: result.lastID,
        participant_id: participant.id,
        name: participant.name,
        department: participant.department,
        round_id: roundId,
        round_name: round.name
      });
    }
    
    // 检查是否抽满
    const totalWinners = existingWinners.length + drawCount;
    if (totalWinners >= round.quantity) {
      await db.markRoundCompleted(roundId);
    }
    
    res.json({ 
      success: true, 
      data: winners,
      message: `成功抽取 ${drawCount} 名中奖者`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取中奖列表
router.get('/winners', async (req, res) => {
  try {
    const session = await db.getCurrentSession();
    if (!session) {
      return res.json({ success: true, data: [] });
    }
    
    const winners = await db.getWinnersBySession(session.id);
    res.json({ success: true, data: winners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取某轮次的中奖者
router.get('/rounds/:id/winners', async (req, res) => {
  try {
    const { id } = req.params;
    const winners = await db.getWinnersByRound(id);
    res.json({ success: true, data: winners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 加入抽奖（参与者自助加入）
router.post('/join', async (req, res) => {
  try {
    const { name, deviceId } = req.body;
    const session = await db.getCurrentSession();
    
    if (!session) {
      return res.status(404).json({ error: '当前没有进行中的抽奖' });
    }
    
    if (!name) {
      return res.status(400).json({ error: '请输入姓名' });
    }
    
    if (!deviceId) {
      return res.status(400).json({ error: '设备标识不能为空' });
    }
    
    // 检查是否已存在
    const existingParticipant = await db.getParticipantByDeviceAndSession(deviceId, session.id);
    if (existingParticipant) {
      return res.status(400).json({ error: '您已参与本次抽奖' });
    }
    
    // 创建参与者
    await db.createParticipant(session.id, name, '', '', deviceId, 'self');
    
    res.json({ 
      success: true, 
      message: '加入成功',
      data: { name, session_name: session.name }
    });
  } catch (error) {
    if (error.message === '该设备已参与本次抽奖') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// 获取参与者列表
router.get('/participants', async (req, res) => {
  try {
    const session = await db.getCurrentSession();
    if (!session) {
      return res.json({ success: true, data: [] });
    }
    
    const participants = await db.getParticipantsBySession(session.id);
    res.json({ success: true, data: participants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;