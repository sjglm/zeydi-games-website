document.getElementById('year').textContent = new Date().getFullYear();

document.querySelectorAll('[data-slideshow]').forEach((slideshow) => {
  const panel = slideshow.closest('.game');
  const slides = Array.from(slideshow.querySelectorAll('.game-slide'));
  const controls = panel.querySelector('.slideshow-controls');
  const toggle = panel.querySelector('.slideshow-toggle');
  const dots = Array.from(panel.querySelectorAll('[data-slide]'));
  const status = panel.querySelector('[data-slide-status]');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let paused = motionPreference.matches;
  let inView = !('IntersectionObserver' in window);
  let timer;
  let request = 0;

  function updateToggle() {
    toggle.textContent = paused ? 'Play' : 'Pause';
    toggle.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} Black Tide slideshow`);
  }

  function schedule() {
    window.clearTimeout(timer);
    if (!paused && inView && !document.hidden) {
      timer = window.setTimeout(() => showSlide((current + 1) % slides.length), 7000);
    }
  }

  async function showSlide(index, manual = false) {
    const thisRequest = ++request;
    window.clearTimeout(timer);
    if (manual) {
      paused = true;
      updateToggle();
    }

    const next = slides[index];
    next.loading = 'eager';
    try {
      if (typeof next.decode === 'function') {
        await next.decode();
      } else if (!next.complete) {
        await new Promise((resolve, reject) => {
          next.addEventListener('load', resolve, { once: true });
          next.addEventListener('error', reject, { once: true });
        });
      }
    } catch {
      if (thisRequest === request) {
        if (manual) status.textContent = 'This screenshot could not be loaded.';
        schedule();
      }
      return;
    }

    if (thisRequest !== request) return;
    current = index;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
    if (manual) {
      status.textContent = `Screenshot ${current + 1} of ${slides.length}: ${dots[current].getAttribute('aria-label').replace(/^Show /, '')}.`;
    }
    schedule();
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => showSlide(Number(dot.dataset.slide), true));
  });

  toggle.addEventListener('click', () => {
    paused = !paused;
    updateToggle();
    schedule();
  });

  document.addEventListener('visibilitychange', schedule);
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) paused = true;
    updateToggle();
    schedule();
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.intersectionRatio >= 0.15;
      schedule();
    }, { threshold: 0.15 });
    observer.observe(panel);
  }

  updateToggle();
  controls.hidden = false;
  schedule();
});
