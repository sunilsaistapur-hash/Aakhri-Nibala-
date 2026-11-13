import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  DOORS,
  FLOOR_Y,
  HIDE_SPOTS,
  INTERACTABLES,
  STAIR_RAMPS,
  WAYPOINTS,
  findRoomAt,
} from '../data/buildingLayout';
import { INVENTORY_ITEMS, LORE_NOTES } from '../data/loreAndItems';
import { MISSIONS } from '../data/missions';
import {
  FloorId,
  GraphicsQuality,
  HUDState,
  InventoryItemId,
  KavitaState,
  PuzzleType,
  SaveSlotData,
} from '../types/game';
import { HorrorAudioEngine } from './audioEngine';
import { KavitaModelRig, createKavitaModel } from './kavitaModel';
import { ProceduralTextureLibrary } from './proceduralTextures';
import { BuiltWorld, buildRestaurantWorld } from './worldBuilder';

export interface EngineCallbacks {
  onHudUpdate: (hud: HUDState) => void;
  onInventoryChange: (items: InventoryItemId[]) => void;
  onLoreCollected: (loreIds: string[]) => void;
  onOpenPuzzle: (puzzle: PuzzleType, context?: string) => void;
  onOpenLoreModal: (loreId: string) => void;
  onOpenLiftModal: () => void;
  onMissionComplete: (completedId: number, nextId: number) => void;
  onSaveCheckpoint: (data: SaveSlotData) => void;
  onPlayerCaught: (reason?: 'caught' | 'wrong_answers') => void;
  onEscapeEnding: (playTimeSeconds: number) => void;
  onPauseRequest: () => void;
  onToggleInventory: () => void;
  onToggleMap: () => void;
}

// Module-scope reusable math helpers (zero GC in loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camLook = new THREE.Vector3();

const CCTV_CAMERAS: { label: string; pos: [number, number, number]; target: [number, number, number] }[] = [
  { label: 'कैमरा 01 · मुख्य लॉबी व रिसेप्शन', pos: [6.8, 3.2, 16.5], target: [0, 1.0, 10.5] },
  { label: 'कैमरा 02 · भोजन करने का हॉल', pos: [-18.5, 3.2, 16.5], target: [-11, 1.0, 10] },
  { label: 'कैमरा 03 · भूतल गलियारा व रसोई द्वार', pos: [6.2, 3.2, 5.2], target: [-6, 1.0, 1.0] },
  { label: 'कैमरा 04 · दूसरी मंजिल (कमरा नं. 13)', pos: [9.0, 11.2, 1.4], target: [-4, 9.0, -1.0] },
];

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private audio: HorrorAudioEngine;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private textures!: ProceduralTextureLibrary;
  private world!: BuiltWorld;
  private kavita!: KavitaModelRig;
  private isSoftwareGl = false;

  // Lighting Pool
  private hemiLight!: THREE.HemisphereLight;
  private moonLight!: THREE.DirectionalLight;
  private flashlight!: THREE.SpotLight;
  private pointLightPool: THREE.PointLight[] = [];
  private lightningTimer = 7.0;
  private lightningFlash = 0;

  // Loop state
  private frameId = 0;
  private disposed = false;
  private paused = false;
  private quality: GraphicsQuality = 'medium';
  private elapsedTotal = 0;
  private lastTimestamp = 0;

  // Player Physics & Camera
  private playerPos = new THREE.Vector3(0, 0, 32.5);
  private playerVelY = 0;
  private yaw = 0; // 0 looks toward -Z (north toward restaurant entrance!)
  private pitch = 0;
  private camHeight = 1.65;
  private stamina = 100;
  private battery = 100;
  private flashlightOn = true;
  private isCrouching = false;
  private isGrounded = true;
  private isHiding = false;
  private currentHideId: string | null = null;
  private preHidePos = new THREE.Vector3();
  private isPeepholeActive = false;

  // Input State
  private keys = new Set<string>();
  private touchMove = { x: 0, y: 0 };
  private touchSprinting = false;
  private pointerDragging = false;
  private lastPointer = { x: 0, y: 0 };
  private noiseEmitLevel = 0;

  // Game Progression State
  private currentMission = 1;
  private inventory = new Set<InventoryItemId>();
  private collectedLore = new Set<string>();
  private unlockedDoors = new Set<string>();
  private solvedPuzzles = new Set<string>();
  private openedInteractables = new Set<string>();
  private powerRestored = false;
  private generatorRunning = false;
  private secretTunnelFound = false;
  private room13FoodDelivered = false;
  private room13FoodInspected = false;
  private room13PhoneAnswered = false;
  private room13DoorJammed = false;
  private emergencyExitUnlocked = false;
  private complaintDone = false;
  private nightmareDone = false;
  private knockPending = false;
  private knockSceneDone = false;
  private hungryReady = false;
  private hungerTalkDone = false;
  private escapeActive = false;
  private kitchenSecretOpened = false;
  private kitchenAlmirahOpened = false;
  private suspicionLevel = 0;
  private wrongDialogueCount = 0;
  private suspicionChaseActive = false;
  private entranceBellRung = false;
  private clockMinutes = 1425; // रात 11:45
  private dayNumber = 1;
  private dialogueCount = 0;
  private finalQuestionAsked = false;
  private lobbyDialogueCooldown = 0;
  private wasSeenInLobbyZone = false;
  private lobbyAutoWaitTimer = 0;
  private playTimeSeconds = 0;

  // Elevator state
  private liftFloor: FloorId = 'G';
  private liftTargetY = 0;
  private liftMoving = false;

  // Subtitles & Prompts
  private subtitle: { speaker: string; text: string } | null = null;
  private subtitleTimer = 0;
  private nearbyTarget: { type: 'door' | 'interactable' | 'hide' | 'peephole'; id: string; prompt: string; secondary?: string } | null = null;

  // Kavita AI State
  private kavitaState: KavitaState = 'waiting_lobby';
  private kavitaPos = new THREE.Vector3(0, 0, 11.15);
  private kavitaYaw = 0;
  private kavitaWaypointIdx = 0;
  private kavitaTargetPos = new THREE.Vector3(0, 0, 11.15);
  private kavitaStateTimer = 0;
  private kavitaThreat = 0;
  private foodKnockScheduled = false;
  private foodKnockTimer = 0;
  private foodDeliveryTimer = 0;
  private caughtCooldown = 0;
  private jumpScareMode: 'caught' | 'wrong_answers' = 'caught';
  private jumpScareDelivered = false;

  // CCTV / Cutscene / Ending overrides
  private cctvActiveCam: number | null = null;
  private cutscenePhase: 'none' | 'car_intro' | 'food_reveal' | 'nightmare' | 'sleep_next_day' | 'sleep_rest' | 'jumpscare_kill' = 'none';
  private cutsceneTimer = 0;
  private cutsceneFlags = {
    sleepingSpoken: false,
    dreamStarted: false,
    dreamChokeSpoken: false,
    morningTransitionDone: false,
    carSpoken: false,
    engineStallSpoken: false,
    headlightsOffSpoken: false,
    foodOpenSpoken: false,
    foodMeatSpoken: false,
    foodCompleteDone: false,
  };
  private eyelidClose = 0;
  private nightmareLightsApplied = false;
  private endingPhase = false;
  private endingTimer = 0;

  // Throttled React HUD sync
  private hudSyncTimer = 0;
  private pendingTimeouts: number[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private contextLostHandler = (e: Event) => {
    e.preventDefault();
  };

  constructor(
    container: HTMLElement,
    callbacks: EngineCallbacks,
    audio: HorrorAudioEngine,
    initialQuality: GraphicsQuality,
    initialSave?: SaveSlotData | null
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.audio = audio;
    this.quality = initialQuality;

    this.initRendererAndScene();
    if (initialSave) {
      this.applySaveData(initialSave);
    } else {
      // Launch directly onto playable Mission 1 entrance screen matching gameplay layout
      this.startEntranceOpening();
    }
    this.bindInputs();
    this.startLoop();
  }

  private scheduleTimer(fn: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      this.pendingTimeouts = this.pendingTimeouts.filter((t) => t !== id);
      if (!this.disposed) fn();
    }, ms);
    this.pendingTimeouts.push(id);
  }

  private detectSoftwareGl(): boolean {
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private initRendererAndScene(): void {
    this.isSoftwareGl = this.detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.quality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.applyQualitySettings(this.quality);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLostHandler);
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080f);
    this.scene.fog = new THREE.FogExp2(0x06080f, 0.032);

    this.camera = new THREE.PerspectiveCamera(72, w / h, 0.12, 160);
    this.camera.rotation.order = 'YXZ';

    // Mandatory studio environment map for metallic brass/steel PBR surfaces
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Balanced horror lighting (warm interior fixtures vs cool stormy moonlight)
    this.hemiLight = new THREE.HemisphereLight(0x465c7a, 0x261d17, 0.42);
    this.scene.add(this.hemiLight);

    this.moonLight = new THREE.DirectionalLight(0x7d9cc4, 0.55);
    this.moonLight.position.set(18, 32, 22);
    this.scene.add(this.moonLight);

    // Player Flashlight
    this.flashlight = new THREE.SpotLight(0xffe9c2, 3.2, 24, Math.PI / 5.2, 0.55, 1.5);
    this.flashlight.castShadow = !this.isSoftwareGl && this.quality !== 'low';
    this.flashlight.shadow.mapSize.width = 1024;
    this.flashlight.shadow.mapSize.height = 1024;
    this.flashlight.shadow.bias = -0.0005;
    this.flashlight.shadow.normalBias = 0.02;
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlight.target);

    // Pooled PointLights (6 active lights relocated dynamically to nearest lamps)
    for (let i = 0; i < 6; i++) {
      const pl = new THREE.PointLight(0xffa852, 1.2, 13, 1.7);
      this.scene.add(pl);
      this.pointLightPool.push(pl);
    }

    this.textures = new ProceduralTextureLibrary(this.renderer);
    this.world = buildRestaurantWorld(this.scene, this.textures, this.quality);

    this.kavita = createKavitaModel();
    this.kavita.root.position.copy(this.kavitaPos);
    this.scene.add(this.kavita.root);
    this.applyTimeOfDayLighting();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public applyQualitySettings(q: GraphicsQuality): void {
    this.quality = q;
    if (!this.renderer) return;
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
    } else {
      const maxDpr = q === 'high' ? 2.0 : q === 'medium' ? 1.25 : 0.85;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      this.renderer.shadowMap.enabled = q !== 'low';
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (this.flashlight) {
        this.flashlight.castShadow = q !== 'low';
      }
    }
  }

  public setPaused(p: boolean): void {
    this.paused = p;
    if (p && document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
  }

  public setTouchMovement(x: number, y: number, sprinting: boolean): void {
    this.audio.init();
    this.touchMove.x = x;
    this.touchMove.y = y;
    this.touchSprinting = sprinting;
  }

  public addTouchLookDelta(dx: number, dy: number): void {
    if (this.paused || this.isPeepholeActive || this.endingPhase || this.cutscenePhase !== 'none') return;
    this.audio.init();
    this.yaw -= dx * 0.0045;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0045, -1.25, 1.25);
  }

  public triggerMobileAction(action: 'interact' | 'peephole' | 'flashlight' | 'crouch' | 'jump'): void {
    if (this.paused || this.cutscenePhase !== 'none' || this.endingPhase) return;
    this.audio.init();
    if (action === 'interact') this.handleInteract();
    else if (action === 'peephole') this.togglePeephole();
    else if (action === 'flashlight') this.toggleFlashlight();
    else if (action === 'crouch') this.isCrouching = !this.isCrouching;
    else if (action === 'jump') this.tryJump();
  }

  public toggleFlashlight(): void {
    if (this.battery <= 0 && !this.flashlightOn) {
      this.setSubtitle('आरव कुमार', 'टॉर्च की बैटरी खत्म हो चुकी है! कमरों में नई बैटरी खोजें।', 3);
      return;
    }
    this.flashlightOn = !this.flashlightOn;
    this.audio.playSwitchClick();
  }

  private tryJump(): void {
    if (this.isGrounded && !this.isHiding && !this.isPeepholeActive && !this.isCrouching) {
      this.playerVelY = 5.1;
      this.isGrounded = false;
    }
  }

  public setCctvCamera(camIdx: number | null): void {
    this.cctvActiveCam = camIdx;
    // During Mission 12, move Kavita visibly into Ground Corridor camera view!
    if (camIdx !== null && this.currentMission === 12) {
      this.kavitaPos.set(-5.0, 0.0, 1.0);
      this.kavita.root.visible = true;
    }
  }

  public getPlayerCoords(): { floor: FloorId; x: number; z: number } {
    return {
      floor: this.getFloorFromY(this.playerPos.y),
      x: this.playerPos.x,
      z: this.playerPos.z,
    };
  }

  public completeExternalPuzzle(puzzle: PuzzleType, payload?: string): void {
    this.solvedPuzzles.add(puzzle);
    this.audio.playPickup();

    if (puzzle === 'register') {
      if (this.currentMission === 2) {
        this.advanceMission(2);
      }
      if (this.currentMission === 3) {
        this.advanceMission(3);
      } else if (this.currentMission < 4) {
        this.currentMission = 4;
        this.callbacks.onMissionComplete(3, 4);
        this.triggerCheckpointSave();
      }
      this.kavitaState = 'waiting_lobby';
      this.kavita.setTrayVisible(false);
      this.kavita.setOfferKeyMode(true);
      this.kavitaPos.set(0, 0, 11.48);
      this.kavita.root.position.copy(this.kavitaPos);
      this.kavita.root.visible = true;
      const keyOfferLine = 'यह लीजिए अपना रूम नंबर तेरह का चाबी... मेरे हाथ से ले लीजिए।';
      this.setSubtitle('कविता', keyOfferLine, 7.5);
      this.audio.speakScaryWoman(keyOfferLine);
    } else if (puzzle === 'food_inspect') {
      this.room13FoodInspected = true;
      this.room13DoorJammed = false;
      if (this.world.foodClocheGroup) this.world.foodClocheGroup.position.y = 0.22;
      if (this.world.foodClocheGroup) this.world.foodClocheGroup.position.x = 0.35;
      const r13Door = this.world.doors.get('door_f2_r13');
      if (r13Door) {
        r13Door.isOpen = true;
        r13Door.targetAngle = Math.PI * 0.48;
      }
      this.kavitaState = 'waiting_lobby';
      this.kavita.setTrayVisible(false);
      this.kavita.setOfferKeyMode(false);
      this.kavitaPos.set(0, 0, 11.15);
      this.kavita.root.position.copy(this.kavitaPos);
      this.kavita.root.visible = true;
      this.audio.playHorrorSting();
      this.advanceMission(6);
      const line = 'अरे! मेरे खाने में पता नहीं कैसे मांस चला गया... मैं यह नहीं खाऊँगा! नीचे जाकर काउंटर वाली लड़की से शिकायत करता हूँ।';
      this.setSubtitle('आरव कुमार', line, 6.5);
      this.audio.speakPlayerMale(line);
    } else if (puzzle === 'chudail_dialogue') {
      try {
        const parsed = JSON.parse(payload || '{}') as {
          suspicionDelta?: number;
          replyText?: string;
          isWrong?: boolean;
        };
        const delta = typeof parsed.suspicionDelta === 'number' ? parsed.suspicionDelta : 5;
        const isWrong = Boolean(parsed.isWrong || delta >= 25);
        if (isWrong) {
          this.wrongDialogueCount += 1;
          this.audio.playHorrorSting();
        }
        this.suspicionLevel = THREE.MathUtils.clamp(this.suspicionLevel + delta, 0, 100);
        const reply = parsed.replyText || 'ठीक है सर... पर ज्यादा घूमिए मत।';
        if (this.suspicionLevel >= 100 || (isWrong && this.wrongDialogueCount >= 3)) {
          this.startChudailKillJumpscare('wrong_answers');
        } else if (isWrong) {
          this.setSubtitle(
            'चेतावनी · चुड़ैल का शक बढ़ गया!',
            `शक स्तर: ${Math.round(this.suspicionLevel)}% (${this.wrongDialogueCount}/3 गलत जवाब) — अगली बार सावधान रहें!`,
            5.5
          );
        } else {
          this.setSubtitle('कविता (काउंटर वाली चुड़ैल)', reply, 5.2);
        }
      } catch {
        this.suspicionLevel = THREE.MathUtils.clamp(this.suspicionLevel + 5, 0, 100);
      }
    } else if (puzzle === 'telephone') {
      this.room13PhoneAnswered = true;
      this.setSubtitle('अज्ञात आवाज', 'यह रेस्टोरेंट सुरक्षित नहीं है... रसोई और पुराने ऑफिस में मेन डोर की असली चाबी का सुराग छिपा है!', 5.2);
    } else if (puzzle === 'cctv_system') {
      this.setCctvCamera(null);
      this.setSubtitle('आरव कुमार', 'कैमरे देख लिए! अब मिली चाबी से भूतल के पूर्वी "पुराना स्टोर रूम" को खोलकर बक्सों में सुराग ढूँढ़ना होगा।', 5.5);
      this.advanceMission(12);
    } else if (puzzle === 'keypad_kavita') {
      this.unlockDoor('door_f3_kavita');
      this.setSubtitle('आरव कुमार', 'ताला खुल गया! अंदर जाकर मालिक के कार्यालय की चाबी खोजें।', 4.5);
    } else if (puzzle === 'keypad_owner_safe') {
      this.grantItem('key_basement');
      this.grantItem('letter_owner');
      this.collectLore('lore_owner_letter');
      this.callbacks.onOpenLoreModal('lore_owner_letter');
      if (this.inventory.has('note_office_drawer')) {
        this.setSubtitle('आरव कुमार', 'तिजोरी से बेसमेंट की चाबी और मालिक का पत्र मिल गया! अब नीचे तहखाने की ओर जाँच करें।', 5.5);
        this.advanceMission(17);
      } else {
        this.setSubtitle('आरव कुमार', 'बेसमेंट की चाबी मिल गई! अब पास रखी मेज की दराज खोलकर गुप्त नोट भी पढ़ लें।', 5.2);
      }
    } else if (puzzle === 'keypad_room13_secret') {
      this.unlockDoor('door_f2_r13_secret');
      this.setSubtitle('आरव कुमार', 'अलमारी के पीछे गुप्त दरवाजा खुल गया! अंदर जाकर कमरा 13 का गुप्त रिकॉर्ड लें।', 5.0);
    } else if (puzzle === 'wiring') {
      this.setSubtitle('आरव कुमार', 'सारे बिजली के तार सही जुड़ गए! अब पास के डीजल जनरेटर को चालू करना होगा।', 5.0);
    } else if (puzzle === 'generator') {
      this.generatorRunning = true;
      this.powerRestored = true;
      this.setSubtitle('आरव कुमार', 'बिजली चालू हो गई! अब नीचे भूतल की पुरानी रसोई में जाकर गुप्त कमरे का रास्ता खोलो!', 5.8);
      this.advanceMission(21);
      this.triggerCheckpointSave();
    } else if (puzzle === 'kitchen_vessels') {
      this.kitchenSecretOpened = true;
      this.unlockDoor('door_g_kitchen_secret');
      this.openedInteractables.add('int_g_kitchen_puzzle1');
      const m = this.world.interactables.get('int_g_kitchen_puzzle1');
      if (m) m.visible = false;
      this.setSubtitle('आरव कुमार', 'पहली पहेली हल हो गई! पुरानी रसोई के पश्चिम की गुप्त दीवार खुल गई — अंदर गुप्त कमरे में जाएँ।', 5.5);
      this.advanceMission(22);
    } else if (puzzle === 'kitchen_almirah') {
      this.kitchenAlmirahOpened = true;
      this.openedInteractables.add('int_g_kitchen_almirah');
      const m = this.world.interactables.get('int_g_kitchen_almirah');
      if (m) m.visible = false;
      this.setSubtitle('आरव कुमार', 'दूसरी पहेली हल! लोहे की अलमारी खुल गई — अब पास रखे अंतिम सुरक्षा बक्से से मेन डोर की चाबी निकालें!', 5.5);
      this.advanceMission(23);
    } else if (puzzle === 'main_door_key_box') {
      this.grantItem('key_main_door');
      this.openedInteractables.add('int_g_kitchen_keybox');
      const m = this.world.interactables.get('int_g_kitchen_keybox');
      if (m) m.visible = false;
      this.setSubtitle('आरव कुमार', 'मेन डोर की असली चाबी मिल गई! अब चुपचाप रिसेप्शन लॉबी से होते हुए मुख्य प्रवेश द्वार तक पहुँचना है!', 6.0);
      this.advanceMission(24);
    } else if (puzzle === 'library_puzzle') {
      this.grantItem('key_small_iron');
      this.setSubtitle('आरव कुमार', 'किताबें सही क्रम में लग गईं! गुप्त दराज से लोहे की छोटी चाबी मिल गई (पीछे बंद किचन खोलने के लिए)।', 5.5);
      this.advanceMission(5);
    } else if (puzzle === 'secret_symbols_wall') {
      this.unlockDoor('door_g_basement');
      this.setSubtitle('आरव कुमार', 'दीवार के तीनों प्रतीक दबते ही बेसमेंट में जाने वाली गुप्त सीढ़ियाँ खुल गईं!', 5.0);
      this.advanceMission(7);
    } else if (puzzle === 'godown_box') {
      this.grantItem('key_godown_chest');
      this.setSubtitle('आरव कुमार', 'कोड 358 से बक्सा खुल गया! अंदर से सुरक्षा कैबिनेट की छोटी चाबी मिल गई।', 5.0);
      this.advanceMission(10);
    } else if (puzzle === 'cabinet_lock') {
      this.grantItem('key_main_door');
      this.setSubtitle('आरव कुमार', 'कैबिनेट खुल गया! मेन डोर की असली चाबी मिल गई (इलेक्ट्रॉनिक लॉक बंद करने के लिए कंट्रोल रूम का कोड चाहिए)।', 5.5);
      this.advanceMission(12);
    } else if (puzzle === 'electronic_keypad') {
      this.grantItem('code_electronic_lock');
      this.setSubtitle('आरव कुमार', 'कोड 9274 स्वीकार! मेन डोर का इलेक्ट्रॉनिक लॉक पूरी तरह निष्क्रिय हो गया!', 5.5);
      this.advanceMission(13);
    } else if (puzzle === 'service_corridor_symbols') {
      this.setSubtitle('आरव कुमार', 'चारों प्रतीक मिल गए! सर्विस कॉरिडोर का भारी दरवाजा खुल गया!', 5.0);
      this.advanceMission(15);
    } else if (puzzle === 'alarm_computer') {
      this.setSubtitle('अलार्म सिस्टम', 'लाल इमरजेंसी लाइटें चालू! अलार्म सक्रिय हो गया — जल्दी अंतिम निकास की ओर बढ़ें!', 5.5);
      this.advanceMission(18);
    } else if (puzzle === 'manager_drawer') {
      this.grantItem('key_emergency_master');
      this.setSubtitle('आरव कुमार', 'मैनेजर दराज खुल गई! इमरजेंसी निकास की मुख्य मास्टर चाबी मिल गई!', 5.0);
      this.advanceMission(19);
    } else if (puzzle === 'escape_prep_modal') {
      this.setSubtitle('आरव कुमार', 'तैयारी पूरी! अब सावधानी से बाहर निकलने के रास्ते की ओर बढ़ते हैं।', 4.5);
      this.advanceMission(20);
    } else if (puzzle === 'car_start') {
      this.audio.playPickup();
      this.setSubtitle('आरव कुमार', 'कार स्टार्ट हो गई! तेजी से यहाँ से निकलो!', 4.0);
      this.advanceMission(24);
      this.startEndingSequence();
    } else if (puzzle === 'final_gate') {
      this.unlockDoor('door_final_gate');
      this.setSubtitle('आरव कुमार', 'लोहे का गेट खुल गया! जल्दी बाहर निकलो!', 4.0);
    }
  }

  public speakChudailQuestion(questionText: string): void {
    this.audio.speakScaryWoman(questionText);
  }

  public speakDialogueExchange(playerText: string, chudailReply: string): void {
    this.audio.speakSequence([
      {
        role: 'player',
        text: playerText,
        onStart: () => this.setSubtitle('आरव कुमार', playerText, 4.5),
      },
      {
        role: 'chudail',
        text: chudailReply,
        onStart: () => this.setSubtitle('कविता (काउंटर वाली चुड़ैल)', chudailReply, 5.2),
      },
    ]);
  }

  private formatHindiClock(totalMins: number): string {
    const mins = ((Math.floor(totalMins) % 1440) + 1440) % 1440;
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    let period = 'रात';
    if (h24 >= 4 && h24 < 6) period = 'तड़के';
    else if (h24 >= 6 && h24 < 12) period = 'सुबह';
    else if (h24 >= 12 && h24 < 16) period = 'दोपहर';
    else if (h24 >= 16 && h24 < 20) period = 'शाम';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const mStr = m < 10 ? `0${m}` : `${m}`;
    return `दिन ${this.dayNumber} · ${period} ${h12}:${mStr}`;
  }

  private applyTimeOfDayLighting(): void {
    if (!this.world || !this.scene || !this.hemiLight || !this.moonLight) return;
    if (this.nightmareLightsApplied) {
      (this.world.skyBackdrop.material as THREE.MeshBasicMaterial).color.setHex(0x050102);
      this.scene.background = new THREE.Color(0x050102);
      this.scene.fog = new THREE.FogExp2(0x050102, 0.085);
      this.hemiLight.color.setHex(0x3a070c);
      this.hemiLight.groundColor.setHex(0x140305);
      this.hemiLight.intensity = 0.28;
      this.moonLight.color.setHex(0x6b0f1b);
      this.moonLight.intensity = 0.16;
      return;
    }

    const mins = ((Math.floor(this.clockMinutes) % 1440) + 1440) % 1440;
    const h24 = Math.floor(mins / 60);
    const isDaytime = h24 >= 6 && h24 < 18;

    if (isDaytime) {
      // Misty Overcast Morning / Next Day Inside the Haunted Hotel!
      (this.world.skyBackdrop.material as THREE.MeshBasicMaterial).color.setHex(0x526578);
      this.scene.background = new THREE.Color(0x526578);
      this.scene.fog = new THREE.FogExp2(0x4b5d6f, 0.017);
      this.hemiLight.color.setHex(0x9fb5cb);
      this.hemiLight.groundColor.setHex(0x342820);
      this.hemiLight.intensity = 0.68;
      this.moonLight.color.setHex(0xd8e4f0);
      this.moonLight.intensity = 0.92;
      this.world.windowGlassMats.forEach((m) => {
        m.color.setHex(0x6c8ca6);
        m.emissive.setHex(0x4f6d87);
        m.emissiveIntensity = 0.72;
      });
    } else {
      (this.world.skyBackdrop.material as THREE.MeshBasicMaterial).color.setHex(0x05070d);
      this.scene.background = new THREE.Color(0x06080f);
      this.scene.fog = new THREE.FogExp2(0x06080f, 0.032);
      this.hemiLight.color.setHex(0x465c7a);
      this.hemiLight.groundColor.setHex(0x261d17);
      this.hemiLight.intensity = 0.42;
      this.moonLight.color.setHex(0x7d9cc4);
      this.moonLight.intensity = 0.55;
      this.world.windowGlassMats.forEach((m) => {
        m.color.setHex(0x162230);
        m.emissive.setHex(0x101824);
        m.emissiveIntensity = 0.4;
      });
    }
  }

  public moveLiftToFloor(targetFloor: FloorId): void {
    if (!this.powerRestored) {
      this.setSubtitle('आरव कुमार', 'लिफ्ट बंद है — पहले तहखाने में जाकर बिजली नियंत्रण कक्ष चालू करना होगा।', 4);
      return;
    }
    if (!this.inventory.has('card_lift')) {
      this.setSubtitle('आरव कुमार', 'लिफ्ट चलाने के लिए चौथी मंजिल के लिफ्ट मशीन कक्ष से "लिफ्ट का कार्ड" लाना होगा।', 4.5);
      return;
    }
    this.liftFloor = targetFloor;
    this.liftTargetY = FLOOR_Y[targetFloor];
    this.liftMoving = false;
    this.world.liftCab.position.y = this.liftTargetY;
    this.playerPos.set(-18.0, this.liftTargetY, 3.75);
    this.audio.playSwitchClick();
    this.setSubtitle('लिफ्ट', `${targetFloor === 'B1' ? 'तहखाना' : targetFloor === 'G' ? 'भूतल' : `मंजिल ${targetFloor}`} पर पहुँचे।`, 2.8);
  }

  public getSaveSnapshot(slotId = 'auto'): SaveSlotData {
    const fl = this.getFloorFromY(this.playerPos.y);
    return {
      slotId,
      savedAt: new Date().toLocaleString('hi-IN'),
      currentMission: this.currentMission,
      floor: fl,
      playerPos: { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
      playerYaw: this.yaw,
      inventory: Array.from(this.inventory),
      collectedLore: Array.from(this.collectedLore),
      unlockedDoors: Array.from(this.unlockedDoors),
      solvedPuzzles: Array.from(this.solvedPuzzles),
      openedInteractables: Array.from(this.openedInteractables),
      powerRestored: this.powerRestored,
      generatorRunning: this.generatorRunning,
      secretTunnelFound: this.secretTunnelFound,
      room13FoodDelivered: this.room13FoodDelivered,
      room13FoodInspected: this.room13FoodInspected,
      room13PhoneAnswered: this.room13PhoneAnswered,
      complaintDone: this.complaintDone,
      nightmareDone: this.nightmareDone,
      knockSceneDone: this.knockSceneDone,
      hungerTalkDone: this.hungerTalkDone,
      escapeActive: this.escapeActive,
      kitchenSecretOpened: this.kitchenSecretOpened,
      kitchenAlmirahOpened: this.kitchenAlmirahOpened,
      suspicionLevel: this.suspicionLevel,
      wrongDialogueCount: this.wrongDialogueCount,
      clockMinutes: this.clockMinutes,
      dayNumber: this.dayNumber,
      dialogueCount: this.dialogueCount,
      battery: this.battery,
      playTimeSeconds: Math.floor(this.playTimeSeconds),
    };
  }

  private applySaveData(save: SaveSlotData): void {
    this.currentMission = save.currentMission || 1;
    this.playerPos.set(save.playerPos.x, save.playerPos.y, save.playerPos.z);
    this.yaw = save.playerYaw || 0;
    this.inventory = new Set(save.inventory || []);
    this.collectedLore = new Set(save.collectedLore || []);
    this.unlockedDoors = new Set(save.unlockedDoors || []);
    this.solvedPuzzles = new Set(save.solvedPuzzles || []);
    this.openedInteractables = new Set(save.openedInteractables || []);
    this.openedInteractables.delete('int_entrance_bell');
    this.powerRestored = Boolean(save.powerRestored);
    this.generatorRunning = Boolean(save.generatorRunning);
    this.secretTunnelFound = Boolean(save.secretTunnelFound);
    this.room13FoodDelivered = Boolean(save.room13FoodDelivered);
    this.room13FoodInspected = Boolean(save.room13FoodInspected);
    this.room13PhoneAnswered = Boolean(save.room13PhoneAnswered);
    this.complaintDone = Boolean(save.complaintDone ?? this.currentMission >= 8);
    this.nightmareDone = Boolean(save.nightmareDone ?? this.currentMission >= 9);
    this.knockSceneDone = Boolean(save.knockSceneDone ?? this.currentMission >= 10);
    this.hungryReady = Boolean(this.knockSceneDone && this.currentMission === 9);
    this.hungerTalkDone = Boolean(save.hungerTalkDone ?? this.currentMission >= 10);
    this.escapeActive = Boolean(save.escapeActive ?? this.currentMission >= 10);
    this.kitchenSecretOpened = Boolean(save.kitchenSecretOpened ?? this.currentMission >= 23);
    this.kitchenAlmirahOpened = Boolean(save.kitchenAlmirahOpened ?? this.currentMission >= 24);
    this.suspicionLevel = Math.min(save.suspicionLevel ?? 0, 55);
    this.wrongDialogueCount = Math.min(save.wrongDialogueCount ?? 0, 1);
    this.entranceBellRung = this.currentMission >= 2 || this.unlockedDoors.has('door_main_entrance');
    this.clockMinutes = save.clockMinutes ?? 1425;
    this.dayNumber = save.dayNumber ?? (this.hungerTalkDone ? 2 : 1);
    this.dialogueCount = save.dialogueCount ?? 0;
    this.battery = save.battery ?? 100;
    this.playTimeSeconds = save.playTimeSeconds || 0;

    // Sync world state from save
    this.unlockedDoors.forEach((did) => this.unlockDoor(did, true));
    if (this.kitchenSecretOpened) {
      this.unlockDoor('door_g_kitchen_secret', true);
    }
    this.openedInteractables.forEach((iid) => {
      const m = this.world.interactables.get(iid);
      if (m && !iid.startsWith('lift_') && iid !== 'int_entrance_bell') m.visible = false;
    });
    if (this.room13FoodDelivered) {
      const foodMesh = this.world.interactables.get('int_r13_food');
      foodMesh?.children.forEach((c) => (c.visible = true));
    }
    if (this.room13FoodInspected && this.world.foodClocheGroup) {
      this.world.foodClocheGroup.position.set(0.35, 0.22, 0);
    }
    if (this.currentMission >= 4) {
      this.solvedPuzzles.add('register');
    }
    if (this.currentMission === 4 && this.inventory.has('key_room13')) {
      this.currentMission = 5;
    }

    if (this.currentMission >= 26 && this.unlockedDoors.has('door_main_entrance')) {
      this.kavitaState = 'final_chase';
      this.kavita.setOfferKeyMode(false);
      this.kavitaPos.set(0, 0, 12.8);
    } else if (this.currentMission >= 7 || this.currentMission < 6) {
      // Counter Chudail stands forever behind the Reception Counter!
      this.kavitaState = 'waiting_lobby';
      const offering = this.currentMission === 4 && !this.inventory.has('key_room13');
      this.kavita.setOfferKeyMode(offering);
      this.kavitaPos.set(0, 0, offering ? 11.48 : 11.15);
    }

    if (this.escapeActive && !this.inventory.has('key_main_door')) {
      const mainDoor = this.world.doors.get('door_main_entrance');
      if (mainDoor) {
        mainDoor.isOpen = false;
        mainDoor.targetAngle = 0;
      }
    }

    this.applyTimeOfDayLighting();
    this.callbacks.onInventoryChange(Array.from(this.inventory));
    this.callbacks.onLoreCollected(Array.from(this.collectedLore));
    this.setSubtitle('चेकपॉइंट लोड हुआ', `मिशन ${this.currentMission}: ${MISSIONS[this.currentMission - 1]?.title || ''}`, 4.5);
  }

  private triggerCheckpointSave(): void {
    const snap = this.getSaveSnapshot('auto');
    this.callbacks.onSaveCheckpoint(snap);
  }

  private grantItem(id: InventoryItemId): void {
    if (!this.inventory.has(id)) {
      this.inventory.add(id);
      this.callbacks.onInventoryChange(Array.from(this.inventory));
      this.audio.playPickup();
    }
  }

  private collectLore(loreId: string): void {
    if (!this.collectedLore.has(loreId) && LORE_NOTES[loreId]) {
      this.collectedLore.add(loreId);
      this.callbacks.onLoreCollected(Array.from(this.collectedLore));
    }
  }

  private advanceMission(completedId: number): void {
    if (this.currentMission !== completedId) return;
    const next = Math.min(MISSIONS.length, completedId + 1);
    this.currentMission = next;
    this.callbacks.onMissionComplete(completedId, next);
    if (MISSIONS[completedId - 1]?.checkpointSave) {
      this.triggerCheckpointSave();
    }
  }

  private unlockDoor(doorId: string, silent = false): void {
    this.unlockedDoors.add(doorId);
    const dr = this.world.doors.get(doorId);
    if (dr) {
      dr.isOpen = true;
      dr.targetAngle = Math.PI * 0.48;
      if (!silent) this.audio.playDoorCreak(false);
    }
  }

  private setSubtitle(speaker: string, text: string, duration = 4.0): void {
    this.subtitle = { speaker, text };
    this.subtitleTimer = Math.max(duration, text.length * 0.088 + 1.4);
  }

  // ============ INPUT BINDINGS (KEYBOARD, MOUSE LOCK + DRAG FALLBACK) ============
  private onKeyDown = (e: KeyboardEvent) => {
    this.audio.init();
    if (e.code === 'Escape') {
      if (this.isPeepholeActive) {
        this.isPeepholeActive = false;
        return;
      }
      this.callbacks.onPauseRequest();
      return;
    }
    if (this.paused || this.cutscenePhase !== 'none' || this.endingPhase) return;

    this.keys.add(e.code);

    if (e.code === 'KeyE') {
      e.preventDefault();
      this.handleInteract();
    } else if (e.code === 'KeyP') {
      e.preventDefault();
      this.togglePeephole();
    } else if (e.code === 'KeyF') {
      e.preventDefault();
      this.toggleFlashlight();
    } else if (e.code === 'KeyC' || e.code === 'ControlLeft') {
      this.isCrouching = !this.isCrouching;
    } else if (e.code === 'Space') {
      this.tryJump();
    } else if (e.code === 'Tab' || e.code === 'KeyI') {
      e.preventDefault();
      this.callbacks.onToggleInventory();
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      this.callbacks.onToggleMap();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.paused || this.isPeepholeActive || this.endingPhase || this.cutscenePhase !== 'none') return;
    if (document.pointerLockElement === this.renderer.domElement) {
      this.yaw -= e.movementX * 0.0022;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0022, -1.25, 1.25);
    } else if (this.pointerDragging) {
      const rawDx = e.clientX - this.lastPointer.x;
      const rawDy = e.clientY - this.lastPointer.y;
      this.lastPointer.x = e.clientX;
      this.lastPointer.y = e.clientY;
      const isCssRotated = window.innerHeight > window.innerWidth;
      const dx = isCssRotated ? rawDy : rawDx;
      const dy = isCssRotated ? -rawDx : rawDy;
      this.yaw -= dx * 0.004;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.004, -1.25, 1.25);
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (this.paused || this.endingPhase || this.cutscenePhase !== 'none') return;
    this.audio.init();
    this.pointerDragging = true;
    this.lastPointer.x = e.clientX;
    this.lastPointer.y = e.clientY;
    // Try pointer lock politely, silently ignoring if sandbox iframe disallows it
    try {
      if (document.pointerLockElement !== this.renderer.domElement) {
        const res = this.renderer.domElement.requestPointerLock?.() as unknown as Promise<void> | undefined;
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      }
    } catch {
      // Fallback drag look remains active seamlessly
    }
  };

  private onMouseUp = () => {
    this.pointerDragging = false;
  };

  private onResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private bindInputs(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('resize', this.onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.container);
    }
  }

  private togglePeephole(): void {
    if (this.isPeepholeActive) {
      this.isPeepholeActive = false;
      return;
    }
    const r13Door = this.world.doors.get('door_f2_r13');
    if (!r13Door) return;
    const dist = Math.hypot(this.playerPos.x - r13Door.x, this.playerPos.z - r13Door.z);
    if (dist < 2.6 && Math.abs(this.playerPos.y - r13Door.y) < 1.5 && this.playerPos.z < r13Door.z) {
      this.isPeepholeActive = true;
      this.audio.playSwitchClick();
    }
  }

  // ============ INTERACTION HANDLER ============
  private handleInteract(): void {
    if (this.isHiding) {
      // Exit hiding spot
      this.isHiding = false;
      this.currentHideId = null;
      this.playerPos.copy(this.preHidePos);
      this.audio.playSwitchClick();
      return;
    }

    if (!this.nearbyTarget) return;
    const { type, id } = this.nearbyTarget;

    if (type === 'hide') {
      const spot = HIDE_SPOTS.find((h) => h.id === id);
      if (!spot) return;
      this.preHidePos.copy(this.playerPos);
      this.isHiding = true;
      this.currentHideId = spot.id;
      this.playerPos.set(spot.x, FLOOR_Y[spot.floor], spot.z);
      this.yaw = spot.facingAngle;
      this.pitch = 0;
      this.flashlightOn = false;
      this.audio.playSwitchClick();
      this.setSubtitle('आरव कुमार', 'साँस रोको... उम्मीद है कविता ने मुझे अंदर जाते न देखा हो।', 2.5);
      return;
    }

    if (type === 'door') {
      this.interactWithDoor(id);
      return;
    }

    if (type === 'interactable') {
      this.interactWithObject(id);
    }
  }

  private interactWithDoor(doorId: string): void {
    const def = DOORS.find((d) => d.id === doorId);
    const rt = this.world.doors.get(doorId);
    if (!def || !rt) return;

    // Permanent lock for ALL other numbered guest rooms (1-12 and 14-20)
    if (/^door_f[12]_r(?!13(?:_|$))\d+$/.test(doorId)) {
      this.audio.playDoorCreak(true);
      const refusal = 'यह आपका रूम नहीं है, यह दूसरे का रूम है, आप इसको नहीं खोल सकते।';
      this.setSubtitle('आरव कुमार', refusal, 4.8);
      this.audio.speakPlayerMale(refusal);
      return;
    }

    // Room 13 knock scene when opening during Mission 9!
    if (doorId === 'door_f2_r13' && this.knockPending) {
      this.knockPending = false;
      this.knockSceneDone = true;
      rt.isOpen = true;
      rt.targetAngle = Math.PI * 0.44;
      this.audio.playDoorCreak(false);
      this.audio.speakSequence([
        {
          role: 'chudail',
          text: 'कुछ खाएंगे सर क्या?',
          onStart: () => this.setSubtitle('कविता', '“कुछ खाएंगे सर क्या?”', 3.6),
        },
        {
          role: 'player',
          text: 'नहीं-नहीं, अभी मेरे को कुछ नहीं खाना।',
          onStart: () => this.setSubtitle('आरव कुमार', '“नहीं-नहीं, अभी मेरे को कुछ नहीं खाना।”', 4.2),
        },
        {
          role: 'chudail',
          text: 'ठीक है सर, मैं जा रही हूँ।',
          onStart: () => {
            this.setSubtitle('कविता', '“ठीक है सर, मैं जा रही हूँ।”', 4.0);
            this.kavitaState = 'waiting_lobby';
            this.kavita.setTrayVisible(false);
            this.kavitaPos.set(0, 0, 11.15);
            this.kavita.root.position.copy(this.kavitaPos);
          },
        },
        {
          role: 'player',
          text: 'वह नीचे चली गई... अब थोड़ी देर पलंग पर सोकर आराम करता हूँ।',
          onStart: () =>
            this.setSubtitle(
              'आरव कुमार',
              'वह नीचे चली गई... अब थोड़ी देर पलंग पर सोकर आराम करता हूँ।',
              5.2
            ),
        },
      ]);
      return;
    }

    // Room 13 delivery event when opening during Mission 6!
    if (doorId === 'door_f2_r13' && this.currentMission === 6 && !this.room13FoodDelivered) {
      this.deliverRoom13Food();
      return;
    }

    // Main Entrance Door behavior: Stays open while outside in M2; slams & locks ONLY once inside!
    if (doorId === 'door_main_entrance') {
      if (this.currentMission === 1) {
        this.audio.playDoorCreak(true);
        const ringMsg = 'दरवाजा बाहर से बंद है। पहले पास लगी पुरानी घंटी बजाकर देखता हूँ।';
        this.setSubtitle('आरव कुमार', ringMsg, 3.5);
        this.audio.speakPlayerMale(ringMsg);
        return;
      }

      // If bell was rung (Mission 2) and player is STILL outside / in doorway, NEVER shut the door on them!
      if (this.currentMission === 2 && this.playerPos.z >= 15.2) {
        rt.isOpen = true;
        rt.targetAngle = Math.PI * 0.48;
        this.unlockedDoors.add('door_main_entrance');
        const walkInMsg = 'दरवाजा खुला हुआ है — अंदर लॉबी में जाइए।';
        this.setSubtitle('आरव कुमार', walkInMsg, 3.5);
        this.audio.speakPlayerMale(walkInMsg);
        return;
      }

      // Final Escape: Only with key_main_door during active escape!
      if ((this.escapeActive || this.currentMission >= 20) && this.inventory.has('key_main_door')) {
        this.unlockDoor('door_main_entrance');
        if (this.currentMission < 26) {
          this.currentMission = 26;
          this.callbacks.onMissionComplete(25, 26);
        }
        this.kavitaState = 'final_chase';
        this.kavita.setTrayVisible(false);
        this.kavitaPos.set(0, 0, 11.8);
        this.kavita.root.visible = true;
        this.audio.playHorrorSting();
        this.setSubtitle('कविता (काउंटर वाली चुड़ैल)', 'आप यहाँ से नहीं जा सकते! आपका आखिरी निवाला अभी बाकी है!', 5.0);
        this.audio.speakScaryWoman('आप यहाँ से नहीं जा सकते! आपका आखिरी निवाला अभी बाकी है!');
        this.scheduleTimer(() => {
          this.setSubtitle('आरव कुमार', 'मेन डोर खुल गया! तेजी से बाहर बारिश वाली सड़क की ओर भागो!', 4.5);
        }, 1800);
        return;
      }

      // In ALL other cases (once trapped inside, Missions 2 to 25 without key_main_door): Door is 100% LOCKED & CLOSED!
      rt.isOpen = false;
      rt.targetAngle = 0;
      this.unlockedDoors.delete('door_main_entrance');
      this.audio.playDoorCreak(true);
      if (this.escapeActive || this.currentMission >= 10) {
        this.suspicionLevel = THREE.MathUtils.clamp(this.suspicionLevel + 8, 0, 100);
        const lockMsg = 'मेन डोर पर भारी लोहे की जंजीर और लॉक लगा है! यह बिना "मेन डोर की असली चाबी" के नहीं खुलेगा। होटल के अंदर से रास्ता ढूँढना होगा!';
        this.setSubtitle('आरव कुमार', lockMsg, 5.0);
        this.audio.speakPlayerMale(lockMsg);
      } else {
        const lockedShutMsg = 'दरवाजा बाहर से पूरी तरह लॉक हो चुका है! खटखटाने पर भी नहीं खुलेगा... अब यहाँ से बाहर निकलने का कोई सामान्य रास्ता नहीं है!';
        this.setSubtitle('आरव कुमार', lockedShutMsg, 5.0);
        this.audio.speakPlayerMale(lockedShutMsg);
      }
      return;
    }

    // 4th Floor Rooftop Door: Permanently locked & barred! (No player can jump down from the roof)
    if (doorId === 'door_f4_roof') {
      rt.isOpen = false;
      rt.targetAngle = 0;
      this.unlockedDoors.delete('door_f4_roof');
      this.audio.playDoorCreak(true);
      const roofMsg = 'छत का यह दरवाजा भारी लोहे के सरियों और मोटी जंजीरों से पूरी तरह बंद और सील है! यहाँ से कोई नहीं कूद सकता — होटल के अंदर से ही सारा एस्केप का सामान ढूँढकर मुख्य रास्ते से निकलना होगा!';
      this.setSubtitle('आरव कुमार', roofMsg, 5.5);
      this.audio.speakPlayerMale(roofMsg);
      return;
    }

    // Locked by Story
    if (def.lockedByStory === 'kitchen_secret_opened' && !this.kitchenSecretOpened) {
      this.audio.playDoorCreak(true);
      this.setSubtitle('आरव कुमार', 'यह दीवार पूरी तरह बंद है — पास रखी पुरानी रसोई की बर्तन पहेली (पहली पहेली) हल करने से यह रास्ता खुलेगा।', 4.5);
      return;
    }
    if (def.lockedByStory === 'emergency_exit_unlocked' && !this.emergencyExitUnlocked) {
      this.audio.playDoorCreak(true);
      this.setSubtitle('आरव कुमार', 'यह गुप्त सुरंग का दरवाजा आपातकालीन सुरक्षा लॉक से जुड़ा है। पहले भूतल पर आपातकालीन निकास कार्ड स्वाइप करना होगा।', 4.5);
      return;
    }

    // Locked by Keypad
    if (def.lockedByKeypad && !this.unlockedDoors.has(doorId)) {
      if (def.lockedByKeypad === 'keypad_room13_secret' && !this.inventory.has('crest_room13')) {
        this.audio.playDoorCreak(true);
        this.setSubtitle('आरव कुमार', 'अलमारी के पीछे यह गुप्त खांचा बिना "कमरा 13 का पीतल प्रतीक" लगाए नहीं खुलेगा! तीसरी मंजिल पर मालिक के निजी कमरे की जाँच करो।', 4.5);
        return;
      }
      this.audio.playSwitchClick();
      this.callbacks.onOpenPuzzle(def.lockedByKeypad, doorId);
      return;
    }

    // Locked by Key / Crowbar
    if (def.lockedByItem && !this.unlockedDoors.has(doorId)) {
      if (def.isFinalGate) {
        this.callbacks.onOpenPuzzle('final_gate', this.inventory.has('crowbar_gate') ? 'has_crowbar' : 'no_crowbar');
        return;
      }
      if (!this.inventory.has(def.lockedByItem)) {
        this.audio.playDoorCreak(true);
        const neededName = INVENTORY_ITEMS[def.lockedByItem]?.name || 'चाबी';
        this.setSubtitle('आरव कुमार', `ताला लगा है! इसे खोलने के लिए "${neededName}" चाहिए।`, 3.5);
        return;
      }
      // Unlock!
      this.unlockDoor(doorId);
      this.setSubtitle('आरव कुमार', `${def.label} खुल गया।`, 2.8);
      if (doorId === 'door_f2_r13' && this.currentMission <= 5) {
        this.currentMission = 5;
        this.advanceMission(5);
        this.scheduleRoom13FoodDelivery();
      } else if (doorId === 'door_g_basement' && this.currentMission === 18) {
        this.advanceMission(18);
      }
      return;
    }

    // Toggle normal unlocked door
    rt.isOpen = !rt.isOpen;
    rt.targetAngle = rt.isOpen ? Math.PI * 0.48 : 0;
    this.audio.playDoorCreak(false);
    this.noiseEmitLevel = Math.max(this.noiseEmitLevel, 0.55);
  }

  private scheduleRoom13FoodDelivery(): void {
    if (this.foodKnockScheduled || this.room13FoodDelivered) return;
    this.foodKnockScheduled = true;
    this.foodKnockTimer = 2.5;
  }

  private deliverRoom13Food(): void {
    this.room13FoodDelivered = true;
    this.isPeepholeActive = false;
    const r13Door = this.world.doors.get('door_f2_r13');
    if (r13Door) {
      r13Door.isOpen = true;
      r13Door.targetAngle = Math.PI * 0.48;
      this.audio.playDoorCreak(false);
    }

    // Keep Kavita clearly visible standing right at the open Room 13 doorway holding the food tray!
    this.kavitaState = 'delivering_food';
    this.foodDeliveryTimer = 4.6;
    this.kavitaPos.set(-2.95, 8.0, -1.25);
    this.kavitaYaw = Math.atan2(this.playerPos.x - this.kavitaPos.x, this.playerPos.z - this.kavitaPos.z);
    this.kavita.root.position.copy(this.kavitaPos);
    this.kavita.root.rotation.y = this.kavitaYaw;
    this.kavita.root.visible = true;
    this.kavita.setTrayVisible(true);
    this.kavita.setOfferKeyMode(false);

    this.audio.prefetchSpeech('player', 'देखता हूँ, खाने में क्या भेजा है...');
    this.audio.prefetchSpeech(
      'player',
      'अरे यह क्या?! मेरे खाने में मांस मिला है! मैं यह बिल्कुल नहीं खाऊँगा... चलो, काउंटर वाली लड़की को कंप्लेंट करते हैं!'
    );
    this.setSubtitle('कविता', 'साहब, गरम खाना है। पूरा खा लीजिएगा।', 4.5);
    this.audio.speakScaryWoman('साहब, गरम खाना है। पूरा खा लीजिएगा।');
  }

  private interactWithObject(id: string): void {
    const def = INTERACTABLES.find((i) => i.id === id);
    if (!def) return;

    if (id === 'int_entrance_bell') {
      // Bell MUST remain visible on the wall & play an unmistakable doorbell ring chime!
      const m = this.world.interactables.get(id);
      if (m) m.visible = true;
      this.audio.playDoorbell();

      if (!this.entranceBellRung) {
        this.entranceBellRung = true;
        this.audio.prefetchSpeech('chudail', 'आइए साहब... आपका ही इंतजार था। अंदर आइए।');
        this.audio.prefetchSpeech('player', 'अरे! दरवाजा पीछे से अपने आप कैसे बंद और लॉक हो गया?! यह क्या हो रहा है!');
        this.audio.prefetchSpeech('chudail', 'स्वागत है साहब... अब यहाँ से कोई बाहर नहीं जा सकता। आइए, रजिस्टर में अपना नाम लिख दीजिए।');
        this.setSubtitle('आरव कुमार', 'घंटी बज गई... लगता है अंदर से कोई दरवाजा खोलने आ रहा है।', 3.5);
        this.scheduleTimer(() => {
          this.unlockDoor('door_main_entrance');
          this.advanceMission(1);
          this.setSubtitle('कविता', 'आइए साहब... आपका ही इंतजार था। अंदर आइए।', 5.0);
          this.audio.speakScaryWoman('आइए साहब... आपका ही इंतजार था। अंदर आइए।');
        }, 1400);
      } else {
        this.setSubtitle('आरव कुमार', 'घंटी बजी — सामने का मुख्य दरवाजा खुला है, अंदर आइए।', 3.2);
      }
      return;
    }

    if (def.kind === 'battery') {
      this.battery = Math.min(100, this.battery + 45);
      this.openedInteractables.add(id);
      const m = this.world.interactables.get(id);
      if (m) m.visible = false;
      this.audio.playPickup();
      this.setSubtitle('आरव कुमार', 'टॉर्च की नई बैटरी मिल गई (+45%)।', 2.5);
      return;
    }

    if (def.kind === 'lift_panel') {
      this.callbacks.onOpenLiftModal();
      return;
    }

    if (def.kind === 'wall_clock') {
      this.setSubtitle('आरव कुमार', 'दीवार पर लगी घड़ी ठीक 11:45 पर रुकी हुई है... शायद यह कोई समय या कोड (1145) है।', 4.5);
      return;
    }

    if (def.kind === 'food_tray') {
      if (!this.room13FoodDelivered) {
        this.setSubtitle('आरव कुमार', 'मेज खाली है। अभी खाना नहीं आया है।', 2.5);
        return;
      }
      if (!this.room13FoodInspected) {
        this.startFoodRevealCutscene();
      }
      return;
    }

    if (def.kind === 'telephone') {
      if (!this.room13FoodInspected) {
        this.setSubtitle('आरव कुमार', 'यह पुराना रोटरी टेलीफोन है — अभी लाइन खामोश है।', 2.5);
        return;
      }
      this.callbacks.onOpenPuzzle('telephone');
      return;
    }

    if (def.kind === 'register') {
      if (this.currentMission >= 4 || this.solvedPuzzles.has('register')) {
        this.setSubtitle('आरव कुमार', 'रजिस्टर में "आरव कुमार — कमरा नं. 13" पहले ही दर्ज है।', 3);
        return;
      }
      this.callbacks.onOpenPuzzle('register');
      return;
    }

    if (def.kind === 'exit_terminal') {
      if (!this.powerRestored) {
        this.setSubtitle('आरव कुमार', 'आपातकालीन टर्मिनल बंद है — पहले तहखाने में बिजली नियंत्रण कक्ष चालू करें।', 4);
        return;
      }
      if (!this.inventory.has('card_emergency_exit')) {
        this.setSubtitle('आरव कुमार', 'इसे खोलने के लिए "आपातकालीन निकास कार्ड" चाहिए (चौथी मंजिल पानी की टंकी क्षेत्र में खोजें)।', 4);
        return;
      }
      this.emergencyExitUnlocked = true;
      this.unlockDoor('door_b1_tunnel');
      this.audio.playPickup();
      this.setSubtitle('आपातकालीन प्रणाली', 'आपातकालीन निकास सक्रिय! नीचे तहखाने में "गुप्त सुरंग" का दरवाजा खुल गया है — जल्दी भागो!', 5.5);
      return;
    }

    if (def.kind === 'cold_crate') {
      this.collectLore('lore_cold_storage');
      this.callbacks.onOpenLoreModal('lore_cold_storage');
      this.advanceMission(19);
      return;
    }

    if (def.kind === 'tunnel_hatch') {
      this.secretTunnelFound = true;
      this.setSubtitle('आरव कुमार', 'यहाँ एक गुप्त भूमिगत सुरंग है जो सीधे पीछे के आँगन तक जाती है! अब बिजली नियंत्रण कक्ष चालू करना होगा।', 5.0);
      this.advanceMission(21);
      return;
    }

    if (def.kind === 'kavita_counter') {
      if (this.currentMission === 7 && !this.complaintDone) {
        this.triggerM7Complaint();
        return;
      }
      if (this.currentMission === 9 && !this.hungerTalkDone) {
        if (!this.hungryReady) {
          this.setSubtitle(
            'आरव कुमार',
            'पहले ऊपर कमरा नंबर 13 के दरवाजे की दस्तक देखकर पलंग पर सोकर आराम करूँगा, तभी अगले दिन वह मुझ पर भरोसा करेगी।',
            5.0
          );
          return;
        }
        this.triggerM9HungerTalk();
        return;
      }
      // During Escape Mission (M10+), talking directly triggers contextual 3-choice dialogue
      const qId =
        this.inventory.has('key_main_door') && !this.finalQuestionAsked
          ? 'Q_FINAL'
          : (['Q1', 'Q2', 'Q3', 'Q4'][this.dialogueCount % 4] as string);
      if (qId === 'Q_FINAL') this.finalQuestionAsked = true;
      this.dialogueCount += 1;
      this.lobbyDialogueCooldown = 14.0;
      this.callbacks.onOpenPuzzle('chudail_dialogue', qId);
      return;
    }

    if (def.kind === 'sleep_bed') {
      if (this.currentMission === 8 && !this.nightmareDone) {
        this.startSleepCutscene('nightmare');
        return;
      }
      if (this.currentMission === 9 && this.knockSceneDone && !this.hungryReady) {
        this.startSleepCutscene('sleep_next_day');
        return;
      }
      if (this.currentMission === 9 && !this.knockSceneDone) {
        this.setSubtitle('आरव कुमार', 'बाहर कमरा 13 के दरवाजे पर कोई दस्तक देने वाला है — पहले दरवाजा खोलकर देखता हूँ।', 3.8);
        return;
      }
      this.startSleepCutscene('sleep_rest');
      return;
    }

    if (def.kind === 'store_clue') {
      this.openedInteractables.add(id);
      const m = this.world.interactables.get(id);
      if (m) m.visible = false;
      this.collectLore('lore_store_clue');
      this.audio.playPickup();
      this.callbacks.onOpenLoreModal('lore_store_clue');
      if (this.currentMission === 13) {
        this.advanceMission(13);
      }
      return;
    }

    if (def.kind === 'office_drawer') {
      this.grantItem('note_office_drawer');
      this.collectLore('lore_office_drawer');
      this.openedInteractables.add(id);
      const m = this.world.interactables.get(id);
      if (m) m.visible = false;
      this.callbacks.onOpenLoreModal('lore_office_drawer');
      if (this.currentMission === 17 && this.inventory.has('key_basement')) {
        this.advanceMission(17);
      } else {
        this.setSubtitle('आरव कुमार', 'दराज में गुप्त नोट मिला — मेन डोर की असली चाबी पुरानी रसोई के पीछे गुप्त कमरे में है! अब पास की तिजोरी (1145) भी खोल लें।', 5.5);
      }
      return;
    }

    if (def.kind === 'puzzle' && def.puzzleType) {
      if (def.puzzleType === 'cctv_system' && !this.inventory.has('card_cctv')) {
        this.setSubtitle('आरव कुमार', 'मॉनिटर चालू करने के लिए "सीसीटीवी एक्सेस कार्ड" चाहिए (पहली मंजिल के पुराने मेहमानों के हॉल में खोजें)।', 4.5);
        return;
      }
      if (def.puzzleType === 'kitchen_almirah' && !this.powerRestored) {
        this.setSubtitle('आरव कुमार', 'लोहे की अलमारी बिजली के सुरक्षा लॉक से बंद है! पहले तहखाने में जाकर बिजली और डीजल जनरेटर चालू करें।', 5.0);
        return;
      }
      if (def.puzzleType === 'main_door_key_box' && !this.kitchenAlmirahOpened) {
        this.setSubtitle('आरव कुमार', 'यह सुरक्षा बक्सा लोहे की अलमारी से जुड़ा है — पहले पास की लोहे की अलमारी (दूसरी पहेली) खोलें!', 4.5);
        return;
      }
      if (def.puzzleType === 'wiring') {
        const partsCount =
          (this.inventory.has('parts_electric_1') ? 1 : 0) +
          (this.inventory.has('parts_electric_2') ? 1 : 0) +
          (this.inventory.has('parts_electric_3') ? 1 : 0);
        if (partsCount < 2) {
          this.setSubtitle('आरव कुमार', `बिजली पैनल के पुर्जे कम हैं (${partsCount}/3)! स्टोर रूम, कर्मचारी कक्ष 3 और चौथी मंजिल लिफ्ट कक्ष से पुर्जे इकट्ठा करें।`, 4.8);
          return;
        }
      }
      if (def.puzzleType === 'generator' && !this.solvedPuzzles.has('wiring')) {
        this.setSubtitle('आरव कुमार', 'जनरेटर चलाने से पहले पास वाले "मुख्य बिजली तार पैनल" के तार जोड़ना जरूरी है।', 4.0);
        return;
      }
      this.callbacks.onOpenPuzzle(def.puzzleType);
      return;
    }

    if (def.kind === 'lore' && def.loreId) {
      this.collectLore(def.loreId);
      if (id === 'int_reception_ledger') {
        this.grantItem('key_store_room');
        this.openedInteractables.add(id);
        const m = this.world.interactables.get(id);
        if (m) m.visible = false;
      }
      this.callbacks.onOpenLoreModal(def.loreId);
      if (def.completesMission && this.currentMission === def.completesMission) {
        this.advanceMission(def.completesMission);
      }
      return;
    }

    // Item pickup!
    if (def.kind === 'item') {
      if (id === 'int_r13_bath_latch') {
        this.openedInteractables.add(id);
        const m = this.world.interactables.get(id);
        if (m) m.visible = false;
        this.audio.playPickup();
        this.setSubtitle('आरव कुमार', 'एक पुरानी पीतल की पिन यहाँ पड़ी है।', 3.0);
        return;
      }

      if (def.itemId) {
        this.grantItem(def.itemId);
        // Special bonus part bundled with lift card in rooftop room
        if (def.itemId === 'card_lift') {
          this.grantItem('parts_electric_3');
        }
        this.openedInteractables.add(id);
        const m = this.world.interactables.get(id);
        if (m) m.visible = false;

        if (def.itemId === 'key_room13') {
          this.kavita.setOfferKeyMode(false);
          this.kavitaPos.set(0, 0, 11.15);
          this.kavita.root.position.copy(this.kavitaPos);
          this.audio.speakScaryWoman('दूसरी मंजिल पर कमरा नंबर तेरह... जल्दी ऊपर जाइए साहब, मैं अभी आपका खाना लेकर आती हूँ।');
          this.setSubtitle('कविता', 'यह लीजिए, कमरा नंबर 13 की चाबी आपके हाथ में है... दूसरी मंजिल पर जाइए साहब...', 6.0);
          if (this.currentMission < 4) {
            this.currentMission = 4;
          }
        }

        if (def.loreId) {
          this.collectLore(def.loreId);
          this.callbacks.onOpenLoreModal(def.loreId);
        } else if (def.itemId !== 'key_room13') {
          this.setSubtitle('वस्तु प्राप्त हुई', `${INVENTORY_ITEMS[def.itemId].name} थैले में रखी गई।`, 3.2);
        }

        // Mission completion checks
        if (def.completesMission && this.currentMission === def.completesMission) {
          this.advanceMission(def.completesMission);
        }
        if (this.currentMission === 11 && this.inventory.has('key_cctv') && this.inventory.has('card_cctv')) {
          this.advanceMission(11);
        }
        if (this.currentMission === 20 && this.inventory.has('guest_list') && this.inventory.has('record_room13')) {
          this.advanceMission(20);
        }
      }
    }
  }

  // ============ COLLISION & FLOOR HEIGHT ============
  private getFloorFromY(y: number): FloorId {
    if (y < -2.0) return 'B1';
    if (y < 2.2) return 'G';
    if (y < 6.2) return '1';
    if (y < 10.2) return '2';
    if (y < 14.2) return '3';
    return '4';
  }

  private computeGroundHeight(x: number, z: number, curY: number): number {
    // 1. Check stair ramps (0.35m margin + pick closest height ramp so overlapping floors never conflict)
    let bestRampY: number | null = null;
    let bestRampDiff = 1.45;
    for (const st of STAIR_RAMPS) {
      const xMin = Math.min(st.x1, st.x2) - 0.35;
      const xMax = Math.max(st.x1, st.x2) + 0.35;
      const zMin = Math.min(st.zStart, st.zEnd) - 0.35;
      const zMax = Math.max(st.zStart, st.zEnd) + 0.35;
      if (x >= xMin && x <= xMax && z >= zMin && z <= zMax) {
        const t = THREE.MathUtils.clamp((z - st.zStart) / (st.zEnd - st.zStart), 0, 1);
        const rampY = st.yStart + (st.yEnd - st.yStart) * t;
        const diff = Math.abs(curY - rampY);
        if (diff < bestRampDiff) {
          bestRampDiff = diff;
          bestRampY = rampY;
        }
      }
    }
    if (bestRampY !== null) return bestRampY;

    // 2. Check Staircase Mid-Landings between Flight A & Flight B (Y = 2, 6, 10, 14 at X: 14..20, Z: -8..-5.5)
    if (x >= 13.8 && x <= 20.2 && z >= -8.2 && z <= -5.2) {
      for (const my of [14.0, 10.0, 6.0, 2.0]) {
        if (Math.abs(curY - my) < 1.35) {
          return my;
        }
      }
    }

    // 3. Check Elevator cab floor
    if (x >= -19.8 && x <= -16.6 && z >= 2.1 && z <= 5.4) {
      if (Math.abs(curY - this.world.liftCab.position.y) < 1.3) {
        return this.world.liftCab.position.y;
      }
    }

    // 4. Snap to nearest solid floor level <= curY + 0.55
    const levels = [16.0, 12.0, 8.0, 4.0, 0.0, -4.0];
    for (const ly of levels) {
      if (ly <= curY + 0.55) {
        // Exterior grounds stay at y = 0
        if (ly > 0 && (Math.abs(x) > 20.1 || Math.abs(z) > 18.1)) continue;
        // Cutout check: Main stairwell shaft on floors 1..4 (X 14.05..19.95, Z -7.95..4.35)
        if (ly > 0 && x >= 14.05 && x <= 19.95 && z >= -7.95 && z <= 4.35) continue;
        // Cutout check: Basement stairwell on floor G (X -20..-14, Z -10.0..-2.3)
        if (ly === 0.0 && x >= -20.0 && x <= -14.0 && z >= -10.0 && z <= -2.3) continue;
        // Cutout check: Lift shaft on G..3
        if (ly >= 0 && ly <= 12 && x >= -20.0 && x <= -16.5 && z >= 2.0 && z <= 5.5) continue;
        return ly;
      }
    }
    return -4.0;
  }

  private collidesHorizontally(x: number, y: number, z: number): boolean {
    const r = 0.34;
    const pMinY = y + 0.38;
    const pMaxY = y + (this.isCrouching ? 1.05 : 1.72);

    // Prevent stepping into empty elevator shaft when cab is on another floor
    if (x - r < -16.55 && x + r > -19.9 && z + r > 2.0 && z - r < 5.5) {
      if (Math.abs(this.world.liftCab.position.y - y) > 0.75) {
        return true;
      }
    }

    // Strict rooftop safety barrier: on Floor 4 (y >= 13.5), player can NEVER leave indoor rooms to jump off roof!
    if (y >= 13.5) {
      const inMumty = x >= 13.5 && x <= 20.2 && z >= -8.2 && z <= 8.2;
      const inLiftMachine = x >= -20.2 && x <= -11.8 && z >= -2.2 && z <= 8.2;
      const inWatchRoom = x >= -4.2 && x <= 11.8 && z >= 7.8 && z <= 18.2;
      if (!inMumty && !inLiftMachine && !inWatchRoom) {
        return true;
      }
    }

    for (let i = 0; i < this.world.colliders.length; i++) {
      const c = this.world.colliders[i];
      if (c.tag === 'slab') continue;
      if (c.maxY <= pMinY || c.minY >= pMaxY) continue;

      if (c.tag?.startsWith('door:')) {
        const doorId = c.tag.slice(5);
        const dr = this.world.doors.get(doorId);
        if (dr && dr.isOpen) continue;
      }

      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        return true;
      }
    }
    return false;
  }

  // ============ MAIN GAME TICK ============
  private startLoop(): void {
    this.lastTimestamp = performance.now();
    const tick = (now?: number) => {
      if (this.disposed) return;
      const t = now ?? performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (t - this.lastTimestamp) / 1000));
      this.lastTimestamp = t;

      if (!this.paused) {
        this.update(dt);
      }

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(() => tick());
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(() => tick());
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number): void {
    this.elapsedTotal += dt;
    if (!this.endingPhase) {
      this.playTimeSeconds += dt;
    }

    if (this.caughtCooldown > 0) this.caughtCooldown -= dt;
    if (this.lobbyDialogueCooldown > 0) this.lobbyDialogueCooldown -= dt;

    // 1. Subtitles & Scheduled Room 13 Knock
    if (this.subtitleTimer > 0) {
      this.subtitleTimer -= dt;
      if (this.subtitleTimer <= 0) this.subtitle = null;
    }
    if (this.foodKnockScheduled && !this.room13FoodDelivered) {
      this.foodKnockTimer -= dt;
      if (this.foodKnockTimer <= 0) {
        this.foodKnockScheduled = false;
        const r13Door = this.world.doors.get('door_f2_r13');
        if (r13Door) {
          r13Door.isOpen = false;
          r13Door.targetAngle = 0;
        }
        this.audio.playKnock();
        this.kavitaState = 'wait_door';
        this.kavitaPos.set(-2.95, 8.0, -1.05);
        this.kavitaYaw = Math.PI;
        this.kavita.root.position.copy(this.kavitaPos);
        this.kavita.root.rotation.y = this.kavitaYaw;
        this.kavita.root.visible = true;
        this.kavita.setOfferKeyMode(false);
        this.kavita.setTrayVisible(true);
        this.setSubtitle('कविता (बाहर से दस्तक)', 'साहब... आपका गरमा-गरम खाना ले आई हूँ। दरवाजे के छेद से देख लें या दरवाजा खोलें।', 5.5);
      }
    }

    // 2. Ending Sequence Override
    if (this.endingPhase) {
      this.updateEndingSequence(dt);
      this.updateEnvironmentAndLights(dt);
      return;
    }

    // 2B. Live 3D Sleeping, Food Reveal, Nightmare & Jump-Scare Kill Cutscene Override!
    if (this.cutscenePhase !== 'none') {
      this.updateSleepCutscene(dt);
      for (let i = 0; i < this.world.ceilingFans.length; i++) {
        this.world.ceilingFans[i].rotation.y += dt * (this.powerRestored ? 2.4 : 0.45);
      }
      this.updateEnvironmentAndLights(dt);
      this.hudSyncTimer += dt;
      if (this.hudSyncTimer >= 0.05) {
        this.hudSyncTimer = 0;
        const cFloor = this.getFloorFromY(this.playerPos.y);
        const cRoom = findRoomAt(cFloor, this.playerPos.x, this.playerPos.z);
        this.callbacks.onHudUpdate({
          currentMission: this.currentMission,
          floor: this.cutscenePhase === 'car_intro' ? 'G' : cFloor,
          roomName: this.cutscenePhase === 'jumpscare_kill' ? (cRoom?.name || 'मुख्य लॉबी') : 'कमरा नंबर 13',
          timeLabel: this.formatHindiClock(this.clockMinutes),
          dayNumber: this.dayNumber,
          stamina: Math.round(this.stamina),
          battery: Math.round(this.battery),
          flashlightOn: this.flashlightOn,
          isCrouching: false,
          isHiding: false,
          hideLabel: '',
          isPeepholeActive: false,
          isCutsceneActive: true,
          eyelidClose: this.eyelidClose,
          nearbyPrompt: null,
          secondaryPrompt: null,
          subtitle: this.subtitle,
          kavitaThreatLevel: this.kavitaThreat,
          kavitaState: this.kavitaState,
          suspicionLevel: Math.round(this.suspicionLevel),
          wrongDialogueCount: this.wrongDialogueCount,
          powerRestored: this.powerRestored,
          playTimeSeconds: Math.floor(this.playTimeSeconds),
          cctvActiveCamera: null,
          playerX: this.playerPos.x,
          playerZ: this.playerPos.z,
        });
      }
      return;
    }

    // 3. Player Movement & Physics
    this.updatePlayer(dt);

    // 4. Doors & Ceiling Fans animation
    this.world.doors.forEach((dr) => {
      dr.currentAngle = THREE.MathUtils.damp(dr.currentAngle, dr.targetAngle, 7.5, dt);
      dr.pivot.rotation.y = dr.currentAngle;
    });
    for (let i = 0; i < this.world.ceilingFans.length; i++) {
      this.world.ceilingFans[i].rotation.y += dt * (this.powerRestored ? 2.4 : 0.25);
    }

    // 5. Kavita AI
    this.updateKavitaAI(dt);

    // 6. Story Triggers (Reception Dialogue, Retroactive Missions, Main Door Escape!)
    this.checkStoryTriggers(dt);

    // 7. Nearest Interaction Scanning
    this.scanNearbyInteractables();

    // 8. Camera, Flashlight & Dynamic Lighting
    this.updateCameraAndFlashlight(dt);
    this.updateEnvironmentAndLights(dt);

    // 9. Throttled HUD update (~15Hz)
    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.065) {
      this.hudSyncTimer = 0;
      const fl = this.getFloorFromY(this.playerPos.y);
      const room = findRoomAt(fl, this.playerPos.x, this.playerPos.z);
      const isOut = Boolean(room?.isOutdoor);
      this.audio.setRainIndoorFactor(isOut, false);
      this.audio.updateTension(this.kavitaThreat);

      this.callbacks.onHudUpdate({
        currentMission: this.currentMission,
        floor: fl,
        roomName: room ? room.name : 'गलियारा',
        timeLabel: this.formatHindiClock(this.clockMinutes),
        dayNumber: this.dayNumber,
        stamina: Math.round(this.stamina),
        battery: Math.round(this.battery),
        flashlightOn: this.flashlightOn,
        isCrouching: this.isCrouching,
        isHiding: this.isHiding,
        hideLabel: this.currentHideId ? HIDE_SPOTS.find((h) => h.id === this.currentHideId)?.label || '' : '',
        isPeepholeActive: this.isPeepholeActive,
        isCutsceneActive: false,
        eyelidClose: this.eyelidClose,
        nearbyPrompt: this.nearbyTarget?.prompt || null,
        secondaryPrompt: this.nearbyTarget?.secondary || null,
        subtitle: this.subtitle,
        kavitaThreatLevel: this.kavitaThreat,
        kavitaState: this.kavitaState,
        suspicionLevel: Math.round(this.suspicionLevel),
        wrongDialogueCount: this.wrongDialogueCount,
        powerRestored: this.powerRestored,
        playTimeSeconds: Math.floor(this.playTimeSeconds),
        cctvActiveCamera: this.cctvActiveCam,
        playerX: this.playerPos.x,
        playerZ: this.playerPos.z,
      });
    }
  }

  private updatePlayer(dt: number): void {
    this.noiseEmitLevel = Math.max(0, this.noiseEmitLevel - dt * 1.6);

    if (this.isHiding || this.isPeepholeActive || this.cctvActiveCam !== null) {
      const targetHeight = this.isHiding
        ? HIDE_SPOTS.find((h) => h.id === this.currentHideId)?.camOffsetY || 0.75
        : 1.52;
      this.camHeight = THREE.MathUtils.damp(this.camHeight, targetHeight, 10, dt);
      return;
    }

    // Keyboard turning (Q / E or ArrowLeft / ArrowRight when desired, plus standard WASD strafe!)
    if (this.keys.has('KeyQ')) this.yaw += dt * 1.9;
    // Wait: keep ArrowLeft/Right for turning too so keyboard-only players can turn smoothly!
    if (this.keys.has('ArrowLeft')) this.yaw += dt * 2.0;
    if (this.keys.has('ArrowRight')) this.yaw -= dt * 2.0;

    let moveForward = 0;
    let moveRight = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveForward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveForward -= 1;
    if (this.keys.has('KeyD')) moveRight += 1;
    if (this.keys.has('KeyA')) moveRight -= 1;

    // Combine touch joystick
    moveForward += -this.touchMove.y;
    moveRight += this.touchMove.x;

    const inputLen = Math.hypot(moveForward, moveRight);
    const wantsSprint =
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchSprinting) &&
      inputLen > 0.1 &&
      !this.isCrouching &&
      this.stamina > 3;

    if (wantsSprint) {
      this.stamina = Math.max(0, this.stamina - dt * 21);
    } else {
      this.stamina = Math.min(100, this.stamina + dt * 14);
    }

    const speed = wantsSprint ? 6.1 : this.isCrouching ? 2.05 : 3.75;

    if (inputLen > 0.05) {
      const norm = Math.min(1, inputLen) / inputLen;
      moveForward *= norm;
      moveRight *= norm;

      _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

      const dx = (_forward.x * moveForward + _right.x * moveRight) * speed * dt;
      const dz = (_forward.z * moveForward + _right.z * moveRight) * speed * dt;

      // Smooth wall sliding along X then Z
      if (!this.collidesHorizontally(this.playerPos.x + dx, this.playerPos.y, this.playerPos.z)) {
        this.playerPos.x += dx;
      }
      if (!this.collidesHorizontally(this.playerPos.x, this.playerPos.y, this.playerPos.z + dz)) {
        this.playerPos.z += dz;
      }

      const fl = this.getFloorFromY(this.playerPos.y);
      const room = findRoomAt(fl, this.playerPos.x, this.playerPos.z);
      this.audio.playFootstep(wantsSprint, this.isCrouching, Boolean(room?.isOutdoor));
      this.noiseEmitLevel = Math.max(
        this.noiseEmitLevel,
        wantsSprint ? 1.0 : this.isCrouching ? 0.1 : 0.42
      );
    }

    // Vertical gravity + stair/slab grounding
    const groundY = this.computeGroundHeight(this.playerPos.x, this.playerPos.z, this.playerPos.y);
    if (!this.isGrounded || this.playerPos.y > groundY + 0.05) {
      this.playerVelY -= 15.5 * dt;
      this.playerPos.y += this.playerVelY * dt;
      if (this.playerPos.y <= groundY) {
        this.playerPos.y = groundY;
        this.playerVelY = 0;
        this.isGrounded = true;
      }
    } else {
      this.playerPos.y = THREE.MathUtils.damp(this.playerPos.y, groundY, 16, dt);
      this.playerVelY = 0;
      this.isGrounded = true;
    }

    // Flashlight battery drain
    if (this.flashlightOn) {
      this.battery = Math.max(0, this.battery - dt * 0.42);
      if (this.battery <= 0) this.flashlightOn = false;
    }

    const targetCamH = this.isCrouching ? 0.96 : 1.65;
    this.camHeight = THREE.MathUtils.damp(this.camHeight, targetCamH, 10, dt);
  }

  private updateKavitaAI(dt: number): void {
    if (this.kavitaState === 'inactive') {
      this.kavita.root.visible = false;
      this.kavitaThreat = Math.max(0, this.kavitaThreat - dt * 0.8);
      return;
    }

    this.kavita.root.visible = true;

    if (this.kavitaState === 'waiting_lobby') {
      // Counter Chudail Pose: stays behind Reception Counter watching Aarav!
      this.kavita.setTrayVisible(false);
      const offering = this.currentMission === 4 && !this.inventory.has('key_room13');
      this.kavita.setOfferKeyMode(offering);
      this.kavitaPos.set(0, 0, offering ? 11.48 : 11.15);
      const ang = Math.atan2(this.playerPos.x - this.kavitaPos.x, this.playerPos.z - this.kavitaPos.z);
      this.kavita.root.position.copy(this.kavitaPos);
      this.kavita.root.rotation.y = ang;
      this.kavita.updateAnimation(dt, 0, false, this.elapsedTotal);
      // Hidden suspicion subtly drives heartbeat & atmospheric vignette only in/near Lobby
      const nearCounter = Math.abs(this.playerPos.y) < 1.5 && this.playerPos.z > 4.0;
      const hiddenTension = nearCounter ? (this.suspicionLevel / 100) * 0.55 : (this.suspicionLevel / 100) * 0.18;
      this.kavitaThreat = THREE.MathUtils.clamp(hiddenTension, 0, 0.72);
      return;
    }

    this.kavita.setOfferKeyMode(false);
    if (this.kavitaState === 'wait_door') {
      this.kavita.setTrayVisible(!this.room13FoodDelivered && !this.knockPending);
      this.kavita.root.position.copy(this.kavitaPos);
      this.kavita.root.rotation.y = this.kavitaYaw;
      this.kavita.updateAnimation(dt, 0, false, this.elapsedTotal);
      this.kavitaThreat = 0.28;
      return;
    }

    if (this.kavitaState === 'delivering_food') {
      this.foodDeliveryTimer -= dt;
      if (this.foodDeliveryTimer > 2.2) {
        // Stand clearly visible right in the open Room 13 doorway holding the food tray!
        this.kavita.setTrayVisible(true);
        this.kavitaYaw = Math.atan2(this.playerPos.x - this.kavitaPos.x, this.playerPos.z - this.kavitaPos.z);
        this.kavita.root.position.copy(this.kavitaPos);
        this.kavita.root.rotation.y = this.kavitaYaw;
        this.kavita.updateAnimation(dt, 0, false, this.elapsedTotal);
      } else if (this.foodDeliveryTimer > 0) {
        // Place food onto Room 13 table & walk away down the corridor
        const foodMesh = this.world.interactables.get('int_r13_food');
        foodMesh?.children.forEach((c) => (c.visible = true));
        this.kavita.setTrayVisible(false);
        const exitTarget = _v1.set(2.4, 8.0, -0.35);
        const dir = _v2.subVectors(exitTarget, this.kavitaPos);
        const d = dir.length();
        if (d > 0.1) {
          dir.divideScalar(d);
          const step = Math.min(d, 1.65 * dt);
          this.kavitaPos.addScaledVector(dir, step);
          this.kavitaYaw = Math.atan2(dir.x, dir.z);
        }
        this.kavita.root.position.copy(this.kavitaPos);
        this.kavita.root.rotation.y = this.kavitaYaw;
        this.kavita.updateAnimation(dt, d > 0.1 ? 1.65 : 0, false, this.elapsedTotal);
      } else {
        const foodMesh = this.world.interactables.get('int_r13_food');
        foodMesh?.children.forEach((c) => (c.visible = true));
        this.kavita.setTrayVisible(false);
        this.kavitaState = 'waiting_lobby';
        this.kavitaPos.set(0, 0, 11.15);
        this.kavita.root.position.copy(this.kavitaPos);
      }
      this.kavitaThreat = 0.22;
      return;
    }

    const isChasingState = this.kavitaState === 'chase' || this.kavitaState === 'final_chase';
    this.kavita.setTrayVisible(!isChasingState);

    // Active Chase / Final Chase AI
    const distToPlayer = this.kavitaPos.distanceTo(this.playerPos);
    const sameFloor = Math.abs(this.kavitaPos.y - this.playerPos.y) < 2.1;

    // Visibility check (line of sight when player is not hiding)
    let canSeePlayer = false;
    if (!this.isHiding && sameFloor && distToPlayer < (this.flashlightOn ? 15.5 : 10.5)) {
      canSeePlayer = true;
      _v1.set(this.kavitaPos.x, this.kavitaPos.y + 1.45, this.kavitaPos.z);
      _v2.set(this.playerPos.x, this.playerPos.y + 1.45, this.playerPos.z);
      _v3.subVectors(_v2, _v1);
      const len = _v3.length();
      _v3.divideScalar(Math.max(0.01, len));
      for (let s = 0.6; s < len - 0.5; s += 0.6) {
        const sx = _v1.x + _v3.x * s;
        const sy = _v1.y + _v3.y * s;
        const sz = _v1.z + _v3.z * s;
        for (let ci = 0; ci < this.world.colliders.length; ci++) {
          const c = this.world.colliders[ci];
          if (c.tag !== 'wall') continue;
          if (sx >= c.minX && sx <= c.maxX && sy >= c.minY && sy <= c.maxY && sz >= c.minZ && sz <= c.maxZ) {
            canSeePlayer = false;
            break;
          }
        }
        if (!canSeePlayer) break;
      }
    }

    const hearsNoise = !this.isHiding && this.noiseEmitLevel > 0.6 && distToPlayer < 15.0;

    if (this.kavitaState === 'final_chase') {
      this.kavitaTargetPos.copy(this.playerPos);
    } else if (canSeePlayer) {
      this.kavitaState = 'chase';
      this.kavitaTargetPos.copy(this.playerPos);
      this.kavitaStateTimer = 5.5;
    } else if (hearsNoise && this.kavitaState !== 'chase') {
      this.kavitaState = 'investigate';
      this.kavitaTargetPos.copy(this.playerPos);
      this.kavitaStateTimer = 5.0;
    } else if (this.kavitaState === 'chase' || this.kavitaState === 'investigate') {
      this.kavitaStateTimer -= dt;
      if (this.kavitaStateTimer <= 0) {
        if (this.escapeActive) {
          // Return Counter Chudail behind reception counter after alert cools down!
          this.suspicionChaseActive = false;
          this.suspicionLevel = Math.min(this.suspicionLevel, 50);
          this.kavitaState = 'waiting_lobby';
          this.kavitaPos.set(0, 0, 11.15);
          this.kavita.root.position.copy(this.kavitaPos);
          return;
        }
        this.kavitaState = 'patrol';
      }
    }

    let moveSpeed = 1.95;
    if (this.kavitaState === 'chase') moveSpeed = 4.15;
    else if (this.kavitaState === 'final_chase') moveSpeed = 3.85;
    else if (this.kavitaState === 'investigate') moveSpeed = 2.65;

    if (this.kavitaState === 'patrol') {
      const wp = WAYPOINTS[this.kavitaWaypointIdx];
      this.kavitaTargetPos.set(wp.x, wp.y, wp.z);
      if (this.kavitaPos.distanceTo(this.kavitaTargetPos) < 1.1) {
        const neighbors = wp.neighbors;
        const nextId = neighbors[Math.floor(Math.random() * neighbors.length)];
        const foundIdx = WAYPOINTS.findIndex((w) => w.id === nextId);
        if (foundIdx >= 0) this.kavitaWaypointIdx = foundIdx;
      }
    } else if (!sameFloor && (this.kavitaState === 'chase' || this.kavitaState === 'final_chase')) {
      const playerFl = this.getFloorFromY(this.playerPos.y);
      const stairWp = WAYPOINTS.find((w) => w.floor === playerFl);
      if (stairWp) {
        this.kavitaTargetPos.set(stairWp.x, stairWp.y, stairWp.z);
        if (Math.abs(this.kavitaPos.y - stairWp.y) > 2.0 && distToPlayer > 7.5) {
          this.kavitaPos.set(stairWp.x, stairWp.y, stairWp.z);
        }
      }
    }

    _v1.subVectors(this.kavitaTargetPos, this.kavitaPos);
    const targetDist = _v1.length();
    if (targetDist > 0.15) {
      _v1.divideScalar(targetDist);
      const step = Math.min(targetDist, moveSpeed * dt);
      this.kavitaPos.addScaledVector(_v1, step);
      this.kavitaYaw = Math.atan2(_v1.x, _v1.z);
    }

    this.kavita.root.position.copy(this.kavitaPos);
    this.kavita.root.rotation.y = this.kavitaYaw;
    this.kavita.updateAnimation(dt, targetDist > 0.15 ? moveSpeed : 0, this.kavitaState === 'chase' || this.kavitaState === 'final_chase', this.elapsedTotal);

    const threatDist = Math.max(0, 1 - distToPlayer / 16.0);
    const chasingBoost = this.kavitaState === 'chase' || this.kavitaState === 'final_chase' ? 0.35 : 0;
    this.kavitaThreat = THREE.MathUtils.clamp((sameFloor ? threatDist : threatDist * 0.35) + chasingBoost, 0, 1);

    if (!this.isHiding && this.caughtCooldown <= 0 && distToPlayer < 1.15 && Math.abs(this.kavitaPos.y - this.playerPos.y) < 1.2) {
      this.caughtCooldown = 4.0;
      this.startChudailKillJumpscare('caught');
    }
  }

  private startChudailKillJumpscare(reason: 'caught' | 'wrong_answers'): void {
    if (this.cutscenePhase === 'jumpscare_kill') return;
    this.cutscenePhase = 'jumpscare_kill';
    this.cutsceneTimer = 0;
    this.jumpScareMode = reason;
    this.jumpScareDelivered = false;
    this.eyelidClose = 0;
    this.isHiding = false;
    this.isCrouching = false;
    this.isPeepholeActive = false;
    this.keys.clear();
    this.touchMove.x = 0;
    this.touchMove.y = 0;

    this.nightmareLightsApplied = true;
    this.applyTimeOfDayLighting();
    this.audio.playJumpScareScream();
    const killLine =
      reason === 'wrong_answers'
        ? 'झूठ बोलते हो!! अब तुम मेरे आखिरी निवाले बनोगे!!'
        : 'पकड़े गए! अब यहाँ से कोई बचकर नहीं जाएगा!';
    this.setSubtitle('काउंटर वाली चुड़ैल', `“${killLine}”`, 4.0);
    this.audio.speakScaryWoman(killLine);

    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
  }

  private triggerM7Complaint(): void {
    if (this.complaintDone || this.currentMission !== 7) return;
    this.complaintDone = true;
    const complainLine = 'मेरे खाने में पता नहीं कैसे मांस चला गया।';
    const kavitaReply = 'माफ करिएगा सर, शायद गलती से चला गया होगा। आप रूम में जाकर आराम कर लीजिए, सो जाइए।';
    this.audio.speakSequence([
      {
        role: 'player',
        text: complainLine,
        onStart: () => this.setSubtitle('आरव कुमार', `“${complainLine}”`, 4.8),
      },
      {
        role: 'chudail',
        text: kavitaReply,
        onStart: () => {
          this.setSubtitle('कविता (काउंटर वाली लड़की)', `“${kavitaReply}”`, 6.5);
          this.advanceMission(7);
        },
      },
    ]);
  }

  private triggerM9HungerTalk(): void {
    if (!this.hungryReady || this.hungerTalkDone || this.currentMission !== 9) return;
    this.hungerTalkDone = true;
    this.escapeActive = true;
    this.lobbyDialogueCooldown = 14.0;
    this.wasSeenInLobbyZone = true;
    const hungryLine = 'मेरे को बहुत भूख लग रही है।';
    const kavitaReply = 'ठीक है सर, मैं आपको खाना पहुँचा दूँगी।';
    const planLine = 'लगता है वह यहीं काउंटर से सब पर नजर रखेगी... चुपचाप रिसेप्शन के पीछे पुराना बहीखाता देखता हूँ!';
    this.audio.speakSequence([
      {
        role: 'player',
        text: hungryLine,
        onStart: () => this.setSubtitle('आरव कुमार', `“${hungryLine}”`, 4.0),
      },
      {
        role: 'chudail',
        text: kavitaReply,
        onStart: () => {
          this.setSubtitle('कविता (काउंटर वाली लड़की)', `“${kavitaReply}”`, 4.8);
          this.advanceMission(9);
        },
      },
      {
        role: 'player',
        text: planLine,
        onStart: () => this.setSubtitle('आरव कुमार', planLine, 6.5),
      },
    ]);
  }

  public startEntranceOpening(): void {
    this.cutscenePhase = 'none';
    this.cutsceneTimer = 0;
    this.eyelidClose = 0;
    this.isCrouching = false;
    this.isHiding = false;
    this.isPeepholeActive = false;
    this.keys.clear();
    this.touchMove.x = 0;
    this.touchMove.y = 0;
    this.playerPos.set(1.12, 0, 20.15);
    this.yaw = 0.22;
    this.pitch = 0.04;
    this.flashlightOn = true;
    this.scanNearbyInteractables();
    this.updateCameraAndFlashlight(0);
    this.hudSyncTimer = 1.0;
  }

  public startCarIntroCutscene(): void {
    this.cutscenePhase = 'car_intro';
    this.cutsceneTimer = 0;
    this.eyelidClose = 0;
    this.isCrouching = false;
    this.isHiding = false;
    this.isPeepholeActive = false;
    this.keys.clear();
    this.touchMove.x = 0;
    this.touchMove.y = 0;
    this.cutsceneFlags = {
      sleepingSpoken: false,
      dreamStarted: false,
      dreamChokeSpoken: false,
      morningTransitionDone: false,
      carSpoken: false,
      engineStallSpoken: false,
      headlightsOffSpoken: false,
      foodOpenSpoken: false,
      foodMeatSpoken: false,
      foodCompleteDone: false,
    };
    this.audio.prefetchSpeech('player', 'इतनी तेज बारिश और तूफान... रात बहुत हो चुकी है, किसी तरह घर पहुँचना होगा!');
    this.audio.prefetchSpeech('player', 'अरे! इंजन को क्या हुआ? गाड़ी अचानक बंद क्यों हो गई?! स्टार्ट ही नहीं हो रही!');
    this.audio.prefetchSpeech('player', 'मोबाइल में भी नेटवर्क नहीं है! सामने "शाही निवाला रेस्टोरेंट" का बोर्ड दिख रहा है... वहीं जाकर मदद माँगता हूँ।');
    // Position car back down the highway (X: 18, Z: 33) facing west along road
    this.playerPos.set(16.0, 0, 33.0);
    this.yaw = -Math.PI / 2;
    this.pitch = 0.04;
    this.flashlightOn = false;
  }

  private startFoodRevealCutscene(): void {
    this.cutscenePhase = 'food_reveal';
    this.cutsceneTimer = 0;
    this.eyelidClose = 0;
    this.isCrouching = false;
    this.isHiding = false;
    this.isPeepholeActive = false;
    this.keys.clear();
    this.touchMove.x = 0;
    this.touchMove.y = 0;
    this.cutsceneFlags = {
      sleepingSpoken: false,
      dreamStarted: false,
      dreamChokeSpoken: false,
      morningTransitionDone: false,
      carSpoken: false,
      engineStallSpoken: false,
      headlightsOffSpoken: false,
      foodOpenSpoken: false,
      foodMeatSpoken: false,
      foodCompleteDone: false,
    };
    this.audio.prefetchSpeech('player', 'देखता हूँ, खाने में क्या भेजा है...');
    this.audio.prefetchSpeech(
      'player',
      'अरे यह क्या?! मेरे खाने में मांस मिला है! मैं यह बिल्कुल नहीं खाऊँगा... चलो, काउंटर वाली लड़की को कंप्लेंट करते हैं!'
    );
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
  }

  private startSleepCutscene(mode: 'nightmare' | 'sleep_next_day' | 'sleep_rest'): void {
    this.cutscenePhase = mode;
    this.cutsceneTimer = 0;
    this.eyelidClose = 0;
    this.isCrouching = false;
    this.isHiding = false;
    this.isPeepholeActive = false;
    this.keys.clear();
    this.touchMove.x = 0;
    this.touchMove.y = 0;
    this.cutsceneFlags = {
      sleepingSpoken: false,
      dreamStarted: false,
      dreamChokeSpoken: false,
      morningTransitionDone: false,
      carSpoken: false,
      engineStallSpoken: false,
      headlightsOffSpoken: false,
      foodOpenSpoken: false,
      foodMeatSpoken: false,
      foodCompleteDone: false,
    };
    if (mode === 'nightmare') {
      this.audio.prefetchSpeech('chudail', 'कहाँ बचकर जाओगे... आज रात तुम यहाँ से जिंदा बाहर नहीं निकलोगे!');
      this.audio.prefetchSpeech(
        'player',
        'अरे यह डरावना सपना कैसा था! मेरे को यहाँ से बाहर निकलना होगा, एस्केप करना होगा!'
      );
    }
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
  }

  private updateSleepCutscene(dt: number): void {
    this.cutsceneTimer += dt;
    const t = this.cutsceneTimer;

    // -1. Terrifying Chudail Kill Jump-Scare Lunge!
    if (this.cutscenePhase === 'jumpscare_kill') {
      const lookDirX = -Math.sin(this.yaw);
      const lookDirZ = -Math.cos(this.yaw);
      const camX = this.playerPos.x;
      const camY = this.playerPos.y + 1.65;
      const camZ = this.playerPos.z;

      // Kavita snaps 0.62m directly in front of player's face!
      this.kavita.root.visible = true;
      this.kavita.setTrayVisible(false);
      this.kavita.setOfferKeyMode(false);
      this.kavita.setNightmareLungePose(true, 1.0);
      this.kavita.root.position.set(
        camX + lookDirX * 0.62,
        this.playerPos.y + 0.08,
        camZ + lookDirZ * 0.62
      );
      this.kavita.root.rotation.y = Math.atan2(camX - this.kavita.root.position.x, camZ - this.kavita.root.position.z);
      this.kavita.updateAnimation(dt, 0, true, this.elapsedTotal);

      const shakeX = Math.sin(t * 58) * 0.042;
      const shakeY = Math.cos(t * 64) * 0.036;
      this.camera.position.set(camX + shakeX, camY + shakeY, camZ);
      this.camera.lookAt(
        this.kavita.root.position.x,
        this.kavita.root.position.y + 1.48,
        this.kavita.root.position.z
      );
      this.flashlight.intensity = Math.sin(t * 48) > 0 ? 5.2 : 0.8;
      this.flashlight.position.copy(this.camera.position);
      this.flashlight.target.position.set(
        this.kavita.root.position.x,
        this.kavita.root.position.y + 1.42,
        this.kavita.root.position.z
      );
      this.flashlight.target.updateMatrixWorld();
      this.kavitaThreat = 1.0;

      if (t >= 1.05 && !this.jumpScareDelivered) {
        this.jumpScareDelivered = true;
        this.nightmareLightsApplied = false;
        this.kavita.setNightmareLungePose(false);
        this.applyTimeOfDayLighting();
        this.cutscenePhase = 'none';
        this.paused = true;
        this.callbacks.onPlayerCaught(this.jumpScareMode);
      }
      return;
    }

    // 0. Car Driving Cinematic Scene on Stormy Highway (3D Scene showing how Aarav got trapped!)
    if (this.cutscenePhase === 'car_intro') {
      this.flashlight.intensity = 0;

      // Phase 1 (0.0s .. 5.2s): Aarav is driving the car along the dark stormy highway
      if (t < 5.2) {
        if (!this.cutsceneFlags.carSpoken) {
          this.cutsceneFlags.carSpoken = true;
          const driveLine = 'इतनी तेज बारिश और तूफान... रात बहुत हो चुकी है, किसी तरह घर पहुँचना होगा!';
          this.setSubtitle('आरव कुमार', driveLine, 5.0);
          this.audio.speakPlayerMale(driveLine);
        }
        // Move car & camera from east down highway toward restaurant frontage
        const p = THREE.MathUtils.clamp(t / 5.2, 0, 1);
        const curCarX = 18.0 - p * 21.0;
        this.camera.position.set(curCarX - 0.2, 1.25, 33.0);
        this.camera.rotation.set(0.02, -Math.PI / 2 + Math.sin(t * 12) * 0.012, 0); // slight wheel vibration

        // Headlight sweep ahead
        this.flashlight.intensity = 4.2;
        this.flashlight.position.set(curCarX - 1.2, 0.7, 33.0);
        this.flashlight.target.position.set(curCarX - 12.0, 0.5, 33.0);
        this.flashlight.target.updateMatrixWorld();
        return;
      }

      // Phase 2 (5.2s .. 10.6s): Engine starts sputtering, breaks down and smoke rises
      if (t < 10.6) {
        if (!this.cutsceneFlags.engineStallSpoken) {
          this.cutsceneFlags.engineStallSpoken = true;
          this.audio.playCarStall();
          const stallLine = 'अरे! इंजन को क्या हुआ? गाड़ी अचानक बंद क्यों हो गई?! स्टार्ट ही नहीं हो रही!';
          this.setSubtitle('आरव कुमार', stallLine, 5.0);
          this.audio.speakPlayerMale(stallLine);
        }
        // Camera pans outside as Aarav gets out of the car in the rain
        const panEase = THREE.MathUtils.clamp((t - 5.2) / 3.8, 0, 1);
        this.camera.position.lerpVectors(_v1.set(-3.2, 1.25, 33.0), _v2.set(-2.5, 1.65, 31.0), panEase);
        this.camera.lookAt(-4.2, 0.9, 32.8); // looking down at broken smoking car
        return;
      }

      // Phase 3 (10.6s .. 16.5s): Aarav looks across at the glowing "शाही निवाला रेस्टोरेंट" signboard
      if (t < 16.5) {
        if (!this.cutsceneFlags.headlightsOffSpoken) {
          this.cutsceneFlags.headlightsOffSpoken = true;
          const trappedLine = 'मोबाइल में भी नेटवर्क नहीं है! सामने "शाही निवाला रेस्टोरेंट" का बोर्ड दिख रहा है... वहीं जाकर मदद माँगता हूँ।';
          this.setSubtitle('आरव कुमार', trappedLine, 5.8);
          this.audio.speakPlayerMale(trappedLine);
        }
        this.camera.position.set(-2.5, 1.65, 30.5);
        // Look up toward restaurant entrance and neon signboard at (0, 3.4, 18.5)
        this.camera.lookAt(0, 3.2, 18.5);
        return;
      }

      // End of Car Driving Intro -> Player now has full controls in front of restaurant!
      this.cutscenePhase = 'none';
      this.playerPos.set(0, 0, 24.5);
      this.yaw = 0;
      this.pitch = 0.05;
      this.flashlightOn = true;
      const readyMsg = 'सामने मुख्य द्वार है — घंटी बजाकर दरवाजा खोलने को कहता हूँ।';
      this.setSubtitle('आरव कुमार', readyMsg, 4.0);
      return;
    }

    // 0B. Room 13 Food Reveal Cutscene — Lifting Cloche Lid to Discover Raw Meat on Plate!
    if (this.cutscenePhase === 'food_reveal') {
      const startCam = _v1.set(this.playerPos.x, 9.6, this.playerPos.z);
      const tableView = _v2.set(-1.5, 9.54, -8.56);
      const closeMeatView = _v3.set(-1.5, 9.3, -8.88);
      const plateFocus = new THREE.Vector3(-1.5, 8.88, -9.5);

      // Shine flashlight clearly onto the plate so raw meat & bone are unmistakable
      this.flashlight.intensity = 4.2;

      if (t < 2.0) {
        if (!this.cutsceneFlags.foodOpenSpoken) {
          this.cutsceneFlags.foodOpenSpoken = true;
          const openLine = 'देखता हूँ, खाने में क्या भेजा है...';
          this.setSubtitle('आरव कुमार', openLine, 2.2);
          this.audio.speakPlayerMale(openLine);
        }
        const p = THREE.MathUtils.clamp(t / 1.4, 0, 1);
        this.camera.position.lerpVectors(startCam, tableView, p);
        this.camera.lookAt(plateFocus);
        this.flashlight.position.copy(this.camera.position);
        this.flashlight.target.position.copy(plateFocus);
        this.flashlight.target.updateMatrixWorld();
        return;
      }

      // Phase 2 (2.0s .. 3.4s): Silver cloche lid lifts off and moves aside!
      const liftP = THREE.MathUtils.clamp((t - 2.0) / 1.25, 0, 1);
      if (this.world.foodClocheGroup) {
        // Arc upward first, then rest neatly beside the plate
        const arcY = Math.sin(liftP * Math.PI) * 0.28 + liftP * 0.02;
        this.world.foodClocheGroup.position.set(liftP * 0.42, arcY, -liftP * 0.12);
        this.world.foodClocheGroup.rotation.z = -liftP * 0.35;
      }

      if (t >= 2.15 && !this.cutsceneFlags.foodMeatSpoken) {
        this.cutsceneFlags.foodMeatSpoken = true;
        this.audio.playSwitchClick();
        this.audio.playHorrorSting();
        const meatLine =
          'अरे यह क्या?! मेरे खाने में मांस मिला है! मैं यह बिल्कुल नहीं खाऊँगा... चलो, काउंटर वाली लड़की को कंप्लेंट करते हैं!';
        this.setSubtitle('आरव कुमार', meatLine, 6.2);
        this.audio.speakPlayerMale(meatLine);
      }

      if (t < 7.8) {
        const zoomP = THREE.MathUtils.clamp((t - 2.2) / 2.0, 0, 1);
        this.camera.position.lerpVectors(tableView, closeMeatView, zoomP);
        // Subtle shock tremor right after spotting raw meat
        const shockAmp = t > 2.3 && t < 4.5 ? 0.008 : 0;
        this.camera.position.x += Math.sin(t * 26) * shockAmp;
        this.camera.position.y += Math.cos(t * 32) * shockAmp;
        this.camera.lookAt(plateFocus);
        this.flashlight.position.copy(this.camera.position);
        this.flashlight.target.position.copy(plateFocus);
        this.flashlight.target.updateMatrixWorld();
        return;
      }

      // End of Food Reveal Cutscene -> Room 13 door unlocks so player goes downstairs to complain!
      if (!this.cutsceneFlags.foodCompleteDone) {
        this.cutsceneFlags.foodCompleteDone = true;
        this.room13FoodInspected = true;
        this.room13DoorJammed = false;
        if (this.world.foodClocheGroup) {
          this.world.foodClocheGroup.position.set(0.42, 0.02, -0.12);
          this.world.foodClocheGroup.rotation.z = -0.35;
        }
        const r13Door = this.world.doors.get('door_f2_r13');
        if (r13Door) {
          r13Door.isOpen = true;
          r13Door.targetAngle = Math.PI * 0.48;
        }
        this.kavitaState = 'waiting_lobby';
        this.kavita.setTrayVisible(false);
        this.kavita.setOfferKeyMode(false);
        this.kavitaPos.set(0, 0, 11.15);
        this.kavita.root.position.copy(this.kavitaPos);
        this.kavita.root.visible = true;
        this.advanceMission(6);
      }

      this.cutscenePhase = 'none';
      this.eyelidClose = 0;
      this.playerPos.set(-1.6, FLOOR_Y['2'], -7.5);
      this.yaw = Math.PI;
      this.pitch = 0.02;
      this.setSubtitle('आरव कुमार', 'चलो, नीचे रिसेप्शन काउंटर पर जाकर काउंटर वाली लड़की को कंप्लेंट करते हैं।', 4.5);
      return;
    }

    this.flashlight.intensity = 0;

    if (this.cutscenePhase === 'nightmare') {
      // Phase 1 (0.0s .. 3.6s): Aarav lies down on Room 13 bed, looks up at turning ceiling fan, eyelids slowly close
      if (t < 3.6) {
        if (!this.cutsceneFlags.sleepingSpoken) {
          this.cutsceneFlags.sleepingSpoken = true;
          const restLine = 'बहुत थकान हो रही है... अब सो जाता हूँ।';
          this.setSubtitle('आरव कुमार', restLine, 3.3);
          this.audio.speakPlayerMale(restLine);
        }
        const blend = THREE.MathUtils.clamp(t / 1.25, 0, 1);
        this.camera.position.lerpVectors(_v1.set(this.playerPos.x, 8.95, this.playerPos.z), _v2.set(-5.2, 8.96, -10.16), blend);
        this.camera.lookAt(-3.6, 11.1, -9.15);
        this.eyelidClose = THREE.MathUtils.clamp((t - 1.75) / 1.6, 0, 1);
        this.kavitaThreat = THREE.MathUtils.clamp(t * 0.08, 0, 0.25);
        return;
      }

      // Phase 2 (3.6s .. 10.6s): Dark Crimson Dream Scene — Counter Chudail hovering over Bed grabbing Aarav's throat!
      if (t < 10.6) {
        if (!this.cutsceneFlags.dreamStarted) {
          this.cutsceneFlags.dreamStarted = true;
          this.nightmareLightsApplied = true;
          this.world.lamps.forEach((l) => {
            l.bulbMat.emissiveIntensity = 0;
          });
          this.applyTimeOfDayLighting();
          this.audio.playHorrorSting();
        }
        const openEase = THREE.MathUtils.clamp((t - 3.65) / 0.5, 0, 1);
        this.eyelidClose = 1 - openEase * 0.92; // tense panicked squint
        const chokeP = THREE.MathUtils.clamp((t - 3.85) / 6.2, 0, 1);

        // Position Chudail hovering closely over the bed reaching directly toward Aarav's throat!
        this.kavita.root.visible = true;
        this.kavita.setTrayVisible(false);
        this.kavita.setOfferKeyMode(false);
        this.kavita.setNightmareLungePose(true, chokeP);
        this.kavita.root.position.set(-5.2, 7.84 + chokeP * 0.08, -8.92 - chokeP * 0.34);
        this.kavita.root.rotation.y = Math.PI; // Facing directly north toward sleeper pillow (-10.16)!
        this.kavita.updateAnimation(dt, 0, true, this.elapsedTotal);

        const shakeX = Math.sin(t * 28) * (0.012 + chokeP * 0.025);
        const shakeY = Math.cos(t * 34) * (0.01 + chokeP * 0.019);
        this.camera.position.set(-5.2 + shakeX, 8.94 + shakeY, -10.16);
        this.camera.lookAt(-5.2, 9.24 - chokeP * 0.14, -9.45);
        this.kavitaThreat = 0.85 + chokeP * 0.15;

        if (t >= 3.9 && !this.cutsceneFlags.dreamChokeSpoken) {
          this.cutsceneFlags.dreamChokeSpoken = true;
          const dreamLine = 'कहाँ बचकर जाओगे... आज रात तुम यहाँ से जिंदा बाहर नहीं निकलोगे!';
          this.setSubtitle('सपने में काउंटर वाली चुड़ैल', `“${dreamLine}”`, 6.2);
          this.audio.speakScaryWoman(dreamLine);
        }
        return;
      }

      // Phase 3 (10.6s .. 11.45s): Bolt Awake in Bed!
      if (!this.cutsceneFlags.morningTransitionDone) {
        this.cutsceneFlags.morningTransitionDone = true;
        this.nightmareLightsApplied = false;
        this.kavita.setNightmareLungePose(false);
        this.kavita.setTrayVisible(false);
        this.kavitaState = 'waiting_lobby';
        this.kavitaPos.set(0, 0, 11.15);
        this.kavita.root.position.copy(this.kavitaPos);

        this.nightmareDone = true;
        this.clockMinutes += 140; // ~रात 2:05
        this.stamina = 100;
        this.applyTimeOfDayLighting();

        // Stand Aarav upright beside Room 13 bed, closing door gently so Kavita knocks next!
        this.playerPos.set(-3.8, FLOOR_Y['2'], -9.5);
        this.yaw = Math.PI / 2;
        this.pitch = 0.05;
        const r13Door = this.world.doors.get('door_f2_r13');
        if (r13Door) {
          r13Door.isOpen = false;
          r13Door.targetAngle = 0;
        }
        this.audio.playHorrorSting();
        this.kavitaThreat = 0.2;
        this.advanceMission(8);

        const wakeLine =
          'अरे यह डरावना सपना कैसा था! मेरे को यहाँ से बाहर निकलना होगा, एस्केप करना होगा!';
        this.audio.speakSequence([
          {
            role: 'player',
            text: wakeLine,
            onStart: () => this.setSubtitle('आरव कुमार', wakeLine, 6.2),
            onEnd: () => {
              this.scheduleTimer(() => {
                if (!this.knockSceneDone && !this.escapeActive) {
                  this.knockPending = true;
                  this.audio.playKnock();
                  this.kavitaState = 'wait_door';
                  this.kavitaPos.set(-3.0, 8.0, -1.0);
                  this.kavitaYaw = Math.PI;
                  this.kavita.root.position.copy(this.kavitaPos);
                  this.kavita.root.rotation.y = this.kavitaYaw;
                  this.kavita.root.visible = true;
                  this.setSubtitle('कविता (दरवाजे के बाहर से)', 'सर... कुछ खाएंगे सर क्या? दरवाजा खोलिए।', 5.8);
                }
              }, 1600);
            },
          },
        ]);
      }
      this.eyelidClose = THREE.MathUtils.clamp(1 - (t - 10.6) / 0.65, 0, 1);
      this.camera.position.set(this.playerPos.x, this.playerPos.y + 1.65, this.playerPos.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      if (t >= 11.45) {
        this.cutscenePhase = 'none';
        this.eyelidClose = 0;
      }
      return;
    }

    // Standard Sleeping into Next Day Morning in Hotel ('sleep_next_day' or 'sleep_rest')!
    if (t < 3.5) {
      if (!this.cutsceneFlags.sleepingSpoken) {
        this.cutsceneFlags.sleepingSpoken = true;
        const sleepLine = 'अब आंखें बंद करके सो जाता हूँ...';
        this.setSubtitle('आरव कुमार', sleepLine, 3.2);
        this.audio.speakPlayerMale(sleepLine);
      }
      const blend = THREE.MathUtils.clamp(t / 1.2, 0, 1);
      this.camera.position.lerpVectors(_v1.set(this.playerPos.x, 8.95, this.playerPos.z), _v2.set(-5.2, 8.96, -10.16), blend);
      this.camera.lookAt(-3.2, 11.15, -9.2);
      this.eyelidClose = THREE.MathUtils.clamp((t - 1.55) / 1.65, 0, 1);
      return;
    }

    if (t < 4.7) {
      this.eyelidClose = 1.0;
      if (!this.cutsceneFlags.morningTransitionDone) {
        this.cutsceneFlags.morningTransitionDone = true;
        this.dayNumber += 1;
        this.clockMinutes = 450; // सुबह 7:30 (Next Day in Hotel!)
        this.stamina = 100;
        this.suspicionLevel = Math.max(0, this.suspicionLevel - 45);
        this.suspicionChaseActive = false;
        this.applyTimeOfDayLighting();

        if (this.kavitaState !== 'final_chase' && this.kavitaState !== 'window_ending') {
          this.kavita.setNightmareLungePose(false);
          this.kavitaState = 'waiting_lobby';
          this.kavitaPos.set(0, 0, 11.15);
          this.kavita.root.position.copy(this.kavitaPos);
        }

        this.playerPos.set(-3.8, FLOOR_Y['2'], -9.5);
        this.yaw = Math.PI / 2;
        this.pitch = 0.02;
      }
      this.camera.position.set(this.playerPos.x, this.playerPos.y + 1.65, this.playerPos.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      return;
    }

    // Opening eyes on the Next Morning inside the Haunted Hotel!
    this.eyelidClose = THREE.MathUtils.clamp(1 - (t - 4.7) / 1.45, 0, 1);
    this.camera.position.set(this.playerPos.x, this.playerPos.y + 1.65, this.playerPos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);

    if (t >= 6.2) {
      const modeDone = this.cutscenePhase;
      this.cutscenePhase = 'none';
      this.eyelidClose = 0;
      if (modeDone === 'sleep_next_day') {
        this.hungryReady = true;
        const hungerLine =
          'अगला दिन शुरू हो गया... मेरे को तो बहुत भूख लग रही है। अब नीचे जाकर काउंटर वाली लड़की को बोलता हूँ — तभी उसे मुझ पर कोई शक नहीं होगा।';
        this.setSubtitle('आरव कुमार', hungerLine, 7.6);
        this.audio.speakPlayerMale(hungerLine);
      } else {
        const wakeMsg = `होटल में ${this.formatHindiClock(this.clockMinutes)} हो चुके हैं। अब सावधानी से बाहर निकलने का रास्ता खोजते हैं।`;
        this.setSubtitle('आरव कुमार', wakeMsg, 5.8);
        this.audio.speakPlayerMale(wakeMsg);
      }
    }
  }

  private checkStoryTriggers(dt: number): void {
    // Mission 2: Only AFTER stepping completely INSIDE the restaurant lobby (z < 15.2) -> Main Door slams shut & locks!
    if (this.currentMission === 2 && Math.abs(this.playerPos.y) < 0.8 && this.playerPos.z < 15.2 && Math.abs(this.playerPos.x) < 7.2) {
      this.advanceMission(2);

      // Slam & lock main entrance door immediately!
      const mainDoor = this.world.doors.get('door_main_entrance');
      if (mainDoor) {
        mainDoor.isOpen = false;
        mainDoor.targetAngle = 0;
        this.unlockedDoors.delete('door_main_entrance');
      }
      this.audio.playDoorCreak(true);
      this.audio.playHorrorSting();

      const aaravLine = 'अरे! दरवाजा पीछे से अपने आप कैसे बंद और लॉक हो गया?! यह क्या हो रहा है!';
      const kavitaLine = 'स्वागत है साहब... अब यहाँ से कोई बाहर नहीं जा सकता। आइए, रजिस्टर में अपना नाम लिख दीजिए।';
      this.audio.speakSequence([
        {
          role: 'player',
          text: aaravLine,
          onStart: () => this.setSubtitle('आरव कुमार (घबराया हुआ)', aaravLine, 5.5),
        },
        {
          role: 'chudail',
          text: kavitaLine,
          onStart: () => {
            this.setSubtitle('कविता (काउंटर वाली चुड़ैल)', kavitaLine, 6.5);
          },
        },
      ]);
    }

    // Track whether Player is visible in Ground Lobby to the Counter Chudail (NO clicking required!)
    const inLobbyFloorBounds =
      Math.abs(this.playerPos.y) < 0.9 &&
      Math.abs(this.playerPos.x) < 7.8 &&
      this.playerPos.z >= 5.2 &&
      this.playerPos.z <= 17.6;

    if (!inLobbyFloorBounds) {
      this.wasSeenInLobbyZone = false;
      this.lobbyAutoWaitTimer = 0;
    } else if (!this.isHiding && this.kavitaState === 'waiting_lobby') {
      // Auto M7 Complaint when coming downstairs to Reception Counter
      if (this.currentMission === 7 && !this.complaintDone) {
        this.triggerM7Complaint();
        return;
      }
      // Auto M9 Hunger conversation when coming downstairs on Next Morning
      if (this.currentMission === 9 && this.hungryReady && !this.hungerTalkDone) {
        this.triggerM9HungerTalk();
        return;
      }
      // Auto M10-M25 Counter Chudail Questioning as soon as she sees Aarav in Lobby!
      if (this.escapeActive && !this.suspicionChaseActive) {
        const justEntered = !this.wasSeenInLobbyZone;
        this.wasSeenInLobbyZone = true;
        this.lobbyAutoWaitTimer += dt;
        const holdingMainKeyNow = this.inventory.has('key_main_door') && !this.finalQuestionAsked;

        if (holdingMainKeyNow || (this.lobbyDialogueCooldown <= 0 && (justEntered || this.lobbyAutoWaitTimer >= 4.0))) {
          this.lobbyAutoWaitTimer = 0;
          if (holdingMainKeyNow) {
            this.finalQuestionAsked = true;
            this.lobbyDialogueCooldown = 14.0;
            this.callbacks.onOpenPuzzle('chudail_dialogue', 'Q_FINAL');
            return;
          }
          const qId = ['Q1', 'Q2', 'Q3', 'Q4'][this.dialogueCount % 4];
          this.dialogueCount += 1;
          this.lobbyDialogueCooldown = 14.0;
          this.callbacks.onOpenPuzzle('chudail_dialogue', qId);
          return;
        }
      }
    }

    // Retroactive inventory/door progression safety across all 26 missions
    if (this.currentMission === 10 && this.inventory.has('key_store_room')) {
      this.advanceMission(10);
    } else if (this.currentMission === 11 && this.inventory.has('key_cctv') && this.inventory.has('card_cctv')) {
      this.advanceMission(11);
    } else if (this.currentMission === 13 && this.collectedLore.has('lore_store_clue')) {
      this.advanceMission(13);
    } else if (this.currentMission === 14 && this.inventory.has('paper_password')) {
      this.advanceMission(14);
    } else if (this.currentMission === 15 && this.inventory.has('diary_ramesh')) {
      this.advanceMission(15);
    } else if (this.currentMission === 16 && this.inventory.has('key_owner_office')) {
      this.advanceMission(16);
    } else if (this.currentMission === 17 && this.inventory.has('key_basement') && this.inventory.has('note_office_drawer')) {
      this.advanceMission(17);
    } else if (this.currentMission === 18 && this.unlockedDoors.has('door_g_basement') && this.playerPos.y < -2.2) {
      this.advanceMission(18);
    } else if (this.currentMission === 19 && this.collectedLore.has('lore_cold_storage')) {
      this.advanceMission(19);
    } else if (this.currentMission === 20 && this.inventory.has('guest_list') && this.inventory.has('record_room13')) {
      this.advanceMission(20);
    } else if (this.currentMission === 21 && this.powerRestored) {
      this.advanceMission(21);
    } else if (this.currentMission === 22 && this.kitchenSecretOpened) {
      this.advanceMission(22);
    } else if (this.currentMission === 23 && this.kitchenAlmirahOpened) {
      this.advanceMission(23);
    } else if (this.currentMission === 24 && this.inventory.has('key_main_door')) {
      this.advanceMission(24);
    }

    // Mission 25 -> 26: Approaching Main Entrance holding Real Main Door Key
    if (
      this.currentMission === 25 &&
      this.inventory.has('key_main_door') &&
      Math.abs(this.playerPos.y) < 1.2 &&
      Math.abs(this.playerPos.x) < 4.5 &&
      this.playerPos.z > 14.0
    ) {
      this.advanceMission(25);
    }

    // Victory / Ending Trigger: Escaped out Main Entrance Door OR Back Courtyard Gate!
    if (
      ((this.currentMission === 26 || (this.escapeActive && this.inventory.has('key_main_door'))) &&
        this.unlockedDoors.has('door_main_entrance') &&
        this.playerPos.z > 20.5 &&
        Math.abs(this.playerPos.y) < 1.5) ||
      (this.currentMission >= 25 && this.playerPos.z < -36.5 && Math.abs(this.playerPos.y) < 1.5)
    ) {
      this.startEndingSequence();
    }
  }

  private startEndingSequence(): void {
    this.endingPhase = true;
    this.endingTimer = 0;
    this.kavitaState = 'window_ending';
    this.audio.setRainIndoorFactor(true, true);
    this.world.rainSystem.visible = false; // Rain clears into dawn!
    (this.world.skyBackdrop.material as THREE.MeshBasicMaterial).color.setHex(0x1f2b47);
    this.scene.background = new THREE.Color(0x1f2b47);
    this.scene.fog = new THREE.FogExp2(0x1f2b47, 0.014);
    this.hemiLight.color.setHex(0x88a4cf);
    this.hemiLight.intensity = 1.05;
    this.moonLight.color.setHex(0xffcb8c);
    this.moonLight.intensity = 1.1;

    // Position player outside looking back north up at 4th floor watch window
    this.playerPos.set(3.75, 0, 34.0);
    this.yaw = 0;
    this.pitch = 0.72;

    // Place Kavita watching eerily from the 4th-floor upper window!
    this.kavita.setTrayVisible(false);
    this.kavitaPos.set(3.75, 16.0, 17.3);
    this.kavita.root.position.copy(this.kavitaPos);
    this.kavita.root.rotation.y = 0;
    this.kavita.root.visible = true;
    const chudailWindowLine = 'आपको लगता है कि आप यहाँ से बचकर निकल गए?';
    this.setSubtitle('काउंटर वाली चुड़ैल (ऊपरी खिड़की से)', `“${chudailWindowLine}”`, 4.8);
    this.audio.speakScaryWoman(chudailWindowLine);
  }

  private updateEndingSequence(dt: number): void {
    this.endingTimer += dt;
    this.camera.position.set(this.playerPos.x, 1.65, this.playerPos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 50, 1.4, dt);
    this.camera.updateProjectionMatrix();
    this.kavita.updateAnimation(dt, 0, false, this.elapsedTotal);

    if (this.endingTimer > 4.2 && this.endingTimer < 4.4) {
      this.audio.playMessageBeep();
      this.callbacks.onEscapeEnding(Math.floor(this.playTimeSeconds));
    }
  }

  private scanNearbyInteractables(): void {
    if (this.isHiding) {
      this.nearbyTarget = {
        type: 'hide',
        id: this.currentHideId || '',
        prompt: 'छिपने की जगह से बाहर निकलें',
      };
      return;
    }

    // Reception Counter Top-Priority Assist (Register in M2-3, Key in M4, Complaint M7, Hunger M9)
    const atReceptionCounter =
      Math.abs(this.playerPos.y) < 1.2 &&
      Math.abs(this.playerPos.x) < 4.5 &&
      this.playerPos.z >= 9.6 &&
      this.playerPos.z <= 15.6;

    if (atReceptionCounter) {
      if (this.currentMission === 4 && !this.inventory.has('key_room13')) {
        this.nearbyTarget = {
          type: 'interactable',
          id: 'int_key_room13',
          prompt: 'कविता के हाथ से कमरा नंबर 13 की चाबी उठाएँ',
        };
        return;
      }
      if (!this.solvedPuzzles.has('register') && this.currentMission >= 2 && this.currentMission <= 3) {
        this.nearbyTarget = {
          type: 'interactable',
          id: 'int_register',
          prompt: 'मेहमान रजिस्टर में कलम से अपना नाम "आरव कुमार" लिखें',
        };
        return;
      }
      if (this.currentMission === 7 && !this.complaintDone && this.playerPos.z >= 11.2) {
        this.nearbyTarget = {
          type: 'interactable',
          id: 'int_kavita_counter',
          prompt: 'खाने में मांस निकलने की शिकायत काउंटर वाली लड़की से करें',
        };
        return;
      }
      if (this.currentMission === 9 && this.hungryReady && !this.hungerTalkDone && this.playerPos.z >= 11.2) {
        this.nearbyTarget = {
          type: 'interactable',
          id: 'int_kavita_counter',
          prompt: 'काउंटर वाली लड़की से भूख लगने की बात कहें',
        };
        return;
      }
    }

    let bestDist = 2.65;
    let best: typeof this.nearbyTarget = null;
    const eyeY = this.playerPos.y + this.camHeight;

    // Check Doors
    for (const d of DOORS) {
      const dr = this.world.doors.get(d.id);
      if (!dr) continue;
      // Do not offer to close the open main entrance door while player is still outside walking in
      if (d.id === 'door_main_entrance' && this.currentMission === 2 && dr.isOpen && this.playerPos.z >= 15.2) {
        continue;
      }
      const dist = Math.hypot(this.playerPos.x - d.x, eyeY - (dr.y + 1.3), this.playerPos.z - d.z);
      if (dist < bestDist) {
        bestDist = dist;
        const actionWord = dr.isOpen ? 'बंद करें' : 'खोलें';
        const sec =
          d.hasPeephole && !dr.isOpen && this.playerPos.z < d.z
            ? 'दरवाजे के छोटे छेद से बाहर देखें'
            : undefined;
        best = {
          type: 'door',
          id: d.id,
          prompt: `${d.label} ${actionWord}`,
          secondary: sec,
        };
      }
    }

    // Check Interactables
    for (const item of INTERACTABLES) {
      if (item.id === 'int_entrance_bell') {
        if (this.currentMission >= 3 || this.playerPos.z < 16.5) continue;
      } else if (this.openedInteractables.has(item.id)) {
        continue;
      }
      if (item.id === 'int_register' && (this.currentMission >= 4 || this.solvedPuzzles.has('register'))) continue;
      if (item.id === 'int_key_room13' && (this.currentMission !== 4 || this.inventory.has('key_room13'))) continue;
      if (item.kind === 'kavita_counter' && (this.kavitaState !== 'waiting_lobby' || (this.currentMission === 8))) continue;
      if (item.requiredMissionMin && this.currentMission < item.requiredMissionMin) continue;
      if (item.kind === 'food_tray' && (!this.room13FoodDelivered || this.room13FoodInspected || (this.kavitaState === 'delivering_food' && this.foodDeliveryTimer > 2.3))) continue;
      if (item.kind === 'telephone' && (!this.room13FoodInspected || this.room13PhoneAnswered)) continue;
      const iy = FLOOR_Y[item.floor] + item.yOffset;
      const dist = Math.hypot(this.playerPos.x - item.x, eyeY - iy, this.playerPos.z - item.z);
      const maxReach =
        item.id === 'int_key_room13' || item.id === 'int_register' || item.id === 'int_kavita_counter'
          ? Math.max(bestDist, 3.6)
          : bestDist;
      if (dist < maxReach) {
        bestDist = dist;
        best = {
          type: 'interactable',
          id: item.id,
          prompt: item.prompt,
        };
      }
    }

    // Check Hiding Spots (disable reception sofa hide spot before escape & avoid overriding sleep_bed right beside bed!)
    for (const h of HIDE_SPOTS) {
      if (h.id === 'hide_g_lobby_sofa' && this.currentMission <= 9) continue;
      if (h.id === 'hide_f2_r13_bed' && (this.currentMission === 8 || (this.currentMission === 9 && this.knockSceneDone && !this.hungryReady))) continue;
      const hy = FLOOR_Y[h.floor] + 0.8;
      const dist = Math.hypot(this.playerPos.x - h.x, eyeY - hy, this.playerPos.z - h.z);
      if (dist < bestDist) {
        bestDist = dist;
        best = {
          type: 'hide',
          id: h.id,
          prompt: h.label,
        };
      }
    }

    this.nearbyTarget = best;
  }

  private updateCameraAndFlashlight(dt: number): void {
    if (this.cctvActiveCam !== null) {
      const camCfg = CCTV_CAMERAS[this.cctvActiveCam % CCTV_CAMERAS.length];
      this.camera.position.set(...camCfg.pos);
      this.camera.fov = 68;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(...camCfg.target);
      this.flashlight.intensity = 0;
      return;
    }

    if (this.isPeepholeActive) {
      const r13 = this.world.doors.get('door_f2_r13')!;
      this.camera.position.set(r13.x, r13.y + 1.52, r13.z + 0.14);
      this.camera.rotation.set(0, Math.PI, 0);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 50, 12, dt);
      this.camera.updateProjectionMatrix();
      this.flashlight.intensity = 0;
      return;
    }

    if (Math.abs(this.camera.fov - 72) > 0.2) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 72, 10, dt);
      this.camera.updateProjectionMatrix();
    }

    // Subtle horror head-bob when moving + realistic breathing sway when still
    const isWalking =
      !this.isHiding &&
      (this.keys.has('KeyW') || this.keys.has('KeyS') || this.keys.has('KeyA') || this.keys.has('KeyD') || Math.abs(this.touchMove.y) > 0.1 || Math.abs(this.touchMove.x) > 0.1);
    const bob = isWalking
      ? Math.sin(this.elapsedTotal * 9.5) * 0.034
      : Math.sin(this.elapsedTotal * 1.6) * 0.008;

    this.camera.position.set(this.playerPos.x, this.playerPos.y + this.camHeight + bob, this.playerPos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);

    // Position flashlight slightly below eye level pointing forward
    if (this.flashlightOn && this.battery > 0) {
      const flicker =
        this.battery < 18 && Math.sin(this.elapsedTotal * 37) > 0.5
          ? 0.6
          : this.kavitaThreat > 0.72 && Math.sin(this.elapsedTotal * 29) > 0.3
          ? 1.1
          : 3.4;
      this.flashlight.intensity = flicker;
      this.flashlight.position.copy(this.camera.position);
      _camLook.set(0, 0, -1).applyEuler(this.camera.rotation).add(this.camera.position);
      this.flashlight.target.position.copy(_camLook);
      this.flashlight.target.updateMatrixWorld();
    } else {
      this.flashlight.intensity = 0;
    }
  }

  private updateEnvironmentAndLights(dt: number): void {
    // Broken car hazard lights blink + soft engine hood steam rises
    const blinkOn = Math.sin(this.elapsedTotal * 5.2) > 0;
    this.world.carHazardMat.emissiveIntensity = blinkOn ? 2.2 : 0.15;
    this.world.carSteamGroup.children.forEach((p, idx) => {
      const cycle = (this.elapsedTotal * 0.55 + idx * 0.2) % 1;
      p.position.y = cycle * 1.1;
      p.scale.setScalar(0.8 + cycle * 0.9);
    });

    // Rain particles drop around player outside
    if (this.world.rainSystem.visible) {
      const arr = this.world.rainPositions;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= 18 * dt;
        if (arr[i + 1] < 0) {
          arr[i] = this.playerPos.x + (Math.random() - 0.5) * 38;
          arr[i + 1] = 20 + Math.random() * 6;
          arr[i + 2] = this.playerPos.z + (Math.random() - 0.5) * 38;
        }
      }
      this.world.rainSystem.geometry.attributes.position.needsUpdate = true;

      // Occasional Storm Lightning (nighttime only — skip overwriting morning daylight or dream darkness!)
      const mins = ((Math.floor(this.clockMinutes) % 1440) + 1440) % 1440;
      const h24 = Math.floor(mins / 60);
      const isDaytime = h24 >= 6 && h24 < 18;
      if (!this.nightmareLightsApplied && !this.endingPhase) {
        if (isDaytime) {
          this.moonLight.intensity = 0.92;
        } else {
          this.lightningTimer -= dt;
          if (this.lightningTimer <= 0) {
            this.lightningTimer = 11 + Math.random() * 14;
            this.lightningFlash = 1.0;
            this.audio.playThunder();
          }
          if (this.lightningFlash > 0) {
            this.lightningFlash = Math.max(0, this.lightningFlash - dt * 2.8);
            this.moonLight.intensity = 0.55 + this.lightningFlash * 2.8;
          } else {
            this.moonLight.intensity = 0.55;
          }
        }
      }
    }

    // Relocate 6 pooled PointLights to nearest lamp fixtures around camera
    const refPos = this.camera.position;
    const sorted = this.world.lamps
      .map((l) => ({
        lamp: l,
        distSq: (l.x - refPos.x) ** 2 + (l.y - refPos.y) ** 2 + (l.z - refPos.z) ** 2,
      }))
      .sort((a, b) => a.distSq - b.distSq);

    const powerMult = this.powerRestored ? 1.45 : 0.72;
    for (let i = 0; i < this.pointLightPool.length; i++) {
      const pl = this.pointLightPool[i];
      if (this.nightmareLightsApplied) {
        if (i === 0) {
          // Focused tense eerie crimson-amber gleam above Room 13 bed during nightmare
          pl.position.set(-5.2, 10.1, -9.4);
          pl.color.setHex(0xb82832);
          pl.intensity = 1.65;
        } else {
          pl.intensity = 0;
        }
        continue;
      }
      const entry = sorted[i];
      if (!entry) {
        pl.intensity = 0;
        continue;
      }
      const l = entry.lamp;
      pl.position.set(l.x, l.y, l.z);
      pl.color.setHex(l.color);
      const suspicionFlick = this.suspicionLevel >= 55 && l.floor === 'G' && l.z > 6;
      const flick =
        (l.flickers || suspicionFlick) && !this.powerRestored && Math.sin(this.elapsedTotal * 19 + i * 3) > 0.65
          ? 0.25
          : 1.0;
      const baseInt = l.floor === 'B1' && !this.powerRestored ? 0.35 : 1.15;
      pl.intensity = baseInt * powerMult * flick;
      l.bulbMat.emissiveIntensity = l.baseEmissive * powerMult * flick;
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.pendingTimeouts.forEach((id) => clearTimeout(id));
    this.pendingTimeouts = [];
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('resize', this.onResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer?.domElement?.removeEventListener('mousedown', this.onMouseDown);
    this.renderer?.domElement?.removeEventListener('webglcontextlost', this.contextLostHandler);

    if (document.pointerLockElement === this.renderer?.domElement) {
      document.exitPointerLock();
    }

    this.world?.dispose();
    this.textures?.dispose();
    this.renderer?.dispose();
    if (this.renderer?.domElement?.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

export { CCTV_CAMERAS };
