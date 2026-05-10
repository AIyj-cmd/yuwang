import { createApp } from 'vue';
import PixelUI, { registerPaintWorklets } from '@mmt817/pixel-ui';
import '@mmt817/pixel-ui/dist/index.css';
import './styles.css';
import App from './App.vue';
import router from './router';
import { applyTheme, readSavedTheme } from './theme';

// Apply the saved theme before Vue mounts so the first paint already has
// the right colors (avoids a flash of default styling).
applyTheme(readSavedTheme());

registerPaintWorklets();

createApp(App).use(router).use(PixelUI).mount('#app');
