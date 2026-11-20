export function responderConsulta(texto) {
  const t = texto.toLowerCase();

  if (t.includes('millpu') || t.includes('turquesa')) {
    return '🌊 **Aguas Turquesas de Millpu:** Están ubicadas en la comunidad de Circamarca (distrito de Huancapi), a unas 3.5 horas de Huamanga. La mejor temporada para visitarlas es entre mayo y noviembre, cuando el agua luce su tono turquesa más cristalino. Se recomienda salir temprano (6:00 a.m.) y llevar calzado para trekking.';
  }

  if (t.includes('iglesia') || t.includes('templo') || t.includes('catedral')) {
    return '🏛️ **33 Templos Coloniales de Huamanga:** Ayacucho es conocida como la Ciudad de las 33 Iglesias. Las más emblemáticas son la Catedral Basílica en la Plaza Mayor, el Templo de Santo Domingo, San Cristóbal (la más antigua, 1540) y el Convento de Santa Teresa. Durante Semana Santa, todas abren sus puertas para las procesiones tradicionales.';
  }

  if (t.includes('comida') || t.includes('plato') || t.includes('gastronom') || t.includes('comer')) {
    return '🍲 **Gastronomía Típica de Ayacucho:** No te puedes perder la **Puca Picante** con chicharrón de cerdo, el **Qapchi** con queso y habas, el reconfortante **Mondongo ayacuchano** de la mañana, y de postre el tradicional helado artesanal **Muyuchi** en los portales de la Plaza Mayor.';
  }

  if (t.includes('quinua') || t.includes('pampa') || t.includes('obelisco') || t.includes('wari')) {
    return '🏺 **Santuario Histórico y Quinua:** A 37 km al noreste de Huamanga se encuentra la Pampa de Ayacucho con su imponente Obelisco de 44 metros de mármol. Al lado está el pintoresco pueblo de artesanos alfareros de Quinua y, en la ruta, el Complejo Arqueológico Wari, capital del primer imperio andino.';
  }

  if (t.includes('vilcas') || t.includes('inca') || t.includes('ushnu')) {
    return '☀️ **Vilcashuamán:** Fue uno de los centros administrativos incaicos más importantes del Chinchaysuyo. Destaca el imponente **Ushnu** (pirámide ceremonial de 5 plataformas con el trono del Inca) y el **Templo del Sol**, sobre cuyas bases los españoles construyeron la iglesia colonial.';
  }

  if (t.includes('transporte') || t.includes('terminal') || t.includes('llegar') || t.includes('ruta')) {
    return '🚌 **Movilidad y Rutas:** Para rutas interprovinciales (Cangallo, Huanta, Quinua, Vilcashuamán), los vehículos parten de los terminales terrestres autorizados en Huamanga (Terminal Sur y Terminal Totora). En LlegueYa puedes consultar paraderos y horarios de referencia sin sobrecostos.';
  }

  return `¡Allillanchu! Como tu Guía Inca en LlegueYa impulsado por Gemini AI, conozco todas las rutas, festividades y patrimonio de Ayacucho. Puedes consultarme sobre las Aguas de Millpu, el Santuario de la Pampa de Quinua, los 33 templos coloniales o la gastronomía local.`;
}

export function iniciarChatbot() {
  const chatbot = document.getElementById('chatbot-flotante');
  const toggle = document.getElementById('chatbot-toggle');
  const ventana = document.getElementById('chatbot-ventana');
  const cerrar = document.getElementById('chatbot-cerrar');
  const form = document.getElementById('chatbot-form');
  const input = document.getElementById('chatbot-input');
  const mensajes = document.getElementById('chatbot-mensajes');

  if (!chatbot || !toggle || !ventana) return;

  const sesion = document.getElementById('sesion');
  if (sesion && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      if (!sesion.hidden) {
        chatbot.hidden = false;
      }
    });
    observer.observe(sesion, { attributes: true, attributeFilter: ['hidden'] });
    if (!sesion.hidden) chatbot.hidden = false;
  }

  toggle.addEventListener('click', () => {
    ventana.hidden = !ventana.hidden;
    if (!ventana.hidden && input) input.focus();
  });

  if (cerrar) {
    cerrar.addEventListener('click', () => {
      ventana.hidden = true;
    });
  }

  if (form && input && mensajes) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const texto = input.value.trim();
      if (!texto) return;

      const userMsg = document.createElement('div');
      userMsg.className = 'chat-msg user';
      const p1 = document.createElement('p');
      p1.textContent = texto;
      userMsg.appendChild(p1);
      mensajes.appendChild(userMsg);
      input.value = '';

      setTimeout(() => {
        const botMsg = document.createElement('div');
        botMsg.className = 'chat-msg bot';
        const p2 = document.createElement('p');
        p2.innerHTML = responderConsulta(texto).replace(/\n/g, '<br>');
        botMsg.appendChild(p2);
        mensajes.appendChild(botMsg);
        mensajes.scrollTop = mensajes.scrollHeight;
      }, 350);
      mensajes.scrollTop = mensajes.scrollHeight;
    });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarChatbot);
  } else {
    iniciarChatbot();
  }
}
