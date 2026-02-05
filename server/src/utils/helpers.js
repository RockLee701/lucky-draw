const os = require('os');

// 获取本机IP地址
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '127.0.0.1';
}

// 生成随机中文姓名
function generateRandomName() {
  const familyNames = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许', '何', '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏', '陶', '姜', '戚', '谢', '邹', '喻', '柏', '水', '窦', '章', '云', '苏', '潘', '葛', '奚', '范', '彭', '郎'];
  const givenNames = ['伟', '芳', '娜', '敏', '静', '秀', '强', '磊', '洋', '勇', '军', '杰', '娟', '艳', '涛', '明', '超', '秀英', '华', '鹏', '飞', '婷', '宇', '欣', '雨', '晨曦', '子轩', '梓涵', '一诺', '诗涵', '浩宇', '欣怡', '博文', '梦瑶', '俊杰', '晓萱', '子墨', '思琪', '雨泽', '语嫣'];
  
  const familyName = familyNames[Math.floor(Math.random() * familyNames.length)];
  const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
  return familyName + givenName;
}

// 生成测试数据
function generateTestParticipants(count = 50) {
  const departments = ['技术部', '销售部', '人事部', '财务部', '市场部', '运营部', '设计部', '产品部'];
  const participants = [];
  
  for (let i = 0; i < count; i++) {
    participants.push({
      name: generateRandomName(),
      department: departments[Math.floor(Math.random() * departments.length)],
      phone: `1${Math.floor(Math.random() * 9 + 3)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      join_method: 'import'
    });
  }
  
  return participants;
}

// 默认奖项配置
const defaultRounds = [
  { name: '幸运奖', quantity: 10, order_num: 1 },
  { name: '三等奖', quantity: 4, order_num: 2 },
  { name: '二等奖', quantity: 2, order_num: 3 },
  { name: '一等奖', quantity: 1, order_num: 4 },
  { name: '特等奖', quantity: 1, order_num: 5 }
];

module.exports = {
  getLocalIP,
  generateRandomName,
  generateTestParticipants,
  defaultRounds
};