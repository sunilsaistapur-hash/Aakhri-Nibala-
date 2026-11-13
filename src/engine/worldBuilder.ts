import * as THREE from 'three';
import {
  DOORS,
  FLOOR_Y,
  HIDE_SPOTS,
  INTERACTABLES,
  ROOMS,
  STAIR_RAMPS,
  buildAllWalls,
} from '../data/buildingLayout';
import { FloorId } from '../types/game';
import { ProceduralTextureLibrary } from './proceduralTextures';

export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  tag?: string;
}

export interface DoorRuntime {
  id: string;
  pivot: THREE.Group;
  colliderIndex: number;
  isOpen: boolean;
  targetAngle: number;
  currentAngle: number;
  x: number;
  y: number;
  z: number;
}

export interface LampFixture {
  x: number;
  y: number;
  z: number;
  floor: FloorId;
  color: number;
  bulbMesh: THREE.Mesh;
  bulbMat: THREE.MeshStandardMaterial;
  baseEmissive: number;
  flickers: boolean;
}

export interface BuiltWorld {
  colliders: AABB[];
  doors: Map<string, DoorRuntime>;
  interactables: Map<string, THREE.Group>;
  foodClocheGroup: THREE.Group | null;
  foodMeatGroup: THREE.Group | null;
  liftCab: THREE.Group;
  lamps: LampFixture[];
  ceilingFans: THREE.Group[];
  rainSystem: THREE.Points;
  rainPositions: Float32Array;
  signBoardMat: THREE.MeshStandardMaterial;
  watchWindowLightMat: THREE.MeshStandardMaterial;
  carHazardMat: THREE.MeshStandardMaterial;
  carSteamGroup: THREE.Group;
  skyBackdrop: THREE.Mesh;
  windowGlassMats: THREE.MeshStandardMaterial[];
  cctvScreens: THREE.Mesh[];
  dispose: () => void;
}

function addBoxCollider(colliders: AABB[], cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, tag?: string): number {
  const idx = colliders.length;
  colliders.push({
    minX: cx - sx / 2,
    maxX: cx + sx / 2,
    minY: cy - sy / 2,
    maxY: cy + sy / 2,
    minZ: cz - sz / 2,
    maxZ: cz + sz / 2,
    tag,
  });
  return idx;
}

export function buildRestaurantWorld(
  scene: THREE.Scene,
  textures: ProceduralTextureLibrary,
  quality: 'low' | 'medium' | 'high'
): BuiltWorld {
  const colliders: AABB[] = [];
  const doors = new Map<string, DoorRuntime>();
  const interactables = new Map<string, THREE.Group>();
  const lamps: LampFixture[] = [];
  const ceilingFans: THREE.Group[] = [];
  const cctvScreens: THREE.Mesh[] = [];
  const windowGlassMats: THREE.MeshStandardMaterial[] = [];
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };

  // Shared PBR Materials
  const floorMarbleMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.getMarbleTileTexture(8, 8),
      roughness: 0.42,
      metalness: 0.08,
    })
  );
  const darkConcreteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2a2c30,
      roughness: 0.9,
      metalness: 0.05,
    })
  );
  const asphaltMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.getAsphaltTexture(),
      roughness: 0.16, // Rain-soaked glossy asphalt puddles
      metalness: 0.24,
    })
  );
  const groundSoilMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x161914,
      roughness: 0.95,
      metalness: 0.02,
    })
  );
  const wallInteriorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.getWallPlasterTexture('#5c4b3f', 2, 1),
      roughness: 0.85,
      metalness: 0.04,
    })
  );
  const wallExteriorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.getWallPlasterTexture('#483c35', 6, 1),
      roughness: 0.9,
      metalness: 0.05,
    })
  );
  const sheeshamMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.getSheeshamWoodTexture(1, 1),
      roughness: 0.62,
      metalness: 0.08,
    })
  );
  const brassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc29338,
      roughness: 0.28,
      metalness: 0.88,
    })
  );
  const steelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7c848c,
      roughness: 0.3,
      metalness: 0.85,
    })
  );
  const mattressMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7d6b5d,
      roughness: 0.92,
      metalness: 0.02,
    })
  );
  const blanketMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x541820,
      roughness: 0.9,
      metalness: 0.02,
    })
  );
  const curtainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.getCurtainTexture(),
      roughness: 0.88,
      metalness: 0.05,
      side: THREE.DoubleSide,
    })
  );
  const ceilingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x26201c,
      roughness: 0.9,
      metalness: 0.02,
    })
  );

  // Night Sky Dome backdrop
  const skyBackdrop = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(180, 24, 16)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x05070d,
        side: THREE.BackSide,
      })
    )
  );
  scene.add(skyBackdrop);

  // ============ 1. EXTERIOR GROUNDS & RAINY HIGHWAY ============
  const extGroup = new THREE.Group();
  scene.add(extGroup);

  // Wide surrounding terrain (never boxed in an empty void!)
  const terrain = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(240, 240)), groundSoilMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.04;
  terrain.receiveShadow = true;
  extGroup.add(terrain);

  // Wet Highway in front (Z = 27 to 39)
  const highway = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(220, 12)), asphaltMat);
  highway.rotation.x = -Math.PI / 2;
  highway.position.set(0, 0.01, 33);
  highway.receiveShadow = true;
  extGroup.add(highway);

  // Front paved forecourt (Z = 18 to 27)
  const forecourt = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(46, 10)), darkConcreteMat);
  forecourt.rotation.x = -Math.PI / 2;
  forecourt.position.set(0, 0.02, 22.5);
  forecourt.receiveShadow = true;
  extGroup.add(forecourt);

  // Back Courtyard ground (Z = -38 to -18)
  const backGround = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(46, 22)), darkConcreteMat);
  backGround.rotation.x = -Math.PI / 2;
  backGround.position.set(0, 0.02, -28);
  backGround.receiveShadow = true;
  extGroup.add(backGround);

  // Exterior Playable Bounds (prevent walking infinitely into fog)
  addBoxCollider(colliders, 0, 2, 43, 60, 5, 1, 'ext_south_bound');
  addBoxCollider(colliders, -25, 2, 29, 1, 5, 30, 'ext_west_bound');
  addBoxCollider(colliders, 25, 2, 29, 1, 5, 30, 'ext_east_bound');
  addBoxCollider(colliders, 0, 2, -39, 50, 5, 1, 'ext_north_bound');

  // Indian Highway Milestone ("शहर 18 कि.मी.")
  const milestoneGroup = new THREE.Group();
  milestoneGroup.position.set(-6.5, 0, 26.8);
  const msBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.65, 0.9, 0.3)), trackMat(new THREE.MeshStandardMaterial({ map: textures.getMilestoneTexture(), roughness: 0.85 })));
  msBase.position.y = 0.45;
  const msCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.3, 12, 1, false, 0, Math.PI)), trackMat(new THREE.MeshStandardMaterial({ color: 0xd99a1e, roughness: 0.7 })));
  msCap.rotation.z = Math.PI / 2;
  msCap.rotation.y = Math.PI / 2;
  msCap.position.y = 0.9;
  milestoneGroup.add(msBase, msCap);
  extGroup.add(milestoneGroup);

  // Main Restaurant Signboard above Porch: "शाही निवाला रेस्टोरेंट – कमरे और भोजन उपलब्ध"
  const signBoardMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.getMainSignboardTexture(),
      emissive: 0xffb347,
      emissiveMap: textures.getMainSignboardTexture(),
      emissiveIntensity: 0.9,
      roughness: 0.5,
    })
  );
  const signFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8.4, 2.1, 0.25)), sheeshamMat);
  signFrame.position.set(0, 4.5, 18.45);
  const signFace = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(8.0, 1.85)), signBoardMat);
  signFace.position.set(0, 4.5, 18.6);
  extGroup.add(signFrame, signFace);

  // Entrance Porch Pillars & Canopy
  const canopy = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.0, 0.35, 3.2)), wallExteriorMat);
  canopy.position.set(0, 3.4, 19.6);
  extGroup.add(canopy);
  [-3.1, 3.1].forEach((px) => {
    const pillar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.26, 3.4, 12)), wallExteriorMat);
    pillar.position.set(px, 1.7, 20.8);
    extGroup.add(pillar);
    addBoxCollider(colliders, px, 1.7, 20.8, 0.55, 3.4, 0.55);
  });

  // Roadside Indian Street Lamps
  [-11, 11].forEach((lx) => {
    const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.12, 5.5, 8)), steelMat);
    pole.position.set(lx, 2.75, 27.2);
    const arm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.1, 1.2)), steelMat);
    arm.position.set(lx, 5.4, 27.7);
    const lampMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffd280, emissive: 0xffb44c, emissiveIntensity: 1.8 }));
    const head = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.35, 0.16, 0.5)), lampMat);
    head.position.set(lx, 5.32, 28.2);
    extGroup.add(pole, arm, head);
    lamps.push({ x: lx, y: 5.1, z: 28.2, floor: 'G', color: 0xffba5c, bulbMesh: head, bulbMat: lampMat, baseEmissive: 1.8, flickers: true });
  });

  // Aarav's Broken-Down Sedan Car on Rainy Desolate Road (10-part composite model)
  const carGroup = new THREE.Group();
  carGroup.position.set(-4.2, 0, 32.8);
  carGroup.rotation.y = Math.PI * 0.42;
  const carPaint = trackMat(new THREE.MeshStandardMaterial({ color: 0x3b4856, roughness: 0.28, metalness: 0.72 }));
  const tireMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 }));
  const carBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.2, 0.65, 1.78)), carPaint);
  carBody.position.y = 0.58;
  const carCabin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.15, 0.58, 1.56)), carPaint);
  carCabin.position.set(-0.2, 1.15, 0);
  const carGlass = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.2, 0.44, 1.59)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x141d26, roughness: 0.15, metalness: 0.65 }))
  );
  carGlass.position.set(-0.2, 1.16, 0);
  // Slightly propped open broken hood
  const carHood = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.15, 0.08, 1.66)), carPaint);
  carHood.position.set(1.42, 0.98, 0);
  carHood.rotation.z = 0.16;
  carGroup.add(carBody, carCabin, carGlass, carHood);
  // 4 Wheels
  [
    [-1.3, 0.34, 0.88],
    [-1.3, 0.34, -0.88],
    [1.3, 0.34, 0.88],
    [1.3, 0.34, -0.88],
  ].forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16)), tireMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    carGroup.add(wheel);
  });
  // Blinking amber hazard tail & front corner lamps + dim headlights + hood steam
  const carHazardMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xff8822, emissive: 0xff6600, emissiveIntensity: 1.6 }));
  [-0.68, 0.68].forEach((tz) => {
    const tail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.16, 0.28)), carHazardMat);
    tail.position.set(-2.11, 0.68, tz);
    const headLamp = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.08, 0.14, 0.26)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xffe4a8, emissive: 0xffc878, emissiveIntensity: 0.9 }))
    );
    headLamp.position.set(2.11, 0.62, tz);
    carGroup.add(tail, headLamp);
  });
  // Soft light pools cast on wet asphalt in front of headlights
  const headlightCone = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(2.6, 18)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0xffe3a6, transparent: true, opacity: 0.14, depthWrite: false }))
  );
  headlightCone.rotation.x = -Math.PI / 2;
  headlightCone.position.set(4.1, 0.03, 0);
  carGroup.add(headlightCone);

  const carSteamGroup = new THREE.Group();
  carSteamGroup.position.set(1.5, 1.05, 0);
  const steamMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xdbe4f0, transparent: true, opacity: 0.18, depthWrite: false }));
  for (let s = 0; s < 5; s++) {
    const puff = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.2 + s * 0.05, 8, 8)), steamMat);
    puff.position.set((s % 2 === 0 ? 1 : -1) * 0.14, s * 0.28, (s - 2) * 0.12);
    carSteamGroup.add(puff);
  }
  carGroup.add(carSteamGroup);

  extGroup.add(carGroup);
  addBoxCollider(colliders, -4.2, 0.8, 32.8, 2.3, 1.6, 4.3, 'car');

  // Old Indian Village Houses along distant highway edges
  [-23, 23].forEach((hx, idx) => {
    const house = new THREE.Group();
    house.position.set(hx, 0, idx === 0 ? 38 : 37);
    const hWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.5, 3.6, 5.2)), wallExteriorMat);
    hWall.position.y = 1.8;
    const hRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(4.8, 1.8, 4)), darkConcreteMat);
    hRoof.position.y = 4.5;
    hRoof.rotation.y = Math.PI / 4;
    house.add(hWall, hRoof);
    extGroup.add(house);
  });

  // Natural perimeter trees (InstancedMesh with variation!)
  const treeCount = 44;
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.22, 0.38, 4.5, 7));
  const crownGeo = trackGeo(new THREE.ConeGeometry(2.3, 5.5, 8));
  const trunks = new THREE.InstancedMesh(trunkGeo, trackMat(new THREE.MeshStandardMaterial({ color: 0x261a12, roughness: 0.95 })), treeCount);
  const crowns = new THREE.InstancedMesh(crownGeo, trackMat(new THREE.MeshStandardMaterial({ color: 0x101d13, roughness: 0.92 })), treeCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2;
    let rad = 32 + (i % 4) * 7;
    let tx = Math.cos(angle) * rad;
    let tz = Math.sin(angle) * rad;
    if (Math.abs(tx) < 25 && tz > -42 && tz < 44) {
      rad += 16;
      tx = Math.cos(angle) * rad;
      tz = Math.sin(angle) * rad;
    }
    const sc = 0.85 + (i % 5) * 0.12;
    dummy.position.set(tx, 2.25 * sc, tz);
    dummy.scale.set(sc, sc, sc);
    dummy.rotation.y = i * 0.7;
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(tx, 5.6 * sc, tz);
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
  }
  trunks.computeBoundingSphere();
  crowns.computeBoundingSphere();
  extGroup.add(trunks, crowns);

  // Upper 4th Floor Iconic Watch Window Glow (visible from outside road!)
  const watchWindowLightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      emissive: 0xff9f3b,
      emissiveIntensity: 0.75,
      transparent: true,
      opacity: 0.85,
    })
  );
  const upperWindowPane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(3.0, 2.0)), watchWindowLightMat);
  upperWindowPane.position.set(3.75, 17.6, 18.08);
  extGroup.add(upperWindowPane);

  // ============ 2. FLOOR SLABS & CEILINGS (WITH EXACT SHAFT CUTOUTS) ============
  const addSlabPiece = (x1: number, z1: number, x2: number, z2: number, y: number, mat: THREE.Material, addCollider = true) => {
    const w = x2 - x1;
    const d = z2 - z1;
    if (w <= 0.05 || d <= 0.05) return;
    const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, 0.18, d)), mat);
    mesh.position.set((x1 + x2) / 2, y - 0.09, (z1 + z2) / 2);
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (addCollider) {
      addBoxCollider(colliders, (x1 + x2) / 2, y - 0.09, (z1 + z2) / 2, w, 0.18, d, 'slab');
    }
  };

  // Floor B1 (y = -4.0) - completely solid
  addSlabPiece(-20, -18, 20, 18, FLOOR_Y.B1, darkConcreteMat);
  // Secret Tunnel horizontal floor at Z=-18 (ramp covers Z=-18.5 to -28.5, plus shed landing at Z=-28.5..-30.5)
  addSlabPiece(-14, -30.5, -10.5, -28.5, 0.02, darkConcreteMat);
  // Secret tunnel roof
  addSlabPiece(-14.2, -29.5, -10.3, -18.0, 0.0, darkConcreteMat, false);

  // Floor G (y = 0.0): cut out Basement Stairwell (X: -20..-14, Z: -10.0..-2.3) and Lift (X: -20..-16.5, Z: 2..5.5)
  addSlabPiece(-14, -18, 20, 18, FLOOR_Y.G, floorMarbleMat);
  addSlabPiece(-20, -18, -14, -10.0, FLOOR_Y.G, floorMarbleMat);
  addSlabPiece(-20, -2.3, -14, 2, FLOOR_Y.G, floorMarbleMat);
  addSlabPiece(-16.5, 2, -14, 18, FLOOR_Y.G, floorMarbleMat);
  addSlabPiece(-20, 5.5, -16.5, 18, FLOOR_Y.G, floorMarbleMat);

  // Floors 1, 2, 3, 4: cut out Main Stairwell (X: 14..20, Z: -8..4.5) and Lift (X: -20..-16.5, Z: 2..5.5)
  (['1', '2', '3', '4'] as FloorId[]).forEach((fl) => {
    const y = FLOOR_Y[fl];
    const mat = fl === '4' ? darkConcreteMat : floorMarbleMat;
    addSlabPiece(-16.5, -18, 14, 18, y, mat);
    addSlabPiece(-20, -18, -16.5, 2, y, mat);
    addSlabPiece(-20, 5.5, -16.5, 18, y, mat);
    addSlabPiece(14, -18, 20, -8, y, mat);
    addSlabPiece(14, 4.5, 20, 18, y, mat);
  });

  // Roof Cap over Floor 4 Mumty, Lift Machine Room, and Watch Room (y = 19.6)
  addSlabPiece(13.5, -8, 20, 8, 19.5, darkConcreteMat, false);
  addSlabPiece(-20, -2, -12, 8, 19.3, darkConcreteMat, false);
  addSlabPiece(-4, 8, 11.5, 18, 19.6, darkConcreteMat, false);

  // ============ 3. WALLS & WINDOWS ============
  const wallSegments = buildAllWalls();
  for (const w of wallSegments) {
    const baseY = FLOOR_Y[w.floor] + (w.yOffset ?? 0);
    const h = w.height ?? 3.8;
    const isEW = Math.abs(w.z1 - w.z2) < 0.01;
    const len = isEW ? Math.abs(w.x2 - w.x1) : Math.abs(w.z2 - w.z1);
    const cx = (w.x1 + w.x2) / 2;
    const cz = (w.z1 + w.z2) / 2;
    const thick = w.isExterior ? 0.28 : 0.22;

    const sx = isEW ? len : thick;
    const sz = isEW ? thick : len;

    const mat = w.isExterior ? wallExteriorMat : wallInteriorMat;
    const wallMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(sx, h, sz)), mat);
    wallMesh.position.set(cx, baseY + h / 2, cz);
    wallMesh.castShadow = !w.isParapet;
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);

    addBoxCollider(colliders, cx, baseY + h / 2, cz, sx, h, sz, 'wall');

    // Add recessed glowing window frames on exterior walls of rooms
    if (w.hasWindow && len > 4.2 && !w.isParapet && !w.yOffset) {
      const winFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(isEW ? 1.8 : 0.34, 1.5, isEW ? 0.34 : 1.8)), sheeshamMat);
      winFrame.position.set(cx, baseY + 1.85, cz);
      const wgMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x162230,
          roughness: 0.15,
          metalness: 0.4,
          emissive: 0x101824,
          emissiveIntensity: 0.4,
        })
      );
      windowGlassMats.push(wgMat);
      const winGlass = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(isEW ? 1.55 : 0.36, 1.25, isEW ? 0.36 : 1.55)),
        wgMat
      );
      winGlass.position.set(cx, baseY + 1.85, cz);
      scene.add(winFrame, winGlass);
    }
  }

  // ============ 4. DETAILED VISIBLE STAIRCASES, BRASS NOSING, GUARDRAILS & LANDINGS ============
  const stairTreadMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5c3a22, roughness: 0.65, metalness: 0.05 }));
  const stairRiserMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xc2b296, roughness: 0.85, metalness: 0.02 }));
  const stairEdgeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xebb744, emissive: 0x5c3c09, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.8 }));

  for (const st of STAIR_RAMPS) {
    const cx = (st.x1 + st.x2) / 2;
    const width = Math.abs(st.x2 - st.x1);
    const dz = st.zEnd - st.zStart;
    const dy = st.yEnd - st.yStart;
    const runLen = Math.abs(dz);
    const stepDepth = runLen / st.steps + 0.04;
    const stepDir = dz >= 0 ? 1 : -1;

    // Solid sloping concrete under-carriage beam so stairs look solid from every angle underneath & above
    const slopeLen = Math.hypot(runLen, dy);
    const underBeam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(width, 0.24, slopeLen)), stairRiserMat);
    underBeam.position.set(cx, (st.yStart + st.yEnd) / 2 - 0.14, (st.zStart + st.zEnd) / 2);
    underBeam.rotation.x = Math.atan2(-dy, dz);
    scene.add(underBeam);

    for (let i = 0; i < st.steps; i++) {
      const t = (i + 0.5) / st.steps;
      const sy = st.yStart + dy * t;
      const sz = st.zStart + dz * t;

      // Contrasting warm teak step tread
      const stepMesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(width, 0.08, stepDepth)),
        stairTreadMat
      );
      stepMesh.position.set(cx, sy - 0.02, sz);
      stepMesh.receiveShadow = true;
      scene.add(stepMesh);

      // Vertical pale stone riser under step
      const riserH = Math.abs(dy / st.steps) + 0.08;
      const riserMesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(width - 0.02, riserH, 0.05)),
        stairRiserMat
      );
      riserMesh.position.set(cx, sy - riserH / 2, sz - stepDir * (stepDepth * 0.45));
      scene.add(riserMesh);

      // Gleaming Brass Anti-Slip Step Nose Strip (makes every single step clearly visible in dim halls!)
      const noseStrip = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(width - 0.06, 0.022, 0.045)),
        stairEdgeMat
      );
      noseStrip.position.set(cx, sy + 0.022, sz - stepDir * (stepDepth * 0.44));
      scene.add(noseStrip);
    }

    // Mid-landing between flights + floor collider
    if (st.id.endsWith('a')) {
      addSlabPiece(14.0, -8.0, 20.0, -5.5, st.yEnd, stairRiserMat);
      // Center Banister Divider Rail + Collider along X = 16.98 between Flight A & Flight B
      const baseFloorY = st.yStart;
      const centerRail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.1, runLen + 0.2)), sheeshamMat);
      centerRail.position.set(16.98, baseFloorY + 2.0, -0.5);
      centerRail.rotation.x = Math.atan2(-dy, -10.0);
      scene.add(centerRail);
      for (let p = -5.2; p <= 4.3; p += 1.9) {
        const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 3.6, 8)), sheeshamMat);
        post.position.set(16.98, baseFloorY + 1.8, p);
        scene.add(post);
      }
      addBoxCollider(colliders, 16.98, baseFloorY + 1.8, -0.5, 0.16, 3.8, 9.8, 'stair_divider');
    }
  }

  // Floor 4 Top Stairwell Safety Guardrail across open North edge above Flight A (X: 14.0..17.0, Z: 4.4)
  const topGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.95, 1.05, 0.14)), sheeshamMat);
  topGuard.position.set(15.48, FLOOR_Y['4'] + 0.525, 4.4);
  scene.add(topGuard);
  addBoxCollider(colliders, 15.48, FLOOR_Y['4'] + 0.55, 4.4, 2.95, 1.1, 0.16, 'stair_guard');

  // Hindi Stairwell Directional Plaques at stair entrances
  (['G', '1', '2', '3'] as FloorId[]).forEach((fl) => {
    const dirTex = textures.getHindiPlaqueTexture(fl === '3' ? 'सीढ़ी ↑ चौथी मंजिल व छत' : 'सीढ़ी ↑ ऊपरी मंजिल');
    const dirMat = trackMat(new THREE.MeshStandardMaterial({ map: dirTex, roughness: 0.45 }));
    const sign = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.5, 0.34)), dirMat);
    sign.position.set(14.05, FLOOR_Y[fl] + 2.65, 6.2);
    sign.rotation.y = Math.PI / 2;
    scene.add(sign);
  });

  // ============ 5. ELEVATOR CAB (लिफ्ट) ============
  const liftCab = new THREE.Group();
  liftCab.position.set(-18.25, FLOOR_Y.G, 3.75);
  const cabFloor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.1, 0.16, 3.1)), steelMat);
  cabFloor.position.y = -0.08;
  const cabRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.1, 0.16, 3.1)), steelMat);
  cabRoof.position.y = 2.7;
  const cabBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 2.7, 3.1)), sheeshamMat);
  cabBack.position.set(-1.5, 1.35, 0);
  const cabSide1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.1, 2.7, 0.12)), sheeshamMat);
  cabSide1.position.set(0, 1.35, -1.5);
  const cabSide2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.1, 2.7, 0.12)), sheeshamMat);
  cabSide2.position.set(0, 1.35, 1.5);
  const cabLight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.6, 0.06, 0.6)), trackMat(new THREE.MeshStandardMaterial({ color: 0xffe4a0, emissive: 0xffaa33, emissiveIntensity: 1.0 })));
  cabLight.position.set(0, 2.6, 0);
  liftCab.add(cabFloor, cabRoof, cabBack, cabSide1, cabSide2, cabLight);
  scene.add(liftCab);

  // ============ 6. DOORS + HINDI PLAQUES + PEEPHOLE ============
  for (const d of DOORS) {
    const baseY = FLOOR_Y[d.floor];
    const pivot = new THREE.Group();
    const isEW = d.orientation === 'EW';
    // Hinge at left edge of doorway
    pivot.position.set(
      isEW ? d.x - d.width / 2 : d.x,
      baseY,
      isEW ? d.z : d.z - d.width / 2
    );

    const doorThick = d.isFinalGate ? 0.14 : 0.09;
    const doorHeight = 2.42;
    const panelGeo = trackGeo(new THREE.BoxGeometry(isEW ? d.width : doorThick, doorHeight, isEW ? doorThick : d.width));
    const panelMat = d.isFinalGate || d.id === 'door_b1_tunnel'
      ? steelMat
      : d.isSecretPanel
      ? wallInteriorMat
      : sheeshamMat;

    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(isEW ? d.width / 2 : 0, doorHeight / 2, isEW ? 0 : d.width / 2);
    panel.castShadow = true;
    panel.userData = { interactKind: 'door', doorId: d.id };
    pivot.add(panel);

    // Molded Teak Wood Frame Trim & Inset Door Reliefs (realistic hotel doors!)
    if (!d.isSecretPanel) {
      const moldingMat = d.isFinalGate ? brassMat : sheeshamMat;
      const trimThickness = 0.035;
      const relief = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(isEW ? d.width * 0.68 : doorThick + trimThickness, 1.78, isEW ? doorThick + trimThickness : d.width * 0.68)),
        moldingMat
      );
      relief.position.set(isEW ? d.width / 2 : 0, doorHeight / 2, isEW ? 0 : d.width / 2);
      pivot.add(relief);

      // Door jamb posts around frame
      const postGeo = trackGeo(new THREE.BoxGeometry(0.12, doorHeight + 0.08, 0.28));
      const p1 = new THREE.Mesh(postGeo, sheeshamMat);
      p1.position.set(isEW ? d.x - d.width / 2 : d.x, baseY + doorHeight / 2, isEW ? d.z : d.z - d.width / 2);
      const p2 = new THREE.Mesh(postGeo, sheeshamMat);
      p2.position.set(isEW ? d.x + d.width / 2 : d.x, baseY + doorHeight / 2, isEW ? d.z : d.z + d.width / 2);
      scene.add(p1, p2);
    }

    // Brass handle & lock plate
    const handle = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.055, 8, 8)), brassMat);
    handle.position.set(isEW ? d.width - 0.18 : 0.08, 1.08, isEW ? 0.08 : d.width - 0.18);
    const lockPlate = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(isEW ? 0.08 : 0.11, 0.22, isEW ? 0.11 : 0.08)), brassMat);
    lockPlate.position.set(isEW ? d.width - 0.18 : 0, 1.04, isEW ? 0 : d.width - 0.18);
    pivot.add(handle, lockPlate);

    // Room 13 Peephole brass ring
    if (d.hasPeephole) {
      const peepRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.032, 0.008, 8, 16)), brassMat);
      peepRing.position.set(d.width / 2, 1.52, -0.055);
      pivot.add(peepRing);
    }

    scene.add(pivot);

    // Hindi Door Sign Plaque above doorway
    if (!d.isSecretPanel) {
      const plaqueTex = textures.getHindiPlaqueTexture(d.label);
      const plaqueMat = trackMat(new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.45 }));
      const plaqueMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.15, 0.28)), plaqueMat);
      plaqueMesh.position.set(
        d.x,
        baseY + 2.68,
        isEW ? d.z + 0.16 : d.z
      );
      if (!isEW) plaqueMesh.rotation.y = Math.PI / 2;
      scene.add(plaqueMesh);

      const plaqueBack = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.15, 0.28)), plaqueMat);
      plaqueBack.position.set(
        d.x,
        baseY + 2.68,
        isEW ? d.z - 0.16 : d.z
      );
      plaqueBack.rotation.y = isEW ? Math.PI : -Math.PI / 2;
      scene.add(plaqueBack);
    }

    const colliderIndex = addBoxCollider(
      colliders,
      d.x,
      baseY + doorHeight / 2,
      d.z,
      isEW ? d.width : 0.22,
      doorHeight,
      isEW ? 0.22 : d.width,
      `door:${d.id}`
    );

    doors.set(d.id, {
      id: d.id,
      pivot,
      colliderIndex,
      isOpen: false,
      targetAngle: 0,
      currentAngle: 0,
      x: d.x,
      y: baseY,
      z: d.z,
    });
  }

  const pillowMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd8d0c3, roughness: 0.88 }));
  const acWhiteMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.38, metalness: 0.12 }));
  const screenDarkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.18, metalness: 0.65 }));
  const leatherSofaMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x4b1d1c, roughness: 0.72, metalness: 0.05 }));
  const foliageMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x244225, roughness: 0.85 }));
  const ceramicWhiteMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xdcd9d0, roughness: 0.25, metalness: 0.08 }));
  const greenLedMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 1.5 }));
  const artCanvasMats = [
    trackMat(new THREE.MeshStandardMaterial({ color: 0x6b3526, roughness: 0.75 })),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x2c4a52, roughness: 0.75 })),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x5c4b27, roughness: 0.75 })),
  ];

  // ============ 7. COMPOSITE INDIAN FURNITURE & HIDING SPOTS ============
  const createBed = (x: number, y: number, z: number, rotY = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    // 4 legs (clearance 0.44m underneath so player can hide!)
    [
      [-0.85, -1.0],
      [0.85, -1.0],
      [-0.85, 1.0],
      [0.85, 1.0],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.04, 0.46, 8)), sheeshamMat);
      leg.position.set(lx, 0.23, lz);
      g.add(leg);
    });
    const frame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.9, 0.14, 2.2)), sheeshamMat);
    frame.position.y = 0.48;
    const headboard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.92, 0.95, 0.1)), sheeshamMat);
    headboard.position.set(0, 0.85, -1.05);
    const mattress = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.78, 0.18, 2.05)), mattressMat);
    mattress.position.y = 0.62;
    const quilt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.82, 0.08, 1.3)), blanketMat);
    quilt.position.set(0, 0.72, 0.35);
    // Double Pillows + Decorative Runner Bolster
    const pillowL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.66, 0.12, 0.38)), pillowMat);
    pillowL.position.set(-0.42, 0.76, -0.74);
    pillowL.rotation.x = 0.12;
    const pillowR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.66, 0.12, 0.38)), pillowMat);
    pillowR.position.set(0.42, 0.76, -0.74);
    pillowR.rotation.x = 0.12;
    const runner = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.84, 0.04, 0.36)), brassMat);
    runner.position.set(0, 0.76, 0.75);
    g.add(frame, headboard, mattress, quilt, pillowL, pillowR, runner);
    scene.add(g);
    addBoxCollider(colliders, x, y + 0.55, z, rotY % Math.PI ? 2.1 : 1.85, 1.1, rotY % Math.PI ? 1.85 : 2.1, 'bed');
  };

  const createSplitAC = (x: number, y: number, z: number, rotY = 0) => {
    const ac = new THREE.Group();
    ac.position.set(x, y, z);
    ac.rotation.y = rotY;
    const unitBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.02, 0.29, 0.24)), acWhiteMat);
    const louverSlot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.88, 0.045, 0.04)), darkConcreteMat);
    louverSlot.position.set(0, -0.1, 0.11);
    const flapBlade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.86, 0.025, 0.05)), acWhiteMat);
    flapBlade.position.set(0, -0.13, 0.14);
    flapBlade.rotation.x = 0.38;
    const ledDot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.015, 6, 6)), greenLedMat);
    ledDot.position.set(0.38, -0.02, 0.122);
    const pipe = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 6)), steelMat);
    pipe.position.set(-0.42, 0.38, -0.06);
    ac.add(unitBody, louverSlot, flapBlade, ledDot, pipe);
    scene.add(ac);
  };

  const createWallTV = (x: number, y: number, z: number, rotY = 0, withShelf = true) => {
    const tv = new THREE.Group();
    tv.position.set(x, y, z);
    tv.rotation.y = rotY;
    const bezel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.22, 0.72, 0.06)), darkConcreteMat);
    const display = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.14, 0.64)), screenDarkMat);
    display.position.z = 0.032;
    const standDot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.012, 6, 6)), trackMat(new THREE.MeshBasicMaterial({ color: 0xef4444 })));
    standDot.position.set(0.5, -0.33, 0.034);
    tv.add(bezel, display, standDot);
    if (withShelf) {
      const shelf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.26, 0.07, 0.28)), sheeshamMat);
      shelf.position.set(0, -0.58, 0.12);
      const stb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.26, 0.045, 0.16)), darkConcreteMat);
      stb.position.set(-0.22, -0.52, 0.14);
      tv.add(shelf, stb);
    }
    scene.add(tv);
  };

  const createSofa = (x: number, y: number, z: number, rotY = 0, twoSeater = true) => {
    const s = new THREE.Group();
    s.position.set(x, y, z);
    s.rotation.y = rotY;
    const width = twoSeater ? 1.75 : 0.92;
    const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(width, 0.14, 0.84)), sheeshamMat);
    base.position.y = 0.18;
    const seatCush = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(width - 0.18, 0.18, 0.74)), leatherSofaMat);
    seatCush.position.set(0, 0.34, 0.03);
    const backRest = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(width - 0.16, 0.56, 0.18)), leatherSofaMat);
    backRest.position.set(0, 0.64, -0.32);
    const armL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.38, 0.82)), leatherSofaMat);
    armL.position.set(-width / 2 + 0.07, 0.44, 0);
    const armR = armL.clone();
    armR.position.x = width / 2 - 0.07;
    s.add(base, seatCush, backRest, armL, armR);
    scene.add(s);
    const rotSwap = Math.abs(Math.sin(rotY)) > 0.7;
    addBoxCollider(colliders, x, y + 0.45, z, rotSwap ? 0.88 : width, 0.9, rotSwap ? width : 0.88, 'sofa');
  };

  const createFloorLamp = (x: number, y: number, z: number) => {
    const lp = new THREE.Group();
    lp.position.set(x, y, z);
    const basePlate = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.2, 0.05, 14)), brassMat);
    basePlate.position.y = 0.025;
    const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.024, 0.03, 1.52, 8)), brassMat);
    pole.position.y = 0.78;
    const drumShade = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.22, 0.26, 0.32, 16, 1, true)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xe6be78, emissive: 0xffaa44, emissiveIntensity: 0.75, side: THREE.DoubleSide }))
    );
    drumShade.position.y = 1.55;
    lp.add(basePlate, pole, drumShade);
    scene.add(lp);
    addBoxCollider(colliders, x, y + 0.8, z, 0.36, 1.6, 0.36, 'lamp');
  };

  const createWallPainting = (x: number, y: number, z: number, rotY = 0, artIdx = 0) => {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    p.rotation.y = rotY;
    const frame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.06, 0.74, 0.05)), sheeshamMat);
    const canvas = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.92, 0.6)), artCanvasMats[artIdx % artCanvasMats.length]);
    canvas.position.z = 0.028;
    const trim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.96, 0.04, 0.06)), brassMat);
    trim.position.set(0, -0.35, 0.01);
    p.add(frame, canvas, trim);
    scene.add(p);
  };

  const createWindowCurtains = (x: number, y: number, z: number, rotY = 0) => {
    const cg = new THREE.Group();
    cg.position.set(x, y, z);
    cg.rotation.y = rotY;
    const rod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 2.2, 8)), brassMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 0.86, 0);
    const finL = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.045, 8, 8)), brassMat);
    finL.position.set(-1.12, 0.86, 0);
    const finR = finL.clone();
    finR.position.x = 1.12;
    const drapeL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 1.75, 0.08)), curtainMat);
    drapeL.position.set(-0.78, -0.02, 0.02);
    const drapeR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 1.75, 0.08)), curtainMat);
    drapeR.position.set(0.78, -0.02, 0.02);
    cg.add(rod, finL, finR, drapeL, drapeR);
    scene.add(cg);
  };

  const createPottedPlant = (x: number, y: number, z: number) => {
    const pt = new THREE.Group();
    pt.position.set(x, y, z);
    const pot = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.16, 0.42, 12)), brassMat);
    pot.position.y = 0.21;
    for (let f = 0; f < 5; f++) {
      const frond = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.14, 0.62, 6)), foliageMat);
      const a = (f / 5) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 0.12, 0.64, Math.sin(a) * 0.12);
      frond.rotation.z = Math.cos(a) * 0.35;
      frond.rotation.x = Math.sin(a) * 0.35;
      pt.add(frond);
    }
    pt.add(pot);
    scene.add(pt);
    addBoxCollider(colliders, x, y + 0.45, z, 0.44, 0.9, 0.44, 'plant');
  };

  const createWardrobe = (x: number, y: number, z: number, rotY = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    const body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.25, 2.25, 0.72)), sheeshamMat);
    body.position.y = 1.125;
    const topCrown = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.36, 0.12, 0.8)), sheeshamMat);
    topCrown.position.y = 2.28;
    const knob1 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.035, 8, 8)), brassMat);
    knob1.position.set(-0.08, 1.1, 0.38);
    const knob2 = knob1.clone();
    knob2.position.set(0.08, 1.1, 0.38);
    g.add(body, topCrown, knob1, knob2);
    scene.add(g);
    addBoxCollider(colliders, x, y + 1.1, z, 1.25, 2.2, 0.75, 'wardrobe');
  };

  const createTableAndChair = (x: number, y: number, z: number, withPlaceSettings = false) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const top = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.2, 0.08, 0.85)), sheeshamMat);
    top.position.y = 0.76;
    [
      [-0.5, -0.34],
      [0.5, -0.34],
      [-0.5, 0.34],
      [0.5, 0.34],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.035, 0.03, 0.74, 8)), sheeshamMat);
      leg.position.set(lx, 0.37, lz);
      g.add(leg);
    });
    if (withPlaceSettings) {
      const p1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.12, 0.02, 12)), ceramicWhiteMat);
      p1.position.set(-0.28, 0.81, 0.06);
      const p2 = p1.clone();
      p2.position.set(0.28, 0.81, -0.06);
      const jug = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 10)), steelMat);
      jug.position.set(0, 0.91, -0.18);
      g.add(p1, p2, jug);
    }
    // Wooden chair beside table
    const seat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.06, 0.46)), sheeshamMat);
    seat.position.set(0, 0.45, 0.72);
    const chairBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.52, 0.06)), sheeshamMat);
    chairBack.position.set(0, 0.72, 0.92);
    g.add(top, seat, chairBack);
    scene.add(g);
    addBoxCollider(colliders, x, y + 0.5, z, 1.18, 1.0, 0.9, 'table');
  };

  const createCeilingFan = (x: number, y: number, z: number) => {
    const fan = new THREE.Group();
    fan.position.set(x, y, z);
    const canopy = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.11, 0.07, 10)), brassMat);
    canopy.position.y = -0.03;
    const rod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8)), brassMat);
    rod.position.y = -0.22;
    const hub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.15, 0.15, 0.11, 12)), sheeshamMat);
    hub.position.y = -0.45;
    fan.add(canopy, rod, hub);
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.02, 0.16)), sheeshamMat);
      const ang = (i * Math.PI * 2) / 3;
      blade.position.set(Math.cos(ang) * 0.55, -0.45, Math.sin(ang) * 0.55);
      blade.rotation.y = -ang;
      fan.add(blade);
    }
    scene.add(fan);
    ceilingFans.push(fan);
  };

  // Reception Desk (Ground Lobby) + Carved Front Molding + Brass Edge + Lantern
  const recDesk = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.6, 1.02, 1.0)), sheeshamMat);
  recDesk.position.set(0, 0.51, 12.2);
  recDesk.receiveShadow = true;
  const recTopLip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.74, 0.06, 1.12)), brassMat);
  recTopLip.position.set(0, 1.03, 12.2);
  // Warm Brass Reception Hurricane Lantern illuminating Kavita's Chudail face & hand!
  const recLanternBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.14, 0.08, 12)), brassMat);
  recLanternBase.position.set(-0.95, 1.09, 12.38);
  const recLanternGlassMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffdf99, emissive: 0xffa638, emissiveIntensity: 2.2, roughness: 0.2 }));
  const recLanternGlass = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.075, 0.08, 0.2, 12)), recLanternGlassMat);
  recLanternGlass.position.set(-0.95, 1.23, 12.38);
  const recLanternCap = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.12, 0.09, 12)), brassMat);
  recLanternCap.position.set(-0.95, 1.37, 12.38);
  const kavitaFaceFillLight = new THREE.PointLight(0xffcb82, 1.45, 4.2);
  kavitaFaceFillLight.position.set(0.0, 1.72, 12.15);
  scene.add(recDescHelperFix(), kavitaFaceFillLight);
  function recDescHelperFix() {
    const grp = new THREE.Group();
    grp.add(recDesk, recTopLip, recLanternBase, recLanternGlass, recLanternCap);
    return grp;
  }
  addBoxCollider(colliders, 0, 0.51, 12.2, 5.6, 1.02, 1.0, 'reception_desk');

  // Ornate Hanging Chandelier over Reception Lobby + Velvet Carpet Runners
  const chGroup = new THREE.Group();
  chGroup.position.set(0, 3.4, 14.5);
  const chRod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8)), brassMat);
  chRod.position.y = 0.2;
  const chRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.65, 0.035, 8, 24)), brassMat);
  chRing.rotation.x = Math.PI / 2;
  chGroup.add(chRod, chRing);
  const chBulbMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffe099, emissive: 0xffa73b, emissiveIntensity: 1.6 }));
  for (let c = 0; c < 6; c++) {
    const a = (c / 6) * Math.PI * 2;
    const candle = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.06, 8, 8)), chBulbMat);
    candle.position.set(Math.cos(a) * 0.65, 0.08, Math.sin(a) * 0.65);
    chGroup.add(candle);
  }
  scene.add(chGroup);

  const carpetRunnerMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.getPersianCarpetTexture(1, 5),
      roughness: 0.92,
      metalness: 0.02,
    })
  );
  const lobbyCarpet = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.4, 10.8)), carpetRunnerMat);
  lobbyCarpet.rotation.x = -Math.PI / 2;
  lobbyCarpet.position.set(0, 0.014, 12.4);
  lobbyCarpet.receiveShadow = true;
  scene.add(lobbyCarpet);
  (['1', '2', '3'] as FloorId[]).forEach((fl) => {
    const corrCarpet = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.0, 29.0)), carpetRunnerMat);
    corrCarpet.rotation.x = -Math.PI / 2;
    corrCarpet.rotation.z = Math.PI / 2;
    corrCarpet.position.set(-1.2, FLOOR_Y[fl] + 0.014, 0);
    corrCarpet.receiveShadow = true;
    scene.add(corrCarpet);
  });

  // Key Rack & Shelf behind Reception (small hanging hooks & brass key tags)
  const backShelf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.2, 2.2, 0.55)), sheeshamMat);
  backShelf.position.set(-1.5, 1.1, 9.5);
  scene.add(backShelf);
  for (let kp = 0; kp < 10; kp++) {
    const tag = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.09, 0.03)), brassMat);
    tag.position.set(-0.6 + kp * 0.16, 1.65, 9.79);
    scene.add(tag);
  }
  addBoxCollider(colliders, -1.5, 1.1, 9.5, 4.2, 2.2, 0.55, 'shelf');

  // Reception Lobby Lounge Waiting Sofas, Fans, Split ACs, Wall TV & Planter!
  createCeilingFan(-4.8, 3.55, 11.5);
  createCeilingFan(4.8, 3.55, 11.5);
  createSplitAC(-7.74, 2.85, 14.5, Math.PI / 2);
  createSplitAC(7.74, 2.85, 14.5, -Math.PI / 2);
  createWallTV(-7.76, 2.02, 8.2, Math.PI / 2, true);
  createSofa(-5.8, FLOOR_Y.G, 16.4, Math.PI, true);
  createSofa(5.8, FLOOR_Y.G, 16.4, Math.PI, true);
  createFloorLamp(-7.15, FLOOR_Y.G, 16.8);
  createPottedPlant(7.15, FLOOR_Y.G, 16.8);
  createWallPainting(-5.4, 2.05, 6.22, 0, 0);
  createWallPainting(5.4, 2.05, 6.22, 0, 1);

  // Ground Dining Tables + Place Settings + ACs + Ceiling Fans
  [
    [-14, 10],
    [-14, 14.5],
    [-10.5, 12.5],
    [12, 13.5],
    [16, 12],
  ].forEach(([tx, tz]) => createTableAndChair(tx, FLOOR_Y.G, tz, true));
  createCeilingFan(-14.0, 3.55, 12.2);
  createCeilingFan(14.0, 3.55, 13.0);
  createSplitAC(-19.72, 2.85, 12.0, Math.PI / 2);
  createSplitAC(19.72, 2.85, 13.0, -Math.PI / 2);
  createWallPainting(-14.0, 2.05, 17.75, Math.PI, 2);

  // Kitchen Counters & Tandoor
  const kitchenCounter = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.5, 0.92, 1.1)), steelMat);
  kitchenCounter.position.set(-2.5, 0.46, -13.5);
  const tandoor = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.65, 0.72, 0.95, 16)), darkConcreteMat);
  tandoor.position.set(1.5, 0.48, -14.8);
  scene.add(kitchenCounter, tandoor);
  addBoxCollider(colliders, -2.5, 0.46, -13.5, 5.5, 0.92, 1.1);
  addBoxCollider(colliders, 1.5, 0.48, -14.8, 1.3, 1.0, 1.3);

  // Old Kitchen Brick Chulha (relocated clear of Secret Room archway at X=-15.5, Z=-14)
  const chulha = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 0.85, 0.95)), darkConcreteMat);
  chulha.position.set(-11.8, 0.425, -16.2);
  scene.add(chulha);
  addBoxCollider(colliders, -11.8, 0.425, -16.2, 2.4, 0.85, 0.95);

  // Secret Kitchen Room Iron Almirah (g_kitchen_secret)
  const almirahGrp = new THREE.Group();
  almirahGrp.position.set(-18.6, FLOOR_Y.G, -16.2);
  const almBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.25, 2.25, 0.72)), steelMat);
  almBody.position.y = 1.125;
  const almCrown = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.32, 0.1, 0.78)), darkConcreteMat);
  almCrown.position.y = 2.28;
  const almSeam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.03, 2.1, 0.04)), darkConcreteMat);
  almSeam.position.set(0, 1.12, 0.36);
  const almLockHasp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.28, 0.06)), brassMat);
  almLockHasp.position.set(0, 1.15, 0.37);
  almirahGrp.add(almBody, almCrown, almSeam, almLockHasp);
  scene.add(almirahGrp);
  addBoxCollider(colliders, -18.6, FLOOR_Y.G + 1.1, -16.2, 1.25, 2.2, 0.75, 'almirah');

  // CCTV Monitors Desk (Ground CCTV Room)
  const cctvDesk = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.8, 0.92, 0.9)), steelMat);
  cctvDesk.position.set(9.0, 0.46, -4.4);
  scene.add(cctvDesk);
  addBoxCollider(colliders, 9.0, 0.46, -4.4, 2.8, 0.92, 0.9);
  for (let m = 0; m < 4; m++) {
    const monBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.55, 0.42, 0.3)), darkConcreteMat);
    monBody.position.set(8.0 + m * 0.65, 1.15, -4.5);
    const scrMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0c2419, emissive: 0x165e3d, emissiveIntensity: 0.75 }));
    const scr = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.46, 0.32)), scrMat);
    scr.position.set(8.0 + m * 0.65, 1.15, -4.34);
    scene.add(monBody, scr);
    cctvScreens.push(scr);
  }

  // Room 13 Special Props (Bed, Wardrobe, Table+Chair, Rug, Suitcase, Nightstand, AC, Fan, Wall TV, Armchair, Standing Lamp, Paintings, Curtains, Bath Commode/Bucket/Shower)
  createBed(-5.2, FLOOR_Y['2'], -9.5, 0);
  createWardrobe(0.45, FLOOR_Y['2'], -9.5, -Math.PI / 2);
  createTableAndChair(-1.5, FLOOR_Y['2'], -9.5, true);
  createCeilingFan(-3.0, FLOOR_Y['2'] + 3.55, -10.0);
  createSplitAC(-6.74, FLOOR_Y['2'] + 2.85, -9.5, Math.PI / 2);
  createWallTV(-5.3, FLOOR_Y['2'] + 1.68, -2.18, Math.PI, true);
  createSofa(-0.15, FLOOR_Y['2'], -4.2, -Math.PI * 0.78, false);
  createFloorLamp(0.55, FLOOR_Y['2'], -2.9);
  createPottedPlant(-6.35, FLOOR_Y['2'], -3.0);
  // North wall has solid wooden paneling with decorative frame (no window or opening to outside)
  createWallPainting(-0.2, FLOOR_Y['2'] + 1.85, -17.82, 0, 0);
  createWallPainting(-1.4, FLOOR_Y['2'] + 1.9, -17.82, 0, 0);
  createWallPainting(0.84, FLOOR_Y['2'] + 1.85, -6.2, -Math.PI / 2, 1);

  // Nightstand beside Room 13 Bed with Glass Bottle & Brass Clock
  const nightStand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 0.56, 0.48)), sheeshamMat);
  nightStand.position.set(-3.82, FLOOR_Y['2'] + 0.28, -10.25);
  const waterBottle = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.04, 0.045, 0.2, 10)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x7ab8cc, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 }))
  );
  waterBottle.position.set(-3.82, FLOOR_Y['2'] + 0.66, -10.25);
  scene.add(nightStand, waterBottle);
  addBoxCollider(colliders, -3.82, FLOOR_Y['2'] + 0.3, -10.25, 0.52, 0.6, 0.48, 'nightstand');

  // Warm crimson woven rug under Room 13 bed/table zone
  const r13Rug = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(3.8, 3.6)), carpetRunnerMat);
  r13Rug.rotation.x = -Math.PI / 2;
  r13Rug.position.set(-3.0, FLOOR_Y['2'] + 0.015, -9.5);
  scene.add(r13Rug);
  // Aarav's Vintage Travel Suitcase near the Bed
  const suitcase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.65, 0.44, 0.26)), trackMat(new THREE.MeshStandardMaterial({ color: 0x45281c, roughness: 0.72 })));
  suitcase.position.set(-6.15, FLOOR_Y['2'] + 0.22, -11.4);
  const suitcaseLatch = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.06, 0.28)), brassMat);
  suitcaseLatch.position.set(-6.15, FLOOR_Y['2'] + 0.42, -11.4);
  scene.add(suitcase, suitcaseLatch);
  // Small side table under Room 13 rotary phone + vintage brass bedside lamp
  const smallTable = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.72, 0.68)), sheeshamMat);
  smallTable.position.set(-2.2, FLOOR_Y['2'] + 0.36, -15.8);
  const lampStand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.08, 0.28, 10)), brassMat);
  lampStand.position.set(-1.98, FLOOR_Y['2'] + 0.86, -15.95);
  const lampShade = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.16, 0.16, 12, 1, true)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xe8ba6b, emissive: 0xffaa44, emissiveIntensity: 0.9, side: THREE.DoubleSide }))
  );
  lampShade.position.set(-1.98, FLOOR_Y['2'] + 1.02, -15.95);
  scene.add(smallTable, lampStand, lampShade);
  addBoxCollider(colliders, -2.2, FLOOR_Y['2'] + 0.36, -15.8, 0.7, 0.75, 0.7, 'small_table');
  // Bathroom sink, mirror, Commode, Bucket + Mug, Shower, Towel inside Room 13 bathroom
  const bathSink = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.85, 0.9, 0.55)), mattressMat);
  bathSink.position.set(-5.4, FLOOR_Y['2'] + 0.45, -17.2);
  const bathMirror = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.75, 0.95)), trackMat(new THREE.MeshStandardMaterial({ color: 0x5d7278, roughness: 0.08, metalness: 0.95 })));
  bathMirror.position.set(-5.4, FLOOR_Y['2'] + 1.55, -17.85);
  const toiletBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.14, 0.4, 12)), ceramicWhiteMat);
  toiletBase.position.set(-6.45, FLOOR_Y['2'] + 0.2, -14.0);
  const toiletTank = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.38, 0.18)), ceramicWhiteMat);
  toiletTank.position.set(-6.45, FLOOR_Y['2'] + 0.56, -13.78);
  const bathBucket = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.14, 0.34, 12)), blanketMat);
  bathBucket.position.set(-6.35, FLOOR_Y['2'] + 0.17, -16.8);
  const showerHead = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.03, 0.12, 10)), steelMat);
  showerHead.position.set(-4.2, FLOOR_Y['2'] + 2.25, -17.65);
  showerHead.rotation.x = 0.55;
  const towelRail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.04, 0.56)), steelMat);
  towelRail.position.set(-3.68, FLOOR_Y['2'] + 1.32, -16.8);
  const towelCloth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.42, 0.38)), pillowMat);
  towelCloth.position.set(-3.72, FLOOR_Y['2'] + 1.12, -16.8);
  scene.add(bathSink, bathMirror, toiletBase, toiletTank, bathBucket, showerHead, towelRail, towelCloth);
  // Wall Clock in Room 13
  const clockRim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.07, 20)), sheeshamMat);
  clockRim.rotation.x = Math.PI / 2;
  clockRim.position.set(-2.5, FLOOR_Y['2'] + 2.1, -17.8);
  const clockFace = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.28, 20)),
    trackMat(new THREE.MeshStandardMaterial({ map: textures.getClockFaceTexture(), roughness: 0.4 }))
  );
  clockFace.position.set(-2.5, FLOOR_Y['2'] + 2.1, -17.75);
  scene.add(clockRim, clockFace);

  // Support Tables & Stands for Relocated Accessible Floor 1 & Floor 2 Collectibles/Notes
  const makeStand = (x: number, floor: FloorId, z: number) => {
    const sy = FLOOR_Y[floor];
    const stTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.85, 0.07, 0.65)), sheeshamMat);
    stTop.position.set(x, sy + 0.81, z);
    const stCol = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.55, 0.78, 0.45)), sheeshamMat);
    stCol.position.set(x, sy + 0.39, z);
    scene.add(stTop, stCol);
    addBoxCollider(colliders, x, sy + 0.42, z, 0.82, 0.85, 0.62, 'stand');
  };
  makeStand(12.6, '1', 4.5); // Floor 1 East Security Desk (holds CCTV key!)
  makeStand(-9.8, '1', -1.15); // Floor 1 Corridor stand outside Room 2
  makeStand(-16.0, '1', 9.5); // Floor 1 Old Guests' Hall table
  makeStand(-16.8, '1', 14.5); // Floor 1 Old Guests' Hall CCTV card crate
  makeStand(-16.2, '2', 10.0); // Floor 2 Closed Library table
  makeStand(12.6, '2', 4.5); // Floor 2 East Vestibule stand
  makeStand(-15.2, '1', 3.2); // Floor 1 Lift corner stand
  makeStand(-18.2, '1', 16.0); // Floor 1 Old Guests' Hall south table
  makeStand(-13.2, 'G', -11.4); // Old Kitchen brass/copper vessels puzzle stand
  makeStand(-18.5, 'G', -11.8); // Secret Kitchen final main-door key box stand
  makeStand(10.5, 'G', -9.8); // Ground Store Room clue stand

  // Guest Rooms 1..20 & Staff Rooms Furnishing (Beds, Tables, Ceiling Fans, Split ACs, TVs, Paintings, Lamps)
  const roomFurnishings: { x: number; floor: FloorId; z: number }[] = [
    { x: -16.5, floor: '1', z: -12.5 },
    { x: -9.8, floor: '1', z: -12.5 },
    { x: -3.0, floor: '1', z: -12.5 },
    { x: 3.8, floor: '1', z: -12.5 },
    { x: 10.5, floor: '1', z: -12.5 },
    { x: -10.8, floor: '1', z: 12.5 },
    { x: -4.4, floor: '1', z: 12.5 },
    { x: 1.9, floor: '1', z: 12.5 },
    { x: 8.2, floor: '1', z: 12.5 },
    { x: 15.5, floor: '1', z: 13.5 },
    { x: -17.0, floor: '2', z: -12.5 },
    { x: -10.2, floor: '2', z: -12.5 },
    { x: 4.2, floor: '2', z: -6.5 },
    { x: 10.6, floor: '2', z: -12.5 },
    { x: -10.8, floor: '2', z: 12.5 },
    { x: -4.4, floor: '2', z: 12.5 },
    { x: 1.9, floor: '2', z: 12.5 },
    { x: 8.2, floor: '2', z: 12.5 },
    { x: 15.5, floor: '2', z: 13.5 },
    { x: -15.5, floor: '3', z: -13.0 },
    { x: -5.0, floor: '3', z: -13.0 },
  ];
  roomFurnishings.forEach((rf, idx) => {
    const y = FLOOR_Y[rf.floor];
    const isNorth = rf.z < 0;
    createBed(rf.x, y, rf.z, isNorth ? 0 : Math.PI);
    // Every Guest/Staff room gets a Ceiling Fan + Split AC + Framed Painting!
    createCeilingFan(rf.x, y + 3.55, isNorth ? -9.5 : 9.5);
    createSplitAC(rf.x + 1.8, y + 2.85, isNorth ? -17.74 : 17.74, isNorth ? 0 : Math.PI);
    createWallPainting(rf.x, y + 1.88, isNorth ? -17.82 : 17.82, isNorth ? 0 : Math.PI, idx);
    if (idx % 2 === 0 && rf.floor !== '3') {
      createWallTV(rf.x - 1.5, y + 1.72, isNorth ? -2.18 : 2.18, isNorth ? Math.PI : 0, false);
    }
    if (idx % 3 === 0) {
      createFloorLamp(rf.x + 1.6, y, rf.z + (isNorth ? 1.5 : -1.5));
    }
  });

  // Owner's Office & Private Suite & Kavita's Room Furniture (Floor 3)
  createTableAndChair(-7.5, FLOOR_Y['3'], 13.5);
  createCeilingFan(-7.5, FLOOR_Y['3'] + 3.55, 11.0);
  createSplitAC(-7.5, FLOOR_Y['3'] + 2.85, 17.74, Math.PI);
  createSofa(-11.5, FLOOR_Y['3'], 10.5, 0, true);
  createWardrobe(-11.5, FLOOR_Y['3'], 15.0, 0);
  createBed(4.5, FLOOR_Y['3'], 12.5, Math.PI);
  createCeilingFan(4.5, FLOOR_Y['3'] + 3.55, 10.5);
  createSplitAC(4.5, FLOOR_Y['3'] + 2.85, 17.74, Math.PI);
  createWallTV(4.5, FLOOR_Y['3'] + 1.75, 2.2, 0, true);
  createSofa(7.4, FLOOR_Y['3'], 9.8, -Math.PI / 2, false);
  createTableAndChair(10.5, FLOOR_Y['3'], -14.2);
  createCeilingFan(10.5, FLOOR_Y['3'] + 3.55, -10.0);
  createSplitAC(10.5, FLOOR_Y['3'] + 2.85, -17.74, 0);

  // 4th Floor Overhead Concrete Water Tank (पानी की टंकी वाला क्षेत्र)
  const tankY = FLOOR_Y['4'];
  [
    [-15, -14],
    [-9, -14],
    [-15, -8],
    [-9, -8],
  ].forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 2.8, 0.45)), darkConcreteMat);
    pillar.position.set(px, tankY + 1.4, pz);
    scene.add(pillar);
    addBoxCollider(colliders, px, tankY + 1.4, pz, 0.5, 2.8, 0.5);
  });
  const waterTankBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.2, 2.6, 7.2)), darkConcreteMat);
  waterTankBody.position.set(-12, tankY + 4.0, -11);
  scene.add(waterTankBody);

  // Basement Cold Storage Racks & Diesel Generator
  for (let r = 0; r < 3; r++) {
    const rack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 2.1, 0.7)), steelMat);
    rack.position.set(-3.5 + r * 3.8, FLOOR_Y.B1 + 1.05, -14.0);
    scene.add(rack);
    addBoxCollider(colliders, -3.5 + r * 3.8, FLOOR_Y.B1 + 1.05, -14.0, 3.2, 2.1, 0.7);
  }
  const genBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.8, 1.5, 1.4)), trackMat(new THREE.MeshStandardMaterial({ color: 0x3b4d38, roughness: 0.65, metalness: 0.45 })));
  genBody.position.set(2.5, FLOOR_Y.B1 + 0.75, 11.0);
  scene.add(genBody);
  addBoxCollider(colliders, 2.5, FLOOR_Y.B1 + 0.75, 11.0, 2.8, 1.5, 1.4);

  // Hiding Spot Visual Curtains & Wardrobes (where not already spawned)
  for (const h of HIDE_SPOTS) {
    const y = FLOOR_Y[h.floor];
    if (h.type === 'curtain') {
      const curtain = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.15, 2.6, 2.2)), curtainMat);
      curtain.position.set(h.x, y + 1.3, h.z);
      scene.add(curtain);
    } else if (h.type === 'wardrobe' && h.id !== 'hide_f2_r13_wardrobe') {
      createWardrobe(h.x, y, h.z, h.facingAngle);
    } else if (h.type === 'storeroom') {
      const crate = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 1.1, 1.1)), sheeshamMat);
      crate.position.set(h.x, y + 0.55, h.z);
      scene.add(crate);
    }
  }

  // ============ 8. INTERACTABLE PROPS (PHONES, FOOD, KEYS, DIARIES, PANELS) ============
  let foodClocheGroup: THREE.Group | null = null;
  let foodMeatGroup: THREE.Group | null = null;

  for (const item of INTERACTABLES) {
    const y = FLOOR_Y[item.floor] + item.yOffset;
    const g = new THREE.Group();
    g.position.set(item.x, y, item.z);

    if (item.id === 'int_entrance_bell') {
      const plate = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.24, 0.04)), sheeshamMat);
      const bell = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.09, 0.09, 12)), brassMat);
      bell.rotation.x = Math.PI / 2;
      bell.position.z = 0.05;
      const glow = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.025, 8, 8)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xffc864, emissive: 0xffaa33, emissiveIntensity: 1.4 }))
      );
      glow.position.set(0, -0.07, 0.04);
      g.add(plate, bell, glow);
    } else if (item.kind === 'food_tray') {
      // Bright porcelain dinner plate + unmistakable raw meat & bone + liftable silver cloche
      const plateMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xebe6dd, roughness: 0.28, metalness: 0.08 }));
      const plate = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.26, 0.2, 0.028, 22)), plateMat);
      const plateInner = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.2, 0.2, 0.008, 20)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0xd8cfc2, roughness: 0.35 }))
      );
      plateInner.position.y = 0.015;

      const meat = new THREE.Group();
      const rawMeatMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x8d1118, roughness: 0.24, metalness: 0.1 }));
      const darkMeatMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5c0a0f, roughness: 0.3, metalness: 0.08 }));
      const fatMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe2b6b0, roughness: 0.38 }));
      const boneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf4ecdc, roughness: 0.45 }));

      // Crimson meat juice pool on plate
      const juicePool = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.145, 0.155, 0.006, 18)),
        trackMat(new THREE.MeshStandardMaterial({ color: 0x62080d, roughness: 0.14, metalness: 0.12 }))
      );
      juicePool.position.y = 0.021;

      // Main raw meat steak/cut slab
      const slab1 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.092, 12, 10)), rawMeatMat);
      slab1.scale.set(1.25, 0.48, 0.92);
      slab1.position.set(-0.02, 0.048, 0.01);

      const slab2 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.068, 10, 8)), darkMeatMat);
      slab2.scale.set(1.15, 0.44, 0.85);
      slab2.position.set(0.055, 0.042, -0.025);

      // Visible bone & fat marbling strips so it immediately reads as raw meat!
      const bone = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.016, 0.02, 0.095, 10)), boneMat);
      bone.rotation.z = Math.PI * 0.44;
      bone.rotation.y = 0.35;
      bone.position.set(-0.055, 0.055, 0.03);

      const fatStreak = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.085, 0.012, 0.022)), fatMat);
      fatStreak.position.set(0.01, 0.072, 0.015);
      fatStreak.rotation.y = -0.3;

      meat.add(juicePool, slab1, slab2, bone, fatStreak);
      foodMeatGroup = meat;

      const cloche = new THREE.Group();
      const dome = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)),
        steelMat
      );
      const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.2, 0.012, 8, 24)), steelMat);
      rim.rotation.x = Math.PI / 2;
      const knob = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.03, 10, 10)), brassMat);
      knob.position.y = 0.21;
      cloche.add(dome, rim, knob);
      cloche.visible = false; // Appears once Kavita delivers food in Mission 5!
      foodClocheGroup = cloche;

      g.add(plate, plateInner, meat, cloche);
      meat.visible = false;
      plate.visible = false;
      plateInner.visible = false;
    } else if (item.kind === 'telephone') {
      const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.26, 0.12, 0.24)), trackMat(new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.3 })));
      const dial = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 14)), brassMat);
      dial.position.set(0, 0.065, 0.03);
      dial.rotation.x = 0.35;
      const handset = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.05, 0.07)), trackMat(new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.25 })));
      handset.position.set(0, 0.11, -0.04);
      g.add(base, dial, handset);
    } else if (item.kind === 'register') {
      const book = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.06, 0.34)), trackMat(new THREE.MeshStandardMaterial({ color: 0x5c181d, roughness: 0.85 })));
      const pages = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.07, 0.3)), trackMat(new THREE.MeshStandardMaterial({ color: 0xe3d5b8, roughness: 0.9 })));
      const bell = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.09, 0.07, 14)), brassMat);
      bell.position.set(0.38, 0.035, 0);
      g.add(book, pages, bell);
    } else if (item.kind === 'lift_panel' || item.kind === 'exit_terminal') {
      const box = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.34, 0.08)), steelMat);
      const led = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.12, 0.08, 0.09)),
        trackMat(new THREE.MeshStandardMaterial({ color: item.kind === 'exit_terminal' ? 0xd93838 : 0xe3a832, emissive: item.kind === 'exit_terminal' ? 0xb32424 : 0xc48b21, emissiveIntensity: 1.2 }))
      );
      led.position.y = 0.06;
      g.add(box, led);
    } else if (item.kind === 'battery') {
      const cell = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10)), trackMat(new THREE.MeshStandardMaterial({ color: 0xd9941e, emissive: 0x6b4506, emissiveIntensity: 0.8, roughness: 0.3 })));
      g.add(cell);
    } else if (item.kind === 'lore' || item.kind === 'store_clue') {
      const note = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.02, 0.22)), trackMat(new THREE.MeshStandardMaterial({ color: 0xe6dac1, emissive: 0x3b3222, emissiveIntensity: 0.45, roughness: 0.9 })));
      g.add(note);
      if (item.kind === 'store_clue') {
        const seal = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.025, 10)), trackMat(new THREE.MeshStandardMaterial({ color: 0xa11622, emissive: 0x5c0a12, emissiveIntensity: 0.6 })));
        seal.position.set(0.06, 0.015, 0.04);
        g.add(seal);
      }
    } else if (item.kind === 'office_drawer') {
      const pull = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.04, 0.04)), brassMat);
      const paperEdge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.015, 0.16)), trackMat(new THREE.MeshStandardMaterial({ color: 0xefe4ca, emissive: 0x6b562e, emissiveIntensity: 0.6 })));
      paperEdge.position.set(0, 0.02, 0.06);
      g.add(pull, paperEdge);
    } else if (item.puzzleType === 'kitchen_vessels') {
      const copperMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xc26e3c, emissive: 0x4a240f, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.75 }));
      const pot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 12, 10)), copperMat);
      pot.scale.set(1, 0.85, 1);
      pot.position.set(-0.16, 0.02, 0);
      const spiceBox = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 14)), brassMat);
      spiceBox.position.set(0.14, 0.0, 0.04);
      const tawa = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16)), darkConcreteMat);
      tawa.position.set(0.02, -0.02, -0.14);
      g.add(pot, spiceBox, tawa);
    } else if (item.puzzleType === 'kitchen_almirah') {
      const dialPlate = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.22, 0.04)), brassMat);
      const glowDot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.024, 8, 8)), trackMat(new THREE.MeshStandardMaterial({ color: 0xffd066, emissive: 0xffaa22, emissiveIntensity: 1.4 })));
      glowDot.position.z = 0.025;
      g.add(dialPlate, glowDot);
    } else if (item.puzzleType === 'main_door_key_box') {
      const lockBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.16, 0.26)), sheeshamMat);
      const clasp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.1, 0.03)), brassMat);
      clasp.position.set(0, 0, 0.135);
      const gleam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.02, 0.2)), brassMat);
      gleam.position.y = 0.085;
      g.add(lockBox, clasp, gleam);
    } else if (item.id === 'int_key_room13' || item.kind === 'kavita_counter' || item.kind === 'sleep_bed') {
      // Invisible proximity anchor (visible mesh lives on Kavita's hand or the bed model itself)
      const anchor = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.02, 6, 6)),
        trackMat(new THREE.MeshBasicMaterial({ visible: false }))
      );
      g.add(anchor);
    } else {
      // Glowing collectible / key / diary / device highlight
      const isKey = item.itemId?.startsWith('key_');
      const color = isKey ? 0xebba46 : item.itemId?.startsWith('card_') ? 0x4aa8d8 : 0xd65c42;
      const obj = new THREE.Mesh(
        trackGeo(isKey ? new THREE.TorusGeometry(0.095, 0.022, 8, 14) : new THREE.BoxGeometry(0.28, 0.11, 0.22)),
        trackMat(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.85, roughness: 0.35, metalness: 0.55 }))
      );
      g.add(obj);
    }

    scene.add(g);
    interactables.set(item.id, g);
  }

  // ============ 9. ARCHITECTURAL CEILING & CORRIDOR & STAIRWELL LAMP FIXTURES ============
  const lampCoords: { x: number; floor: FloorId; z: number; flickers?: boolean; yCustom?: number }[] = [
    { x: 0, floor: 'G', z: 12.5 },
    { x: -13, floor: 'G', z: 12 },
    { x: 13, floor: 'G', z: 12 },
    { x: 0, floor: 'G', z: 4, flickers: true },
    { x: -2, floor: 'G', z: -12 },
    { x: 9, floor: 'G', z: -2 },
    { x: 16.8, floor: 'G', z: 5.8 },
    { x: 17.0, floor: 'G', z: -6.5, yCustom: 5.1 }, // Mid-landing G->1
    { x: -17.0, floor: 'G', z: -4.5 }, // Basement staircase entry
    { x: 0, floor: '1', z: 0, flickers: true },
    { x: -12, floor: '1', z: 0 },
    { x: 4, floor: '1', z: -10 },
    { x: 16.8, floor: '1', z: 5.8 }, // Floor 1 stairwell landing
    { x: 17.0, floor: '1', z: -6.5, yCustom: 9.1 }, // Mid-landing 1->2
    { x: 0, floor: '2', z: 0, flickers: true },
    { x: -3, floor: '2', z: -10, flickers: true },
    { x: 4, floor: '2', z: -14 },
    { x: 16.8, floor: '2', z: 5.8 }, // Floor 2 stairwell landing
    { x: 17.0, floor: '2', z: -6.5, yCustom: 13.1 }, // Mid-landing 2->3
    { x: 0, floor: '3', z: 0 },
    { x: -7.5, floor: '3', z: 10 },
    { x: 10.5, floor: '3', z: -10 },
    { x: 16.8, floor: '3', z: 5.8 }, // Floor 3 stairwell landing
    { x: 17.0, floor: '3', z: -6.5, yCustom: 17.1 }, // Mid-landing 3->4
    { x: 16.8, floor: '4', z: 5.8 }, // Floor 4 mumty landing
    { x: -12, floor: 'B1', z: 0, flickers: true },
    { x: -1, floor: 'B1', z: -10 },
    { x: 0, floor: 'B1', z: 10 },
    { x: -12.25, floor: 'B1', z: -23 },
    { x: 3.75, floor: '4', z: 13 },
    { x: -17.8, floor: 'G', z: -14.0, flickers: true },
  ];

  for (const lc of lampCoords) {
    const y = lc.yCustom ?? FLOOR_Y[lc.floor] + 3.45;
    const bulbMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffdf9e,
        emissive: 0xff9f38,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      })
    );
    const bulbMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.14, 10, 10)), bulbMat);
    bulbMesh.position.set(lc.x, y, lc.z);
    const shade = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.32, 0.2, 12, 1, true)), brassMat);
    shade.position.set(lc.x, y + 0.08, lc.z);
    scene.add(bulbMesh, shade);

    lamps.push({
      x: lc.x,
      y: y - 0.15,
      z: lc.z,
      floor: lc.floor,
      color: 0xffa852,
      bulbMesh,
      bulbMat,
      baseEmissive: 0.95,
      flickers: Boolean(lc.flickers),
    });
  }

  // ============ 10. POURING RAIN PARTICLE SYSTEM ============
  const rainCount = quality === 'high' ? 1600 : quality === 'medium' ? 950 : 450;
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 44;
    rainPositions[i * 3 + 1] = Math.random() * 24;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 44;
  }
  const rainGeo = trackGeo(new THREE.BufferGeometry());
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = trackMat(
    new THREE.PointsMaterial({
      color: 0xa3b8d4,
      size: 0.12,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  const rainSystem = new THREE.Points(rainGeo, rainMat);
  rainSystem.frustumCulled = false;
  scene.add(rainSystem);

  return {
    colliders,
    doors,
    interactables,
    foodClocheGroup,
    foodMeatGroup,
    liftCab,
    lamps,
    ceilingFans,
    rainSystem,
    rainPositions,
    signBoardMat,
    watchWindowLightMat,
    carHazardMat,
    carSteamGroup,
    skyBackdrop,
    windowGlassMats,
    cctvScreens,
    dispose: () => {
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
    },
  };
}
