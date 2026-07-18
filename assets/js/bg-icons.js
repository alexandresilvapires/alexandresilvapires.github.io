'use strict';

/*-----------------------------------------------------------------*\
  #BG-ICONS
  Draws a diagonal (45deg) grid of little piano + computer icons
  behind the page content. The whole grid drifts in one direction
  and wraps around the edges of the screen, and icons nudge away
  from the mouse cursor when it gets close.

  All the tunable knobs live in window.bgIconParams below - change
  any of them in the browser console (or right here) and the effect
  updates live. Changing "count", "spacing" or "gridAngle" requires
  calling window.rebuildBgIcons() to re-lay-out the grid (this file
  does that for you automatically on window resize).
\*-----------------------------------------------------------------*/

(function () {

  // Build and inject the canvas element.
  const canvas = document.createElement('canvas');
  canvas.id = 'bg-icons-canvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  /* ================================================================
     ADJUSTABLE PARAMETERS
     ================================================================ */
  window.bgIconParams = {
    count: 90,                 // how many icons are drawn on screen at once
    scale: 1.5,                  // size multiplier for every icon (1 = ~28px)
    speed: 18,                 // drift speed, in pixels per second
    direction: 135,            // drift direction in degrees: 0=right, 90=up, 180=left, 270=down (135 = towards the top-left)
    gridAngle: 25,             // the angle of the underlying grid lines, in degrees
    spacing: 110,              // distance between icons in the grid, in px (before "scale" is applied)
    rotation: 0,                // fixed rotation applied to every icon, in degrees
    spin: 10,                   // continuous rotation speed of each icon, in degrees per second (0 = icons don't spin)
    opacity: 0.12,             // base opacity of every icon, from 0 (invisible) to 1 (solid)
    cursorRepelRadius: 140,    // how close (px) the cursor needs to be before it starts pushing icons away
    cursorRepelStrength: 10,   // how far (px) icons get pushed away at the center of that radius
    pianoColor: 'hsl(200, 100%, 77%)',   // color of the piano icons (defaults to the site's accent color)
    computerColor: 'hsl(0, 0%, 60%)'     // color of the computer icons
  };

  let width, height, icons = [];
  let mouseX = -9999, mouseY = -9999;
  let lastTime = performance.now();

  /* ----------------------------------------------------------------
     Piano image: loaded from assets/images/piano.png, then re-colored
     to bgIconParams.pianoColor on an offscreen canvas (the source-in
     trick below recolors every opaque pixel of the outline while
     keeping its transparency, so a black-outline PNG becomes any
     color you like). Falls back to the old vector-drawn piano until
     the image has loaded, or if it fails to load at all.
     ---------------------------------------------------------------- */
  const pianoImg = new Image();
  let pianoImgReady = false;
  let tintedPianoCanvas = null;

  pianoImg.onload = () => {
    pianoImgReady = true;
    buildTintedPiano();
  };
  pianoImg.onerror = () => {
    pianoImgReady = false; // image missing - vector fallback keeps things working
  };
  pianoImg.src = './assets/images/piano.png';

  function buildTintedPiano() {
    if (!pianoImgReady) return;
    const off = document.createElement('canvas');
    off.width = pianoImg.naturalWidth;
    off.height = pianoImg.naturalHeight;
    const octx = off.getContext('2d');
    octx.drawImage(pianoImg, 0, 0);
    octx.globalCompositeOperation = 'source-in';
    octx.fillStyle = window.bgIconParams.pianoColor;
    octx.fillRect(0, 0, off.width, off.height);
    tintedPianoCanvas = off;
  }

  // Call this if you change pianoColor at runtime and want the
  // piano.png tint to update to match.
  window.rebuildPianoTint = buildTintedPiano;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    buildGrid();
  }

  // Lay out a diagonal grid of points big enough to cover the
  // screen, tag each point as a piano or computer icon (alternating,
  // checkerboard-style), then randomly sample down to `count` icons.
  function buildGrid() {
    icons = [];
    const p = window.bgIconParams;
    const angleRad = p.gridAngle * Math.PI / 180;
    const spacing = p.spacing;

    // Oversize the covered area so, once the grid drifts, icons
    // wrap around smoothly instead of popping in at the edge.
    const diag = Math.sqrt(width * width + height * height) + spacing * 2;
    const cols = Math.ceil(diag / spacing);
    const rows = Math.ceil(diag / spacing);
    const cx = width / 2;
    const cy = height / 2;

    const candidates = [];
    for (let row = -rows; row <= rows; row++) {
      for (let col = -cols; col <= cols; col++) {
        const localX = col * spacing;
        const localY = row * spacing;
        const x = cx + localX * Math.cos(angleRad) - localY * Math.sin(angleRad);
        const y = cy + localX * Math.sin(angleRad) + localY * Math.cos(angleRad);
        if (x > -spacing && x < width + spacing && y > -spacing && y < height + spacing) {
          candidates.push({
            x, y,
            type: (row + col) % 2 === 0 ? 'piano' : 'computer',
            spinOffset: Math.random() * 360
          });
        }
      }
    }

    // Sample down (or keep all) to the requested count.
    if (candidates.length > p.count) {
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      icons = candidates.slice(0, p.count);
    } else {
      icons = candidates;
    }
  }

  function drawPiano(x, y, scale, rotationDeg, opacity, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotationDeg * Math.PI / 180);
    ctx.scale(scale, scale);
    ctx.globalAlpha = opacity;

    if (tintedPianoCanvas) {
      // draw piano.png (tinted to `color`), centered on the icon's origin,
      // sized so it matches the old vector icon's ~28x12 footprint
      const w = 34;
      const h = w * (tintedPianoCanvas.height / tintedPianoCanvas.width);
      ctx.drawImage(tintedPianoCanvas, -w / 2, -h / 2, w, h);
    } else {
      // vector fallback, used until piano.png has loaded (or if it 404s)
      ctx.fillStyle = color;
      ctx.fillRect(-14, -6, 28, 12);
      ctx.globalAlpha = opacity * 0.9;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = -12; i < 12; i += 4) {
        ctx.fillRect(i, -2, 3, 8);
      }
    }
    ctx.restore();
  }

  function drawComputer(x, y, scale, rotationDeg, opacity, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotationDeg * Math.PI / 180);
    ctx.scale(scale, scale);
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    // monitor
    ctx.strokeRect(-12, -9, 24, 15);
    // stand
    ctx.fillRect(-3, 6, 6, 4);
    ctx.fillRect(-7, 10, 14, 2);
    ctx.restore();
  }

  function step(now) {
    const p = window.bgIconParams;
    const dt = Math.min((now - lastTime) / 1000, 0.05); // clamp dt to avoid jumps after tab is backgrounded
    lastTime = now;

    ctx.clearRect(0, 0, width, height);

    const dirRad = p.direction * Math.PI / 180;
    const vx = Math.cos(dirRad) * p.speed;
    const vy = -Math.sin(dirRad) * p.speed; // negative because canvas y grows downward
    const wrapMargin = 60;

    for (const icon of icons) {
      icon.x += vx * dt;
      icon.y += vy * dt;

      // wrap around the edges so the grid drifts forever
      if (icon.x < -wrapMargin) icon.x += width + wrapMargin * 2;
      if (icon.x > width + wrapMargin) icon.x -= width + wrapMargin * 2;
      if (icon.y < -wrapMargin) icon.y += height + wrapMargin * 2;
      if (icon.y > height + wrapMargin) icon.y -= height + wrapMargin * 2;

      // cursor repulsion - offsets only the drawn position, not the
      // "real" grid position, so the drift stays perfectly regular
      let drawX = icon.x;
      let drawY = icon.y;
      const dx = icon.x - mouseX;
      const dy = icon.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < p.cursorRepelRadius && dist > 0.01) {
        const force = (1 - dist / p.cursorRepelRadius) * p.cursorRepelStrength;
        drawX += (dx / dist) * force;
        drawY += (dy / dist) * force;
      }

      const spinRotation = p.spin ? ((now / 1000) * p.spin + icon.spinOffset) : 0;
      const totalRotation = p.rotation + spinRotation;

      if (icon.type === 'piano') {
        drawPiano(drawX, drawY, p.scale, totalRotation, p.opacity, p.pianoColor);
      } else {
        drawComputer(drawX, drawY, p.scale, totalRotation, p.opacity, p.computerColor);
      }
    }

    requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  window.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
  });

  // Expose a manual rebuild for when count/spacing/gridAngle are
  // changed live from the console.
  window.rebuildBgIcons = buildGrid;

  resize();
  requestAnimationFrame(step);

})();