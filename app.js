/* Ciudad de los muertos · app.js
   Cuatro vistas: portada, plano, lente (tumba en primera persona) y código abierto.
   La navegación usa el hash de la dirección: #inicio, #panteon, #tumba-3, #codigo.
   Todo el contenido llega de window.CDM (datos.js). */
(function () {
  const D = window.CDM;
  const T = D.tumbas;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Tumbas ya visitadas: solo una comodidad del navegador de cada lector
  const visitadas = new Set();
  try { JSON.parse(localStorage.getItem("cdm-visitadas") || "[]").forEach(v => visitadas.add(v)); } catch (e) {}
  function guardarVisita(id) { visitadas.add(id); try { localStorage.setItem("cdm-visitadas", JSON.stringify([...visitadas])); } catch (e) {} }

  // Cuántas tumbas comparten cada hilo
  const HILOS = {};
  T.forEach(t => t.hilos.forEach(h => { (HILOS[h] = HILOS[h] || []).push(t.id); }));

  /* ===================== BARRA Y SONIDO ===================== */
  Sonido.alCambiar = on => {
    $("#sonido").classList.toggle("on", on);
    $("#sonido").setAttribute("aria-pressed", on);
    $("#sonido-txt").textContent = on ? "Sonido" : "Activar sonido";
  };
  $("#sonido").addEventListener("click", () => Sonido.on ? Sonido.parar() : Sonido.iniciar());
  document.addEventListener("click", e => {
    const ir = e.target.closest("[data-ir]");
    if (ir) { location.hash = ir.dataset.ir; return; }
    if (e.target.closest("[data-entrar]")) { Sonido.iniciar(); location.hash = "panteon"; }
  });

  /* ===================== PORTADA ===================== */
  const C = D.contexto;
  $("#contexto").innerHTML = `<p class="dato">Antes del panteón</p><p class="cifra">1842</p><h3>${esc(C.titulo)}</h3><p>${esc(C.texto)}</p><p class="dato">${esc(C.fuente)}</p>`;
  $("#voces-grid").innerHTML = ["recio", "villarreal", "salas"].map(k => {
    const v = D.voces[k];
    return `<article class="voz-card"><img src="${v.foto}" alt="Retrato de ${esc(v.nombre)}" loading="lazy"><div><p class="dato">${esc(v.rol)}</p><h3>${esc(v.nombre)}</h3></div><p>${esc(v.semblanza)}</p></article>`;
  }).join("");
  const PR = D.proyecto;
  const enlace = (o) => o.url ? `<a href="${o.url}" target="_blank" rel="noopener">${esc(o.nombre)}</a>` : esc(o.nombre);
  $("#creditos").innerHTML = `
    <span class="dato">Fotografía<b>${esc(PR.fotografia)}</b></span>
    <span class="dato">Investigación y manejo de archivos<b>${enlace(PR.investigacion)}</b></span>
    <span class="dato">Lecturas<b>Carlos Recio Dávila · Arturo Villarreal · Griselda Salas</b></span>
    <span class="dato">Dirección creativa y vibe coding<b>${enlace(PR.direccion)}</b></span>
    <span class="dato">Una entrega de<b>${enlace({ nombre: PR.serie, url: PR.serie_url })} · ${esc(PR.medio)}</b></span>
    <span class="dato">Una experiencia de<b>${enlace(PR.hub)}</b></span>
    <span class="dato">Taller abierto<b><button type="button" data-ir="codigo">Ver el código</button></b></span>`;

  /* ===================== PLANO (SVG generativo) ===================== */
  const AV_X = [180, 420, 660, 860], AV_Y = 320;
  function trazoBase() {
    const r = rng(11); let s = "";
    for (let x = 36; x < 962; x += 20) for (let y = 36; y < 604; y += 28) {
      if (Math.abs(y + 10 - AV_Y) < 28) continue;
      if (AV_X.some(a => Math.abs(x + 6 - a) < 24)) continue;
      const v = r(); if (v < .14) continue;
      const mayor = v > .92 || (Math.abs(y + 10 - AV_Y) < 60 && v > .6);
      s += `<rect class="lote${mayor ? " mayor" : ""}" x="${x}" y="${y}" width="${mayor ? 17 : 13}" height="${mayor ? 24 : 20}"/>`;
    }
    return `<rect x="20" y="20" width="960" height="600" class="muro"/>
      <path class="calle" d="${AV_X.map(x => `M${x} 20V620`).join("")}"/>
      <path class="calle-principal" d="M20 ${AV_Y}H980"/>${s}`;
  }
  $("#mapa").innerHTML = trazoBase() + `
    <text class="rotulo" x="560" y="${AV_Y + 4}" text-anchor="middle" opacity=".6">CALLE PRINCIPAL</text>
    <g class="acceso" data-ir="inicio" role="link" tabindex="0" aria-label="Volver al acceso del panteón"><rect x="6" y="${AV_Y - 22}" width="28" height="44" fill="var(--noche)" stroke="var(--verdin)"/><text class="rotulo" x="42" y="${AV_Y - 28}">ACCESO</text></g>
    <g id="hilos-lineas"></g>
    <path id="camino" d=""/>` +
    T.map(t => `<g class="marca" data-id="${t.id}" tabindex="0" role="button" aria-label="Tumba ${t.id}: ${esc(t.nombre)}" transform="translate(${t.plano[0]} ${t.plano[1]})">
      <circle class="halo" r="17"/><circle class="nucleo" r="14"/><text class="num">${t.id}</text>
      <text class="nombre" y="30" text-anchor="middle">${esc(t.corto.toUpperCase())}</text></g>`).join("");

  $("#panel-tumbas").innerHTML = T.map(t => `<li><button type="button" data-id="${t.id}"><span class="num">${t.id}</span><span class="nom">${esc(t.nombre)}<small>${esc(t.sub)}</small></span></button></li>`).join("");
  $("#panel-hilos").innerHTML = Object.entries(D.categorias).map(([cat, lista]) =>
    `<div><h4>${esc(cat)}</h4><div class="chips">${lista.filter(h => HILOS[h]).map(h => `<button type="button" class="chip" data-hilo="${esc(h)}" aria-pressed="false">${esc(h)} <small>${HILOS[h].length}</small></button>`).join("")}</div></div>`).join("");

  function marcarVisitadas() { $$("#mapa .marca").forEach(g => g.classList.toggle("visitada", visitadas.has(+g.dataset.id))); }
  function resaltar(id, on) { $$(`#mapa .marca[data-id="${id}"], #panel-tumbas button[data-id="${id}"]`).forEach(el => el.classList.toggle("activa", on)); }
  ["mouseover", "focusin"].forEach(ev => document.addEventListener(ev, e => { const el = e.target.closest && e.target.closest("#mapa .marca, #panel-tumbas button"); if (el) resaltar(+el.dataset.id, true); }));
  ["mouseout", "focusout"].forEach(ev => document.addEventListener(ev, e => { const el = e.target.closest && e.target.closest("#mapa .marca, #panel-tumbas button"); if (el) resaltar(+el.dataset.id, false); }));

  // Pestañas del índice
  function pestana(cual) {
    const h = cual === "hilos";
    $("#tab-tumbas").setAttribute("aria-selected", !h); $("#tab-hilos").setAttribute("aria-selected", h);
    $("#panel-tumbas").hidden = h; $("#panel-hilos").hidden = !h;
  }
  $("#tab-tumbas").addEventListener("click", () => pestana("tumbas"));
  $("#tab-hilos").addEventListener("click", () => pestana("hilos"));

  // Hilos: encienden las tumbas que comparten un rasgo y las unen en el plano
  let hiloActual = null;
  function hilar(h) {
    hiloActual = h;
    const ids = h ? HILOS[h] || [] : [];
    $(".plano-mapa").classList.toggle("hilando", !!h);
    $$("#mapa .marca").forEach(g => g.classList.toggle("encendida", ids.includes(+g.dataset.id)));
    $$("#panel-hilos .chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.hilo === h));
    const pts = ids.map(id => T.find(t => t.id === id).plano).sort((a, b) => a[0] - b[0]);
    let d = "";
    pts.forEach((p, k) => { if (!k) { d = `M${p[0]} ${p[1]}`; return; } const q = pts[k - 1]; d += ` Q${(q[0] + p[0]) / 2} ${Math.min(q[1], p[1]) - 60} ${p[0]} ${p[1]}`; });
    $("#hilos-lineas").innerHTML = pts.length > 1 ? `<path class="hilo-linea" d="${d}"/>` : "";
    const box = $("#hilo-activo");
    box.hidden = !h;
    if (h) box.innerHTML = `<span class="dato">Hilo</span><b>${esc(h)}</b><span class="dato">${ids.length} ${ids.length === 1 ? "tumba" : "tumbas"}</span><button type="button" id="soltar">Soltar ×</button>`;
    if (window.__lentesHilo) window.__lentesHilo(h, ids);
  }
  $("#panel-hilos").addEventListener("click", e => { const c = e.target.closest(".chip"); if (c) hilar(c.getAttribute("aria-pressed") === "true" ? null : c.dataset.hilo); });
  $("#hilo-activo").addEventListener("click", e => { if (e.target.id === "soltar") hilar(null); });

  // Caminar desde el acceso hasta una tumba
  let caminando = false;
  function caminarA(id) {
    if (caminando) return; caminando = true;
    const [mx, my] = T.find(t => t.id === id).plano;
    const p = $("#camino");
    let d;
    if (Math.abs(my - AV_Y) < 70) d = `M34 ${AV_Y}H${mx}V${my}`;
    else { const ax = AV_X.reduce((a, b) => Math.abs(b - mx) < Math.abs(a - mx) ? b : a); d = `M34 ${AV_Y}H${ax}V${my}H${mx}`; }
    p.setAttribute("d", d);
    const L = p.getTotalLength();
    p.style.transition = "none"; p.style.opacity = "1"; p.style.strokeDasharray = `${L}`; p.style.strokeDashoffset = `${L}`;
    p.getBoundingClientRect();
    const dur = quieto ? 0 : 1100;
    p.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.4,0,.2,1)`; p.style.strokeDashoffset = "0";
    Sonido.pasos(dur / 1000);
    setTimeout(() => { caminando = false; location.hash = "tumba-" + id; setTimeout(() => { p.style.opacity = "0"; }, 300); }, dur + 150);
  }
  $("#mapa").addEventListener("click", e => { const g = e.target.closest(".marca"); if (g) caminarA(+g.dataset.id); });
  $("#mapa").addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const g = e.target.closest(".marca, .acceso"); if (!g) return;
    e.preventDefault(); if (g.classList.contains("acceso")) location.hash = "inicio"; else caminarA(+g.dataset.id);
  });
  $("#panel-tumbas").addEventListener("click", e => { const b = e.target.closest("button"); if (b) caminarA(+b.dataset.id); });

  /* ===================== SILUETAS PROVISIONALES =====================
     Mientras una fotografía no está disponible se dibuja una silueta de piedra
     que sigue la tipología de la tumba. Al llegar la foto, la silueta desaparece sola. */
  const CAMS = [{ z: 1, fx: 0, fy: -80 }, { z: 2, fx: 0, fy: -92 }, { z: 4.4, fx: -6, fy: -138 }, { z: 4.8, fx: 12, fy: -62 }, { z: 6, fx: -4, fy: -18 }];
  let grano = null;
  function patronGrano(g) {
    if (!grano) {
      grano = document.createElement("canvas"); grano.width = grano.height = 128;
      const x = grano.getContext("2d"), d = x.createImageData(128, 128);
      for (let k = 0; k < d.data.length; k += 4) { const v = Math.random() * 255; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 40; }
      x.putImageData(d, 0, 0);
    }
    return g.createPattern(grano, "repeat");
  }
  function piedra(g) { const gr = g.createLinearGradient(-70, -170, 60, 0); gr.addColorStop(0, "#6a706a"); gr.addColorStop(.55, "#3f4540"); gr.addColorStop(1, "#252925"); g.fillStyle = gr; g.strokeStyle = "rgba(210,214,205,.18)"; g.lineWidth = .5; }
  function R(g, x, y, w, h) { piedra(g); g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h); }
  function P(g, pts) { piedra(g); g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); g.stroke(); }
  function arcoPunta(g, x, y, w, h) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w * .5); g.quadraticCurveTo(x, y, x + w / 2, y); g.quadraticCurveTo(x + w, y, x + w, y + w * .5); g.lineTo(x + w, y + h); g.closePath(); }
  function figura(g, x, y, s) { piedra(g); g.beginPath(); g.ellipse(x, y, 6 * s, 18 * s, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(x, y - 22 * s, 4.5 * s, 0, 7); g.fill(); g.stroke(); }
  function cruz(g, x, y, s) { R(g, x - 1.5 * s, y - 22 * s, 3 * s, 22 * s); R(g, x - 7 * s, y - 16 * s, 14 * s, 3 * s); }
  const FORMAS = {
    templete(g) { R(g, -70, -6, 140, 6); [-50, -16, 18].forEach(x => R(g, x, -10, 30, 4)); R(g, -34, -40, 68, 30); R(g, -30, -128, 8, 88); R(g, 22, -128, 8, 88);
      piedra(g); arcoPunta(g, -36, -170, 72, 44); g.fill(); g.stroke(); figura(g, 0, -64, 1.1); },
    capilla(g) { R(g, -56, -112, 112, 112); P(g, [[-64, -112], [64, -112], [0, -150]]);
      g.fillStyle = "#0c0d0c"; arcoPunta(g, -18, -86, 36, 86); g.fill();
      [-60, 52].forEach(x => P(g, [[x, -112], [x + 8, -112], [x + 4, -146]])); R(g, -12, -194, 24, 44); g.fillStyle = "#2c4a66"; g.beginPath(); g.arc(0, -176, 7, 0, 7); g.fill(); cruz(g, 0, -194, 1); },
    aguja(g) { R(g, -50, -96, 100, 96); g.fillStyle = "#0c0d0c"; arcoPunta(g, -16, -78, 32, 78); g.fill();
      R(g, -16, -126, 32, 30); P(g, [[-16, -126], [16, -126], [0, -206]]); cruz(g, 0, -206, 1);
      [-50, -32, 24, 42].forEach(x => P(g, [[x, -96], [x + 8, -96], [x + 4, -128]])); figura(g, -68, -26, 1); figura(g, 68, -26, 1); },
    mausoleo(g) { R(g, -60, -104, 120, 104); R(g, -66, -114, 132, 10); g.fillStyle = "#0c0d0c"; g.beginPath(); g.moveTo(-18, 0); g.lineTo(-18, -54); g.arc(0, -54, 18, Math.PI, 0); g.lineTo(18, 0); g.fill();
      R(g, -92, -26, 26, 26); R(g, 66, -26, 26, 26); figura(g, -79, -54, 1.1); figura(g, 79, -54, 1.1); },
    baldaquino(g) { R(g, -46, -10, 92, 10); R(g, -34, -24, 68, 14); R(g, -24, -70, 48, 46); [-18, -6, 6, 18].forEach(x => R(g, x - 1.5, -170, 3, 100));
      piedra(g); arcoPunta(g, -24, -200, 48, 30); g.fill(); g.stroke(); figura(g, 0, -224, .9);
      g.strokeStyle = "#4a4f49"; g.lineWidth = 1.2; for (let x = -80; x <= 80; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, -34); g.stroke(); } },
    parabola(g) { piedra(g); g.beginPath(); g.moveTo(-62, 0); g.quadraticCurveTo(0, -260, 62, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "rgba(140,170,190,.25)"; g.beginPath(); g.moveTo(-36, 0); g.quadraticCurveTo(0, -170, 36, 0); g.closePath(); g.fill();
      g.fillStyle = "#0c0d0c"; g.fillRect(-12, -52, 24, 52); R(g, -1.5, -160, 3, 34); R(g, -10, -150, 20, 3); },
    cupula(g) { [0, 1, 2].forEach(k => R(g, -40 + k * 6, -6 - k * 6, 80 - k * 12, 6)); R(g, -50, -118, 100, 100);
      for (let y = -110; y < -20; y += 12) { g.fillStyle = "rgba(150,155,148,.18)"; g.fillRect(-50, y, 100, 5); }
      g.fillStyle = "#0c0d0c"; arcoPunta(g, -16, -88, 32, 70); g.fill();
      piedra(g); g.beginPath(); g.arc(0, -118, 44, Math.PI, 0); g.fill(); g.stroke(); cruz(g, 0, -162, 1.2);
      g.strokeStyle = "#6a706a"; g.beginPath(); g.arc(0, -177, 4, 0, 7); g.stroke(); },
    ancla(g) { R(g, -50, -14, 100, 14); R(g, -36, -60, 72, 46); P(g, [[-12, -60], [12, -60], [12, -128], [5, -136], [-2, -129], [-12, -133]]);
      g.strokeStyle = "#7c827b"; g.lineWidth = 3; g.beginPath(); g.moveTo(-20, -70); g.lineTo(-20, -126); g.moveTo(-30, -118); g.lineTo(-10, -118);
      g.moveTo(-36, -84); g.quadraticCurveTo(-20, -60, -4, -84); g.stroke(); g.beginPath(); g.arc(-20, -130, 4, 0, 7); g.stroke();
      R(g, 70, -12, 40, 12); R(g, 80, -60, 20, 48); R(g, 88, -110, 4, 50); R(g, 76, -96, 28, 4); g.strokeStyle = "#7c827b"; g.lineWidth = 1.5; g.beginPath(); g.arc(90, -94, 9, 0, 7); g.stroke(); }
  };
  const ORDEN_FORMAS = Object.keys(FORMAS);
  function pintar(cv, t, vi) {
    const w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height; if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cielo = g.createLinearGradient(0, 0, 0, h); cielo.addColorStop(0, "#1c2220"); cielo.addColorStop(.6, "#121513"); cielo.addColorStop(1, "#0a0b0a");
    g.fillStyle = cielo; g.fillRect(0, 0, w, h);
    const cam = CAMS[vi], U = h / 280 * cam.z;
    g.save(); g.translate(w / 2 - cam.fx * U, h / 2 - cam.fy * U); g.scale(U, U);
    g.fillStyle = "#0d0f0d"; g.fillRect(-4000, 0, 8000, 2000);
    const r = rng(t.id * 97); g.globalAlpha = .3;
    for (let k = 0; k < 12; k++) { const x = (r() - .5) * 800; if (Math.abs(x) < 120) continue; g.save(); g.translate(x, 0); g.scale(.3, .3); FORMAS[ORDEN_FORMAS[(k + t.id) % 8]](g); g.restore(); }
    g.globalAlpha = 1; FORMAS[t.silueta](g); g.restore();
    g.fillStyle = patronGrano(g); g.globalAlpha = .5; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
  }

  /* ===================== LENTE (primera persona) ===================== */
  let actual = T[0], vista = 0, zoom = 1, zoomAct = 1;
  const objetivo = { x: 0, y: 0 }, pos = { x: 0, y: 0 };
  const escena = $("#escena"), escenario = $("#escenario");
  const estadoFoto = {}; // src -> "ok" | "falta"

  // Devuelve la foto real si existe; si no, una silueta provisional.
  // mini = true usa la miniatura de fotos/mini/ (para la tira de vistas).
  function medio(t, k, alListo, mini) {
    const f = t.fotos[k], nombre = D.vistas[k].nombre;
    const lienzo = () => { const cv = document.createElement("canvas"); cv.setAttribute("role", "img"); cv.setAttribute("aria-label", `${t.nombre}, ${nombre}. Silueta provisional.`); return cv; };
    if (estadoFoto[f.src] === "falta") { const cv = lienzo(); alListo && alListo(cv, false); return cv; }
    const im = new Image(); im.decoding = "async"; im.draggable = false;
    im.alt = `${t.nombre}, ${nombre}. ${f.pie} Fotografía de Homero Sánchez.`;
    let src = mini ? f.src.replace(/^fotos\//, "fotos/mini/") : f.src;
    im.onload = () => { if (!mini) estadoFoto[f.src] = "ok"; alListo && alListo(im, true); };
    im.onerror = () => {
      if (mini && src !== f.src) { src = f.src; im.src = src; return; } // sin miniatura: usa la foto completa
      estadoFoto[f.src] = "falta"; const cv = lienzo(); im.replaceWith(cv); alListo && alListo(cv, false);
    };
    im.src = src;
    return im;
  }

  /* Encuadre en primera persona: la foto cubre la pantalla con un margen extra y la mirada
     puede recorrerla completa. En una foto vertical, subir el cursor es levantar la vista. */
  const marco = { w: 0, h: 0, rx: 0, ry: 0 };
  const tactil = () => matchMedia("(pointer: coarse)").matches;
  function encuadrar() {
    const el = escena.firstElementChild, vw = escenario.clientWidth, vh = escenario.clientHeight;
    if (!el || !vw) return;
    let ar = vw / vh;
    if (el.tagName === "IMG" && el.naturalWidth) ar = el.naturalWidth / el.naturalHeight;
    let w, h;
    if (tactil()) {
      // En pantallas táctiles la foto entra completa; se explora con los dedos
      w = Math.min(vw, vh * ar); h = w / ar;
      if (el.tagName === "CANVAS") { w = vw; h = vh; }
    } else {
      const extra = 1.08;
      w = vw * extra; h = w / ar;
      if (h < vh * extra) { h = vh * extra; w = h * ar; }
      if (el.tagName === "CANVAS") { w = vw * 1.18; h = vh * 1.18; }
    }
    marco.w = w; marco.h = h;
    escena.style.width = w + "px"; escena.style.height = h + "px";
  }
  function estadoLeyenda(real) {
    $("#leyenda-estado").textContent = real ? "Foto: Homero Sánchez" : "Silueta provisional · la fotografía de Homero Sánchez se integrará aquí";
  }
  function mostrarVista(vi, instant) {
    vista = vi; zoom = 1; reiniciarTactil();
    const t = actual, f = t.fotos[vi];
    const poner = () => {
      escena.innerHTML = "";
      escena.appendChild(medio(t, vi, (el, real) => {
        encuadrar();
        if (el.tagName === "CANVAS") requestAnimationFrame(() => pintar(el, t, vi));
        if (vista === vi && actual === t) estadoLeyenda(real);
      }));
      escena.classList.remove("fuera");
    };
    if (instant) poner(); else { escena.classList.add("fuera"); setTimeout(poner, 280); Sonido.obturador(); }
    $("#leyenda-num").textContent = `Vista ${vi + 1} de 5 · ${f.clave}`;
    $("#leyenda-tipo").textContent = D.vistas[vi].nombre;
    $("#leyenda-pie").textContent = f.pie;
    $$("#tira button").forEach((b, k) => b.setAttribute("aria-selected", k === vi));
    $("#leyenda-paleta").innerHTML = (f.paleta || []).map((c, k) => `<i style="background:${c};flex:${Math.max(.08, f.pesos[k])}"></i>`).join("");
    $("#minimapa-img").src = f.src.replace(/^fotos\//, "fotos/mini/");
    pintarFichaFoto(t, vi);
    marcarGuardar();
    try { history.replaceState(null, "", "#tumba-" + t.id + "-" + f.clave.toLowerCase()); } catch (e) {}
  }

  let pistaVista = false;
  function pistaTactil() {
    if (pistaVista || !tactil()) return;
    try { if (sessionStorage.getItem("cdm-pista")) { pistaVista = true; return; } sessionStorage.setItem("cdm-pista", "1"); } catch (e) {}
    pistaVista = true;
    const p = $("#pista"); p.hidden = false;
    setTimeout(() => { p.classList.add("fuera"); setTimeout(() => { p.hidden = true; }, 700); }, 2800);
  }
  function lecturaHTML(k, texto) {
    const v = D.voces[k];
    return `<article class="lectura"><img src="${v.foto}" alt=""><p class="quien">${esc(v.nombre)}<small>${esc(v.rol)}</small></p><p>${esc(texto)}</p></article>`;
  }
  function abrirTumba(id, vi0) {
    const t = T.find(x => x.id === id); if (!t) return;
    actual = t; guardarVisita(id);
    $("#lente-num").textContent = `Tumba ${t.id} de ${T.length} · ${t.sub}`;
    $("#lente-titulo").textContent = t.nombre;
    document.title = `${t.nombre} · Ciudad de los muertos`;

    const tira = $("#tira"); tira.innerHTML = "";
    D.vistas.forEach((v, k) => {
      const b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-label", v.nombre);
      b.appendChild(medio(t, k, (el) => { if (el.tagName === "CANVAS") { el.width = 184; el.height = 120; requestAnimationFrame(() => pintar(el, t, k)); } }, true));
      const s = document.createElement("span"); s.textContent = v.clave; b.appendChild(s);
      b.addEventListener("click", () => mostrarVista(k)); tira.appendChild(b);
    });

    $("#relato").innerHTML = t.relato.split("\n\n").map(p => `<p>${esc(p)}</p>`).join("");
    $("#ficha-datos").innerHTML = t.ficha.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
    $("#lecturas").innerHTML = ["recio", "villarreal", "salas"].map(k => lecturaHTML(k, t.lecturas[k])).join("");
    const ext = t.extendida;
    $("#extendida-sec").hidden = !ext;
    if (ext) {
      $("#extendida").open = false;
      $("#extendida").innerHTML = `<summary>${esc(ext.titulo || "Lectura de Griselda Salas")}</summary><div class="cuerpo"><p class="dato">Griselda Salas · Arquitecta</p>${ext.parrafos.map(p => `<p${p.length < 70 ? ' class="corto"' : ""}>${esc(p)}</p>`).join("")}</div>`;
    }
    $("#ficha-hilos").innerHTML = t.hilos.map(h => `<button type="button" class="chip" data-hilo="${esc(h)}" aria-pressed="false">${esc(h)} <small>${HILOS[h].length}</small></button>`).join("");
    $("#ficha-rel").innerHTML = "";
    $("#otros").innerHTML = T.map(o => `<button type="button" data-id="${o.id}" aria-current="${o.id === id}" aria-label="Tumba ${o.id}: ${esc(o.nombre)}">${o.id}</button>`).join("");
    $("#ficha").scrollTop = 0;
    mostrarVista(vi0 || 0, true);
    Sonido.afinar(t.tono);
    pistaTactil();
    // Precarga de las cinco vistas
    t.fotos.forEach(f => { if (!estadoFoto[f.src]) { const i = new Image(); i.src = f.src; } });
  }

  $("#ficha-hilos").addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    const on = c.getAttribute("aria-pressed") !== "true";
    $$("#ficha-hilos .chip").forEach(x => x.setAttribute("aria-pressed", x === c && on));
    const h = c.dataset.hilo;
    const otras = on ? HILOS[h].filter(id => id !== actual.id) : null;
    $("#ficha-rel").innerHTML = !on ? "" : otras.length
      ? otras.map(id => { const o = T.find(x => x.id === id); return `<button type="button" data-id="${id}"><span>${id}</span>${esc(o.nombre)}</button>`; }).join("") + `<button type="button" data-ver-hilo="${esc(h)}"><span>⌖</span>Ver el hilo en el plano</button>`
      : `<p class="nota">Ninguna otra tumba del recorrido comparte este rasgo.</p>`;
  });
  $("#ficha-rel").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.verHilo) { pendienteHilo = b.dataset.verHilo; location.hash = "panteon"; return; }
    Sonido.pasos(.6); location.hash = "tumba-" + b.dataset.id;
  });
  $("#otros").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { Sonido.pasos(.6); location.hash = "tumba-" + b.dataset.id; } });
  function mover(d) { const i = T.indexOf(actual); Sonido.pasos(.6); location.hash = "tumba-" + T[(i + d + T.length) % T.length].id; }
  $("#anterior").addEventListener("click", () => mover(-1));
  $("#siguiente").addEventListener("click", () => mover(1));
  function alternarFicha(forzar) {
    const on = typeof forzar === "boolean" ? forzar : !$("#lente").classList.contains("con-ficha");
    $("#lente").classList.toggle("con-ficha", on);
    $("#ficha-btn").setAttribute("aria-expanded", on);
    $("#ficha-btn").textContent = on ? "Cerrar ficha" : "Ficha y lecturas";
    $("#ficha-mini").setAttribute("aria-expanded", on);
  }
  $("#ficha-btn").addEventListener("click", () => alternarFicha());
  $("#ficha-mini").addEventListener("click", () => alternarFicha(true));
  $("#ficha-cerrar").addEventListener("click", () => alternarFicha(false));

  /* Pie de foto plegable y modo «foto limpia».
     En pantallas chicas el pie empieza plegado para que la foto se vea completa;
     el título de la vista y los botones Leer, Ficha y el ojo quedan siempre a la mano. */
  const angosto = () => matchMedia("(max-width: 820px)").matches;
  let pieAbierto = !angosto();
  function pintarPie() {
    $("#leyenda").classList.toggle("plegada", !pieAbierto);
    $("#leyenda-toggle").setAttribute("aria-expanded", pieAbierto);
    $("#leyenda-toggle .txt").textContent = pieAbierto ? "Ocultar" : "Leer";
  }
  $("#leyenda-toggle").addEventListener("click", () => { pieAbierto = !pieAbierto; pintarPie(); });
  pintarPie();
  function fotoLimpia(on) {
    $("#lente").classList.toggle("limpia", on); document.body.classList.toggle("foto-limpia", on);
    $("#limpia-btn").setAttribute("aria-pressed", on); $("#mostrar-ui").hidden = !on;
    if (on) $("#mostrar-ui").focus(); else $("#limpia-btn").focus();
  }
  $("#limpia-btn").addEventListener("click", () => fotoLimpia(true));
  $("#mostrar-ui").addEventListener("click", () => fotoLimpia(false));

  // Mirar: el cursor o el dedo giran la cabeza; un clic (o toque) acerca
  let arrastre = null;
  const esTacto = e => e.pointerType !== "mouse" && tactil();
  escenario.addEventListener("pointermove", e => {
    if (esTacto(e)) return;
    const r = escenario.getBoundingClientRect();
    if (e.pointerType === "mouse") { objetivo.x = ((e.clientX - r.left) / r.width - .5) * 2; objetivo.y = ((e.clientY - r.top) / r.height - .5) * 2; }
    else if (arrastre) {
      objetivo.x = Math.max(-1, Math.min(1, arrastre.ox - (e.clientX - arrastre.x) / r.width * 3));
      objetivo.y = Math.max(-1, Math.min(1, arrastre.oy - (e.clientY - arrastre.y) / r.height * 3));
      if (Math.abs(e.clientX - arrastre.x) + Math.abs(e.clientY - arrastre.y) > 8) arrastre.mov = true;
    }
  });
  // Zoom profundo: rueda, pellizco, botones y teclado. Un clic alterna entre la vista completa y ×2.2.
  const ZMIN = 1, ZMAX = 3.2;
  function fijarZoom(z) {
    zoom = Math.max(ZMIN, Math.min(ZMAX, z));
    if (tactil()) { const k = zoom / tq.s; animarA(zoom, tq.x * k, tq.y * k); }
  }
  const dedos = new Map(); let pellizco = null;
  escenario.addEventListener("pointerdown", e => {
    if (esTacto(e)) return;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 2) { const [p, q] = [...dedos.values()]; pellizco = { d: Math.hypot(p.x - q.x, p.y - q.y), z: zoom }; arrastre = null; return; }
    arrastre = { x: e.clientX, y: e.clientY, ox: objetivo.x, oy: objetivo.y, mov: false, tipo: e.pointerType };
  });
  escenario.addEventListener("pointermove", e => {
    if (esTacto(e) || !dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pellizco && dedos.size === 2) { const [p, q] = [...dedos.values()]; fijarZoom(pellizco.z * Math.hypot(p.x - q.x, p.y - q.y) / pellizco.d); }
  });
  const soltarDedo = e => { dedos.delete(e.pointerId); if (dedos.size < 2) pellizco = null; };
  escenario.addEventListener("pointercancel", e => { if (esTacto(e)) return; soltarDedo(e); arrastre = null; });
  escenario.addEventListener("pointerup", e => {
    if (esTacto(e)) return;
    const habiaPellizco = !!pellizco; soltarDedo(e);
    const a = arrastre; arrastre = null; if (!a || habiaPellizco) return;
    if (a.tipo !== "mouse" && a.mov) {
      // Deslizar en horizontal cambia de vista
      const dx = e.clientX - a.x;
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(e.clientY - a.y) * 1.5 && zoom < 1.05) { mostrarVista((vista + (dx < 0 ? 1 : 4)) % 5); objetivo.x = objetivo.y = 0; }
      return;
    }
    fijarZoom(zoom > 1.05 ? 1 : 2.2);
  });
  escenario.addEventListener("wheel", e => { e.preventDefault(); fijarZoom(zoom * Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
  $("#zoom-mas").addEventListener("click", () => fijarZoom(zoom * 1.4));
  $("#zoom-menos").addEventListener("click", () => fijarZoom(zoom / 1.4));
  // Minimapa: muestra qué parte de la foto se está mirando; un clic lleva la mirada ahí
  $("#minimapa").addEventListener("click", e => {
    const r = $("#minimapa").getBoundingClientRect(), vw = escenario.clientWidth, vh = escenario.clientHeight;
    if (tactil()) { const fx = (e.clientX - r.left) / r.width - .5, fy = (e.clientY - r.top) / r.height - .5; animarA(tq.s, -fx * marco.w * tq.s, -fy * marco.h * tq.s); return; }
    const W = marco.w * zoomAct, H = marco.h * zoomAct, rx = (W - vw) / 2, ry = (H - vh) / 2;
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    if (rx > 0) objetivo.x = Math.max(-1, Math.min(1, (fx - .5) * W / rx));
    if (ry > 0) objetivo.y = Math.max(-1, Math.min(1, (fy - .5) * H / ry));
  });
  escenario.addEventListener("pointerleave", () => { if (!arrastre) { objetivo.x *= .4; objetivo.y *= .4; } });

  /* ===================== EXPLORACIÓN TÁCTIL =====================
     La foto se ve completa. Un dedo arrastra la imagen exactamente bajo el dedo (con inercia al soltar),
     dos dedos acercan alrededor del punto que se pellizca, doble toque acerca o regresa,
     y deslizar con la foto completa cambia de vista. Los bordes ceden un poco y regresan solos. */
  const tq = { s: 1, x: 0, y: 0 }, tVel = { x: 0, y: 0 }, tPts = new Map();
  let tAnim = null, tGesto = null, tInercia = false, ultimoToque = null;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  function limites(sc) { return [Math.max(0, (marco.w * sc - escenario.clientWidth) / 2), Math.max(0, (marco.h * sc - escenario.clientHeight) / 2)]; }
  function goma(v, m) { return v > m ? m + (v - m) * .28 : v < -m ? -m + (v + m) * .28 : v; }
  function animarA(sc, x, y) { sc = cl(sc, ZMIN, ZMAX); const [mx, my] = limites(sc); tAnim = { s: sc, x: cl(x, -mx, mx), y: cl(y, -my, my) }; tInercia = false; }
  function reiniciarTactil() { tq.s = 1; tq.x = 0; tq.y = 0; tAnim = null; tInercia = false; }
  function relCentro(p) { const r = escenario.getBoundingClientRect(); return { x: p.x - r.left - r.width / 2, y: p.y - r.top - r.height / 2 }; }
  function iniciarGesto() {
    const ps = [...tPts.values()];
    if (ps.length >= 2) {
      const [a, b] = ps, m = relCentro({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      tGesto = { tipo: "pinza", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: tq.s, x0: tq.x, y0: tq.y, m0: m };
    } else if (ps.length === 1) {
      const p = ps[0];
      tGesto = { tipo: "arrastre", px: p.x, py: p.y, x0: tq.x, y0: tq.y, t0: performance.now(), lx: p.x, ly: p.y, lt: performance.now(), recorrido: 0, ini: { x: p.x, y: p.y } };
    } else tGesto = null;
  }
  escenario.addEventListener("pointerdown", e => {
    if (!esTacto(e)) return;
    escenario.setPointerCapture && escenario.setPointerCapture(e.pointerId);
    tPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    tAnim = null; tInercia = false; tVel.x = tVel.y = 0;
    iniciarGesto();
  });
  escenario.addEventListener("pointermove", e => {
    if (!esTacto(e) || !tPts.has(e.pointerId)) return;
    tPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = tGesto; if (!g) return;
    if (g.tipo === "pinza" && tPts.size >= 2) {
      const [a, b] = [...tPts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      const m = relCentro({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      let sc = g.s0 * d / g.d0;
      if (sc < ZMIN) sc = ZMIN - (ZMIN - sc) * .35; if (sc > ZMAX) sc = ZMAX + (sc - ZMAX) * .35;
      const k = sc / g.s0;
      const [mx, my] = limites(sc);
      tq.s = sc; tq.x = goma(m.x - (g.m0.x - g.x0) * k, mx); tq.y = goma(m.y - (g.m0.y - g.y0) * k, my);
    } else if (g.tipo === "arrastre") {
      const now = performance.now(), dt = Math.max(1, now - g.lt);
      const [mx, my] = limites(tq.s);
      tq.x = goma(g.x0 + (e.clientX - g.px), mx); tq.y = goma(g.y0 + (e.clientY - g.py), my);
      // velocidad suavizada para la inercia (px por ms)
      tVel.x = tVel.x * .6 + (e.clientX - g.lx) / dt * .4; tVel.y = tVel.y * .6 + (e.clientY - g.ly) / dt * .4;
      g.recorrido += Math.abs(e.clientX - g.lx) + Math.abs(e.clientY - g.ly);
      g.lx = e.clientX; g.ly = e.clientY; g.lt = now;
    }
  });
  function soltarTactil(e, cancelado) {
    if (!esTacto(e) || !tPts.has(e.pointerId)) return;
    const g = tGesto; tPts.delete(e.pointerId);
    if (tPts.size) { iniciarGesto(); if (tGesto) tGesto.dePinza = true; return; }   // de pinza a arrastre sin brincos
    tGesto = null;
    if (cancelado || !g) { animarA(tq.s, tq.x, tq.y); return; }
    if (g.tipo === "pinza" || g.dePinza) { ultimoToque = null; animarA(tq.s, tq.x, tq.y); return; }
    const now = performance.now(), dx = e.clientX - g.ini.x, dy = e.clientY - g.ini.y, dur = now - g.t0;
    if (g.recorrido < 10 && dur < 280) {
      // Toque: el doble toque acerca hacia ese punto o regresa a la foto completa
      const p = relCentro({ x: e.clientX, y: e.clientY });
      if (ultimoToque && now - ultimoToque.t < 320 && Math.hypot(p.x - ultimoToque.x, p.y - ultimoToque.y) < 40) {
        ultimoToque = null;
        if (tq.s > 1.05) animarA(1, 0, 0);
        else { const sc = 2.4, k = sc / tq.s; animarA(sc, p.x - (p.x - tq.x) * k, p.y - (p.y - tq.y) * k); }
      } else ultimoToque = { t: now, x: p.x, y: p.y };
      return;
    }
    if (tq.s <= 1.02 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4 && dur < 600) {
      mostrarVista((vista + (dx < 0 ? 1 : 4)) % 5); return;   // deslizar con la foto completa: otra vista
    }
    const [mx, my] = limites(tq.s);
    if (Math.abs(tq.x) > mx + .5 || Math.abs(tq.y) > my + .5 || Math.hypot(tVel.x, tVel.y) < .05) { animarA(tq.s, tq.x, tq.y); return; }
    tInercia = true;
  }
  escenario.addEventListener("pointerup", e => soltarTactil(e, false));
  escenario.addEventListener("pointercancel", e => soltarTactil(e, true));
  // Safari: evita que el gesto de pellizco haga zoom a toda la página
  ["gesturestart", "gesturechange"].forEach(ev => escenario.addEventListener(ev, e => e.preventDefault()));
  let ultimoCuadro = performance.now();
  function pasoTactil(now) {
    const dt = Math.min(48, now - ultimoCuadro); ultimoCuadro = now;
    if (tAnim) {
      const k = quieto ? 1 : 1 - Math.pow(1 - .2, dt / 16.7);
      tq.s += (tAnim.s - tq.s) * k; tq.x += (tAnim.x - tq.x) * k; tq.y += (tAnim.y - tq.y) * k;
      if (Math.abs(tAnim.s - tq.s) < .001 && Math.abs(tAnim.x - tq.x) < .3 && Math.abs(tAnim.y - tq.y) < .3) { tq.s = tAnim.s; tq.x = tAnim.x; tq.y = tAnim.y; tAnim = null; }
    } else if (tInercia) {
      tq.x += tVel.x * dt; tq.y += tVel.y * dt;
      const f = Math.pow(.94, dt / 16.7); tVel.x *= f; tVel.y *= f;
      const [mx, my] = limites(tq.s);
      if (Math.abs(tq.x) > mx) { tq.x = goma(tq.x, mx); tVel.x *= .5; }
      if (Math.abs(tq.y) > my) { tq.y = goma(tq.y, my); tVel.y *= .5; }
      if (Math.hypot(tVel.x, tVel.y) < .02) animarA(tq.s, tq.x, tq.y);
    }
    zoom = tq.s; zoomAct = tq.s;
  }
  let zoomMostrado = "";
  function bucle(t) {
    if (tactil()) {
      pasoTactil(t);
      escena.style.transform = `translate(-50%, -50%) translate(${tq.x.toFixed(1)}px, ${tq.y.toFixed(1)}px) scale(${tq.s.toFixed(4)})`;
      if (!$("#lente").hidden && marco.w) {
        const vw = escenario.clientWidth, vh = escenario.clientHeight, W = marco.w * tq.s, H = marco.h * tq.s, c = v => Math.max(0, Math.min(1, v));
        const l = c((W / 2 - vw / 2 - tq.x) / W), tp = c((H / 2 - vh / 2 - tq.y) / H), w = Math.min(1 - l, vw / W), h = Math.min(1 - tp, vh / H);
        const mm = $("#minimapa-marco");
        mm.style.left = (l * 100).toFixed(2) + "%"; mm.style.top = (tp * 100).toFixed(2) + "%";
        mm.style.width = (w * 100).toFixed(2) + "%"; mm.style.height = (h * 100).toFixed(2) + "%";
        $("#minimapa").classList.toggle("on", tq.s > 1.08);
      }
      requestAnimationFrame(bucle); return;
    }
    if (Deriva.on && !quieto) { objetivo.x = Math.sin(t / 5200) * .85; objetivo.y = Math.cos(t / 7300) * .7; }
    const k = quieto ? 1 : .07;
    pos.x += (objetivo.x - pos.x) * k; pos.y += (objetivo.y - pos.y) * k; zoomAct += (zoom - zoomAct) * (quieto ? 1 : .08);
    const vw = escenario.clientWidth, vh = escenario.clientHeight;
    // Margen recorrible en cada eje, contando el acercamiento
    const rx = Math.max(0, (marco.w * zoomAct - vw) / 2), ry = Math.max(0, (marco.h * zoomAct - vh) / 2);
    const resp = quieto ? 0 : Math.sin(t / 2400) * 3; // respiración de quien mira
    escena.style.transform = `translate(-50%, -50%) translate(${(-pos.x * rx).toFixed(1)}px, ${(-pos.y * ry + resp).toFixed(1)}px) scale(${zoomAct.toFixed(4)})`;
    if (!$("#lente").hidden && marco.w) {
      const W = marco.w * zoomAct, H = marco.h * zoomAct;
      const L = (W / 2 - vw / 2 + pos.x * rx) / W, Tt = (H / 2 - vh / 2 + pos.y * ry) / H;
      const mm = $("#minimapa-marco"), cl = v => Math.max(0, Math.min(1, v));
      const l = cl(L), tp = cl(Tt), w = Math.min(1 - l, vw / W), h = Math.min(1 - tp, vh / H);
      mm.style.left = (l * 100).toFixed(2) + "%"; mm.style.top = (tp * 100).toFixed(2) + "%";
      mm.style.width = (w * 100).toFixed(2) + "%"; mm.style.height = (h * 100).toFixed(2) + "%";
      $("#minimapa").classList.toggle("on", zoomAct > 1.08);
      const zm = "×" + zoomAct.toFixed(1);
      if (zm !== zoomMostrado) { zoomMostrado = zm; $("#zoom-valor").textContent = zm; }
    }
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);
  addEventListener("resize", () => { if ($("#lente").hidden) return; encuadrar(); const cv = escena.querySelector("canvas"); if (cv) pintar(cv, actual, vista); });

  /* ===================== GLOSARIO ===================== */
  const tipos = ["todos", ...new Set(D.glosario.map(g => g.tipo))];
  let tipoGlosario = "todos";
  function pintarGlosario() {
    $("#glosario-filtros").innerHTML = tipos.map(t => `<button type="button" class="chip" data-tipo="${t}" aria-pressed="${t === tipoGlosario}">${t === "todos" ? "Todos" : t[0].toUpperCase() + t.slice(1)}</button>`).join("");
    $("#glosario-lista").innerHTML = D.glosario.filter(g => tipoGlosario === "todos" || g.tipo === tipoGlosario).map(g =>
      `<dt>${esc(g.termino)}<span>${esc(g.tipo)}</span></dt><dd>${esc(g.definicion)}<div class="donde">${g.tumbas.map(id => `<button type="button" data-id="${id}">Tumba ${id} · ${esc(T.find(t => t.id === id).corto)}</button>`).join("")}</div></dd>`).join("");
  }
  pintarGlosario();
  $("#glosario-filtros").addEventListener("click", e => { const b = e.target.closest("[data-tipo]"); if (b) { tipoGlosario = b.dataset.tipo; pintarGlosario(); } });
  $("#glosario-lista").addEventListener("click", e => { const b = e.target.closest("[data-id]"); if (b) { cerrarGlosario(); location.hash = "tumba-" + b.dataset.id; } });
  let focoPrevio = null;
  document.addEventListener("click", e => { if (e.target.closest("[data-abre-glosario]")) { focoPrevio = document.activeElement; $("#glosario").hidden = false; $("#glosario-cerrar").focus(); } });
  function cerrarGlosario() { $("#glosario").hidden = true; if (focoPrevio && focoPrevio.focus) focoPrevio.focus(); }
  $("#glosario-cerrar").addEventListener("click", cerrarGlosario);
  $("#glosario").addEventListener("click", e => { if (e.target.id === "glosario") cerrarGlosario(); });

  /* ===================== CÓDIGO ABIERTO ===================== */
  const FUENTES = ["index.html", "estilos.css", "app.js", "sonido.js", "datos.js"];
  const cache = {};
  let fuenteActual = FUENTES[0];
  $("#fuentes-tabs").innerHTML = FUENTES.map(f => `<button type="button" role="tab" data-f="${f}" aria-selected="${f === fuenteActual}">${f}</button>`).join("");
  async function verFuente(f) {
    fuenteActual = f;
    $$("#fuentes-tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.f === f));
    const pre = $("#fuente code");
    if (!cache[f]) {
      pre.textContent = "Cargando…";
      try { const r = await fetch(f); if (!r.ok) throw 0; cache[f] = await r.text(); }
      catch (e) { cache[f] = null; }
    }
    if (fuenteActual !== f) return;
    const txt = cache[f];
    pre.textContent = txt || `No se pudo cargar ${f} en esta vista. El archivo está en el paquete del proyecto.`;
    $("#fuente-info").textContent = txt ? `${f} · ${txt.split("\n").length.toLocaleString("es-MX")} líneas · ${(new Blob([txt]).size / 1024).toFixed(1)} KB` : f;
  }
  $("#fuentes-tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) verFuente(b.dataset.f); });
  $("#copiar").addEventListener("click", () => {
    const txt = cache[fuenteActual]; if (!txt) return;
    const b = $("#copiar");
    const listo = ok => { b.textContent = ok ? "Copiado" : "Selecciona y copia"; setTimeout(() => { b.textContent = "Copiar archivo"; }, 1800); };
    const seleccionar = () => { const r = document.createRange(); r.selectNodeContents($("#fuente code")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); listo(false); };
    try { navigator.clipboard.writeText(txt).then(() => listo(true), seleccionar); } catch (e) { seleccionar(); }
  });
  let fuentesListas = false;

  /* ===================== ESTA FOTOGRAFÍA · CITA =====================
     Como en los archivos abiertos de museos: dimensiones, color, autoría y una forma de citar. */
  function nombreTono(h) {
    if (h == null) return "neutro";
    if (h < 18 || h >= 340) return "rojizo"; if (h < 45) return "terracota"; if (h < 70) return "ocre";
    if (h < 165) return "verde"; if (h < 195) return "turquesa"; if (h < 255) return "azul"; if (h < 290) return "violeta"; return "rosado";
  }
  function enlaceFoto(t, vi) { return location.href.split("#")[0] + "#tumba-" + t.id + "-" + t.fotos[vi].clave.toLowerCase(); }
  function textoCita(t, vi) {
    return `Homero Sánchez, «${t.nombre}, ${D.vistas[vi].nombre.toLowerCase()}», fotografía. En Ciudad de los muertos, Historias de Saltillo, ${PR.medio}, 2026.`;
  }
  function pintarFichaFoto(t, vi) {
    const f = t.fotos[vi];
    const orient = f.w > f.h ? "Horizontal" : f.w < f.h ? "Vertical" : "Cuadrada";
    $("#foto-datos").innerHTML = [
      ["Vista", `${D.vistas[vi].nombre} · ${f.clave}`],
      ["Archivo", `tumba${t.id}_${f.clave}.jpg`],
      ["Autor", PR.fotografia],
      ["Formato", f.w ? `${orient} · ${f.w.toLocaleString("es-MX")} × ${f.h.toLocaleString("es-MX")} px` : "—"],
      ["Luz media", f.luz != null ? `${Math.round(f.luz * 100)} %` : "—"],
      ["Tono dominante", f.tono != null ? `${nombreTono(f.tono)} · ${f.tono}°` : "neutro"],
    ].map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("") +
      `<dt>Paleta</dt><dd><span class="muestras">${(f.paleta || []).map(c => `<i style="background:${c}" title="${c}"></i>`).join("")}</span></dd>`;
    $("#cita").textContent = textoCita(t, vi);
  }
  function copiarTexto(btn, txt, etiqueta) {
    const listo = ok => { btn.textContent = ok ? "Copiado" : "No se pudo copiar"; setTimeout(() => { btn.textContent = etiqueta; }, 1800); };
    try { navigator.clipboard.writeText(txt).then(() => listo(true), () => listo(false)); } catch (e) { listo(false); }
  }
  $("#copiar-cita").addEventListener("click", e => copiarTexto(e.currentTarget, textoCita(actual, vista), "Copiar cita"));
  $("#copiar-enlace").addEventListener("click", e => copiarTexto(e.currentTarget, enlaceFoto(actual, vista), "Copiar enlace"));

  /* ===================== CUADERNO =====================
     Colección personal de vistas guardadas, como Rijksstudio. Vive solo en este navegador. */
  let cuaderno = [];
  try { cuaderno = JSON.parse(localStorage.getItem("cdm-cuaderno") || "[]"); } catch (e) {}
  const claveVista = (t, vi) => `${t.id}-${t.fotos[vi].clave}`;
  function guardarCuaderno() { try { localStorage.setItem("cdm-cuaderno", JSON.stringify(cuaderno)); } catch (e) {} $("#cuaderno-n").textContent = cuaderno.length; }
  function marcarGuardar() {
    const on = cuaderno.includes(claveVista(actual, vista));
    $("#guardar").setAttribute("aria-pressed", on); $("#guardar").textContent = on ? "Guardada" : "Guardar";
  }
  function alternarGuardado() {
    const k = claveVista(actual, vista), i = cuaderno.indexOf(k);
    if (i >= 0) cuaderno.splice(i, 1); else { cuaderno.unshift(k); Sonido.obturador(); }
    guardarCuaderno(); marcarGuardar(); if (lenteActual === "archivo") pintarArchivo();
  }
  $("#guardar").addEventListener("click", alternarGuardado);
  function pintarCuaderno() {
    $("#cuaderno-lista").innerHTML = cuaderno.length ? cuaderno.map(k => {
      const [id, clave] = k.split("-"), t = T.find(x => x.id === +id); if (!t) return "";
      const vi = D.vistas.findIndex(v => v.clave === clave), f = t.fotos[vi];
      return `<div class="apunte"><img src="${f.src.replace(/^fotos\//, "fotos/mini/")}" alt=""><button type="button" class="ir" data-k="${k}"><b>${t.id} · ${esc(t.corto)}</b><span>${esc(D.vistas[vi].nombre)} · ${esc(f.pie)}</span></button><button type="button" class="quitar" data-quitar="${k}">Quitar</button></div>`;
    }).join("") : `<p class="vacio">Aún no has guardado ninguna vista. En cada fotografía, usa «Guardar» o la tecla G.</p>`;
  }
  let focoCuaderno = null;
  $("#cuaderno-btn").addEventListener("click", () => { focoCuaderno = document.activeElement; pintarCuaderno(); $("#cuaderno").hidden = false; $("#cuaderno-cerrar").focus(); });
  function cerrarCuaderno() { $("#cuaderno").hidden = true; if (focoCuaderno && focoCuaderno.focus) focoCuaderno.focus(); }
  $("#cuaderno-cerrar").addEventListener("click", cerrarCuaderno);
  $("#cuaderno").addEventListener("click", e => {
    if (e.target.id === "cuaderno") { cerrarCuaderno(); return; }
    const q = e.target.closest("[data-quitar]");
    if (q) { cuaderno = cuaderno.filter(k => k !== q.dataset.quitar); guardarCuaderno(); pintarCuaderno(); if (!$("#lente").hidden) marcarGuardar(); return; }
    const b = e.target.closest("[data-k]");
    if (b) { const [id, clave] = b.dataset.k.split("-"); cerrarCuaderno(); location.hash = `tumba-${id}-${clave.toLowerCase()}`; }
  });
  guardarCuaderno();

  /* ===================== LENTES DEL PANTEÓN =====================
     Cuatro maneras de mirar el mismo conjunto: el plano, la red de rasgos compartidos,
     el archivo de las 40 fotografías y las fechas que se leen en las piedras. */
  const PIES_LENTE = {
    plano: "Plano interpretativo: muestra relaciones, no distancias. La calle horizontal es la calle principal del panteón.",
    red: "Cada tumba se une con los rasgos que comparte con otras. Solo aparecen los hilos que tocan dos tumbas o más.",
    archivo: "",
    tiempo: "Solo las fechas que se leen en las piedras o en los documentos. Las barras punteadas son rangos aproximados."
  };
  let lenteActual = "plano";
  try { lenteActual = localStorage.getItem("cdm-lente") || "plano"; } catch (e) {}
  if (!PIES_LENTE.hasOwnProperty(lenteActual)) lenteActual = "plano";
  function mostrarLente(l) {
    lenteActual = l;
    try { localStorage.setItem("cdm-lente", l); } catch (e) {}
    $$(".lentes button").forEach(b => b.setAttribute("aria-selected", b.dataset.lente === l));
    $("#mapa").style.display = l === "plano" ? "" : "none";
    $("#red").toggleAttribute("hidden", l !== "red"); $("#archivo").hidden = l !== "archivo"; $("#tiempo").hidden = l !== "tiempo";
    $(".plano-mapa").classList.toggle("con-lente-archivo", l === "archivo");
    $("#plano-pie").textContent = PIES_LENTE[l];
    if (l === "red") pintarRed();
    if (l === "archivo") pintarArchivo();
    if (l === "tiempo") pintarTiempo();
  }
  $(".lentes").addEventListener("click", e => { const b = e.target.closest("[data-lente]"); if (b) mostrarLente(b.dataset.lente); });

  /* --- Constelación --- */
  const HILOS_RED = Object.keys(HILOS).filter(h => HILOS[h].length > 1);
  let redLista = false;
  const posT = {}, posH = {};
  function pintarRed() {
    if (redLista) { aplicarHiloRed(); return; }
    redLista = true;
    const cx = 500, cy = 340, ax = 395, ay = 262;
    T.forEach((t, k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / T.length; posT[t.id] = [cx + ax * Math.cos(a), cy + ay * Math.sin(a)]; });
    // Cada hilo parte del centro de sus tumbas y se separa de los demás
    HILOS_RED.forEach((h, k) => {
      const ps = HILOS[h].map(id => posT[id]);
      const mx = ps.reduce((s, p) => s + p[0], 0) / ps.length, my = ps.reduce((s, p) => s + p[1], 0) / ps.length;
      posH[h] = [cx + (mx - cx) * .55 + Math.cos(k * 2.4) * 8, cy + (my - cy) * .55 + Math.sin(k * 2.4) * 8];
    });
    for (let it = 0; it < 220; it++) {
      HILOS_RED.forEach(a => HILOS_RED.forEach(b => {
        if (a >= b) return; const p = posH[a], q = posH[b];
        let dx = q[0] - p[0], dy = (q[1] - p[1]) * 2.2; const d = Math.hypot(dx, dy) || .01;
        if (d < 120) { const f = (120 - d) / d * .05; p[0] -= dx * f; q[0] += dx * f; p[1] -= dy * f / 2.2; q[1] += dy * f / 2.2; }
      }));
      HILOS_RED.forEach(h => { const p = posH[h]; const e = ((p[0] - cx) / (ax * .7)) ** 2 + ((p[1] - cy) / (ay * .72)) ** 2; if (e > 1) { const s = 1 / Math.sqrt(e); p[0] = cx + (p[0] - cx) * s; p[1] = cy + (p[1] - cy) * s; } });
    }
    const aristas = HILOS_RED.flatMap(h => HILOS[h].map(id => {
      const [x1, y1] = posT[id], [x2, y2] = posH[h], qx = (x1 + x2) / 2 + (cy - (y1 + y2) / 2) * .12, qy = (y1 + y2) / 2 + ((x1 + x2) / 2 - cx) * .12;
      return `<path class="arista" data-t="${id}" data-h="${esc(h)}" d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`;
    })).join("");
    const nodosH = HILOS_RED.map(h => { const [x, y] = posH[h], izq = x < cx;
      return `<g class="nodo-h" data-h="${esc(h)}" tabindex="0" role="button" aria-label="Hilo ${esc(h)}, ${HILOS[h].length} tumbas" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="${3 + HILOS[h].length * 1.3}"/><text class="halo-t" x="${izq ? -10 : 10}" y="4" text-anchor="${izq ? "end" : "start"}">${esc(h)}</text></g>`; }).join("");
    const nodosT = T.map(t => { const [x, y] = posT[t.id], abajo = y > cy;
      return `<g class="nodo-t" data-id="${t.id}" tabindex="0" role="button" aria-label="Tumba ${t.id}: ${esc(t.nombre)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
        <clipPath id="cl-${t.id}"><circle r="34"/></clipPath>
        <image href="${t.fotos[0].src.replace(/^fotos\//, "fotos/mini/")}" x="-48" y="-48" width="96" height="96" preserveAspectRatio="xMidYMid slice" clip-path="url(#cl-${t.id})"/>
        <circle class="anillo" r="36"/>
        <text y="${abajo ? 58 : -48}">${t.id} · ${esc(t.corto)}</text></g>`; }).join("");
    $("#red").innerHTML = `<g>${aristas}</g><g>${nodosH}</g><g>${nodosT}</g>`;
    aplicarHiloRed();
  }
  function encenderRed(tId, h) {
    const red = $("#red"); const on = tId != null || h != null;
    red.classList.toggle("activo", on);
    const ts = new Set(), hs = new Set();
    if (tId != null) { ts.add(tId); T.find(t => t.id === tId).hilos.forEach(x => { if (HILOS[x].length > 1) hs.add(x); }); }
    if (h != null) { hs.add(h); HILOS[h].forEach(id => ts.add(id)); }
    $$("#red .nodo-t").forEach(g => g.classList.toggle("on", ts.has(+g.dataset.id)));
    $$("#red .nodo-h").forEach(g => g.classList.toggle("on", hs.has(g.dataset.h)));
    $$("#red .arista").forEach(p => p.classList.toggle("on", (tId != null ? +p.dataset.t === tId : ts.has(+p.dataset.t)) && hs.has(p.dataset.h)));
  }
  function aplicarHiloRed() { encenderRed(null, hiloActual && HILOS[hiloActual].length > 1 ? hiloActual : null); }
  ["mouseover", "focusin"].forEach(ev => $("#red").addEventListener(ev, e => {
    const t = e.target.closest(".nodo-t"), h = e.target.closest(".nodo-h");
    if (t) encenderRed(+t.dataset.id, null); else if (h) encenderRed(null, h.dataset.h);
  }));
  ["mouseleave", "focusout"].forEach(ev => $("#red").addEventListener(ev, aplicarHiloRed));
  function activarRed(e) {
    const t = e.target.closest(".nodo-t"), h = e.target.closest(".nodo-h");
    if (t) { Sonido.pasos(.6); location.hash = "tumba-" + t.dataset.id; }
    else if (h) { pestana("hilos"); hilar(hiloActual === h.dataset.h ? null : h.dataset.h); }
  }
  $("#red").addEventListener("click", activarRed);
  $("#red").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activarRed(e); } });

  /* --- Archivo --- */
  const FILTROS_VISTA = [["todas", "Todas"], ["PG", "Planos generales"], ["PP", "Primeros planos"], ["D", "Detalles"]];
  const ORDENES = [["tumba", "Tumba"], ["luz", "Luz"], ["tono", "Tono"]];
  let filtroVista = "todas", orden = "tumba";
  function pintarArchivo() {
    $("#archivo-vista").innerHTML = FILTROS_VISTA.map(([k, n]) => `<button type="button" class="chip" data-fv="${k}" aria-pressed="${k === filtroVista}">${n}</button>`).join("");
    $("#archivo-orden").innerHTML = ORDENES.map(([k, n]) => `<button type="button" class="chip" data-or="${k}" aria-pressed="${k === orden}">${n}</button>`).join("");
    let items = T.flatMap(t => t.fotos.map((f, vi) => ({ t, f, vi })));
    if (filtroVista !== "todas") items = items.filter(x => filtroVista === "D" ? x.f.clave[0] === "D" : x.f.clave === filtroVista);
    if (orden === "luz") items.sort((a, b) => a.f.luz - b.f.luz);
    if (orden === "tono") items.sort((a, b) => ((a.f.tono ?? 999) - (b.f.tono ?? 999)) || (a.f.luz - b.f.luz));
    const ids = hiloActual ? HILOS[hiloActual] : null;
    $("#archivo-grid").innerHTML = items.map(({ t, f, vi }) => {
      const tenue = ids && !ids.includes(t.id), g = cuaderno.includes(`${t.id}-${f.clave}`);
      return `<button type="button" class="pieza${tenue ? " tenue" : ""}${g ? " guardada" : ""}" data-id="${t.id}" data-cl="${f.clave}" title="${esc(f.pie)}">
        <span class="img"><img src="${f.src.replace(/^fotos\//, "fotos/mini/")}" alt="${esc(t.nombre)}, ${esc(D.vistas[vi].nombre)}" loading="lazy"></span>
        <span class="cinta">${(f.paleta || []).map((c, k) => `<i style="background:${c};flex:${Math.max(.08, f.pesos[k])}"></i>`).join("")}</span>
        <span class="rot"><span><b>${t.id}</b> · ${f.clave}</span><span>${esc(t.corto)}</span></span></button>`;
    }).join("");
  }
  $("#archivo").addEventListener("click", e => {
    const fv = e.target.closest("[data-fv]"), or = e.target.closest("[data-or]"), p = e.target.closest(".pieza");
    if (fv) { filtroVista = fv.dataset.fv; pintarArchivo(); }
    else if (or) { orden = or.dataset.or; pintarArchivo(); }
    else if (p) { Sonido.pasos(.6); location.hash = `tumba-${p.dataset.id}-${p.dataset.cl.toLowerCase()}`; }
  });

  /* --- Tiempo --- */
  const HITOS = [[1842, "1842 · tarifa para enterrar dentro de los templos"]];
  function pintarTiempo() {
    const svg = $("#tiempo-svg"), box = svg.getBoundingClientRect();
    const W = Math.max(760, Math.round(box.width)), H = Math.max(380, Math.round(box.height));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const izq = 250, der = 110, top = 54, base = H - 34, y0 = 1835, y1 = 1990;
    const X = y => izq + (y - y0) / (y1 - y0) * (W - izq - der);
    const fechadas = T.filter(t => t.tiempo.desde).sort((a, b) => a.tiempo.desde - b.tiempo.desde);
    const sin = T.filter(t => !t.tiempo.desde);
    const filas = [...fechadas, ...sin], alto = (base - top - 16) / filas.length;
    const ids = hiloActual ? HILOS[hiloActual] : null;
    let g = "";
    for (let y = 1840; y <= 1980; y += 20) g += `<line class="reja" x1="${X(y)}" x2="${X(y)}" y1="${top - 10}" y2="${base}"/><text class="lbl" x="${X(y)}" y="${base + 20}" text-anchor="middle">${y}</text>`;
    g += `<line class="eje" x1="${izq}" x2="${W - der}" y1="${base}" y2="${base}"/>`;
    HITOS.forEach(([y, txt], k) => { g += `<g class="hito"><line x1="${X(y)}" x2="${X(y)}" y1="${top - 26 + k * 0}" y2="${base}"/><text x="${X(y) + 6}" y="${top - 30 + k * 14}">${txt}</text></g>`; });
    filas.forEach((t, k) => {
      const yy = top + k * alto + alto / 2, tm = t.tiempo, tenue = ids && !ids.includes(t.id);
      g += `<g class="fila${tenue ? " tenue" : ""}" data-id="${t.id}" tabindex="0" role="button" aria-label="Tumba ${t.id}: ${esc(t.nombre)}. ${esc(tm.nota)}"><title>${esc(tm.nota)}</title>
        <rect x="0" y="${yy - alto / 2}" width="${W}" height="${alto}" fill="transparent"/>
        <text class="num" x="0" y="${yy + 5}">${t.id}</text><text class="nom" x="26" y="${yy + 5}">${esc(t.corto)}</text>`;
      if (tm.desde) {
        const a = X(tm.desde), b = Math.max(X(tm.hasta), a + 4);
        g += `<rect class="barra-t${tm.aprox ? " aprox" : ""}" x="${a}" y="${yy - 4}" width="${b - a}" height="8"/>`;
        if (!tm.aprox) g += `<circle class="punto" cx="${a}" cy="${yy}" r="4"/><circle class="punto" cx="${b}" cy="${yy}" r="4"/>`;
        g += `<text class="lbl" x="${b + 10}" y="${yy + 4}">${tm.desde === tm.hasta ? tm.desde : tm.desde + "–" + tm.hasta}${tm.aprox ? " aprox." : ""}</text>`;
      } else g += `<text class="sinfecha" x="${izq}" y="${yy + 5}">Sin fecha en la piedra</text>`;
      g += `</g>`;
    });
    svg.innerHTML = g;
  }
  $("#tiempo-svg").addEventListener("click", e => { const f = e.target.closest(".fila"); if (f) { Sonido.pasos(.6); location.hash = "tumba-" + f.dataset.id; } });
  $("#tiempo-svg").addEventListener("keydown", e => { const f = e.target.closest(".fila"); if (f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); location.hash = "tumba-" + f.dataset.id; } });
  addEventListener("resize", () => { if (!$("#plano").hidden && lenteActual === "tiempo") pintarTiempo(); });

  // Un hilo elegido se refleja en todas las lentes
  window.__lentesHilo = () => {
    if (lenteActual === "red" && redLista) aplicarHiloRed();
    if (lenteActual === "archivo") pintarArchivo();
    if (lenteActual === "tiempo") pintarTiempo();
  };

  /* ===================== DERIVA =====================
     Un paseo automático y no lineal: mira tres vistas de una tumba y salta a otra
     siguiendo uno de los rasgos que comparten. Cualquier clic o tecla lo detiene. */
  const Deriva = {
    on: false, reloj: null, recientes: [],
    iniciar() {
      this.on = true; this.recientes = [];
      $("#deriva-btn").setAttribute("aria-pressed", "true"); $("#lente").classList.add("derivando");
      Sonido.iniciar();
      if ($("#lente").hidden) { const t = T[Math.floor(Math.random() * T.length)]; location.hash = "tumba-" + t.id; }
      this.aviso(`Paseo libre por el panteón. Empieza en ${actual && !$("#lente").hidden ? actual.corto : "una tumba al azar"}.`);
      setTimeout(() => this.tumba(), 900);
    },
    parar() {
      this.on = false; clearTimeout(this.reloj);
      $("#deriva-btn").setAttribute("aria-pressed", "false"); $("#lente").classList.remove("derivando");
      $("#deriva-aviso").hidden = true; fijarZoom(1);
    },
    aviso(txt) { $("#deriva-txt").textContent = txt; $("#deriva-aviso").hidden = false; },
    tumba() {
      if (!this.on) return;
      this.recientes = [actual.id, ...this.recientes.filter(x => x !== actual.id)].slice(0, 4);
      const detalles = [2, 3, 4].sort(() => Math.random() - .5);
      const seq = [0, detalles[0], detalles[1]];
      let k = 0;
      const paso = () => {
        if (!this.on) return;
        if (k < seq.length) { mostrarVista(seq[k]); fijarZoom(seq[k] >= 2 ? 1.25 : 1); k++; this.reloj = setTimeout(paso, 7600); return; }
        this.saltar();
      };
      paso();
    },
    saltar() {
      if (!this.on) return;
      const opciones = actual.hilos.filter(h => HILOS[h].length > 1).flatMap(h => HILOS[h].filter(id => id !== actual.id && !this.recientes.includes(id)).map(id => [h, id]));
      const pool = opciones.length ? opciones : T.filter(t => t.id !== actual.id).map(t => [null, t.id]);
      const [h, id] = pool[Math.floor(Math.random() * pool.length)], dest = T.find(t => t.id === id);
      this.aviso(h ? `Sigue el hilo «${h}»: de ${actual.corto} a ${dest.corto}.` : `De ${actual.corto} a ${dest.corto}.`);
      this.reloj = setTimeout(() => { if (!this.on) return; Sonido.pasos(1.2); location.hash = "tumba-" + id; this.reloj = setTimeout(() => this.tumba(), 700); }, 2200);
    }
  };
  $("#deriva-btn").addEventListener("click", () => Deriva.on ? Deriva.parar() : Deriva.iniciar());
  $("#deriva-parar").addEventListener("click", () => Deriva.parar());
  ["pointerdown", "keydown"].forEach(ev => document.addEventListener(ev, e => {
    if (!Deriva.on || !e.isTrusted) return;
    if (e.target.closest && e.target.closest("#deriva-btn, #deriva-aviso, #sonido, [data-compartir], #compartir, #leyenda-toggle, #limpia-btn, #mostrar-ui")) return;
    Deriva.parar();
  }, true));

  /* ===================== REFERENCIAS ===================== */
  $("#refs").innerHTML = (D.referencias || []).map(([n, org, hace, toma, url]) =>
    `<article class="ref${toma.startsWith("No replicado") ? " no" : ""}"><h4><a href="${url}" target="_blank" rel="noopener">${esc(n)} ↗</a><small>${esc(org)}</small></h4><p>${esc(hace)}</p><p><b>${toma.startsWith("No replicado") ? "Pendiente" : "Aquí"}:</b> ${esc(toma)}</p></article>`).join("");

  /* ===================== COMPARTIR =====================
     Usa el menú nativo del teléfono cuando existe; si no, abre un panel con el enlace y redes. */
  function urlBase() { return (PR.url_publica || location.href.split("#")[0]); }
  let modoCompartir = "experiencia";
  function urlCompartir() {
    if (modoCompartir === "vista" && !$("#lente").hidden) return urlBase() + "#tumba-" + actual.id + "-" + actual.fotos[vista].clave.toLowerCase();
    return urlBase();
  }
  function textoCompartir() {
    return modoCompartir === "vista" && !$("#lente").hidden
      ? `${actual.nombre}, en Ciudad de los muertos · Historias de Saltillo`
      : "Ciudad de los muertos: un recorrido por ocho tumbas del Panteón de Santiago de Saltillo · Historias de Saltillo";
  }
  function pintarCompartir() {
    const enTumba = !$("#lente").hidden;
    if (!enTumba) modoCompartir = "experiencia";
    $("#que-compartir").hidden = !enTumba;
    $("#que-compartir").innerHTML = enTumba ? [["experiencia", "Toda la experiencia"], ["vista", "Esta vista"]].map(([k, n]) =>
      `<button type="button" class="chip" role="radio" data-modo="${k}" aria-checked="${k === modoCompartir}" aria-pressed="${k === modoCompartir}">${n}</button>`).join("") : "";
    const u = urlCompartir(), t = textoCompartir(), U = encodeURIComponent(u), Tt = encodeURIComponent(t);
    $("#compartir-url").value = u;
    $("#redes").innerHTML = [
      ["WhatsApp", `https://wa.me/?text=${Tt}%20${U}`],
      ["X", `https://twitter.com/intent/tweet?text=${Tt}&url=${U}`],
      ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${U}`],
      ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${U}`],
      ["Telegram", `https://t.me/share/url?url=${U}&text=${Tt}`],
    ].map(([n, h]) => `<a class="red" href="${h}" target="_blank" rel="noopener">${n} ↗</a>`).join("");
  }
  let focoCompartir = null;
  function abrirPanelCompartir() { focoCompartir = document.activeElement; pintarCompartir(); $("#compartir").hidden = false; $("#compartir-copiar").focus(); }
  function cerrarCompartir() { $("#compartir").hidden = true; if (focoCompartir && focoCompartir.focus) focoCompartir.focus(); }
  document.addEventListener("click", e => {
    if (!e.target.closest("[data-compartir]")) return;
    const datos = { title: "Ciudad de los muertos", text: textoCompartir(), url: urlCompartir() };
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      navigator.share(datos).catch(err => { if (!err || err.name !== "AbortError") abrirPanelCompartir(); });
    } else abrirPanelCompartir();
  });
  $("#que-compartir").addEventListener("click", e => { const b = e.target.closest("[data-modo]"); if (b) { modoCompartir = b.dataset.modo; pintarCompartir(); } });
  $("#compartir-copiar").addEventListener("click", e => {
    const btn = e.currentTarget, inp = $("#compartir-url");
    const listo = ok => { btn.textContent = ok ? "Copiado" : "Selecciona y copia"; setTimeout(() => { btn.textContent = "Copiar enlace"; }, 1800); };
    try { navigator.clipboard.writeText(inp.value).then(() => listo(true), () => { inp.select(); listo(false); }); } catch (err) { inp.select(); listo(false); }
  });
  $("#compartir-url").addEventListener("focus", e => e.target.select());
  $("#compartir-cerrar").addEventListener("click", cerrarCompartir);
  $("#compartir").addEventListener("click", e => { if (e.target.id === "compartir") cerrarCompartir(); });

  /* ===================== TECLADO ===================== */
  document.addEventListener("keydown", e => {
    if (!$("#glosario").hidden) { if (e.key === "Escape") cerrarGlosario(); return; }
    if (!$("#cuaderno").hidden) { if (e.key === "Escape") cerrarCuaderno(); return; }
    if (!$("#compartir").hidden) { if (e.key === "Escape") cerrarCompartir(); return; }
    if ($("#lente").hidden) return;
    if ($("#lente").classList.contains("limpia") && e.key === "Escape") { fotoLimpia(false); return; }
    if ((e.key === "h" || e.key === "H") && !e.metaKey && !e.ctrlKey) { fotoLimpia(!$("#lente").classList.contains("limpia")); return; }
    if (e.key === "+" || e.key === "=") { fijarZoom(zoom * 1.4); return; }
    if (e.key === "-" || e.key === "_") { fijarZoom(zoom / 1.4); return; }
    if (e.key === "0") { fijarZoom(1); return; }
    if ((e.key === "g" || e.key === "G") && !e.metaKey && !e.ctrlKey) { alternarGuardado(); return; }
    if (e.target.closest && e.target.closest(".ficha") && e.key.startsWith("Arrow")) return;
    if (e.key === "ArrowRight") mostrarVista((vista + 1) % 5);
    else if (e.key === "ArrowLeft") mostrarVista((vista + 4) % 5);
    else if (e.key === "]") mover(1);
    else if (e.key === "[") mover(-1);
    else if (e.key === "f" || e.key === "F") alternarFicha();
    else if (e.key === "Escape") location.hash = "panteon";
  });

  /* ===================== NAVEGACIÓN ===================== */
  let pendienteHilo = null, fichaInicial = false;
  function mostrar(id) { ["portada", "plano", "lente", "codigo"].forEach(v => { $("#" + v).hidden = (v !== id); }); }
  function ruta() {
    const h = location.hash.slice(1), m = h.match(/^tumba-(\d+)(?:-(pg|pp|d1|d2|d3))?$/);
    if (m && T.some(t => t.id === +m[1])) {
      const vi = m[2] ? D.vistas.findIndex(v => v.clave.toLowerCase() === m[2]) : 0;
      if (!$("#lente").hidden && actual.id === +m[1]) { if (vi !== vista) mostrarVista(vi); return; }
      mostrar("lente"); abrirTumba(+m[1], vi);
      if (!fichaInicial && innerWidth > 1180) { alternarFicha(true); fichaInicial = true; }
      return;
    }
    document.title = "Ciudad de los muertos";
    if (Deriva.on) Deriva.parar();
    if ($("#lente").classList.contains("limpia")) fotoLimpia(false);
    if (h === "panteon") {
      mostrar("plano"); marcarVisitadas(); mostrarLente(lenteActual);
      if (pendienteHilo) { pestana("hilos"); hilar(pendienteHilo); pendienteHilo = null; }
    } else if (h === "codigo") {
      mostrar("codigo"); $("#codigo").scrollTop = 0;
      if (!fuentesListas) { fuentesListas = true; verFuente(fuenteActual); }
    } else if (h === "leer") {
      mostrar("portada"); const s = $("#leer"); if (s) s.scrollIntoView({ behavior: quieto ? "auto" : "smooth" });
    } else { mostrar("portada"); }
  }
  addEventListener("hashchange", ruta);
  ruta();
})();
