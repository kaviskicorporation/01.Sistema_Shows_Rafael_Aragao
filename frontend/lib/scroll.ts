/** Anima a rolagem até o formulário — mesmo efeito sticky de rolar à mão. */
let scrollRaf = 0;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function jumpToContactForm(
  e?: { preventDefault?: () => void } | null
) {
  e?.preventDefault?.();

  const section = document.getElementById("contato");
  if (!section) return;

  const targetY = Math.max(
    0,
    section.offsetTop + section.offsetHeight - window.innerHeight
  );
  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 2) return;

  // Duração proporcional à distância (sensação de rolagem real)
  const duration = Math.min(2600, Math.max(1600, Math.abs(delta) * 0.5));

  cancelAnimationFrame(scrollRaf);
  const html = document.documentElement;
  const previous = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";

  const t0 = performance.now();

  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration);
    window.scrollTo(0, startY + delta * easeInOutCubic(p));
    if (p < 1) {
      scrollRaf = requestAnimationFrame(step);
    } else {
      html.style.scrollBehavior = previous;
    }
  };

  scrollRaf = requestAnimationFrame(step);
}
