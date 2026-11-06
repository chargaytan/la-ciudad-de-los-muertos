/* Ciudad de los muertos · sonido.js
   Paisaje sonoro generado en tiempo real con Web Audio. No usa archivos de audio:
   viento (ruido marrón filtrado), un dron grave que cambia de tono en cada tumba,
   campanas lejanas con reverberación, grillos, pasos y obturador.
   Los navegadores solo permiten sonido después de un gesto del usuario: llama a
   Sonido.iniciar() desde un clic. */
(function () {
  const S = {
    ctx: null, master: null, rev: null, drones: [], on: false, tono: 0, alCambiar: null,

    iniciar() {
      if (!this.ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return false;
        this.ctx = new C();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
        this.construir();
      }
      this.ctx.resume();
      this.master.gain.setTargetAtTime(0.8, this.ctx.currentTime, 1.8);
      this.on = true;
      this.afinar(this.tono);
      if (this.alCambiar) this.alCambiar(true);
      return true;
    },

    parar() {
      if (this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
      this.on = false;
      if (this.alCambiar) this.alCambiar(false);
    },

    ruido(seg) {
      const c = this.ctx, n = Math.floor(c.sampleRate * seg), b = c.createBuffer(2, n, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch); let u = 0;
        for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; u = (u + 0.02 * w) / 1.02; d[i] = u * 3.5; }
      }
      return b;
    },

    construir() {
      const c = this.ctx;
      // Reverberación sintética: una respuesta de impulso de ruido que decae
      const ir = c.createBuffer(2, c.sampleRate * 4, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6);
      }
      this.rev = c.createConvolver(); this.rev.buffer = ir;
      const rg = c.createGain(); rg.gain.value = 0.55; this.rev.connect(rg).connect(this.master);

      // Viento: ruido marrón por un filtro pasabanda que respira lento
      const v = c.createBufferSource(); v.buffer = this.ruido(6); v.loop = true;
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 380; bp.Q.value = 0.7;
      const l1 = c.createOscillator(); l1.frequency.value = 0.06;
      const l1g = c.createGain(); l1g.gain.value = 230; l1.connect(l1g).connect(bp.frequency);
      const vg = c.createGain(); vg.gain.value = 0.32;
      const l2 = c.createOscillator(); l2.frequency.value = 0.11;
      const l2g = c.createGain(); l2g.gain.value = 0.16; l2.connect(l2g).connect(vg.gain);
      v.connect(bp).connect(vg).connect(this.master); vg.connect(this.rev);
      v.start(); l1.start(); l2.start();

      // Dron: cuatro osciladores graves por un pasabajos
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
      const dg = c.createGain(); dg.gain.value = 0.05;
      lp.connect(dg); dg.connect(this.master); dg.connect(this.rev);
      [[1, "sine"], [1.5, "sine"], [2.002, "triangle"], [0.5, "sine"]].forEach(([m, t]) => {
        const o = c.createOscillator(); o.type = t; o.frequency.value = 55 * m; o.start(); o.connect(lp);
        this.drones.push({ o, m });
      });

      // Eventos aleatorios
      const campana = () => { if (this.on) this.campana(); setTimeout(campana, 7000 + Math.random() * 11000); };
      const grillos = () => { if (this.on) this.grillo(); setTimeout(grillos, 2500 + Math.random() * 6000); };
      setTimeout(campana, 4000); setTimeout(grillos, 2000);
    },

    // Cambia el tono del dron (en semitonos) para dar a cada tumba su propia atmósfera
    afinar(semis) {
      this.tono = semis;
      if (!this.ctx) return;
      const base = 55 * Math.pow(2, semis / 12) / 1.5;
      this.drones.forEach(d => d.o.frequency.setTargetAtTime(base * d.m, this.ctx.currentTime, 2.5));
    },

    panear(nodo, valor, destino) {
      const c = this.ctx;
      if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = valor; nodo.connect(p).connect(destino); }
      else nodo.connect(destino);
    },

    // Campana lejana: parciales inarmónicos que decaen
    campana() {
      const c = this.ctx, t = c.currentTime, f = [196, 220, 261.6, 293.7, 329.6][Math.floor(Math.random() * 5)];
      const out = c.createGain(); out.gain.value = 0.05;
      this.panear(out, Math.random() * 1.6 - 0.8, this.rev);
      [1, 2.76, 5.4, 8.93].forEach((r, k) => {
        const o = c.createOscillator(); o.frequency.value = f * r; const g = c.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5 / (k + 1), t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 5 / (k + 1));
        o.connect(g).connect(out); o.start(t); o.stop(t + 5.2);
      });
    },

    grillo() {
      const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      const am = c.createOscillator(), amg = c.createGain();
      o.frequency.value = 4300 + Math.random() * 500; am.frequency.value = 28; amg.gain.value = 0.5;
      am.connect(amg).connect(g.gain); g.gain.setValueAtTime(0, t);
      const out = c.createGain(); out.gain.value = 0.006; o.connect(g).connect(out);
      this.panear(out, Math.random() * 2 - 1, this.master);
      const n = 3 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) { g.gain.setValueAtTime(0.5, t + k * 0.32); g.gain.setValueAtTime(0, t + k * 0.32 + 0.16); }
      o.start(t); am.start(t); o.stop(t + n * 0.32 + 0.1); am.stop(t + n * 0.32 + 0.1);
    },

    pasos(seg) {
      if (!this.on) return;
      const c = this.ctx, b = this.ruido(0.2), n = Math.max(2, Math.round(seg / 0.42));
      for (let k = 0; k < n; k++) {
        const s = c.createBufferSource(); s.buffer = b;
        const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700 + Math.random() * 300;
        const g = c.createGain(), t = c.currentTime + k * 0.42;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + 0.2);
      }
    },

    obturador() {
      if (!this.on) return;
      const c = this.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = this.ruido(0.08);
      const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 2500;
      const g = c.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      s.connect(f).connect(g).connect(this.master); g.connect(this.rev); s.start(t);
    }
  };
  window.Sonido = S;
})();
