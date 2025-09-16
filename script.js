// Pointer parallax for bubbles
(function () {
  const container = document.querySelector('[data-parallax-container]');
  const bubbles = Array.from(document.querySelectorAll('[data-parallax]'));
  if (!container || bubbles.length === 0) return;

  let prefersReduced = false;
  try {
    prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {}
  if (prefersReduced) return;

  const bounds = () => container.getBoundingClientRect();
  let raf = 0;
  let targetX = 0, targetY = 0;
  let currX = 0, currY = 0;

  function onMove(e) {
    const rect = bounds();
    const x = (e.clientX - rect.left) / rect.width; // 0..1
    const y = (e.clientY - rect.top) / rect.height; // 0..1
    targetX = (x - 0.5) * 2; // -1..1
    targetY = (y - 0.5) * 2; // -1..1
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    currX += (targetX - currX) * 0.08;
    currY += (targetY - currY) * 0.08;

    bubbles.forEach((el) => {
      const strength = parseFloat(el.getAttribute('data-parallax') || '8');
      const tx = currX * strength;
      const ty = currY * strength;
      el.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`;
    });

    if (Math.abs(currX - targetX) > 0.001 || Math.abs(currY - targetY) > 0.001) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
    }
  }

  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerleave', () => {
    targetX = 0; targetY = 0; if (!raf) raf = requestAnimationFrame(tick);
  });
})();

