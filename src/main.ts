import { createApp } from 'vue';
import PixelUI, { registerPaintWorklets } from '@mmt817/pixel-ui';
import '@mmt817/pixel-ui/dist/index.css';
import './styles.css';
import App from './App.vue';
import router from './router';

registerPaintWorklets();

createApp(App).use(router).use(PixelUI).mount('#app');
