const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const db = require('../models/db');

// 导出中奖记录为Excel
router.get('/winners', async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ error: '请指定抽奖会话' });
    }
    
    const session = await db.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: '抽奖会话不存在' });
    }
    
    const winners = await db.getWinnersBySession(sessionId);
    
    if (winners.length === 0) {
      return res.status(400).json({ error: '该抽奖暂无中奖记录' });
    }
    
    // 准备Excel数据
    const data = winners.map((winner, index) => ({
      '序号': index + 1,
      '奖项': winner.round_name,
      '姓名': winner.name,
      '部门': winner.department || '',
      '中奖时间': winner.won_at
    }));
    
    // 创建工作簿
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 8 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 }
    ];
    
    xlsx.utils.book_append_sheet(wb, ws, '中奖名单');
    
    // 生成文件名
    const fileName = `${session.name}_中奖名单_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../../uploads', fileName);
    
    // 写入文件
    xlsx.writeFile(wb, filePath);
    
    // 发送文件
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('下载文件失败:', err);
      }
      // 删除临时文件
      fs.unlink(filePath, (err) => {
        if (err) console.error('删除临时文件失败:', err);
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导出参与者列表
router.get('/participants', async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ error: '请指定抽奖会话' });
    }
    
    const session = await db.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: '抽奖会话不存在' });
    }
    
    const participants = await db.getParticipantsBySession(sessionId);
    
    // 准备Excel数据
    const data = participants.map((p, index) => ({
      '序号': index + 1,
      '姓名': p.name,
      '部门': p.department || '',
      '手机号': p.phone || '',
      '加入方式': p.join_method === 'import' ? '导入' : '自助加入',
      '加入时间': p.created_at
    }));
    
    // 创建工作簿
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    
    ws['!cols'] = [
      { wch: 8 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 20 }
    ];
    
    xlsx.utils.book_append_sheet(wb, ws, '参与者名单');
    
    const fileName = `${session.name}_参与者名单_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../../uploads', fileName);
    
    xlsx.writeFile(wb, filePath);
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('下载文件失败:', err);
      }
      fs.unlink(filePath, (err) => {
        if (err) console.error('删除临时文件失败:', err);
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;