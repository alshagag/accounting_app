<script setup>
import { ref } from 'vue'
import logo from '../assets/favicon.svg'
import hero from '../assets/hero.png'

const count = ref(0)
</script>

<template>
  <section id="center">

    <!-- Hero -->
    <div class="hero">
      <img :src="hero" class="hero-img" alt="Hero" />
      <img :src="logo" class="logo" alt="Logo" />
    </div>

    <!-- Title -->
    <div class="text">
      <h1>📊 المحاسب المبسط</h1>
      <p>نظام إدارة حسابات بسيط وسريع وسهل الاستخدام</p>
    </div>

    <!-- Counter demo -->
    <button class="counter" @click="count++">
      عدد الضغطات: {{ count }}
    </button>

    <!-- Actions -->
    <div class="actions">
      <a href="/accounting.html" class="btn">الدخول للنظام</a>
      <a href="/versions/versions.html" class="btn secondary">الإصدارات</a>
    </div>

  </section>
</template>

<style scoped>
#center {
  text-align: center;
  padding: 60px 20px;
  font-family: sans-serif;
}

.hero {
  position: relative;
  margin-bottom: 20px;
}

.hero-img {
  width: 180px;
  opacity: 0.3;
}

.logo {
  width: 60px;
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
}

h1 {
  font-size: 30px;
  margin: 10px 0;
}

p {
  color: #666;
  margin-bottom: 20px;
}

.counter {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  background: #2d6cdf;
  color: white;
  cursor: pointer;
  margin-bottom: 20px;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

.btn {
  padding: 10px 16px;
  background: #2d6cdf;
  color: white;
  border-radius: 8px;
  text-decoration: none;
}

.btn.secondary {
  background: #555;
}
</style>