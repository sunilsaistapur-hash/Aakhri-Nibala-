import * as THREE from 'three';

export interface KavitaModelRig {
  root: THREE.Group;
  head: THREE.Group;
  torsoGroup: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  trayGroup: THREE.Group;
  handKeyGroup: THREE.Group;
  setTrayVisible: (visible: boolean) => void;
  setOfferKeyMode: (active: boolean) => void;
  setNightmareLungePose: (active: boolean, progress?: number) => void;
  updateAnimation: (dt: number, speed: number, chasing: boolean, time: number) => void;
}

const COUNTER_WOMAN_PHOTO_URL =
  '/assets/aistudio/file_00000000f7fc82119210b918dbfab209_7b28c7b7.png';

function createBloodSoakedLehengaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Base aged, grim off-white / pale yellowed bridal silk fabric
  ctx.fillStyle = '#b8aa97';
  ctx.fillRect(0, 0, 512, 1024);

  // 2. Heavy Lehenga pleats & deep shadow folds running vertically
  for (let x = 0; x < 512; x += 32) {
    const grad = ctx.createLinearGradient(x, 0, x + 32, 0);
    grad.addColorStop(0, 'rgba(18, 10, 8, 0.48)');
    grad.addColorStop(0.38, 'rgba(240, 228, 212, 0.15)');
    grad.addColorStop(0.75, 'rgba(32, 16, 12, 0.38)');
    grad.addColorStop(1, 'rgba(12, 6, 6, 0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 32, 1024);
  }

  // 3. Ancient faded gold zari embroidery border along hem (tarnished & grimy)
  ctx.fillStyle = 'rgba(148, 112, 42, 0.35)';
  ctx.fillRect(0, 880, 512, 40);
  ctx.fillRect(0, 950, 512, 60);

  // 4. MASSIVE FRESH & DRIED BLOOD COATING across the entire lehenga:
  // Lower half is drenched in deep crimson coagulated blood
  const bloodSoakGrad = ctx.createLinearGradient(0, 200, 0, 1024);
  bloodSoakGrad.addColorStop(0, 'rgba(78, 8, 12, 0.0)');
  bloodSoakGrad.addColorStop(0.3, 'rgba(115, 12, 18, 0.45)');
  bloodSoakGrad.addColorStop(0.65, 'rgba(148, 14, 22, 0.78)');
  bloodSoakGrad.addColorStop(0.9, 'rgba(88, 6, 10, 0.94)');
  bloodSoakGrad.addColorStop(1.0, 'rgba(45, 4, 6, 0.98)');
  ctx.fillStyle = bloodSoakGrad;
  ctx.fillRect(0, 200, 512, 824);

  // 5. Dripping blood streaks running downward along the pleats
  for (let d = 0; d < 48; d++) {
    const startX = Math.random() * 512;
    const startY = 180 + Math.random() * 400;
    const dripLen = 120 + Math.random() * 380;
    const dripWidth = 3 + Math.random() * 8;

    const dripGrad = ctx.createLinearGradient(startX, startY, startX, startY + dripLen);
    dripGrad.addColorStop(0, 'rgba(180, 20, 28, 0.88)');
    dripGrad.addColorStop(0.7, 'rgba(130, 12, 18, 0.85)');
    dripGrad.addColorStop(1, 'rgba(70, 5, 8, 0.95)');
    ctx.fillStyle = dripGrad;

    ctx.beginPath();
    ctx.ellipse(startX, startY, dripWidth * 1.4, dripWidth * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(startX - dripWidth / 2, startY);
    ctx.lineTo(startX - dripWidth * 0.3, startY + dripLen);
    ctx.arc(startX, startY + dripLen, dripWidth * 0.7, 0, Math.PI);
    ctx.lineTo(startX + dripWidth / 2, startY);
    ctx.closePath();
    ctx.fill();
  }

  // 6. Splattered blood droplets & explosive arterial sprays (छींटे व खून के धब्बे)
  for (let s = 0; s < 380; s++) {
    const sx = Math.random() * 512;
    const sy = 80 + Math.random() * 920;
    const r = 2 + Math.random() * 16;
    const isDarkCoag = s % 3 === 0;

    ctx.fillStyle = isDarkCoag
      ? 'rgba(65, 6, 9, 0.88)'
      : s % 2 === 0
      ? 'rgba(168, 16, 24, 0.82)'
      : 'rgba(135, 12, 18, 0.78)';

    ctx.beginPath();
    ctx.ellipse(
      sx,
      sy,
      r,
      r * (1 + Math.random() * 1.8),
      Math.random() * Math.PI,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // 7. Terrifying bloody handprints smeared across the fabric (हाथों के खूनी पंजे)
  const drawBloodyHand = (hx: number, hy: number, scale: number, angle: number) => {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(125, 10, 16, 0.82)';
    // Palm
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5 Dragged claw-fingers
    for (let f = -2; f <= 2; f++) {
      const fx = f * 7;
      ctx.beginPath();
      ctx.moveTo(fx, -14);
      ctx.lineTo(fx + f * 2.2, -42 - Math.abs(f) * 4);
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = 'rgba(110, 8, 14, 0.78)';
      ctx.stroke();
    }
    ctx.restore();
  };

  drawBloodyHand(130, 420, 1.1, 0.25);
  drawBloodyHand(360, 560, 1.2, -0.32);
  drawBloodyHand(240, 720, 1.3, 0.14);
  drawBloodyHand(410, 840, 1.15, 0.45);

  // 8. Charred dirt & ripped black tears along bottom hem
  ctx.fillStyle = '#140608';
  for (let t = 0; t < 36; t++) {
    const rx = 10 + Math.random() * 492;
    const ry = 920 + Math.random() * 95;
    ctx.beginPath();
    ctx.ellipse(rx, ry, 6 + Math.random() * 14, 14 + Math.random() * 26, Math.random() * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function drawProceduralChudailFace(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Base gaunt corpse-ash skin gradient
  const skinGrad = ctx.createRadialGradient(w * 0.5, h * 0.46, 30, w * 0.5, h * 0.5, w * 0.6);
  skinGrad.addColorStop(0, '#9a958d');
  skinGrad.addColorStop(0.6, '#706b66');
  skinGrad.addColorStop(1, '#1a1618');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, w, h);

  // Dark gaunt hollow cheekbones & sunken temples
  ctx.fillStyle = 'rgba(20, 14, 18, 0.58)';
  ctx.beginPath();
  ctx.ellipse(w * 0.22, h * 0.54, 52, 95, 0.25, 0, Math.PI * 2);
  ctx.ellipse(w * 0.78, h * 0.54, 52, 95, -0.25, 0, Math.PI * 2);
  ctx.fill();

  // Deep bruised dark-purple/black Chudail eye sockets
  const drawEye = (cx: number, cy: number) => {
    const sock = ctx.createRadialGradient(cx, cy, 8, cx, cy, 56);
    sock.addColorStop(0, '#090609');
    sock.addColorStop(0.65, 'rgba(24, 13, 20, 0.92)');
    sock.addColorStop(1, 'rgba(24, 13, 20, 0)');
    ctx.fillStyle = sock;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 56, 44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wide pale eerie staring sclera
    ctx.fillStyle = '#ddd7c5';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 24, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Small unblinking dark iris & tiny pinprick pupil
    ctx.fillStyle = '#2d2620';
    ctx.beginPath();
    ctx.arc(cx, cy, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#050406';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  };
  drawEye(w * 0.34, h * 0.38);
  drawEye(w * 0.66, h * 0.38);

  // Sunken furrowed brow creases + gaunt nose bridge shadows
  ctx.strokeStyle = 'rgba(22, 16, 18, 0.7)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.44, h * 0.34);
  ctx.lineTo(w * 0.43, h * 0.56);
  ctx.moveTo(w * 0.56, h * 0.34);
  ctx.lineTo(w * 0.57, h * 0.56);
  ctx.stroke();

  // Wide sinister Chudail grin stretching cheek-to-cheek with dark stained teeth
  ctx.fillStyle = '#150608';
  ctx.beginPath();
  ctx.moveTo(w * 0.24, h * 0.64);
  ctx.quadraticCurveTo(w * 0.5, h * 0.86, w * 0.76, h * 0.64);
  ctx.quadraticCurveTo(w * 0.5, h * 0.71, w * 0.24, h * 0.64);
  ctx.fill();

  // Ragged crooked stained teeth inside wide smile
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const tx = w * (0.28 + t * 0.44);
    const curve = Math.sin(t * Math.PI) * 34;
    ctx.fillStyle = i % 3 === 0 ? '#695b40' : '#8a7c5d';
    ctx.fillRect(tx - 6, h * 0.66 + curve * 0.4, 10, 17);
  }

  // Fine messy black hair wisps clinging across forehead & cheeks
  ctx.strokeStyle = '#080709';
  for (let s = 0; s < 36; s++) {
    const sx = (s / 35) * w;
    ctx.lineWidth = 2 + (s % 4);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.quadraticCurveTo(
      sx + (s < 18 ? -18 : 18),
      h * (0.14 + (s % 5) * 0.04),
      sx + (s < 18 ? -42 : 42),
      h * (0.3 + (s % 4) * 0.14)
    );
    ctx.stroke();
  }
}

function createChudailFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Immediate procedural horror face (visible frame 0)
  drawProceduralChudailFace(ctx, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  // Overlay the exact Chudail face from the uploaded horror photo so she matches 1:1!
  const photo = new Image();
  photo.crossOrigin = 'anonymous';
  photo.onload = () => {
    try {
      const tmp = document.createElement('canvas');
      tmp.width = 512;
      tmp.height = 512;
      const tctx = tmp.getContext('2d')!;

      // Clear with dark hairline-ash tone before drawing upright-corrected face crop
      tctx.fillStyle = '#181416';
      tctx.fillRect(0, 0, 512, 512);

      // In the 1122x1402 photo, Kavita's head is tilted clockwise (~+16deg / +0.28 rad).
      // De-rotate by -0.28 rad so eyes & smile sit level on the UV mask (head.rotation.z then adds the eerie tilt).
      const pw = photo.naturalWidth || 1122;
      const ph = photo.naturalHeight || 1402;
      const faceCenterX = pw * 0.50;
      const faceCenterY = ph * 0.175;
      const scale = 512 / (pw * 0.195);

      tctx.save();
      tctx.translate(256, 256);
      tctx.rotate(-0.28);
      tctx.scale(scale, scale);
      tctx.drawImage(photo, -faceCenterX, -faceCenterY);
      tctx.restore();

      // Stamp centered photo face onto main texture with smooth radial hair-blend edges
      ctx.drawImage(tmp, 0, 0);

      // Soft dark vignette + wispy perimeter frame so edges tuck cleanly under 3D hair locks
      const edgeMask = ctx.createRadialGradient(256, 256, 150, 256, 256, 260);
      edgeMask.addColorStop(0, 'rgba(0,0,0,0)');
      edgeMask.addColorStop(0.76, 'rgba(12,10,12,0.42)');
      edgeMask.addColorStop(1, 'rgba(8,7,9,0.96)');
      ctx.fillStyle = edgeMask;
      ctx.fillRect(0, 0, 512, 512);

      tex.needsUpdate = true;
    } catch {
      // Procedural Chudail face already active cleanly
    }
  };
  photo.src = COUNTER_WOMAN_PHOTO_URL;

  return tex;
}

/**
 * Composite procedural 3D horror model of Kavita (कविता) modeled closely on the user's sent Chudail photo:
 * - Real horror Chudail photo face texture projected over a sculpted 3D front face contour + luminous pale iris glints
 * - Wild messy jet-black hair plumes + tangled strands clinging down both cheeks and shoulders
 * - Deep crimson short-sleeve blouse + blood/mud-stained tattered off-white draped saree
 * - Red glass bangles (लाल चूड़ियाँ) stacked on BOTH wrists + long crooked dark claws
 * - Built-in key-handing pose holding the Room 13 brass key + crimson "13" fob out to Aarav!
 */
export function createKavitaModel(): KavitaModelRig {
  const root = new THREE.Group();

  const lehengaTexture = createBloodSoakedLehengaTexture();
  const faceTexture = createChudailFaceTexture();

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x848078, // Ashen corpse-grey skin
    roughness: 0.74,
    metalness: 0.04,
  });
  const chudailFaceMat = new THREE.MeshStandardMaterial({
    map: faceTexture,
    emissiveMap: faceTexture,
    emissive: 0xd8d0c4,
    emissiveIntensity: 0.36,
    roughness: 0.62,
    metalness: 0.03,
  });
  const blouseMat = new THREE.MeshStandardMaterial({
    color: 0x580a10, // Deep crimson blouse
    roughness: 0.85,
    metalness: 0.04,
  });
  const lehengaMat = new THREE.MeshStandardMaterial({
    map: lehengaTexture,
    roughness: 0.88,
    metalness: 0.04,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x09080a,
    roughness: 0.92,
    metalness: 0.04,
  });
  const bangleMat = new THREE.MeshStandardMaterial({
    color: 0xa10f1d, // Shiny red glass bangles
    roughness: 0.22,
    metalness: 0.35,
  });
  const clawTipMat = new THREE.MeshStandardMaterial({
    color: 0x292118, // Long crooked dark talons
    roughness: 0.45,
  });
  const trayMat = new THREE.MeshStandardMaterial({
    color: 0xb8bec4,
    roughness: 0.24,
    metalness: 0.86,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf5c852,
    emissive: 0xe3941e,
    emissiveIntensity: 0.95,
    roughness: 0.22,
    metalness: 0.88,
  });

  // 1. Legs (articulated, bottom-aligned at y = 0)
  const legGeo = new THREE.CylinderGeometry(0.058, 0.046, 0.78, 10);
  legGeo.translate(0, -0.39, 0);
  const leftLeg = new THREE.Mesh(legGeo, skinMat);
  leftLeg.position.set(-0.095, 0.78, 0);
  leftLeg.castShadow = true;
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, skinMat);
  rightLeg.position.set(0.095, 0.78, 0);
  rightLeg.castShadow = true;
  root.add(rightLeg);

  // 2. Flared Blood-Soaked Lehenga Skirt (घूमरदार खूनी लहंगा)
  const lehengaGeo = new THREE.CylinderGeometry(0.18, 0.38, 0.96, 20);
  const lehenga = new THREE.Mesh(lehengaGeo, lehengaMat);
  lehenga.position.set(0, 0.52, 0);
  lehenga.castShadow = true;
  root.add(lehenga);

  // Decorative lehenga pleat flare along front
  const pleatFold = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.92, 0.14), lehengaMat);
  pleatFold.position.set(0.04, 0.54, 0.16);
  pleatFold.rotation.y = 0.12;
  root.add(pleatFold);

  // 3. Upper Body Group (leaning forward eerily like the reference photo!)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.0, 0);
  torsoGroup.rotation.x = 0.11;
  root.add(torsoGroup);

  // Crimson Short-Sleeve Blouse Torso
  const torsoGeo = new THREE.CylinderGeometry(0.185, 0.155, 0.48, 14);
  const torso = new THREE.Mesh(torsoGeo, blouseMat);
  torso.position.set(0, 0.22, 0);
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Diagonal Blood-Stained Chunni / Dupatta draped across chest
  const dupattaFront = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.56, 0.28), lehengaMat);
  dupattaFront.position.set(-0.03, 0.24, 0.01);
  dupattaFront.rotation.z = 0.38;
  torsoGroup.add(dupattaFront);

  // Short Crimson Blouse Sleeves
  const sleeveGeo = new THREE.CylinderGeometry(0.064, 0.056, 0.16, 10);
  const leftSleeve = new THREE.Mesh(sleeveGeo, blouseMat);
  leftSleeve.position.set(-0.21, 0.37, 0);
  leftSleeve.rotation.z = 0.42;
  torsoGroup.add(leftSleeve);

  const rightSleeve = new THREE.Mesh(sleeveGeo, blouseMat);
  rightSleeve.position.set(0.21, 0.37, 0);
  rightSleeve.rotation.z = -0.42;
  torsoGroup.add(rightSleeve);

  // 4. Gaunt Neck + Chudail Photo-Textured Tilted Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.062, 0.15, 10), skinMat);
  neck.position.set(0, 0.48, 0.015);
  torsoGroup.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.64, 0.035);
  torsoGroup.add(head);

  // Back & side skull base
  const skullGeo = new THREE.SphereGeometry(0.146, 20, 18);
  skullGeo.scale(0.88, 1.15, 0.94);
  const skull = new THREE.Mesh(skullGeo, skinMat);
  skull.castShadow = true;
  head.add(skull);

  // Forward-facing UV-aligned sculpted Chudail Face Shell (phi centered at PI/2 = +Z!)
  const faceMaskGeo = new THREE.SphereGeometry(
    0.15,
    28,
    24,
    Math.PI * 0.14,
    Math.PI * 0.72,
    Math.PI * 0.15,
    Math.PI * 0.70
  );
  faceMaskGeo.scale(0.89, 1.16, 0.95);
  const faceMask = new THREE.Mesh(faceMaskGeo, chudailFaceMat);
  faceMask.position.set(0, 0, 0.004);
  head.add(faceMask);

  // Wild Messy Tangled Chudail Black Hair Crown + Jagged Silhouette Strands
  const hairCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.162, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  hairCrown.scale.set(1.06, 1.05, 1.04);
  hairCrown.rotation.x = -0.32;
  head.add(hairCrown);

  // Dense billowing back curtain of matted black hair falling over shoulders
  const hairBackCurtain = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.72, 0.14), hairMat);
  hairBackCurtain.position.set(0, -0.24, -0.1);
  hairBackCurtain.rotation.x = 0.08;
  head.add(hairBackCurtain);

  // Wild spiked crown tufts & jagged side hair locks framing cheeks exactly like the horror photo
  const lockSpecs = [
    // Wild top & temple wisps
    [-0.12, 0.15, -0.02, 0.055, 0.18, 0.45, 0.1],
    [0.12, 0.15, -0.02, 0.055, 0.18, -0.45, -0.1],
    [0.0, 0.17, -0.05, 0.09, 0.15, 0.05, -0.3],
    // Cascading jagged hair locks framing face sides down to chest/shoulders
    [-0.15, -0.13, 0.03, 0.05, 0.58, 0.16, 0.06],
    [-0.135, -0.22, 0.075, 0.04, 0.54, -0.09, -0.08],
    [-0.17, -0.06, -0.03, 0.048, 0.48, 0.24, 0.02],
    [0.15, -0.13, 0.03, 0.05, 0.58, -0.16, -0.06],
    [0.135, -0.22, 0.075, 0.04, 0.52, 0.09, 0.08],
    [0.17, -0.06, -0.03, 0.048, 0.48, -0.24, -0.02],
    // Forehead straggling wisps over brows
    [-0.085, 0.06, 0.115, 0.024, 0.19, 0.36, 0.12],
    [0.088, 0.055, 0.115, 0.024, 0.2, -0.34, -0.12],
    [-0.02, 0.1, 0.12, 0.02, 0.12, 0.15, 0.2],
  ];
  lockSpecs.forEach(([sx, sy, sz, w, len, rz, rx]) => {
    const strand = new THREE.Mesh(new THREE.ConeGeometry(w * 0.65, len, 6), hairMat);
    strand.position.set(sx, sy, sz);
    strand.rotation.z = rz;
    strand.rotation.x = Math.PI + rx; // tapered tip downward
    head.add(strand);
  });

  // 5. Articulated Gaunt Arms + Red Bangles on Both Wrists + Long Crooked Claw Fingers
  const buildArmWithHand = (side: -1 | 1): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.215, 0.36, 0);

    const upperLower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.037, 0.027, 0.5, 10),
      skinMat
    );
    upperLower.geometry.translate(0, -0.25, 0);
    upperLower.castShadow = true;
    arm.add(upperLower);

    // Stacked Red Glass Bangles at Wrist (5 rings)
    for (let b = 0; b < 5; b++) {
      const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0055, 6, 12), bangleMat);
      bangle.rotation.x = Math.PI / 2;
      bangle.position.y = -0.43 - b * 0.011;
      arm.add(bangle);
    }

    // Gaunt Palm + 4 Crooked Clawed Fingers with Sharp Dark Talons
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.075, 0.028), skinMat);
    palm.position.set(0, -0.52, 0.01);
    arm.add(palm);

    for (let f = 0; f < 4; f++) {
      const fx = -0.02 + f * 0.013;
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.068, 6), skinMat);
      finger.position.set(fx, -0.578, 0.026);
      finger.rotation.x = 0.55;
      arm.add(finger);

      const talon = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.034, 5), clawTipMat);
      talon.position.set(fx, -0.618, 0.052);
      talon.rotation.x = Math.PI * 0.68;
      arm.add(talon);
    }

    return arm;
  };

  const leftArm = buildArmWithHand(-1);
  const rightArm = buildArmWithHand(1);
  torsoGroup.add(leftArm, rightArm);

  // 5B. Room 13 Brass Key + Crimson "13" Fob Held Clearly Above Desk in Kavita's Outstretched Hand!
  const handKeyGroup = new THREE.Group();
  handKeyGroup.position.set(0, -0.53, 0.08);
  handKeyGroup.rotation.x = Math.PI * 0.38;
  handKeyGroup.scale.setScalar(1.28);

  const keyBow = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.012, 8, 14), goldTrimMat);
  const keyShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.13, 8), goldTrimMat);
  keyShaft.position.set(0, -0.09, 0);
  const keyBit = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.024, 0.012), goldTrimMat);
  keyBit.position.set(0.018, -0.14, 0);
  const fobMat = new THREE.MeshStandardMaterial({
    color: 0xb01420,
    emissive: 0x7c0e17,
    emissiveIntensity: 0.85,
    roughness: 0.4,
  });
  const keyFob = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.095, 0.016), fobMat);
  keyFob.position.set(-0.04, -0.05, 0.015);
  keyFob.rotation.z = 0.35;

  const keyGlow = new THREE.PointLight(0xffcb5c, 2.0, 2.6);
  keyGlow.position.set(0, -0.04, 0.08);

  handKeyGroup.add(keyBow, keyShaft, keyBit, keyFob, keyGlow);
  handKeyGroup.visible = false;
  rightArm.add(handKeyGroup);

  // 6. Serving Tray + Steel Cloche Dome (shown only during patrol/delivery)
  const trayGroup = new THREE.Group();
  trayGroup.position.set(0, 1.08, 0.42);
  root.add(trayGroup);

  const trayDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.025, 20), trayMat);
  trayDisc.castShadow = true;
  trayGroup.add(trayDisc);

  const clocheDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    trayMat
  );
  clocheDome.position.y = 0.012;
  trayGroup.add(clocheDome);

  const clocheKnob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 10), goldTrimMat);
  clocheKnob.position.y = 0.165;
  trayGroup.add(clocheKnob);

  // Default counter pose: no tray, eerie Chudail stare + reaching right claw
  let trayActive = false;
  let offerKeyActive = false;
  let nightmareLungeActive = false;
  let nightmareLungeProgress = 0;
  trayGroup.visible = false;

  const setTrayVisible = (visible: boolean) => {
    trayActive = visible;
    trayGroup.visible = visible;
  };

  const setOfferKeyMode = (active: boolean) => {
    offerKeyActive = active;
    handKeyGroup.visible = active;
  };

  const setNightmareLungePose = (active: boolean, progress = 0) => {
    nightmareLungeActive = active;
    nightmareLungeProgress = progress;
    if (active) {
      trayGroup.visible = false;
      handKeyGroup.visible = false;
    }
  };

  // Animation updater
  const updateAnimation = (dt: number, speed: number, chasing: boolean, time: number) => {
    void dt;
    if (nightmareLungeActive) {
      // Dream Strangulation Pose: creeping low & forward with BOTH clawed hands closing toward the sleeper's throat!
      const p = Math.min(1, Math.max(0, nightmareLungeProgress));
      leftLeg.rotation.x = -0.38;
      rightLeg.rotation.x = 0.28;
      torsoGroup.rotation.x = 0.62 + p * 0.34;
      head.rotation.x = 0.28 + Math.sin(time * 7.5) * 0.04;
      head.rotation.z = Math.sin(time * 11) * 0.09 - 0.06;
      const tremor = Math.sin(time * 16) * 0.045;
      leftArm.rotation.x = -1.58 - p * 0.12 + tremor;
      rightArm.rotation.x = -1.62 - p * 0.12 - tremor;
      leftArm.rotation.z = -0.22 + p * 0.16;
      rightArm.rotation.z = 0.22 - p * 0.16;
      return;
    }

    if (offerKeyActive) {
      handKeyGroup.rotation.z = Math.sin(time * 2.8) * 0.12;
    }

    if (speed > 0.1) {
      const cycle = time * (chasing ? 11.5 : 6.0);
      leftLeg.rotation.x = Math.sin(cycle) * 0.42;
      rightLeg.rotation.x = -Math.sin(cycle) * 0.42;
      root.position.y += Math.abs(Math.sin(cycle)) * 0.025;
      trayGroup.position.y = 1.08 + Math.sin(cycle * 2) * 0.012;

      if (chasing) {
        torsoGroup.rotation.x = 0.24;
        head.rotation.z = Math.sin(time * 8) * 0.2 + 0.14;
        head.rotation.x = -0.18;
        leftArm.rotation.x = -1.15 + Math.sin(cycle) * 0.18;
        rightArm.rotation.x = -1.25 - Math.sin(cycle) * 0.18;
      } else {
        torsoGroup.rotation.x = 0.1;
        head.rotation.z = Math.sin(cycle) * 0.05 - 0.14;
        head.rotation.x = 0.02;
        leftArm.rotation.x = trayActive ? -0.78 : -0.25 + Math.sin(cycle) * 0.25;
        rightArm.rotation.x = trayActive ? -0.78 : -0.5 - Math.sin(cycle) * 0.22;
      }
    } else {
      leftLeg.rotation.x *= 0.85;
      rightLeg.rotation.x *= 0.85;

      if (trayActive) {
        torsoGroup.rotation.x = 0.1;
        leftArm.rotation.x = -0.76;
        rightArm.rotation.x = -0.76;
      } else if (offerKeyActive) {
        // Offering Room 13 Key directly from her extended clawed right hand clearly above the counter!
        torsoGroup.rotation.x = 0.22;
        leftArm.rotation.x = -0.18;
        leftArm.rotation.z = -0.06;
        rightArm.rotation.x = -1.48 + Math.sin(time * 2.4) * 0.035;
        rightArm.rotation.z = 0.04;
      } else {
        // Iconic creepy counter/courtyard pose from reference photo
        torsoGroup.rotation.x = 0.12;
        leftArm.rotation.x = -0.16;
        leftArm.rotation.z = -0.06;
        rightArm.rotation.x = -0.72 + Math.sin(time * 1.1) * 0.06;
        rightArm.rotation.z = 0.08;
      }

      head.rotation.z = -0.22 + Math.sin(time * 1.35) * 0.09;
      head.rotation.x = -0.05 + Math.sin(time * 0.85) * 0.04;
    }
  };

  return {
    root,
    head,
    torsoGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    trayGroup,
    handKeyGroup,
    setTrayVisible,
    setOfferKeyMode,
    setNightmareLungePose,
    updateAnimation,
  };
}
