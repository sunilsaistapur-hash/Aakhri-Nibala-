export type GraphicsQuality = 'low' | 'medium' | 'high';

export type FloorId = 'B1' | 'G' | '1' | '2' | '3' | '4';

export type PuzzleType =
  | 'register'
  | 'food_inspect'
  | 'telephone'
  | 'nightmare_sleep'
  | 'chudail_dialogue'
  | 'library_puzzle'
  | 'kitchen_vessels'
  | 'kitchen_almirah'
  | 'main_door_key_box'
  | 'secret_symbols_wall'
  | 'godown_box'
  | 'cabinet_lock'
  | 'electronic_keypad'
  | 'service_corridor_symbols'
  | 'alarm_computer'
  | 'manager_drawer'
  | 'escape_prep_modal'
  | 'car_start'
  | 'keypad_kavita'
  | 'keypad_owner_safe'
  | 'keypad_room13_secret'
  | 'cctv_system'
  | 'wiring'
  | 'generator'
  | 'final_gate';

export type HideSpotType = 'bed' | 'wardrobe' | 'curtain' | 'storeroom' | 'furniture';

export type InventoryItemId =
  | 'key_room13'
  | 'key_store_room'
  | 'map_old_office'
  | 'key_cctv'
  | 'card_cctv'
  | 'map_secret_door'
  | 'key_small_iron'
  | 'key_kitchen'
  | 'diary_ramesh'
  | 'diary_meera'
  | 'paper_password'
  | 'key_owner_office'
  | 'note_office_drawer'
  | 'map_basement_tunnel'
  | 'key_tunnel_1'
  | 'key_tunnel_2'
  | 'key_tunnel_3'
  | 'key_godown_chest'
  | 'key_basement'
  | 'parts_electric_1'
  | 'parts_electric_2'
  | 'parts_electric_3'
  | 'card_lift'
  | 'crest_room13'
  | 'record_room13'
  | 'guest_list'
  | 'letter_owner'
  | 'key_main_door'
  | 'code_electronic_lock'
  | 'map_emergency_exit'
  | 'key_emergency_1'
  | 'key_emergency_2'
  | 'key_emergency_3'
  | 'key_emergency_master'
  | 'card_emergency_exit'
  | 'crowbar_gate';

export interface InventoryItem {
  id: InventoryItemId;
  name: string;
  subtitle: string;
  description: string;
  category: 'key' | 'card' | 'document' | 'part' | 'tool';
  loreId?: string;
}

export interface LoreNote {
  id: string;
  title: string;
  author: string;
  locationLabel: string;
  pages: string[];
  clueHighlight?: string;
}

export interface MissionDef {
  id: number;
  title: string;
  objective: string;
  hint: string;
  floorLabel: string;
  checkpointSave: boolean;
}

export interface RoomDef {
  id: string;
  floor: FloorId;
  name: string;
  shortLabel: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  colorTint?: string;
  isOutdoor?: boolean;
  usefulHint: string;
}

export interface DoorDef {
  id: string;
  floor: FloorId;
  x: number;
  z: number;
  orientation: 'NS' | 'EW';
  width: number;
  label: string;
  lockedByItem?: InventoryItemId;
  lockedByKeypad?: PuzzleType;
  lockedByPower?: boolean;
  lockedByStory?: string;
  initiallyOpen?: boolean;
  hasPeephole?: boolean;
  isSecretPanel?: boolean;
  isFinalGate?: boolean;
}

export interface HideSpotDef {
  id: string;
  floor: FloorId;
  type: HideSpotType;
  label: string;
  x: number;
  z: number;
  facingAngle: number;
  camOffsetY: number;
}

export interface InteractableDef {
  id: string;
  floor: FloorId;
  x: number;
  yOffset: number;
  z: number;
  label: string;
  prompt: string;
  kind:
    | 'item'
    | 'lore'
    | 'puzzle'
    | 'register'
    | 'kavita_counter'
    | 'sleep_bed'
    | 'store_clue'
    | 'office_drawer'
    | 'food_tray'
    | 'telephone'
    | 'wall_clock'
    | 'lift_panel'
    | 'cold_crate'
    | 'tunnel_hatch'
    | 'exit_terminal'
    | 'battery';
  itemId?: InventoryItemId;
  loreId?: string;
  puzzleType?: PuzzleType;
  requiredMissionMin?: number;
  completesMission?: number;
}

export type KavitaState =
  | 'waiting_lobby'
  | 'inactive'
  | 'patrol'
  | 'investigate'
  | 'wait_door'
  | 'chase'
  | 'delivering_food'
  | 'final_chase'
  | 'window_ending';

export interface SaveSlotData {
  slotId: string;
  savedAt: string;
  currentMission: number;
  floor: FloorId;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  inventory: InventoryItemId[];
  collectedLore: string[];
  unlockedDoors: string[];
  solvedPuzzles: string[];
  openedInteractables: string[];
  powerRestored: boolean;
  generatorRunning: boolean;
  secretTunnelFound: boolean;
  room13FoodDelivered: boolean;
  room13FoodInspected: boolean;
  room13PhoneAnswered: boolean;
  complaintDone?: boolean;
  nightmareDone?: boolean;
  knockSceneDone?: boolean;
  hungerTalkDone?: boolean;
  escapeActive?: boolean;
  kitchenSecretOpened?: boolean;
  kitchenAlmirahOpened?: boolean;
  suspicionLevel?: number;
  wrongDialogueCount?: number;
  clockMinutes?: number;
  dayNumber?: number;
  dialogueCount?: number;
  battery: number;
  playTimeSeconds: number;
}

export interface HUDState {
  currentMission: number;
  floor: FloorId;
  roomName: string;
  timeLabel: string;
  dayNumber: number;
  stamina: number;
  battery: number;
  flashlightOn: boolean;
  isCrouching: boolean;
  isHiding: boolean;
  hideLabel: string;
  isPeepholeActive: boolean;
  isCutsceneActive: boolean;
  eyelidClose: number;
  nearbyPrompt: string | null;
  secondaryPrompt: string | null;
  subtitle: { speaker: string; text: string } | null;
  kavitaThreatLevel: number;
  kavitaState: KavitaState;
  suspicionLevel: number;
  wrongDialogueCount: number;
  powerRestored: boolean;
  playTimeSeconds: number;
  cctvActiveCamera: number | null;
  playerX: number;
  playerZ: number;
}
