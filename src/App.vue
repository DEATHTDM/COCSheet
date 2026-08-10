<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/">COCSheet</RouterLink>
      <nav aria-label="主要导航">
        <RouterLink to="/create">创建调查员</RouterLink>
        <RouterLink to="/kp/presets">KP 建卡预设</RouterLink>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>
