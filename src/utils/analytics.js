// analytics.js — улучшенная версия с очередью для отложенной аналитики

const YM_ID = 105245584;

// Очередь вызовов до загрузки счётчиков
const queue = [];

const flushQueue = () => {
  if (queue.length === 0) return;

  while (queue.length > 0) {
    const { type, args } = queue.shift();
    try {
      if (type === 'ym' && typeof window.ym === 'function') {
        window.ym(...args);
      } else if (type === 'gtag' && typeof window.gtag === 'function') {
        window.gtag(...args);
      }
    } catch (e) {
      // Если снова не получилось — вернём в очередь (на всякий случай)
      queue.unshift({ type, args });
      break;
    }
  }
};

// Проверяем каждые 200 мс, появились ли счётчики
const intervalId = setInterval(() => {
  const ymReady = typeof window.ym === 'function';
  const gtagReady = typeof window.gtag === 'function';
  if (ymReady || gtagReady) {
    flushQueue();
  }
  // Если оба счётчика загружены и очередь пуста — останавливаем проверку
  if (ymReady && gtagReady && queue.length === 0) {
    clearInterval(intervalId);
  }
}, 200);

// Гарантия: при уходе со страницы всё равно попытаться отправить
window.addEventListener('pagehide', flushQueue, { once: true });

export const trackGoal = (goalName, params = {}) => {
  // 1. Сразу пытаемся отправить
  let ymSent = false;
  let gtagSent = false;

  try {
    if (typeof window.ym === 'function') {
      window.ym(YM_ID, 'reachGoal', goalName, params);
      ymSent = true;
    }
  } catch (e) { /* noop */ }

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', goalName, params);
      gtagSent = true;
    }
  } catch (e) { /* noop */ }

  // 2. Если кто-то не отправился — ставим в очередь
  if (!ymSent) {
    queue.push({ type: 'ym', args: [YM_ID, 'reachGoal', goalName, params] });
  }
  if (!gtagSent) {
    queue.push({ type: 'gtag', args: ['event', goalName, params] });
  }
};

// Для отладки: сколько целей висит в очереди
export const getPendingGoals = () => queue.length;