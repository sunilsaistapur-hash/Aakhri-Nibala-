import * as THREE from 'three';

export class ProceduralTextureLibrary {
  private maxAniso: number;
  private cache = new Map<string, THREE.CanvasTexture>();
  private disposed = false;

  constructor(renderer: THREE.WebGLRenderer) {
    this.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
  }

  private configure(tex: THREE.CanvasTexture, repeatX = 1, repeatY = 1, isColor = true): THREE.CanvasTexture {
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.anisotropy = this.maxAniso;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.needsUpdate = true;
    return tex;
  }

  getMarbleTileTexture(repeatX = 6, repeatY = 6): THREE.CanvasTexture {
    const key = `marble_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Heritage Indian hotel marble / mosaic tile
    ctx.fillStyle = '#2d2722';
    ctx.fillRect(0, 0, 512, 512);

    const tileSize = 128;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const isDark = (x + y) % 2 === 0;
        ctx.fillStyle = isDark ? '#3a312b' : '#6b5e50';
        ctx.fillRect(x * tileSize + 3, y * tileSize + 3, tileSize - 6, tileSize - 6);

        // Subtle stone veining
        ctx.strokeStyle = isDark ? 'rgba(255,245,230,0.06)' : 'rgba(20,15,12,0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x * tileSize + 15, y * tileSize + 20);
        ctx.bezierCurveTo(
          x * tileSize + 50,
          y * tileSize + 55,
          x * tileSize + 80,
          y * tileSize + 35,
          x * tileSize + 115,
          y * tileSize + 100
        );
        ctx.stroke();
      }
    }

    // Age & grime speckles
    for (let i = 0; i < 650; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.14)' : 'rgba(255,240,210,0.04)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }

    const tex = this.configure(new THREE.CanvasTexture(canvas), repeatX, repeatY, true);
    this.cache.set(key, tex);
    return tex;
  }

  getWallPlasterTexture(tint = '#5a4a3f', repeatX = 2, repeatY = 1): THREE.CanvasTexture {
    const key = `wall_${tint}_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Upper aged plaster
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, 512, 512);

    // Damp patches & plaster texture
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = Math.random() > 0.45 ? 'rgba(15,10,8,0.07)' : 'rgba(255,235,210,0.04)';
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 350, 4 + Math.random() * 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hairline cracks & age wear
    ctx.strokeStyle = 'rgba(18,12,9,0.22)';
    ctx.lineWidth = 1.5;
    for (let c = 0; c < 6; c++) {
      let cx = 60 + c * 78;
      let cy = 40 + (c % 3) * 70;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += (Math.random() - 0.5) * 28;
        cy += 18 + Math.random() * 14;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Lower Indian dark teak wainscoting (bottom 35%)
    ctx.fillStyle = '#261710';
    ctx.fillRect(0, 330, 512, 182);
    ctx.fillStyle = '#3d2417';
    ctx.fillRect(0, 326, 512, 10);

    // Wainscot vertical panels
    for (let x = 16; x < 512; x += 128) {
      ctx.strokeStyle = '#140b07';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, 348, 96, 142);
      ctx.strokeStyle = 'rgba(212,175,55,0.16)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 6, 354, 84, 130);
    }

    const tex = this.configure(new THREE.CanvasTexture(canvas), repeatX, repeatY, true);
    this.cache.set(key, tex);
    return tex;
  }

  getSheeshamWoodTexture(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
    const key = `wood_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#381e12';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 110; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(18,8,4,0.38)' : 'rgba(120,70,38,0.22)';
      ctx.lineWidth = 1 + Math.random() * 3;
      ctx.beginPath();
      const y = Math.random() * 256;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(85, y + (Math.random() - 0.5) * 14, 170, y + (Math.random() - 0.5) * 14, 256, y);
      ctx.stroke();
    }

    const tex = this.configure(new THREE.CanvasTexture(canvas), repeatX, repeatY, true);
    this.cache.set(key, tex);
    return tex;
  }

  getAsphaltTexture(): THREE.CanvasTexture {
    const key = 'asphalt';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#14171d';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 2400; i++) {
      const shade = 15 + Math.floor(Math.random() * 24);
      ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 5})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // Wet rainwater puddles reflecting night sky
    for (let p = 0; p < 14; p++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const g = ctx.createRadialGradient(px, py, 2, px, py, 24 + Math.random() * 28);
      g.addColorStop(0, 'rgba(65, 86, 118, 0.28)');
      g.addColorStop(1, 'rgba(20, 24, 32, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, 52, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highway lane line
    ctx.fillStyle = '#c8aa5a';
    ctx.fillRect(246, 20, 20, 180);
    ctx.fillRect(246, 280, 20, 180);

    const tex = this.configure(new THREE.CanvasTexture(canvas), 4, 2, true);
    this.cache.set(key, tex);
    return tex;
  }

  getPersianCarpetTexture(repeatX = 1, repeatY = 6): THREE.CanvasTexture {
    const key = `carpet_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Deep royal Indian burgundy/crimson
    ctx.fillStyle = '#471015';
    ctx.fillRect(0, 0, 256, 512);

    // Ornate gold & ochre double border
    ctx.fillStyle = '#a87d32';
    ctx.fillRect(10, 0, 10, 512);
    ctx.fillRect(236, 0, 10, 512);
    ctx.fillStyle = '#24080a';
    ctx.fillRect(24, 0, 8, 512);
    ctx.fillRect(224, 0, 8, 512);

    // Traditional central diamond motifs
    for (let y = 40; y < 512; y += 96) {
      ctx.fillStyle = '#631920';
      ctx.beginPath();
      ctx.moveTo(128, y - 34);
      ctx.lineTo(176, y);
      ctx.lineTo(128, y + 34);
      ctx.lineTo(80, y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#b58d3e';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Aged dust & wear
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(Math.random() * 256, Math.random() * 512, 3, 3);
    }

    const tex = this.configure(new THREE.CanvasTexture(canvas), repeatX, repeatY, true);
    this.cache.set(key, tex);
    return tex;
  }

  getCurtainTexture(): THREE.CanvasTexture {
    const key = 'curtain';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    for (let i = 0; i <= 8; i++) {
      grad.addColorStop(i / 8, i % 2 === 0 ? '#5c141c' : '#310a0f');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Subtle Indian gold brocade border at bottom
    ctx.fillStyle = '#9c7830';
    ctx.fillRect(0, 232, 256, 12);

    const tex = this.configure(new THREE.CanvasTexture(canvas), 1, 1, true);
    this.cache.set(key, tex);
    return tex;
  }

  getMainSignboardTexture(): THREE.CanvasTexture {
    const key = 'main_signboard';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#240b0e';
    ctx.fillRect(0, 0, 1024, 256);

    // Ornate Indian gold border
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 996, 228);
    ctx.strokeStyle = '#82571d';
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, 968, 200);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd573';
    ctx.font = 'bold 68px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('शाही निवाला रेस्टोरेंट', 512, 118);

    ctx.fillStyle = '#f2c179';
    ctx.font = '600 30px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('खाना और रहने की व्यवस्था उपलब्ध है', 512, 185);

    // Weathering streaks
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let x = 40; x < 1000; x += 72) {
      ctx.fillRect(x, 0, 6 + Math.random() * 8, 80 + Math.random() * 140);
    }

    const tex = this.configure(new THREE.CanvasTexture(canvas), 1, 1, true);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    this.cache.set(key, tex);
    return tex;
  }

  getMilestoneTexture(): THREE.CanvasTexture {
    const key = 'milestone';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#d9d2c5';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#d99a1e';
    ctx.fillRect(0, 0, 256, 76);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#18181b';
    ctx.font = 'bold 34px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('राजमार्ग 44', 128, 52);
    ctx.font = 'bold 36px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('शहर', 128, 145);
    ctx.font = 'bold 42px "Noto Sans Devanagari", sans-serif';
    ctx.fillText('18 कि.मी.', 128, 210);

    const tex = this.configure(new THREE.CanvasTexture(canvas), 1, 1, true);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    this.cache.set(key, tex);
    return tex;
  }

  getHindiPlaqueTexture(label: string): THREE.CanvasTexture {
    const key = `plaque_${label}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#24140d';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#c4963f';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5d78c';
    const fontSize = label.length > 22 ? 28 : label.length > 14 ? 34 : 42;
    ctx.font = `bold ${fontSize}px "Noto Sans Devanagari", sans-serif`;
    ctx.fillText(label, 256, 66);

    const tex = this.configure(new THREE.CanvasTexture(canvas), 1, 1, true);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    this.cache.set(key, tex);
    return tex;
  }

  getClockFaceTexture(): THREE.CanvasTexture {
    const key = 'clock_1145';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#efe5cf';
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b2416';
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.fillStyle = '#1f1610';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let n = 1; n <= 12; n++) {
      const a = (n / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(String(n), 128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92);
    }

    // Stopped at 11:45!
    ctx.strokeStyle = '#111';
    ctx.lineCap = 'round';
    // Hour hand (~11:45)
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + Math.cos(-Math.PI / 2 - 0.12) * 58, 128 + Math.sin(-Math.PI / 2 - 0.12) * 58);
    ctx.stroke();
    // Minute hand (at 9 = 45)
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(44, 128);
    ctx.stroke();

    const tex = this.configure(new THREE.CanvasTexture(canvas), 1, 1, true);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    this.cache.set(key, tex);
    return tex;
  }

  getContactShadowTexture(): THREE.CanvasTexture {
    const key = 'contact_shadow';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    this.cache.set(key, tex);
    return tex;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cache.forEach((t) => t.dispose());
    this.cache.clear();
  }
}
