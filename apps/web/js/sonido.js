// Sonido suave al navegar: una nota corta tipo quena, generada en el navegador con Web Audio
// (sin archivos ni servicios externos). Cada sección suena con una nota de la escala pentatónica
// andina. Muy bajo volumen, solo tras un toque de la persona, y se puede apagar en Mi cuenta.
const CLAVE = 'ly:sonido';
// Escala pentatónica menor en La (La, Do, Re, Mi, Sol), la de muchos huaynos.
const NOTAS = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
let ctx = null;

export function sonidoActivo() {
  try { return localStorage.getItem(CLAVE) !== '0'; } catch { return true; }
}

export function cambiarSonido(activo) {
  try { localStorage.setItem(CLAVE, activo ? '1' : '0'); } catch { /* sin almacenamiento */ }
}

export function sonar(indice = 0) {
  if (!sonidoActivo() || document.hidden) return;
  const Contexto = window.AudioContext || window.webkitAudioContext;
  if (!Contexto) return;
  try {
    ctx = ctx || new Contexto();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const f = NOTAS[Math.abs(indice) % NOTAS.length];
    const volumen = ctx.createGain();
    volumen.gain.setValueAtTime(0.0001, t);
    volumen.gain.exponentialRampToValueAtTime(0.05, t + 0.02);   // ataque suave, como un soplo
    volumen.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 2400;
    // Cuerpo de la nota (triangular, cálida) con un leve vibrato.
    const nota = ctx.createOscillator();
    nota.type = 'triangle';
    nota.frequency.setValueAtTime(f * 0.97, t);
    nota.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const vibrato = ctx.createOscillator(), hondo = ctx.createGain();
    vibrato.frequency.value = 6;
    hondo.gain.value = f * 0.008;
    vibrato.connect(hondo).connect(nota.frequency);
    // Aire de la quena: un armónico muy bajo.
    const aire = ctx.createOscillator(), aireVol = ctx.createGain();
    aire.type = 'sine';
    aire.frequency.value = f * 2;
    aireVol.gain.value = 0.18;
    aire.connect(aireVol).connect(filtro);
    nota.connect(filtro).connect(volumen).connect(ctx.destination);
    [nota, vibrato, aire].forEach(o => { o.start(t); o.stop(t + 0.34); });
  } catch { /* el audio es un adorno: si falla, no pasa nada */ }
}
