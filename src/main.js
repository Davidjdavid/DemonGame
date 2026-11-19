import { startApp } from './ui/app.js';

function boot() {
  startApp(document.querySelector('#app'));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
