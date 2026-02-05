<template>
  <router-view />
</template>

<script setup>
</script>

<style>
/* 全局样式 */
.festive-theme {
  background: linear-gradient(135deg, #8B0000 0%, #DC143C 50%, #8B0000 100%);
  min-height: 100vh;
}

.gold-text {
  color: #FFD700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.gold-border {
  border: 3px solid #FFD700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.festive-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.lantern-decoration {
  position: relative;
}

.lantern-decoration::before,
.lantern-decoration::after {
  content: '🏮';
  position: absolute;
  font-size: 48px;
  top: -20px;
}

.lantern-decoration::before {
  left: 20px;
}

.lantern-decoration::after {
  right: 20px;
}

/* 按钮样式 */
.festive-btn {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border: none;
  color: #8B0000;
  font-weight: bold;
  transition: all 0.3s;
}

.festive-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.6);
}

/* 动画 */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.pulse-animation {
  animation: pulse 2s infinite;
}

@keyframes shine {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.shine-text {
  background: linear-gradient(90deg, #FFD700, #FFF, #FFD700);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 3s linear infinite;
}
</style>