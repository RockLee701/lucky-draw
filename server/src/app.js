const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const db = require('./models/db');
const { getLocalIP } = require('./utils/helpers');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../client/dist')));

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// 路由
app.use('/api/admin', require('./routes/admin'));
app.use('/api/lottery', require('./routes/lottery'));
app.use('/api/export', require('./routes/export'));

// 导入Excel
app.post('/api/admin/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }
    
    const session = await db.getCurrentSession();
    if (!session) {
      return res.status(400).json({ error: '请先创建抽奖会话' });
    }
    
    // 读取Excel
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel文件为空' });
    }
    
    // 导入数据
    let imported = 0;
    for (const row of data) {
      const name = row['姓名'] || row['name'] || row['Name'];
      const department = row['部门'] || row['department'] || row['Department'] || '';
      const phone = row['手机号'] || row['phone'] || row['Phone'] || '';
      
      if (name) {
        try {
          await db.createParticipant(session.id, name, department, phone, null, 'import');
          imported++;
        } catch (error) {
          console.error('导入参与者失败:', error.message);
        }
      }
    }
    
    // 删除上传的文件
    const fs = require('fs');
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('删除上传文件失败:', err);
    });
    
    res.json({ 
      success: true, 
      message: `成功导入 ${imported} 人`,
      data: { imported, total: data.length }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 生成测试数据
app.post('/api/admin/generate-test-data', async (req, res) => {
  try {
    const session = await db.getCurrentSession();
    if (!session) {
      return res.status(400).json({ error: '请先创建抽奖会话' });
    }
    
    const { generateTestParticipants } = require('./utils/helpers');
    const participants = generateTestParticipants(50);
    
    let imported = 0;
    for (const p of participants) {
      try {
        await db.createParticipant(session.id, p.name, p.department, p.phone, null, 'import');
        imported++;
      } catch (error) {
        console.error('创建测试数据失败:', error.message);
      }
    }
    
    res.json({ 
      success: true, 
      message: `成功生成 ${imported} 个测试人员`,
      data: { imported }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 生成二维码
app.get('/api/qrcode', async (req, res) => {
  try {
    const localIP = getLocalIP();
    const joinUrl = `http://${localIP}:${PORT}/#/join`;
    
    const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#DC143C',
        light: '#FFFFFF'
      }
    });
    
    res.json({ 
      success: true, 
      data: {
        qrCode: qrCodeDataUrl,
        url: joinUrl
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取服务器信息
app.get('/api/server-info', (req, res) => {
  const localIP = getLocalIP();
  res.json({
    success: true,
    data: {
      ip: localIP,
      port: PORT,
      url: `http://${localIP}:${PORT}`
    }
  });
});

// 前端路由处理
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

app.listen(PORT, () => {
  const localIP = getLocalIP();
  console.log('🎉 年会抽奖系统启动成功！');
  console.log(`📱 大屏幕地址: http://${localIP}:${PORT}`);
  console.log(`⚙️  管理后台: http://${localIP}:${PORT}/#/admin`);
  console.log(`🔗 参与者加入: http://${localIP}:${PORT}/#/join`);
  console.log('');
  console.log('按 Ctrl+C 停止服务');
});