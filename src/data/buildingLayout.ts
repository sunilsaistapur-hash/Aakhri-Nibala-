import {
  DoorDef,
  FloorId,
  HideSpotDef,
  InteractableDef,
  RoomDef,
} from '../types/game';

export const FLOOR_Y: Record<FloorId, number> = {
  B1: -4.0,
  G: 0.0,
  '1': 4.0,
  '2': 8.0,
  '3': 12.0,
  '4': 16.0,
};

export const FLOOR_NAMES: Record<FloorId, string> = {
  B1: 'तहखाना (बेसमेंट)',
  G: 'भूतल (रिसेप्शन व रसोई)',
  '1': 'पहली मंजिल (कमरा 1–10)',
  '2': 'दूसरी मंजिल (कमरा 11–20)',
  '3': 'तीसरी मंजिल (कर्मचारी व मालिक)',
  '4': 'चौथी मंजिल व खुली छत',
};

export interface WallSegment {
  floor: FloorId;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  height?: number;
  yOffset?: number;
  isExterior?: boolean;
  hasWindow?: boolean;
  isParapet?: boolean;
}

export interface StairRamp {
  id: string;
  fromFloor: FloorId;
  toFloor: FloorId;
  x1: number;
  x2: number;
  zStart: number;
  zEnd: number;
  yStart: number;
  yEnd: number;
  steps: number;
}

export interface WaypointNode {
  id: string;
  floor: FloorId;
  x: number;
  y: number;
  z: number;
  neighbors: string[];
}

export const ROOMS: RoomDef[] = [
  // EXTERIOR
  {
    id: 'ext_road',
    floor: 'G',
    name: 'मुख्य प्रवेश द्वार और बारिश वाली सड़क',
    shortLabel: 'सड़क व मुख्य द्वार',
    x1: -24,
    z1: 18,
    x2: 24,
    z2: 42,
    isOutdoor: true,
    usefulHint: 'सामने "शाही निवाला रेस्टोरेंट – कमरे और भोजन उपलब्ध" का बोर्ड चमक रहा है।',
  },
  {
    id: 'ext_courtyard',
    floor: 'G',
    name: 'पीछे का आँगन और अंतिम लोहे का गेट',
    shortLabel: 'पीछे का आँगन',
    x1: -22,
    z1: -38,
    x2: 22,
    z2: -18,
    isOutdoor: true,
    usefulHint: 'तहखाने की गुप्त सुरंग यहीं खुलती है। उत्तर छोर पर अंतिम लोहे का गेट है।',
  },

  // BASEMENT (B1)
  {
    id: 'b1_hall',
    floor: 'B1',
    name: 'बंद बेसमेंट हॉल',
    shortLabel: 'बेसमेंट हॉल',
    x1: -20,
    z1: -18,
    x2: -8,
    z2: 18,
    colorTint: '#2b2d30',
    usefulHint: 'तहखाने का मुख्य अंधेरा कक्ष। यहाँ से गुप्त सुरंग और बिजली कक्ष का रास्ता जाता है।',
  },
  {
    id: 'b1_corridor',
    floor: 'B1',
    name: 'तहखाना मुख्य गलियारा',
    shortLabel: 'तहखाना गलियारा',
    x1: -8,
    z1: -3,
    x2: 20,
    z2: 2,
    colorTint: '#26292c',
    usefulHint: 'ठंडा भंडारण, रिकॉर्ड रूम और बिजली नियंत्रण कक्ष इसी गलियारे से जुड़ते हैं।',
  },
  {
    id: 'b1_cold',
    floor: 'B1',
    name: 'ठंडा भंडारण कक्ष',
    shortLabel: 'ठंडा भंडारण',
    x1: -8,
    z1: -18,
    x2: 6,
    z2: -3,
    colorTint: '#1f2e3b',
    usefulHint: 'जमे हुए स्टील के डिब्बों में अजीब काले पदार्थ और यात्रियों के नाम का राज है।',
  },
  {
    id: 'b1_records',
    floor: 'B1',
    name: 'पुराना रिकॉर्ड रूम',
    shortLabel: 'पुराना रिकॉर्ड रूम',
    x1: 6,
    z1: -18,
    x2: 20,
    z2: -3,
    colorTint: '#362e28',
    usefulHint: '1998 से अब तक के लापता मेहमानों की सूची यहीं रखी है।',
  },
  {
    id: 'b1_power',
    floor: 'B1',
    name: 'बिजली नियंत्रण कक्ष',
    shortLabel: 'बिजली नियंत्रण कक्ष',
    x1: -8,
    z1: 2,
    x2: 8,
    z2: 18,
    colorTint: '#2b2a22',
    usefulHint: 'रेस्टोरेंट का मुख्य जनरेटर और तार जोड़ने का पैनल यहाँ है।',
  },
  {
    id: 'b1_archive',
    floor: 'B1',
    name: 'तहखाना पुराना भंडार',
    shortLabel: 'तहखाना भंडार',
    x1: 8,
    z1: 2,
    x2: 20,
    z2: 18,
    colorTint: '#2d2624',
    usefulHint: 'यहाँ भारी लोहे की छड़ (सब्बल) और छिपने के बक्से रखे हैं।',
  },
  {
    id: 'b1_tunnel',
    floor: 'B1',
    name: 'गुप्त सुरंग',
    shortLabel: 'गुप्त सुरंग',
    x1: -14,
    z1: -30,
    x2: -10.5,
    z2: -18,
    colorTint: '#1c1917',
    usefulHint: 'पीछे के आँगन तक निकलने वाला पुराना भूमिगत रास्ता।',
  },

  // GROUND FLOOR (G)
  {
    id: 'g_lobby',
    floor: 'G',
    name: 'रिसेप्शन और मुख्य लॉबी',
    shortLabel: 'रिसेप्शन',
    x1: -8,
    z1: 6,
    x2: 8,
    z2: 18,
    colorTint: '#452c24',
    usefulHint: 'मेहमान रजिस्टर, कमरा नं. 13 की चाबी और पुराने रिकॉर्ड की अलमारी।',
  },
  {
    id: 'g_dining',
    floor: 'G',
    name: 'भोजन करने का हॉल',
    shortLabel: 'भोजन हॉल',
    x1: -20,
    z1: 6,
    x2: -8,
    z2: 18,
    colorTint: '#4a2923',
    usefulHint: 'सजी हुई मेजें और भारी लाल पर्दे जिनके पीछे छिपा जा सकता है।',
  },
  {
    id: 'g_banquet',
    floor: 'G',
    name: 'बंद रेस्टोरेंट हॉल',
    shortLabel: 'बंद रेस्टोरेंट हॉल',
    x1: 8,
    z1: 8,
    x2: 20,
    z2: 18,
    colorTint: '#362622',
    usefulHint: 'सालों से बंद पड़ा शाही भोज कक्ष। यहाँ मेज के नीचे या पर्दे के पीछे छिप सकते हैं।',
  },
  {
    id: 'g_spine',
    floor: 'G',
    name: 'भूतल मुख्य गलियारा',
    shortLabel: 'भूतल गलियारा',
    x1: -16.5,
    z1: 2,
    x2: 14,
    z2: 6,
    colorTint: '#3b2b24',
    usefulHint: 'लिफ्ट, सीढ़ी, सीसीटीवी रूम और रसोई क्षेत्र को जोड़ने वाला गलियारा।',
  },
  {
    id: 'g_stair_hall',
    floor: 'G',
    name: 'मुख्य सीढ़ी क्षेत्र (भूतल)',
    shortLabel: 'मुख्य सीढ़ी',
    x1: 14,
    z1: -8,
    x2: 20,
    z2: 8,
    colorTint: '#3a2d25',
    usefulHint: 'पहली से चौथी मंजिल तक जाने की लकड़ी और पत्थर की सीढ़ी।',
  },
  {
    id: 'g_laundry',
    floor: 'G',
    name: 'कपड़े धोने का कमरा',
    shortLabel: 'कपड़े धोने का कमरा',
    x1: -14,
    z1: -10,
    x2: -8,
    z2: 2,
    colorTint: '#2f3638',
    usefulHint: 'सफेद चादरों और कपड़ों के बीच रसोईघर की चाबी छिपी है।',
  },
  {
    id: 'g_exit_hall',
    floor: 'G',
    name: 'आपातकालीन निकास कक्ष',
    shortLabel: 'आपातकालीन निकास',
    x1: -8,
    z1: -6,
    x2: 4,
    z2: 2,
    colorTint: '#3a2a24',
    usefulHint: 'यहाँ रसोई का मुख्य द्वार और आपातकालीन निकास कार्ड टर्मिनल है।',
  },
  {
    id: 'g_cctv',
    floor: 'G',
    name: 'सीसीटीवी कमरा',
    shortLabel: 'सीसीटीवी कमरा',
    x1: 4,
    z1: -6,
    x2: 14,
    z2: 2,
    colorTint: '#252c2b',
    usefulHint: 'सुरक्षा मॉनिटर पर रेस्टोरेंट के कैमरे और कविता की हरकत देखी जा सकती है।',
  },
  {
    id: 'g_kitchen',
    floor: 'G',
    name: 'रसोईघर',
    shortLabel: 'रसोईघर',
    x1: -8,
    z1: -18,
    x2: 4,
    z2: -6,
    colorTint: '#383834',
    usefulHint: 'बड़े तंदूर और स्टील के काउंटर। पुराने रसोइए के सुराग यहीं से जुड़े हैं।',
  },
  {
    id: 'g_old_kitchen',
    floor: 'G',
    name: 'पुरानी रसोई',
    shortLabel: 'पुरानी रसोई',
    x1: -15.5,
    z1: -18,
    x2: -8,
    z2: -10,
    colorTint: '#2f2923',
    usefulHint: 'मिट्टी का पुराना चूल्हा, तांबे के बर्तन (पहली पहेली) और रमेश यादव का पासवर्ड कागज।',
  },
  {
    id: 'g_kitchen_secret',
    floor: 'G',
    name: 'रसोई के पीछे गुप्त कमरा',
    shortLabel: 'रसोई का गुप्त कमरा',
    x1: -20,
    z1: -18,
    x2: -15.5,
    z2: -10,
    colorTint: '#241819',
    usefulHint: 'बंद लोहे की अलमारी (दूसरी पहेली) व अंतिम सुरक्षा बक्सा (तीसरी पहेली — मेन डोर की असली चाबी)।',
  },
  {
    id: 'g_store',
    floor: 'G',
    name: 'सामान रखने और पुराना स्टोर रूम',
    shortLabel: 'सामान व स्टोर रूम',
    x1: 4,
    z1: -18,
    x2: 14,
    z2: -6,
    colorTint: '#342c24',
    usefulHint: 'बहीखाते की चाबी से खुलने वाला स्टोर रूम — पुराने बक्सों में मेन डोर सुराग व बिजली पुर्जा (1/3) है।',
  },
  {
    id: 'g_basement_entry',
    floor: 'G',
    name: 'बेसमेंट सीढ़ी द्वार',
    shortLabel: 'बेसमेंट सीढ़ी',
    x1: -20,
    z1: -10,
    x2: -14,
    z2: 2,
    colorTint: '#262525',
    usefulHint: 'नीचे तहखाने में उतरने का बंद दरवाजा।',
  },

  // 1ST FLOOR (1) - Rooms 1 to 10 (Locked Other Guest Rooms) + Old Guests' Hall + Corridor
  {
    id: 'f1_corridor',
    floor: '1',
    name: 'पहली मंजिल का गलियारा',
    shortLabel: 'गलियारा (मंजिल 1)',
    x1: -16.5,
    z1: -2,
    x2: 14,
    z2: 2,
    colorTint: '#402c23',
    usefulHint: 'कमरा नं. 1 से 10 के बंद दरवाजे। पूर्वी कोने में सुरक्षा मेज पर सीसीटीवी की चाबी व पश्चिमी हिस्से में पुराने मेहमानों का हॉल है।',
  },
  {
    id: 'f1_r1',
    floor: '1',
    name: 'कमरा नंबर 1',
    shortLabel: 'कमरा नं. 1',
    x1: -20,
    z1: -18,
    x2: -13.2,
    z2: -2,
    colorTint: '#3e2d25',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f1_r2',
    floor: '1',
    name: 'कमरा नंबर 2',
    shortLabel: 'कमरा नं. 2',
    x1: -13.2,
    z1: -18,
    x2: -6.4,
    z2: -2,
    colorTint: '#3a2d28',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है। इसके बाहर गलियारे में एक फटा टिकट पड़ा है।',
  },
  {
    id: 'f1_r3',
    floor: '1',
    name: 'कमरा नंबर 3',
    shortLabel: 'कमरा नं. 3',
    x1: -6.4,
    z1: -18,
    x2: 0.4,
    z2: -2,
    colorTint: '#3c2b24',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f1_r4',
    floor: '1',
    name: 'कमरा नंबर 4',
    shortLabel: 'कमरा नं. 4',
    x1: 0.4,
    z1: -18,
    x2: 7.2,
    z2: -2,
    colorTint: '#382a23',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f1_r5',
    floor: '1',
    name: 'कमरा नंबर 5',
    shortLabel: 'कमरा नं. 5',
    x1: 7.2,
    z1: -18,
    x2: 14,
    z2: -2,
    colorTint: '#3d2c25',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f1_old_hall',
    floor: '1',
    name: 'पुराने मेहमानों का हॉल',
    shortLabel: 'पुराने मेहमानों का हॉल',
    x1: -20,
    z1: 5.5,
    x2: -14,
    z2: 18,
    colorTint: '#473026',
    usefulHint: 'खुला साझा हॉल — यहाँ सीसीटीवी एक्सेस कार्ड, बिजली मिस्त्री का नोट, बैटरी और छिपने की जगहें हैं।',
  },
  {
    id: 'f1_r6',
    floor: '1',
    name: 'कमरा नंबर 6',
    shortLabel: 'कमरा नं. 6',
    x1: -14,
    z1: 2,
    x2: -7.625,
    z2: 18,
    colorTint: '#3b2c25',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f1_r7',
    floor: '1',
    name: 'कमरा नंबर 7',
    shortLabel: 'कमरा नं. 7',
    x1: -7.625,
    z1: 2,
    x2: -1.25,
    z2: 18,
    colorTint: '#3d2a24',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f1_r8',
    floor: '1',
    name: 'कमरा नंबर 8',
    shortLabel: 'कमरा नं. 8',
    x1: -1.25,
    z1: 2,
    x2: 5.125,
    z2: 18,
    colorTint: '#382a26',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f1_r9',
    floor: '1',
    name: 'कमरा नंबर 9',
    shortLabel: 'कमरा नं. 9',
    x1: 5.125,
    z1: 2,
    x2: 11.5,
    z2: 18,
    colorTint: '#3a2b25',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f1_r10',
    floor: '1',
    name: 'कमरा नंबर 10',
    shortLabel: 'कमरा नं. 10',
    x1: 11.5,
    z1: 8,
    x2: 20,
    z2: 18,
    colorTint: '#422c24',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है। पास की सुरक्षा मेज पर सीसीटीवी की चाबी रखी है।',
  },

  // 2ND FLOOR (2) - Rooms 11 to 20 + Room 13 Secret + Corridor
  {
    id: 'f2_corridor',
    floor: '2',
    name: 'दूसरी मंजिल का गलियारा',
    shortLabel: 'गलियारा (मंजिल 2)',
    x1: -16.5,
    z1: -2,
    x2: 14,
    z2: 2,
    colorTint: '#3b2520',
    usefulHint: 'कमरा नंबर 11 से 20 और रहस्यमयी कमरा नंबर 13 का गलियारा।',
  },
  {
    id: 'f2_r11',
    floor: '2',
    name: 'कमरा नंबर 11',
    shortLabel: 'कमरा नं. 11',
    x1: -20,
    z1: -18,
    x2: -13.5,
    z2: -2,
    colorTint: '#382722',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f2_r12',
    floor: '2',
    name: 'कमरा नंबर 12',
    shortLabel: 'कमरा नं. 12',
    x1: -13.5,
    z1: -18,
    x2: -7.0,
    z2: -2,
    colorTint: '#352621',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f2_r13',
    floor: '2',
    name: 'कमरा नंबर 13',
    shortLabel: 'कमरा नं. 13',
    x1: -7.0,
    z1: -18,
    x2: 1.0,
    z2: -2,
    colorTint: '#452320',
    usefulHint: 'आरव का कमरा — बड़ा बिस्तर, अलमारी, मेज-कुर्सी, बाथरूम, खिड़की, टेलीफोन, दीवार घड़ी और दरवाजे में छोटा छेद।',
  },
  {
    id: 'f2_r13_secret',
    floor: '2',
    name: 'कमरा नंबर 13 का गुप्त हिस्सा',
    shortLabel: 'कमरा 13 गुप्त कक्ष',
    x1: 1.0,
    z1: -18,
    x2: 7.5,
    z2: -11,
    colorTint: '#261a1b',
    usefulHint: 'मीरा और शाही निवाला के पूरे रहस्य की सच्चाई यहाँ छिपी है।',
  },
  {
    id: 'f2_r14',
    floor: '2',
    name: 'कमरा नंबर 14',
    shortLabel: 'कमरा नं. 14',
    x1: 1.0,
    z1: -11,
    x2: 7.5,
    z2: -2,
    colorTint: '#392823',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f2_r15',
    floor: '2',
    name: 'कमरा नंबर 15',
    shortLabel: 'कमरा नं. 15',
    x1: 7.5,
    z1: -18,
    x2: 14,
    z2: -2,
    colorTint: '#3a2924',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f2_lounge',
    floor: '2',
    name: 'बंद पुस्तकालय कक्ष (दूसरी मंजिल)',
    shortLabel: 'बंद पुस्तकालय',
    x1: -20,
    z1: 5.5,
    x2: -14,
    z2: 18,
    colorTint: '#3d2a23',
    usefulHint: 'पुरानी किताबें, सुरेश मेहता का संदेश व छिपने की सुरक्षित जगहें।',
  },
  {
    id: 'f2_r16',
    floor: '2',
    name: 'कमरा नंबर 16',
    shortLabel: 'कमरा नं. 16',
    x1: -14,
    z1: 2,
    x2: -7.625,
    z2: 18,
    colorTint: '#372722',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f2_r17',
    floor: '2',
    name: 'कमरा नंबर 17',
    shortLabel: 'कमरा नं. 17',
    x1: -7.625,
    z1: 2,
    x2: -1.25,
    z2: 18,
    colorTint: '#3b2823',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f2_r18',
    floor: '2',
    name: 'कमरा नंबर 18',
    shortLabel: 'कमरा नं. 18',
    x1: -1.25,
    z1: 2,
    x2: 5.125,
    z2: 18,
    colorTint: '#382622',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f2_r19',
    floor: '2',
    name: 'कमरा नंबर 19',
    shortLabel: 'कमरा नं. 19',
    x1: 5.125,
    z1: 2,
    x2: 11.5,
    z2: 18,
    colorTint: '#362724',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },
  {
    id: 'f2_r20',
    floor: '2',
    name: 'कमरा नंबर 20',
    shortLabel: 'कमरा नं. 20',
    x1: 11.5,
    z1: 8,
    x2: 20,
    z2: 18,
    colorTint: '#3e2923',
    usefulHint: 'यह दूसरे मेहमान का बंद कमरा है।',
  },

  // 3RD FLOOR (3) - Staff, Kavita's Room, Owner's Office, Private Suite
  {
    id: 'f3_corridor',
    floor: '3',
    name: 'तीसरी मंजिल का गलियारा',
    shortLabel: 'गलियारा (मंजिल 3)',
    x1: -16.5,
    z1: -2,
    x2: 14,
    z2: 2,
    colorTint: '#37231e',
    usefulHint: 'कर्मचारियों के कमरे, कविता का कमरा और मालिक का कार्यालय।',
  },
  {
    id: 'f3_staff1',
    floor: '3',
    name: 'कर्मचारियों का कमरा 1 (रमेश यादव)',
    shortLabel: 'रमेश यादव कक्ष',
    x1: -20,
    z1: -18,
    x2: -10,
    z2: -2,
    colorTint: '#342c24',
    usefulHint: 'पुराने रसोइए रमेश यादव की महत्वपूर्ण डायरी यहीं रखी है!',
  },
  {
    id: 'f3_staff2',
    floor: '3',
    name: 'कर्मचारियों का कमरा 2 (सेवा कक्ष)',
    shortLabel: 'कर्मचारी कक्ष 2',
    x1: -10,
    z1: -18,
    x2: 0,
    z2: -2,
    colorTint: '#322b26',
    usefulHint: 'कर्मचारियों के चारपाई व लॉकर — छिपने की जगह।',
  },
  {
    id: 'f3_staff3',
    floor: '3',
    name: 'कर्मचारियों का कमरा 3 (तकनीकी कक्ष)',
    shortLabel: 'कर्मचारी कक्ष 3',
    x1: 0,
    z1: -18,
    x2: 7,
    z2: -2,
    colorTint: '#2f2d2a',
    usefulHint: 'बिजली का पुर्जा (रिले स्विच - भाग 2) यहाँ अलमारी पर है।',
  },
  {
    id: 'f3_kavita',
    floor: '3',
    name: 'वेट्रेस का कमरा (कविता का कक्ष)',
    shortLabel: 'कविता का कमरा',
    x1: 7,
    z1: -18,
    x2: 14,
    z2: -2,
    colorTint: '#401f24',
    usefulHint: 'ताला कोड 1998। अंदर मालिक के कार्यालय की चाबी और पुरानी वर्दी है।',
  },
  {
    id: 'f3_owner_office',
    floor: '3',
    name: 'मालिक का कार्यालय (महेंद्र प्रताप)',
    shortLabel: 'मालिक का कार्यालय',
    x1: -14,
    z1: 2,
    x2: -1,
    z2: 18,
    colorTint: '#44281f',
    usefulHint: 'महेंद्र प्रताप की भारी मेज और कोड 1145 वाली तिजोरी जिसमें बेसमेंट की चाबी व पत्र है।',
  },
  {
    id: 'f3_owner_private',
    floor: '3',
    name: 'पुराने मालिक का निजी कमरा',
    shortLabel: 'मालिक का निजी कक्ष',
    x1: -1,
    z1: 2,
    x2: 11.5,
    z2: 18,
    colorTint: '#482c25',
    usefulHint: 'मीरा की चिट्ठी और कमरा 13 का पीतल प्रतीक यहाँ रखा है।',
  },
  {
    id: 'f3_archive_corner',
    floor: '3',
    name: 'गुप्त दस्तावेजों का कमरा',
    shortLabel: 'गुप्त दस्तावेज कक्ष',
    x1: 11.5,
    z1: 8,
    x2: 20,
    z2: 18,
    colorTint: '#362722',
    usefulHint: 'पुराने गुप्त दस्तावेज व अतिरिक्त बैटरी।',
  },

  // 4TH FLOOR / ROOFTOP (4)
  {
    id: 'f4_mumty',
    floor: '4',
    name: 'छत की सीढ़ी मम्टी कक्ष',
    shortLabel: 'सीढ़ी मम्टी कक्ष',
    x1: 13.5,
    z1: -8,
    x2: 20,
    z2: 8,
    colorTint: '#2b2d30',
    usefulHint: 'तीसरी मंजिल से खुली छत पर निकलने का दरवाजा।',
  },
  {
    id: 'f4_lift_machine',
    floor: '4',
    name: 'लिफ्ट मशीन कक्ष',
    shortLabel: 'लिफ्ट मशीन कक्ष',
    x1: -20,
    z1: -2,
    x2: -12,
    z2: 8,
    colorTint: '#26292e',
    usefulHint: 'लिफ्ट का मास्टर कार्ड और बिजली का पुर्जा (भाग 3) यहाँ रखा है।',
  },
  {
    id: 'f4_water_tank',
    floor: '4',
    name: 'पानी की टंकी वाला क्षेत्र',
    shortLabel: 'पानी की टंकी क्षेत्र',
    x1: -20,
    z1: -18,
    x2: -4,
    z2: -2,
    isOutdoor: true,
    usefulHint: 'ऊँची कंक्रीट टंकी के नीचे आपातकालीन निकास कार्ड का सुरक्षित बक्सा है!',
  },
  {
    id: 'f4_watch_room',
    floor: '4',
    name: 'ऊपरी मीनार निगरानी कक्ष',
    shortLabel: 'ऊपरी मीनार खिड़की',
    x1: -4,
    z1: 8,
    x2: 11.5,
    z2: 18,
    colorTint: '#332422',
    usefulHint: 'सड़क की ओर खुलने वाली ऊपर की खिड़की, जहाँ से रात में रोशनी दिखती थी।',
  },
  {
    id: 'f4_rooftop',
    floor: '4',
    name: 'खुली छत (बारिश और हवा)',
    shortLabel: 'खुली छत',
    x1: -12,
    z1: -18,
    x2: 13.5,
    z2: 8,
    isOutdoor: true,
    usefulHint: 'तेज बारिश में भीगी विशाल छत।',
  },
];

// Helper to build wall segments leaving clean openings for doorways
function buildWallSegmentsWithOpenings(
  floor: FloorId,
  orientation: 'EW' | 'NS',
  fixedCoord: number,
  start: number,
  end: number,
  openings: { center: number; width: number; noLintel?: boolean }[],
  height = 3.8,
  isExterior = false,
  hasWindow = false
): WallSegment[] {
  const sorted = [...openings].sort((a, b) => a.center - b.center);
  const segs: WallSegment[] = [];
  let cursor = start;

  for (const op of sorted) {
    const half = op.width / 2;
    const opStart = Math.max(start, op.center - half);
    const opEnd = Math.min(end, op.center + half);
    if (opStart - cursor > 0.05) {
      segs.push(
        orientation === 'EW'
          ? { floor, x1: cursor, z1: fixedCoord, x2: opStart, z2: fixedCoord, height, isExterior, hasWindow }
          : { floor, x1: fixedCoord, z1: cursor, x2: fixedCoord, z2: opStart, height, isExterior, hasWindow }
      );
    }
    // Lintel above doorway (y = 2.45 to height)
    if (!op.noLintel && height > 2.55) {
      segs.push(
        orientation === 'EW'
          ? {
              floor,
              x1: opStart,
              z1: fixedCoord,
              x2: opEnd,
              z2: fixedCoord,
              height: height - 2.45,
              yOffset: 2.45,
              isExterior,
            }
          : {
              floor,
              x1: fixedCoord,
              z1: opStart,
              x2: fixedCoord,
              z2: opEnd,
              height: height - 2.45,
              yOffset: 2.45,
              isExterior,
            }
      );
    }
    cursor = opEnd;
  }

  if (end - cursor > 0.05) {
    segs.push(
      orientation === 'EW'
        ? { floor, x1: cursor, z1: fixedCoord, x2: end, z2: fixedCoord, height, isExterior, hasWindow }
        : { floor, x1: fixedCoord, z1: cursor, x2: fixedCoord, z2: end, height, isExterior, hasWindow }
    );
  }
  return segs;
}

export function buildAllWalls(): WallSegment[] {
  const walls: WallSegment[] = [];

  // ============ BASEMENT (B1) ============
  // Perimeter
  walls.push(
    ...buildWallSegmentsWithOpenings('B1', 'EW', -18, -20, 20, [{ center: -12.25, width: 1.7 }], 3.6, true), // Tunnel hatch at -12.25
    ...buildWallSegmentsWithOpenings('B1', 'EW', 18, -20, 20, [], 3.6, true),
    ...buildWallSegmentsWithOpenings('B1', 'NS', -20, -18, 18, [], 3.6, true),
    ...buildWallSegmentsWithOpenings('B1', 'NS', 20, -18, 18, [], 3.6, true)
  );
  // Partition between b1_hall (X < -8) and central block (X > -8) - open into b1_corridor (Z -3 to +2)
  walls.push(
    ...buildWallSegmentsWithOpenings('B1', 'NS', -8, -18, 18, [{ center: -0.5, width: 4.4, noLintel: true }], 3.6)
  );
  // Corridor walls Z = -3 and Z = +2 from X = -8 to +20
  walls.push(
    ...buildWallSegmentsWithOpenings('B1', 'EW', -3, -8, 20, [
      { center: -1, width: 1.6 }, // Cold storage door
      { center: 13, width: 1.6 }, // Record room door
    ], 3.6),
    ...buildWallSegmentsWithOpenings('B1', 'EW', 2, -8, 20, [
      { center: 0, width: 1.6 }, // Power room door
      { center: 14, width: 1.6 }, // Archive door
    ], 3.6),
    // Dividers between Cold/Records (X=6, Z:-18..-3) and Power/Archive (X=8, Z:2..18)
    ...buildWallSegmentsWithOpenings('B1', 'NS', 6, -18, -3, [], 3.6),
    ...buildWallSegmentsWithOpenings('B1', 'NS', 8, 2, 18, [], 3.6),
    // B1 Lift Shaft Pocket (X: -20..-16.5, Z: 2..5.5)
    ...buildWallSegmentsWithOpenings('B1', 'NS', -16.5, 2, 5.5, [{ center: 3.75, width: 1.6 }], 3.6),
    ...buildWallSegmentsWithOpenings('B1', 'EW', 2, -20, -16.5, [], 3.6),
    ...buildWallSegmentsWithOpenings('B1', 'EW', 5.5, -20, -16.5, [], 3.6)
  );
  // Secret Tunnel walls (X=-14 & X=-10.5, Z=-30..-18)
  walls.push(
    ...buildWallSegmentsWithOpenings('B1', 'NS', -14, -30, -18, [], 3.6, true),
    ...buildWallSegmentsWithOpenings('B1', 'NS', -10.5, -30, -18, [], 3.6, true)
  );

  // ============ GROUND FLOOR (G) ============
  // Exterior shell
  walls.push(
    ...buildWallSegmentsWithOpenings('G', 'EW', 18, -20, 20, [{ center: 0, width: 2.2 }], 3.8, true, true), // Front Main Entrance
    ...buildWallSegmentsWithOpenings('G', 'EW', -18, -20, 20, [], 3.8, true, true),
    ...buildWallSegmentsWithOpenings('G', 'NS', -20, -18, 18, [], 3.8, true, true),
    ...buildWallSegmentsWithOpenings('G', 'NS', 20, -18, 18, [], 3.8, true, true),
    // Ground Lift Shaft Pocket
    ...buildWallSegmentsWithOpenings('G', 'NS', -16.5, 2, 5.5, [{ center: 3.75, width: 1.6 }], 3.8),
    ...buildWallSegmentsWithOpenings('G', 'EW', 2, -20, -16.5, [], 3.8),
    ...buildWallSegmentsWithOpenings('G', 'EW', 5.5, -20, -16.5, [], 3.8)
  );
  // Reception & Dining & Banquet partitions
  walls.push(
    ...buildWallSegmentsWithOpenings('G', 'NS', -8, 6, 18, [{ center: 12, width: 2.8, noLintel: true }], 3.8), // Lobby <-> Dining arch
    ...buildWallSegmentsWithOpenings('G', 'NS', 8, 8, 18, [{ center: 13, width: 1.6 }], 3.8), // Lobby <-> Banquet door
    ...buildWallSegmentsWithOpenings('G', 'EW', 8, 8, 20, [], 3.8), // Banquet north wall (separates from stair hall!)
    ...buildWallSegmentsWithOpenings('G', 'EW', 6, -20, 8, [
      { center: -12, width: 2.4, noLintel: true }, // Dining <-> Spine arch
      { center: 0, width: 3.4, noLintel: true }, // Lobby <-> Spine arch
    ], 3.8),
    ...buildWallSegmentsWithOpenings('G', 'EW', 6, 8, 14, [{ center: 11, width: 2.4, noLintel: true }], 3.8) // Lobby/Spine -> Stair Vestibule
  );
  // Spine North Wall (Z = 2) from X = -16.5 to +14
  walls.push(
    ...buildWallSegmentsWithOpenings('G', 'EW', 2, -16.5, 14, [
      { center: -15.2, width: 1.5 }, // Lift/Basement entry zone? Wait: Basement vestibule is X:-20..-14, Z:-10..2, so open at X=-15.2? Wait: Lift is -20..-16.5, Z:2..5.5!
      { center: -11, width: 1.6 }, // Laundry door
      { center: -2, width: 2.8, noLintel: true }, // Open to Emergency Exit Hall
      { center: 9, width: 1.6 }, // CCTV Room door
    ], 3.8),
    // Stairwell West Wall (X = 14) from Z = -8 to +8: open at Z=+6.2 for ground access; Z=-8..-18 belongs to Store Room & CCTV (already bounded by X=14!)
    ...buildWallSegmentsWithOpenings('G', 'NS', 14, -18, 8, [{ center: 6.2, width: 2.6, noLintel: true }], 3.8),
    ...buildWallSegmentsWithOpenings('G', 'EW', -8, 14, 20, [], 3.8)
  );
  // Service Rooms Partitions
  walls.push(
    ...buildWallSegmentsWithOpenings('G', 'NS', -14, -10, 2, [{ center: 0, width: 1.6 }], 3.8), // Separates Laundry from Basement Entry (only Z=-10..2 so Old Kitchen Z=-18..-10 stays open!)
    ...buildWallSegmentsWithOpenings('G', 'EW', -2, -20, -14, [{ center: -17, width: 1.6 }], 3.8), // LOCKED BASEMENT DOOR!
    ...buildWallSegmentsWithOpenings('G', 'EW', -10, -20, -8, [], 3.8), // Separates Old Kitchen + Secret Room (Z:-18..-10) from Laundry & Basement stair!
    ...buildWallSegmentsWithOpenings('G', 'NS', -15.5, -18, -10, [{ center: -14, width: 1.5 }], 3.8), // Old Kitchen <-> Secret Kitchen Room panel at X=-15.5, Z=-14!
    ...buildWallSegmentsWithOpenings('G', 'NS', -8, -18, 2, [{ center: -14, width: 1.6 }], 3.8), // Kitchen <-> Old Kitchen door at Z=-14
    ...buildWallSegmentsWithOpenings('G', 'EW', -6, -8, 14, [{ center: -2, width: 1.6 }], 3.8), // LOCKED KITCHEN DOOR at Z=-6, X=-2!
    ...buildWallSegmentsWithOpenings('G', 'NS', 4, -18, 2, [{ center: -12, width: 1.6 }], 3.8) // Store Room <-> Kitchen door at Z=-12; also separates Exit Hall & CCTV
  );

  // ============ FLOORS 1 & 2 (Guest Wings) ============
  (['1', '2'] as FloorId[]).forEach((fl) => {
    // Completely solid windowless exterior walls (no holes/gaps looking outside)
    walls.push(
      ...buildWallSegmentsWithOpenings(fl, 'EW', -18, -20, 20, [], 3.6, true, false),
      ...buildWallSegmentsWithOpenings(fl, 'EW', 18, -20, 20, [], 3.6, true, false),
      ...buildWallSegmentsWithOpenings(fl, 'NS', -20, -18, 18, [], 3.6, true, false),
      ...buildWallSegmentsWithOpenings(fl, 'NS', 20, -18, 18, [], 3.6, true, false)
    );
    // Stairwell West wall X=14 (open at Z=+6.2 for stair landing!) + back wall Z=-8
    walls.push(
      ...buildWallSegmentsWithOpenings(fl, 'NS', 14, -18, 8, [{ center: 6.2, width: 2.6, noLintel: true }], 3.6),
      ...buildWallSegmentsWithOpenings(fl, 'EW', -8, 14, 20, [], 3.6)
    );
    // Stair Vestibule separation from R10/R20 at Z=8 (X:11.5..20)
    walls.push(
      ...buildWallSegmentsWithOpenings(fl, 'EW', 8, 11.5, 20, [{ center: 12.8, width: 1.5 }], 3.6)
    );
    // Stair Vestibule West wall X=11.5 from Z=2 to 8 (open at Z=2..5? No, Corridor goes to X=14, Z=-2..2! So X=11.5, Z=2..8 only separates R9/R19 from Stair Vestibule!)
    walls.push(
      ...buildWallSegmentsWithOpenings(fl, 'NS', 11.5, 2, 18, [], 3.6)
    );
    // Lift Pocket West & South walls: Lift occupies X=-20..-16.5, Z=2..5.5
    walls.push(
      ...buildWallSegmentsWithOpenings(fl, 'NS', -16.5, 2, 5.5, [{ center: 3.75, width: 1.6 }], 3.6),
      ...buildWallSegmentsWithOpenings(fl, 'EW', 5.5, -20, -14, [{ center: -15.2, width: 1.6 }], 3.6), // Door to Old Guests' Hall / Lounge!
      ...buildWallSegmentsWithOpenings(fl, 'NS', -14, 2, 18, [], 3.6) // West wall of R6/R16
    );

    if (fl === '1') {
      // North corridor wall Z=-2 with doors to Rooms 1..5
      walls.push(
        ...buildWallSegmentsWithOpenings('1', 'EW', -2, -20, 14, [
          { center: -16.6, width: 1.5 },
          { center: -9.8, width: 1.5 },
          { center: -3.0, width: 1.5 },
          { center: 3.8, width: 1.5 },
          { center: 10.6, width: 1.5 },
        ], 3.6),
        ...buildWallSegmentsWithOpenings('1', 'NS', -13.2, -18, -2, [], 3.6),
        ...buildWallSegmentsWithOpenings('1', 'NS', -6.4, -18, -2, [], 3.6),
        ...buildWallSegmentsWithOpenings('1', 'NS', 0.4, -18, -2, [], 3.6),
        ...buildWallSegmentsWithOpenings('1', 'NS', 7.2, -18, -2, [], 3.6)
      );
      // South corridor wall Z=+2 with doors to Rooms 6..9 (X: -14..11.5)
      walls.push(
        ...buildWallSegmentsWithOpenings('1', 'EW', 2, -14, 11.5, [
          { center: -10.8, width: 1.5 },
          { center: -4.4, width: 1.5 },
          { center: 1.9, width: 1.5 },
          { center: 8.3, width: 1.5 },
        ], 3.6),
        ...buildWallSegmentsWithOpenings('1', 'NS', -7.625, 2, 18, [], 3.6),
        ...buildWallSegmentsWithOpenings('1', 'NS', -1.25, 2, 18, [], 3.6),
        ...buildWallSegmentsWithOpenings('1', 'NS', 5.125, 2, 18, [], 3.6)
      );
    } else {
      // Floor 2: Rooms 11..15 + Room 13 Secret Chamber
      walls.push(
        ...buildWallSegmentsWithOpenings('2', 'EW', -2, -20, 14, [
          { center: -16.75, width: 1.5 },
          { center: -10.25, width: 1.5 },
          { center: -3.0, width: 1.5 }, // Room 13 main door
          { center: 4.25, width: 1.5 }, // Room 14 door
          { center: 10.75, width: 1.5 }, // Room 15 door
        ], 3.6),
        ...buildWallSegmentsWithOpenings('2', 'NS', -13.5, -18, -2, [], 3.6),
        ...buildWallSegmentsWithOpenings('2', 'NS', -7.0, -18, -2, [], 3.6),
        // East wall of Room 13 (X=+1.0) has secret sliding panel opening at Z=-14.5!
        ...buildWallSegmentsWithOpenings('2', 'NS', 1.0, -18, -2, [{ center: -14.5, width: 1.5 }], 3.6),
        ...buildWallSegmentsWithOpenings('2', 'EW', -11, 1.0, 7.5, [], 3.6), // Separates R13 Secret from R14!
        ...buildWallSegmentsWithOpenings('2', 'NS', 7.5, -18, -2, [], 3.6),
        // Room 13 inner bathroom partition (X=-7..-3.5, Z=-18..-13)
        ...buildWallSegmentsWithOpenings('2', 'NS', -3.5, -18, -13, [{ center: -15.5, width: 1.3 }], 3.6),
        ...buildWallSegmentsWithOpenings('2', 'EW', -13, -7, -3.5, [], 3.6)
      );
      // South corridor wall Z=+2 for Rooms 16..19
      walls.push(
        ...buildWallSegmentsWithOpenings('2', 'EW', 2, -14, 11.5, [
          { center: -10.8, width: 1.5 },
          { center: -4.4, width: 1.5 },
          { center: 1.9, width: 1.5 },
          { center: 8.3, width: 1.5 },
        ], 3.6),
        ...buildWallSegmentsWithOpenings('2', 'NS', -7.625, 2, 18, [], 3.6),
        ...buildWallSegmentsWithOpenings('2', 'NS', -1.25, 2, 18, [], 3.6),
        ...buildWallSegmentsWithOpenings('2', 'NS', 5.125, 2, 18, [], 3.6)
      );
    }
  });

  // ============ FLOOR 3 (Staff & Owner Wing) ============
  walls.push(
    ...buildWallSegmentsWithOpenings('3', 'EW', -18, -20, 20, [], 3.6, true, false),
    ...buildWallSegmentsWithOpenings('3', 'EW', 18, -20, 20, [], 3.6, true, false),
    ...buildWallSegmentsWithOpenings('3', 'NS', -20, -18, 18, [], 3.6, true, false),
    ...buildWallSegmentsWithOpenings('3', 'NS', 20, -18, 18, [], 3.6, true, false),
    ...buildWallSegmentsWithOpenings('3', 'NS', 14, -18, 8, [{ center: 6.2, width: 2.6, noLintel: true }], 3.6),
    ...buildWallSegmentsWithOpenings('3', 'EW', -8, 14, 20, [], 3.6),
    ...buildWallSegmentsWithOpenings('3', 'EW', 8, 11.5, 20, [{ center: 12.8, width: 1.5 }], 3.6),
    ...buildWallSegmentsWithOpenings('3', 'NS', 11.5, 2, 18, [], 3.6),
    ...buildWallSegmentsWithOpenings('3', 'NS', -16.5, 2, 5.5, [{ center: 3.75, width: 1.6 }], 3.6),
    ...buildWallSegmentsWithOpenings('3', 'EW', 5.5, -20, -14, [], 3.6),
    ...buildWallSegmentsWithOpenings('3', 'NS', -14, 2, 18, [], 3.6),
    // North rooms: Staff 1 (-20..-10), Staff 2 (-10..0), Staff 3 (0..7), Kavita (7..14)
    ...buildWallSegmentsWithOpenings('3', 'EW', -2, -20, 14, [
      { center: -15, width: 1.5 },
      { center: -5, width: 1.5 },
      { center: 3.5, width: 1.5 },
      { center: 10.5, width: 1.5 },
    ], 3.6),
    ...buildWallSegmentsWithOpenings('3', 'NS', -10, -18, -2, [], 3.6),
    ...buildWallSegmentsWithOpenings('3', 'NS', 0, -18, -2, [], 3.6),
    ...buildWallSegmentsWithOpenings('3', 'NS', 7, -18, -2, [], 3.6),
    // South rooms: Owner Office (-14..-1), Old Owner Private (-1..11.5)
    ...buildWallSegmentsWithOpenings('3', 'EW', 2, -14, 11.5, [
      { center: -7.5, width: 1.6 },
      { center: 5.25, width: 1.6 },
    ], 3.6),
    ...buildWallSegmentsWithOpenings('3', 'NS', -1, 2, 18, [], 3.6)
  );

  // ============ FLOOR 4 (Rooftop, Water Tank, Lift Machine, Watch Room) ============
  // Rooftop High Security Parapet Walls (3.2m high solid perimeter barrier - no jumping off)
  walls.push(
    { floor: '4', x1: -20, z1: -18, x2: 20, z2: -18, height: 3.2, isExterior: true, isParapet: true },
    { floor: '4', x1: -20, z1: 18, x2: 20, z2: 18, height: 3.2, isExterior: true, isParapet: true },
    { floor: '4', x1: -20, z1: -18, x2: -20, z2: 18, height: 3.2, isExterior: true, isParapet: true },
    { floor: '4', x1: 20, z1: -18, x2: 20, z2: 18, height: 3.2, isExterior: true, isParapet: true }
  );
  // Stair Mumty Enclosure (X: 13.5..20, Z: -8..8)
  walls.push(
    ...buildWallSegmentsWithOpenings('4', 'EW', -8, 13.5, 20, [], 3.4, true),
    ...buildWallSegmentsWithOpenings('4', 'EW', 8, 13.5, 20, [], 3.4, true),
    ...buildWallSegmentsWithOpenings('4', 'NS', 20, -8, 8, [], 3.4, true),
    ...buildWallSegmentsWithOpenings('4', 'NS', 13.5, -8, 8, [{ center: 5.8, width: 1.8 }], 3.4, true) // Exit to open roof!
  );
  // Lift Machine Room (X: -20..-12, Z: -2..8)
  walls.push(
    ...buildWallSegmentsWithOpenings('4', 'EW', -2, -20, -12, [], 3.2, true),
    ...buildWallSegmentsWithOpenings('4', 'EW', 8, -20, -12, [], 3.2, true),
    ...buildWallSegmentsWithOpenings('4', 'NS', -20, -2, 8, [], 3.2, true),
    ...buildWallSegmentsWithOpenings('4', 'NS', -12, -2, 8, [{ center: 3, width: 1.6 }], 3.2, true)
  );
  // Upper Watch Window Room (X: -4..11.5, Z: 8..18)
  walls.push(
    ...buildWallSegmentsWithOpenings('4', 'EW', 8, -4, 11.5, [{ center: 3.75, width: 1.6 }], 3.6, true),
    ...buildWallSegmentsWithOpenings('4', 'NS', -4, 8, 18, [], 3.6, true),
    ...buildWallSegmentsWithOpenings('4', 'NS', 11.5, 8, 18, [], 3.6, true),
    // Front wall Z=18 with window gap
    ...buildWallSegmentsWithOpenings('4', 'EW', 18, -4, 11.5, [{ center: 3.75, width: 3.0, noLintel: false }], 3.6, true, true)
  );

  // Back Courtyard Perimeter (X: -22..22, Z: -38..-18)
  walls.push(
    ...buildWallSegmentsWithOpenings('G', 'NS', -22, -38, -18, [], 3.0, true),
    ...buildWallSegmentsWithOpenings('G', 'NS', 22, -38, -18, [], 3.0, true),
    ...buildWallSegmentsWithOpenings('G', 'EW', -36, -22, 22, [{ center: 0, width: 3.2 }], 3.0, true) // Final Iron Gate at X=0, Z=-36!
  );

  return walls;
}

export const STAIR_RAMPS: StairRamp[] = [
  // Ground -> 1st Floor
  { id: 'st_g_1a', fromFloor: 'G', toFloor: '1', x1: 14.05, x2: 16.88, zStart: 4.5, zEnd: -5.5, yStart: 0, yEnd: 2.0, steps: 20 },
  { id: 'st_g_1b', fromFloor: 'G', toFloor: '1', x1: 17.08, x2: 19.92, zStart: -5.5, zEnd: 4.5, yStart: 2.0, yEnd: 4.0, steps: 20 },
  // 1st -> 2nd Floor
  { id: 'st_1_2a', fromFloor: '1', toFloor: '2', x1: 14.05, x2: 16.88, zStart: 4.5, zEnd: -5.5, yStart: 4.0, yEnd: 6.0, steps: 20 },
  { id: 'st_1_2b', fromFloor: '1', toFloor: '2', x1: 17.08, x2: 19.92, zStart: -5.5, zEnd: 4.5, yStart: 6.0, yEnd: 8.0, steps: 20 },
  // 2nd -> 3rd Floor
  { id: 'st_2_3a', fromFloor: '2', toFloor: '3', x1: 14.05, x2: 16.88, zStart: 4.5, zEnd: -5.5, yStart: 8.0, yEnd: 10.0, steps: 20 },
  { id: 'st_2_3b', fromFloor: '2', toFloor: '3', x1: 17.08, x2: 19.92, zStart: -5.5, zEnd: 4.5, yStart: 10.0, yEnd: 12.0, steps: 20 },
  // 3rd -> 4th Floor
  { id: 'st_3_4a', fromFloor: '3', toFloor: '4', x1: 14.05, x2: 16.88, zStart: 4.5, zEnd: -5.5, yStart: 12.0, yEnd: 14.0, steps: 20 },
  { id: 'st_3_4b', fromFloor: '3', toFloor: '4', x1: 17.08, x2: 19.92, zStart: -5.5, zEnd: 4.5, yStart: 14.0, yEnd: 16.0, steps: 20 },
  // Ground -> Basement (West Stairwell: X -19.85..-14.15, Z -2.5..-10.5)
  { id: 'st_g_b1', fromFloor: 'G', toFloor: 'B1', x1: -19.85, x2: -14.15, zStart: -2.5, zEnd: -10.5, yStart: 0.0, yEnd: -4.0, steps: 22 },
  // Basement Secret Tunnel -> Back Courtyard (X -14..-10.5, Z -18.5..-28.5)
  { id: 'st_b1_ext', fromFloor: 'B1', toFloor: 'G', x1: -14.0, x2: -10.5, zStart: -18.5, zEnd: -28.5, yStart: -4.0, yEnd: 0.0, steps: 22 },
];

export const DOORS: DoorDef[] = [
  // Main Entrance & Courtyard Gate
  { id: 'door_main_entrance', floor: 'G', x: 0, z: 18, orientation: 'EW', width: 2.2, label: 'शाही निवाला मुख्य प्रवेश द्वार' },
  { id: 'door_final_gate', floor: 'G', x: 0, z: -36, orientation: 'EW', width: 3.2, label: 'अंतिम लोहे का गेट', lockedByItem: 'crowbar_gate', isFinalGate: true },

  // Ground Floor Doors
  { id: 'door_g_banquet', floor: 'G', x: 8, z: 13, orientation: 'NS', width: 1.6, label: 'बंद रेस्टोरेंट हॉल' },
  { id: 'door_g_laundry', floor: 'G', x: -11, z: 2, orientation: 'EW', width: 1.6, label: 'कपड़े धोने का कमरा' },
  { id: 'door_g_cctv', floor: 'G', x: 9, z: 2, orientation: 'EW', width: 1.6, label: 'सीसीटीवी कमरा', lockedByItem: 'key_cctv' },
  { id: 'door_g_kitchen', floor: 'G', x: -2, z: -6, orientation: 'EW', width: 1.6, label: 'रसोईघर का बंद दरवाजा', lockedByItem: 'key_kitchen' },
  { id: 'door_g_old_kitchen', floor: 'G', x: -8, z: -14, orientation: 'NS', width: 1.6, label: 'पुरानी रसोई' },
  { id: 'door_g_kitchen_secret', floor: 'G', x: -15.5, z: -14, orientation: 'NS', width: 1.5, label: 'रसोई के पीछे का गुप्त कमरा', lockedByStory: 'kitchen_secret_opened', isSecretPanel: true },
  { id: 'door_g_store', floor: 'G', x: 4, z: -12, orientation: 'NS', width: 1.6, label: 'पुराना स्टोर रूम', lockedByItem: 'key_store_room' },
  { id: 'door_g_basement', floor: 'G', x: -17, z: -2, orientation: 'EW', width: 1.6, label: 'बंद बेसमेंट द्वार', lockedByItem: 'key_basement' },

  // Basement Doors
  { id: 'door_b1_cold', floor: 'B1', x: -1, z: -3, orientation: 'EW', width: 1.6, label: 'ठंडा भंडारण कक्ष' },
  { id: 'door_b1_records', floor: 'B1', x: 13, z: -3, orientation: 'EW', width: 1.6, label: 'पुराना रिकॉर्ड रूम' },
  { id: 'door_b1_power', floor: 'B1', x: 0, z: 2, orientation: 'EW', width: 1.6, label: 'बिजली नियंत्रण कक्ष' },
  { id: 'door_b1_archive', floor: 'B1', x: 14, z: 2, orientation: 'EW', width: 1.6, label: 'तहखाना भंडार' },
  { id: 'door_b1_tunnel', floor: 'B1', x: -12.25, z: -18, orientation: 'EW', width: 1.7, label: 'गुप्त सुरंग का दरवाजा', lockedByStory: 'emergency_exit_unlocked' },

  // 1st Floor Doors (1-10 + Hall)
  { id: 'door_f1_r1', floor: '1', x: -16.6, z: -2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 1' },
  { id: 'door_f1_r2', floor: '1', x: -9.8, z: -2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 2' },
  { id: 'door_f1_r3', floor: '1', x: -3.0, z: -2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 3' },
  { id: 'door_f1_r4', floor: '1', x: 3.8, z: -2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 4' },
  { id: 'door_f1_r5', floor: '1', x: 10.6, z: -2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 5' },
  { id: 'door_f1_old_hall', floor: '1', x: -15.2, z: 5.5, orientation: 'EW', width: 1.6, label: 'पुराने मेहमानों का हॉल' },
  { id: 'door_f1_r6', floor: '1', x: -10.8, z: 2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 6' },
  { id: 'door_f1_r7', floor: '1', x: -4.4, z: 2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 7' },
  { id: 'door_f1_r8', floor: '1', x: 1.9, z: 2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 8' },
  { id: 'door_f1_r9', floor: '1', x: 8.3, z: 2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 9' },
  { id: 'door_f1_r10', floor: '1', x: 12.8, z: 8, orientation: 'EW', width: 1.5, label: 'कमरा नं. 10' },

  // 2nd Floor Doors (11-20 + Room 13 Peephole & Secret Panel)
  { id: 'door_f2_r11', floor: '2', x: -16.75, z: -2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 11' },
  { id: 'door_f2_r12', floor: '2', x: -10.25, z: -2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 12' },
  { id: 'door_f2_r13', floor: '2', x: -3.0, z: -2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 13', lockedByItem: 'key_room13', hasPeephole: true },
  { id: 'door_f2_r13_bath', floor: '2', x: -3.5, z: -15.5, orientation: 'NS', width: 1.3, label: 'कमरा 13 बाथरूम' },
  { id: 'door_f2_r13_secret', floor: '2', x: 1.0, z: -14.5, orientation: 'NS', width: 1.5, label: 'कमरा नं. 13 का गुप्त कक्ष', lockedByKeypad: 'keypad_room13_secret', isSecretPanel: true },
  { id: 'door_f2_r14', floor: '2', x: 4.25, z: -2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 14' },
  { id: 'door_f2_r15', floor: '2', x: 10.75, z: -2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 15' },
  { id: 'door_f2_r16', floor: '2', x: -10.8, z: 2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 16' },
  { id: 'door_f2_r17', floor: '2', x: -4.4, z: 2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 17' },
  { id: 'door_f2_r18', floor: '2', x: 1.9, z: 2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 18' },
  { id: 'door_f2_r19', floor: '2', x: 8.3, z: 2, orientation: 'EW', width: 1.5, label: 'कमरा नं. 19' },
  { id: 'door_f2_r20', floor: '2', x: 12.8, z: 8, orientation: 'EW', width: 1.5, label: 'कमरा नं. 20' },

  // 3rd Floor Doors
  { id: 'door_f3_staff1', floor: '3', x: -15, z: -2, orientation: 'EW', width: 1.5, label: 'कर्मचारी कक्ष 1 – रमेश यादव' },
  { id: 'door_f3_staff2', floor: '3', x: -5, z: -2, orientation: 'EW', width: 1.5, label: 'कर्मचारी कक्ष 2' },
  { id: 'door_f3_staff3', floor: '3', x: 3.5, z: -2, orientation: 'EW', width: 1.5, label: 'कर्मचारी कक्ष 3' },
  { id: 'door_f3_kavita', floor: '3', x: 10.5, z: -2, orientation: 'EW', width: 1.5, label: 'वेट्रेस कविता का कक्ष', lockedByKeypad: 'keypad_kavita' },
  { id: 'door_f3_owner_office', floor: '3', x: -7.5, z: 2, orientation: 'EW', width: 1.6, label: 'मालिक का कार्यालय', lockedByItem: 'key_owner_office' },
  { id: 'door_f3_owner_private', floor: '3', x: 5.25, z: 2, orientation: 'EW', width: 1.6, label: 'पुराने मालिक का निजी कमरा' },
  { id: 'door_f3_archive', floor: '3', x: 12.8, z: 8, orientation: 'EW', width: 1.5, label: 'दस्तावेज कक्ष' },

  // 4th Floor Doors (Roof door permanently barred & locked)
  { id: 'door_f4_roof', floor: '4', x: 13.5, z: 5.8, orientation: 'NS', width: 1.8, label: 'छत का सीलबंद भारी दरवाजा', lockedByStory: 'roof_sealed' },
  { id: 'door_f4_lift_machine', floor: '4', x: -12, z: 3, orientation: 'NS', width: 1.6, label: 'लिफ्ट मशीन कक्ष' },
  { id: 'door_f4_watch', floor: '4', x: 3.75, z: 8, orientation: 'EW', width: 1.6, label: 'ऊपरी मीनार निगरानी कक्ष' },
];

export const HIDE_SPOTS: HideSpotDef[] = [
  // Ground floor hiding spots (curtains, store room, furniture)
  { id: 'hide_g_dining_curtain', floor: 'G', type: 'curtain', label: 'बड़े लाल पर्दे के पीछे छिपें', x: -18.8, z: 12, facingAngle: -Math.PI / 2, camOffsetY: 1.35 },
  { id: 'hide_g_banquet_curtain', floor: 'G', type: 'curtain', label: 'भोज कक्ष के पर्दे के पीछे छिपें', x: 18.6, z: 13, facingAngle: Math.PI / 2, camOffsetY: 1.35 },
  { id: 'hide_g_store_rack', floor: 'G', type: 'storeroom', label: 'स्टोर रूम की बोरियों के पीछे छिपें', x: 11.8, z: -15.5, facingAngle: 0, camOffsetY: 1.1 },
  { id: 'hide_g_laundry', floor: 'G', type: 'curtain', label: 'लटकी सफेद चादरों के पीछे छिपें', x: -12.8, z: -6.5, facingAngle: -Math.PI / 2, camOffsetY: 1.3 },
  { id: 'hide_g_lobby_sofa', floor: 'G', type: 'furniture', label: 'रिसेप्शन के बड़े काउंटर के पीछे झुककर छिपें', x: 3.5, z: 11.5, facingAngle: 0, camOffsetY: 0.75 },

  // 1st Floor hiding spots (accessible Hall, Vestibule & Corridor wardrobes/curtains)
  { id: 'hide_f1_hall_curtain', floor: '1', type: 'curtain', label: 'मखमली पर्दे के पीछे छिपें', x: -18.8, z: 14, facingAngle: -Math.PI / 2, camOffsetY: 1.35 },
  { id: 'hide_f1_hall_wardrobe', floor: '1', type: 'wardrobe', label: 'हॉल की अलमारी के अंदर छिपें', x: -18.8, z: 8.5, facingAngle: Math.PI / 2, camOffsetY: 1.35 },
  { id: 'hide_f1_corr_wardrobe', floor: '1', type: 'wardrobe', label: 'गलियारे की अलमारी के अंदर छिपें', x: -6.5, z: 1.48, facingAngle: Math.PI, camOffsetY: 1.35 },
  { id: 'hide_f1_vestibule_curtain', floor: '1', type: 'curtain', label: 'सीढ़ी के पास पर्दे के पीछे छिपें', x: 19.1, z: 6.5, facingAngle: Math.PI / 2, camOffsetY: 1.35 },

  // 2nd Floor hiding spots (Room 13 bed & wardrobe + accessible Corridor & Lounge!)
  { id: 'hide_f2_r13_bed', floor: '2', type: 'bed', label: 'कमरा 13 के बड़े बिस्तर के नीचे छिपें', x: -6.55, z: -9.5, facingAngle: Math.PI / 2, camOffsetY: 0.35 },
  { id: 'hide_f2_r13_wardrobe', floor: '2', type: 'wardrobe', label: 'कमरा 13 की अलमारी के अंदर छिपें', x: 0.2, z: -9.5, facingAngle: -Math.PI / 2, camOffsetY: 1.35 },
  { id: 'hide_f2_lounge_curtain', floor: '2', type: 'curtain', label: 'पुस्तकालय के पर्दे के पीछे छिपें', x: -18.8, z: 13.0, facingAngle: -Math.PI / 2, camOffsetY: 1.35 },
  { id: 'hide_f2_lounge_wardrobe', floor: '2', type: 'wardrobe', label: 'पुस्तकालय अलमारी के अंदर छिपें', x: -18.8, z: 8.5, facingAngle: Math.PI / 2, camOffsetY: 1.35 },
  { id: 'hide_f2_corr_wardrobe', floor: '2', type: 'wardrobe', label: 'गलियारे की अलमारी के अंदर छिपें', x: 7.5, z: 1.48, facingAngle: Math.PI, camOffsetY: 1.35 },
  { id: 'hide_f2_vestibule_curtain', floor: '2', type: 'curtain', label: 'सीढ़ी के पर्दे के पीछे छिपें', x: 19.1, z: 6.5, facingAngle: Math.PI / 2, camOffsetY: 1.35 },

  // 3rd Floor hiding spots
  { id: 'hide_f3_staff1_bed', floor: '3', type: 'bed', label: 'चारपाई के नीचे छिपें', x: -16.5, z: -12.5, facingAngle: 0, camOffsetY: 0.35 },
  { id: 'hide_f3_staff2_wardrobe', floor: '3', type: 'wardrobe', label: 'कर्मचारी लॉकर के अंदर छिपें', x: -8.5, z: -14.5, facingAngle: 0, camOffsetY: 1.35 },
  { id: 'hide_f3_office_desk', floor: '3', type: 'furniture', label: 'ऑफिस के कोने में छिपें', x: -2.6, z: 15.2, facingAngle: Math.PI, camOffsetY: 0.75 },
  { id: 'hide_f3_private_wardrobe', floor: '3', type: 'wardrobe', label: 'सागौन अलमारी के अंदर छिपें', x: 9.8, z: 14.5, facingAngle: Math.PI / 2, camOffsetY: 1.35 },

  // Basement hiding spots
  { id: 'hide_b1_cold_crates', floor: 'B1', type: 'storeroom', label: 'ठंडे कक्ष के स्टील रैक के पीछे छिपें', x: 4.5, z: -15.5, facingAngle: Math.PI / 2, camOffsetY: 0.85 },
  { id: 'hide_b1_records_shelf', floor: 'B1', type: 'furniture', label: 'फाइल रैक के पीछे छिपें', x: 17.5, z: -15.0, facingAngle: 0, camOffsetY: 0.9 },
  { id: 'hide_b1_archive_crates', floor: 'B1', type: 'storeroom', label: 'बक्सों के पीछे छिपें', x: 17.5, z: 14.5, facingAngle: Math.PI, camOffsetY: 0.85 },
];

export const INTERACTABLES: InteractableDef[] = [
  // Exterior Entrance Bell
  {
    id: 'int_entrance_bell',
    floor: 'G',
    x: 1.55,
    yOffset: 1.38,
    z: 18.28,
    label: 'पुरानी प्रवेश घंटी',
    prompt: 'दरवाजे के पास लगी पुरानी घंटी बजाएँ',
    kind: 'lore',
    completesMission: 1,
  },
  // Ground Reception (register on counter front + Room 13 key offered directly from Kavita's hand!)
  {
    id: 'int_register',
    floor: 'G',
    x: 0,
    yOffset: 1.06,
    z: 12.48,
    label: 'मेहमान रजिस्टर',
    prompt: 'मेहमान रजिस्टर में कलम से अपना नाम "आरव कुमार" लिखें',
    kind: 'register',
    puzzleType: 'register',
    requiredMissionMin: 2,
    completesMission: 3,
  },
  {
    id: 'int_key_room13',
    floor: 'G',
    x: 0.2,
    yOffset: 1.26,
    z: 12.11,
    label: 'कविता के हाथ में कमरा नं. 13 की चाबी',
    prompt: 'कविता के हाथ से कमरा नंबर 13 की चाबी लें',
    kind: 'item',
    itemId: 'key_room13',
    requiredMissionMin: 4,
    completesMission: 4,
  },
  {
    id: 'int_kavita_counter',
    floor: 'G',
    x: 0,
    yOffset: 1.35,
    z: 12.15,
    label: 'काउंटर पर खड़ी लड़की (कविता)',
    prompt: 'काउंटर वाली लड़की से बात करें',
    kind: 'kavita_counter',
    requiredMissionMin: 7,
  },
  {
    id: 'int_reception_ledger',
    floor: 'G',
    x: -2.2,
    yOffset: 1.15,
    z: 9.6,
    label: 'पुराना मेहमान बहीखाता (1998)',
    prompt: 'रिसेप्शन का पुराना बहीखाता पढ़ें और स्टोर रूम की चाबी लें',
    kind: 'lore',
    loreId: 'lore_reception_ledger',
    requiredMissionMin: 10,
    completesMission: 10,
  },
  {
    id: 'int_emergency_terminal',
    floor: 'G',
    x: -2.0,
    yOffset: 1.35,
    z: -4.2,
    label: 'आपातकालीन निकास कार्ड टर्मिनल',
    prompt: 'आपातकालीन निकास कार्ड स्वाइप करें',
    kind: 'exit_terminal',
    requiredMissionMin: 21,
  },

  // Room 13 Hero Props (2nd Floor)
  {
    id: 'int_r13_food',
    floor: '2',
    x: -1.5,
    yOffset: 0.85,
    z: -9.5,
    label: 'ढक्कन वाली थाली',
    prompt: 'खाने की थाली का ढक्कन खोलकर जाँच करें',
    kind: 'food_tray',
    puzzleType: 'food_inspect',
    requiredMissionMin: 6,
  },
  {
    id: 'int_r13_sleep_bed',
    floor: '2',
    x: -4.3,
    yOffset: 0.85,
    z: -9.5,
    label: 'कमरा नंबर 13 का पलंग',
    prompt: 'कमरा नं. 13 के पलंग पर सोएँ / आराम करें',
    kind: 'sleep_bed',
    requiredMissionMin: 8,
  },
  {
    id: 'int_r13_phone',
    floor: '2',
    x: -2.2,
    yOffset: 0.78,
    z: -15.8,
    label: 'पुराना काला टेलीफोन',
    prompt: 'पुराना टेलीफोन उठाकर सुनें',
    kind: 'telephone',
    puzzleType: 'telephone',
    requiredMissionMin: 10,
  },
  {
    id: 'int_r13_clock',
    floor: '2',
    x: -2.5,
    yOffset: 2.1,
    z: -17.7,
    label: 'दीवार पर लगी पुरानी घड़ी',
    prompt: 'दीवार घड़ी का रुका हुआ समय देखें (11:45)',
    kind: 'wall_clock',
  },
  {
    id: 'int_r13_bath_latch',
    floor: '2',
    x: -5.4,
    yOffset: 1.0,
    z: -16.8,
    label: 'बाथरूम की पुरानी सिटकनी पिन',
    prompt: 'बाथरूम की पुरानी पिन देखें',
    kind: 'item',
    requiredMissionMin: 10,
  },

  // 1st Floor Items & Notes (accessible in Vestibule, Corridor & Old Guests' Hall!)
  {
    id: 'int_f1_r4_cctv_key',
    floor: '1',
    x: 12.6,
    yOffset: 0.88,
    z: 4.5,
    label: 'सीसीटीवी कक्ष की चाबी',
    prompt: 'सुरक्षा मेज से सीसीटीवी कक्ष की चाबी उठाएँ',
    kind: 'item',
    itemId: 'key_cctv',
  },
  {
    id: 'int_f1_hall_cctv_card',
    floor: '1',
    x: -16.8,
    yOffset: 0.68,
    z: 14.5,
    label: 'सीसीटीवी एक्सेस कार्ड',
    prompt: 'सीसीटीवी सुरक्षा कार्ड उठाएँ',
    kind: 'item',
    itemId: 'card_cctv',
  },
  {
    id: 'int_f1_r2_note',
    floor: '1',
    x: -9.8,
    yOffset: 0.85,
    z: -1.15,
    label: 'यात्री का फटा टिकट',
    prompt: 'कमरा 2 के बाहर पड़ा यात्री का नोट पढ़ें',
    kind: 'lore',
    loreId: 'lore_room_misc_1',
  },
  {
    id: 'int_f1_r9_note',
    floor: '1',
    x: -16.0,
    yOffset: 0.85,
    z: 9.5,
    label: 'बिजली मिस्त्री का सुराग नोट',
    prompt: 'बिजली मिस्त्री शंकर का नोट पढ़ें',
    kind: 'lore',
    loreId: 'lore_room_misc_2',
  },

  // Ground Floor CCTV, Laundry, Old Kitchen, Kitchen Secret Room, Store
  {
    id: 'int_g_cctv_console',
    floor: 'G',
    x: 9.0,
    yOffset: 1.0,
    z: -4.2,
    label: 'सीसीटीवी निगरानी प्रणाली',
    prompt: 'पुराने कैमरों की रिकॉर्डिंग देखें',
    kind: 'puzzle',
    puzzleType: 'cctv_system',
    requiredMissionMin: 11,
    completesMission: 12,
  },
  {
    id: 'int_g_laundry_kitchen_key',
    floor: 'G',
    x: -11.0,
    yOffset: 0.72,
    z: -7.5,
    label: 'रसोईघर की चाबी',
    prompt: 'कपड़े की टोकरी में रखी रसोई की चाबी उठाएँ',
    kind: 'item',
    itemId: 'key_kitchen',
  },
  {
    id: 'int_g_old_kitchen_paper',
    floor: 'G',
    x: -11.8,
    yOffset: 0.9,
    z: -16.2,
    label: 'पासवर्ड वाला मुड़ा कागज',
    prompt: 'रसोइए का छोड़ा कागज पढ़ें व उठाएँ',
    kind: 'item',
    itemId: 'paper_password',
    loreId: 'lore_password_paper',
    completesMission: 14,
  },
  {
    id: 'int_g_kitchen_puzzle1',
    floor: 'G',
    x: -13.2,
    yOffset: 0.95,
    z: -11.4,
    label: 'पुरानी रसोई · तांबे के बर्तन व मसाला अलमारी',
    prompt: 'पहली पहेली हल करें (गुप्त कमरे का रास्ता खोलें)',
    kind: 'puzzle',
    puzzleType: 'kitchen_vessels',
    requiredMissionMin: 17,
    completesMission: 22,
  },
  {
    id: 'int_g_kitchen_almirah',
    floor: 'G',
    x: -18.5,
    yOffset: 1.15,
    z: -15.7,
    label: 'गुप्त कमरे की बंद लोहे की अलमारी',
    prompt: 'दूसरी पहेली: बंद लोहे की अलमारी खोलें',
    kind: 'puzzle',
    puzzleType: 'kitchen_almirah',
    requiredMissionMin: 17,
    completesMission: 23,
  },
  {
    id: 'int_g_kitchen_keybox',
    floor: 'G',
    x: -18.5,
    yOffset: 1.05,
    z: -11.8,
    label: 'मेन डोर चाबी का अंतिम सुरक्षा बक्सा',
    prompt: 'तीसरी पहेली: मेन डोर की असली चाबी निकालें',
    kind: 'puzzle',
    puzzleType: 'main_door_key_box',
    requiredMissionMin: 17,
    completesMission: 24,
  },
  {
    id: 'int_g_store_clue',
    floor: 'G',
    x: 10.5,
    yOffset: 0.95,
    z: -9.8,
    label: 'स्टोर रूम में पुराना सुराग नोट',
    prompt: 'स्टोर रूम के बक्सों में रखा सुराग नोट पढ़ें',
    kind: 'store_clue',
    loreId: 'lore_store_clue',
    completesMission: 13,
  },
  {
    id: 'int_g_store_part1',
    floor: 'G',
    x: 9.5,
    yOffset: 0.95,
    z: -14.5,
    label: 'बिजली का पुर्जा (फ्यूज कॉइल 1/3)',
    prompt: 'बिजली का पुर्जा (फ्यूज कॉइल) उठाएँ',
    kind: 'item',
    itemId: 'parts_electric_1',
  },

  // 2nd Floor Misc (accessible Closed Library Lounge) & Room 13 Secret
  {
    id: 'int_f2_r17_note',
    floor: '2',
    x: -16.2,
    yOffset: 0.85,
    z: 10.0,
    label: 'फँसे यात्री का संदेश',
    prompt: 'सुरेश मेहता का संदेश पढ़ें',
    kind: 'lore',
    loreId: 'lore_room_misc_3',
  },
  {
    id: 'int_f2_r13_secret_record',
    floor: '2',
    x: 4.5,
    yOffset: 0.9,
    z: -15.2,
    label: 'कमरा नंबर 13 का गुप्त रिकॉर्ड',
    prompt: 'कमरा नंबर 13 का गुप्त रिकॉर्ड उठाएँ व पढ़ें',
    kind: 'item',
    itemId: 'record_room13',
    loreId: 'lore_room13_secret',
  },

  // 3rd Floor Items & Safes
  {
    id: 'int_f3_ramesh_diary',
    floor: '3',
    x: -15.5,
    yOffset: 0.85,
    z: -13.0,
    label: 'रमेश यादव की पुरानी डायरी',
    prompt: 'रसोइए रमेश यादव की डायरी उठाएँ',
    kind: 'item',
    itemId: 'diary_ramesh',
    loreId: 'lore_ramesh_diary',
    completesMission: 15,
  },
  {
    id: 'int_f3_staff3_part2',
    floor: '3',
    x: 3.5,
    yOffset: 0.9,
    z: -14.0,
    label: 'बिजली का पुर्जा (रिले स्विच 2/3)',
    prompt: 'रिले स्विच (बिजली का पुर्जा) उठाएँ',
    kind: 'item',
    itemId: 'parts_electric_2',
  },
  {
    id: 'int_f3_kavita_key',
    floor: '3',
    x: 10.5,
    yOffset: 0.88,
    z: -14.2,
    label: 'मालिक के कार्यालय की चाबी',
    prompt: 'मालिक के कार्यालय की चाबी उठाएँ',
    kind: 'item',
    itemId: 'key_owner_office',
    completesMission: 16,
  },
  {
    id: 'int_f3_office_drawer',
    floor: '3',
    x: -7.5,
    yOffset: 0.88,
    z: 13.0,
    label: 'मालिक की मेज की दराज (पुराना नोट)',
    prompt: 'पुराने ऑफिस की दराज खोलकर गुप्त नोट पढ़ें',
    kind: 'office_drawer',
    itemId: 'note_office_drawer',
    loreId: 'lore_office_drawer',
  },
  {
    id: 'int_f3_owner_safe',
    floor: '3',
    x: -11.5,
    yOffset: 1.1,
    z: 15.0,
    label: 'मालिक की बंद तिजोरी (कोड: 1145 या 145)',
    prompt: 'मालिक की तिजोरी खोलकर बेसमेंट की चाबी व डायरी निकालें',
    kind: 'puzzle',
    puzzleType: 'keypad_owner_safe',
    requiredMissionMin: 3,
  },
  {
    id: 'int_f3_private_crest',
    floor: '3',
    x: 4.5,
    yOffset: 0.88,
    z: 12.5,
    label: 'कमरा 13 का पीतल प्रतीक व मीरा का पत्र',
    prompt: 'मीरा की चिट्ठी व पीतल प्रतीक उठाएँ',
    kind: 'item',
    itemId: 'crest_room13',
    loreId: 'lore_meera_suite',
  },

  // 4th Floor Items
  {
    id: 'int_f4_lift_card',
    floor: '4',
    x: -16.5,
    yOffset: 0.9,
    z: 3.0,
    label: 'लिफ्ट का कार्ड व कंट्रोल बोर्ड (3/3)',
    prompt: 'लिफ्ट का कार्ड व बिजली कंट्रोल बोर्ड उठाएँ',
    kind: 'item',
    itemId: 'card_lift',
  },
  {
    id: 'int_f4_tank_exit_card',
    floor: '4',
    x: 16.5,
    yOffset: 1.0,
    z: 4.5,
    label: 'छत सीढ़ी कक्ष - आपातकालीन निकास कार्ड बॉक्स',
    prompt: 'आपातकालीन निकास कार्ड और चौकीदार की पर्ची लें',
    kind: 'item',
    itemId: 'card_emergency_exit',
    loreId: 'lore_water_tank',
  },

  // Basement Items & Puzzles
  {
    id: 'int_b1_cold_crate',
    floor: 'B1',
    x: -1.0,
    yOffset: 0.95,
    z: -13.5,
    label: 'जमे हुए ठंडे बक्से की जाँच',
    prompt: 'ठंडे भंडारण के जमे बक्से और दस्तावेज की जाँच करें',
    kind: 'cold_crate',
    loreId: 'lore_cold_storage',
    requiredMissionMin: 18,
    completesMission: 19,
  },
  {
    id: 'int_b1_guest_list',
    floor: 'B1',
    x: 13.0,
    yOffset: 0.95,
    z: -12.0,
    label: 'पुराने मेहमानों की सूची',
    prompt: 'लापता मेहमानों की वास्तविक सूची उठाएँ',
    kind: 'item',
    itemId: 'guest_list',
    loreId: 'lore_guest_list',
  },
  {
    id: 'int_b1_wiring_panel',
    floor: 'B1',
    x: -5.5,
    yOffset: 1.35,
    z: 10.5,
    label: 'मुख्य बिजली तार व फ्यूज बॉक्स',
    prompt: 'फ्यूज बॉक्स पहेली / बिजली तार पैनल ठीक करें',
    kind: 'puzzle',
    puzzleType: 'wiring',
    requiredMissionMin: 8,
  },
  {
    id: 'int_b1_generator',
    floor: 'B1',
    x: 2.5,
    yOffset: 1.1,
    z: 11.0,
    label: 'डीजल जनरेटर यूनिट',
    prompt: 'जनरेटर चालू करके पूरी इमारत की बिजली बहाल करें',
    kind: 'puzzle',
    puzzleType: 'generator',
    requiredMissionMin: 8,
  },
  {
    id: 'int_b1_crowbar',
    floor: 'B1',
    x: 14.0,
    yOffset: 0.82,
    z: 11.5,
    label: 'लोहे की भारी छड़ (सब्बल)',
    prompt: 'बाहरी गेट तोड़ने के लिए लोहे की छड़ उठाएँ',
    kind: 'item',
    itemId: 'crowbar_gate',
  },
  {
    id: 'int_b1_tunnel_clue',
    floor: 'B1',
    x: -14.0,
    yOffset: 1.0,
    z: -16.2,
    label: 'पुरानी सुरंग का दरवाजा (3 ताले)',
    prompt: 'तीन चाबियों से पुरानी सुरंग खोलें',
    kind: 'tunnel_hatch',
    requiredMissionMin: 9,
    completesMission: 9,
  },

  // ============ NEW 25 MISSIONS ESCAPE INTERACTABLES ============
  // M1: Old Register with mysterious note at Reception
  {
    id: 'int_m1_register_note',
    floor: 'G',
    x: 0.35,
    yOffset: 1.08,
    z: 12.35,
    label: 'पुराने रजिस्टर में दबा रहस्यमयी नोट',
    prompt: 'रजिस्टर में दबा रहस्यमयी नोट पढ़ें (मेन डोर की चाबी का राज)',
    kind: 'lore',
    loreId: 'lore_reception_ledger',
    requiredMissionMin: 1,
    completesMission: 1,
  },
  // M2: Laundry key & Store room box
  {
    id: 'int_m2_laundry_key',
    floor: 'G',
    x: -11.5,
    yOffset: 0.75,
    z: -3.5,
    label: 'स्टोर रूम की चाबी (लाँड्री)',
    prompt: 'कपड़े धोने वाले कमरे से स्टोर रूम की चाबी उठाएँ',
    kind: 'item',
    itemId: 'key_store_room',
    completesMission: 2,
  },
  {
    id: 'int_m2_store_map',
    floor: 'G',
    x: 9.8,
    yOffset: 0.95,
    z: -11.2,
    label: 'पुराने ऑफिस का नक्शा (स्टोर बक्सा)',
    prompt: 'स्टोर रूम के पुराने बक्से से पुराने ऑफिस का नक्शा लें',
    kind: 'item',
    itemId: 'map_old_office',
    loreId: 'lore_map_office',
    completesMission: 2,
  },
  // M3: Old Office Diary (Mahendra Pratap)
  {
    id: 'int_m3_owner_diary',
    floor: '3',
    x: -7.2,
    yOffset: 0.88,
    z: 13.5,
    label: 'महेंद्र प्रताप की पुरानी डायरी',
    prompt: 'महेंद्र प्रताप की डायरी पढ़ें (किचन के गुप्त कमरे का सुराग)',
    kind: 'item',
    itemId: 'letter_owner',
    loreId: 'lore_owner_letter',
    completesMission: 3,
  },
  // M4: Secret Door Map & Clues on Floor 1
  {
    id: 'int_m4_secret_map',
    floor: '1',
    x: 3.5,
    yOffset: 0.85,
    z: -10.5,
    label: 'गुप्त दरवाजे का नक्शा व 3 संकेत',
    prompt: 'कमरा 4 की अलमारी से गुप्त दरवाजे का नक्शा लें',
    kind: 'item',
    itemId: 'map_secret_door',
    loreId: 'lore_map_secret',
    completesMission: 4,
  },
  // M5: Floor 2 Library Bookshelf Puzzle
  {
    id: 'int_m5_library_books',
    floor: '2',
    x: -18.2,
    yOffset: 1.1,
    z: 11.5,
    label: 'पुरानी लाइब्रेरी · किताबों की अलमारी',
    prompt: 'किताबों को सही क्रम में लगाकर गुप्त दराज खोलें',
    kind: 'puzzle',
    puzzleType: 'library_puzzle',
    requiredMissionMin: 5,
    completesMission: 5,
  },
  // M7: Meera's Diary and Wall Symbols in Secret Kitchen
  {
    id: 'int_m7_meera_diary',
    floor: 'G',
    x: -18.2,
    yOffset: 0.92,
    z: -14.2,
    label: 'मीरा की डायरी',
    prompt: 'गुप्त कमरे की मेज से मीरा की डायरी पढ़ें',
    kind: 'item',
    itemId: 'diary_meera',
    loreId: 'lore_meera_diary',
    completesMission: 7,
  },
  {
    id: 'int_m7_symbols_wall',
    floor: 'G',
    x: -19.6,
    yOffset: 1.35,
    z: -13.5,
    label: 'दीवार पर उकेरे तीन गुप्त प्रतीक',
    prompt: 'दीवार पर 3 प्रतीक दबाकर बेसमेंट की सीढ़ियाँ खोलें',
    kind: 'puzzle',
    puzzleType: 'secret_symbols_wall',
    requiredMissionMin: 7,
    completesMission: 7,
  },
  // M8: Basement Tunnel Map in Power Room
  {
    id: 'int_m8_tunnel_map',
    floor: 'B1',
    x: 3.2,
    yOffset: 1.05,
    z: 13.5,
    label: 'पुरानी सुरंग का नक्शा',
    prompt: 'बिजली रूम से सुरंग का नक्शा लें',
    kind: 'item',
    itemId: 'map_basement_tunnel',
    loreId: 'lore_tunnel_map',
    completesMission: 8,
  },
  // M9: Three Tunnel Keys
  {
    id: 'int_m9_key1',
    floor: 'G',
    x: 12.2,
    yOffset: 1.15,
    z: -15.5,
    label: 'सुरंग की पहली चाबी (स्टोर रूम शेल्फ)',
    prompt: 'स्टोर रूम के शेल्फ से सुरंग की पहली चाबी उठाएँ',
    kind: 'item',
    itemId: 'key_tunnel_1',
  },
  {
    id: 'int_m9_key2',
    floor: 'B1',
    x: 16.5,
    yOffset: 0.88,
    z: -14.5,
    label: 'सुरंग की दूसरी चाबी (रिकॉर्ड रूम)',
    prompt: 'रिकॉर्ड रूम के बक्से से सुरंग की दूसरी चाबी उठाएँ',
    kind: 'item',
    itemId: 'key_tunnel_2',
  },
  {
    id: 'int_m9_key3',
    floor: 'G',
    x: -12.5,
    yOffset: 1.05,
    z: -7.2,
    label: 'सुरंग की तीसरी चाबी (लाँड्री रूम)',
    prompt: 'लाँड्री रूम की दीवार से सुरंग की तीसरी चाबी उठाएँ',
    kind: 'item',
    itemId: 'key_tunnel_3',
  },
  // M10: Old Godown Wooden Chest (Code lock 358)
  {
    id: 'int_m10_godown_chest',
    floor: 'B1',
    x: -12.2,
    yOffset: 0.85,
    z: -27.5,
    label: 'पुराने गोदाम का लकड़ी का बक्सा',
    prompt: '3 अंकों का कोड लॉक (358) खोलकर चाबी लें',
    kind: 'puzzle',
    puzzleType: 'godown_box',
    requiredMissionMin: 10,
    completesMission: 10,
  },
  // M12: Security Cabinet in CCTV room
  {
    id: 'int_m12_cabinet',
    floor: 'G',
    x: 12.5,
    yOffset: 1.25,
    z: -3.8,
    label: 'दीवार पर बंद सुरक्षा कैबिनेट',
    prompt: 'छोटी चाबी से कैबिनेट खोलकर मेन डोर की चाबी निकालें',
    kind: 'puzzle',
    puzzleType: 'cabinet_lock',
    requiredMissionMin: 12,
    completesMission: 12,
  },
  // M13: Electronic keypad terminal
  {
    id: 'int_m13_terminal',
    floor: 'G',
    x: 6.2,
    yOffset: 1.35,
    z: -4.5,
    label: 'मेन डोर इलेक्ट्रॉनिक लॉक टर्मिनल',
    prompt: '4 अंकों का कोड (9274) डालकर इलेक्ट्रॉनिक लॉक निष्क्रिय करें',
    kind: 'puzzle',
    puzzleType: 'electronic_keypad',
    requiredMissionMin: 13,
    completesMission: 13,
  },
  // M15: Heavy Service Corridor Door (4 symbols)
  {
    id: 'int_m15_service_door',
    floor: 'B1',
    x: -13.8,
    yOffset: 1.35,
    z: -22.5,
    label: 'सर्विस कॉरिडोर का भारी दरवाजा',
    prompt: 'चार प्रतीकों की पहेली हल कर सर्विस कॉरिडोर खोलें',
    kind: 'puzzle',
    puzzleType: 'service_corridor_symbols',
    requiredMissionMin: 15,
    completesMission: 15,
  },
  // M16: Ramesh Yadav's emergency exit map
  {
    id: 'int_m16_emergency_map',
    floor: '3',
    x: -18.2,
    yOffset: 0.95,
    z: -14.5,
    label: 'इमरजेंसी निकास का नया नक्शा',
    prompt: 'रसोइये की अलमारी से इमरजेंसी निकास का नक्शा लें',
    kind: 'item',
    itemId: 'map_emergency_exit',
    loreId: 'lore_emergency_map',
    completesMission: 16,
  },
  // M17: Emergency Exit Door (3 locks)
  {
    id: 'int_m17_emergency_door',
    floor: 'G',
    x: -6.5,
    yOffset: 1.25,
    z: -3.5,
    label: 'इमरजेंसी निकास द्वार (3 ताले)',
    prompt: 'इमरजेंसी निकास के तीनों ताले खोलें',
    kind: 'item',
    requiredMissionMin: 17,
  },
  // M18: Alarm Computer
  {
    id: 'int_m18_alarm_computer',
    floor: '4',
    x: -15.5,
    yOffset: 1.05,
    z: 2.5,
    label: 'इमरजेंसी अलार्म कंट्रोल कंप्यूटर',
    prompt: 'कंप्यूटर पासवर्ड डालकर लाल इमरजेंसी अलार्म चालू करें',
    kind: 'puzzle',
    puzzleType: 'alarm_computer',
    requiredMissionMin: 18,
    completesMission: 18,
  },
  // M19: Manager Room Secret Drawer
  {
    id: 'int_m19_manager_drawer',
    floor: '3',
    x: 8.5,
    yOffset: 0.95,
    z: 14.5,
    label: 'पुराने मैनेजर की गुप्त दराज',
    prompt: 'मैनेजर दराज की पहेली हल कर इमरजेंसी मास्टर चाबी लें',
    kind: 'puzzle',
    puzzleType: 'manager_drawer',
    requiredMissionMin: 19,
    completesMission: 19,
  },
  // M20: Final Escape Preparation Checklist
  {
    id: 'int_m20_prep_bag',
    floor: '2',
    x: -2.8,
    yOffset: 0.85,
    z: -11.5,
    label: 'अंतिम तैयारी की मेज (कमरा 13)',
    prompt: 'थैले का सामान जाँचे व Escape रास्ता चुनें',
    kind: 'puzzle',
    puzzleType: 'escape_prep_modal',
    requiredMissionMin: 20,
    completesMission: 20,
  },
  // M24: Broken Car on road
  {
    id: 'int_m24_car',
    floor: 'G',
    x: -3.2,
    yOffset: 0.95,
    z: 28.5,
    label: 'आरव की खराब कार (सड़क पर)',
    prompt: 'कार की बैटरी व चाबी जाँचकर स्टार्ट करें',
    kind: 'puzzle',
    puzzleType: 'car_start',
    requiredMissionMin: 24,
    completesMission: 24,
  },

  // Elevator Panels on B1, G, 1, 2, 3 (X: -16.6, Z: 3.75)
  { id: 'lift_B1', floor: 'B1', x: -16.7, yOffset: 1.35, z: 3.75, label: 'लिफ्ट (तहखाना)', prompt: 'लिफ्ट पैनल उपयोग करें', kind: 'lift_panel' },
  { id: 'lift_G', floor: 'G', x: -16.7, yOffset: 1.35, z: 3.75, label: 'लिफ्ट (भूतल)', prompt: 'लिफ्ट पैनल उपयोग करें', kind: 'lift_panel' },
  { id: 'lift_1', floor: '1', x: -16.7, yOffset: 1.35, z: 3.75, label: 'लिफ्ट (पहली मंजिल)', prompt: 'लिफ्ट पैनल उपयोग करें', kind: 'lift_panel' },
  { id: 'lift_2', floor: '2', x: -16.7, yOffset: 1.35, z: 3.75, label: 'लिफ्ट (दूसरी मंजिल)', prompt: 'लिफ्ट पैनल उपयोग करें', kind: 'lift_panel' },
  { id: 'lift_3', floor: '3', x: -16.7, yOffset: 1.35, z: 3.75, label: 'लिफ्ट (तीसरी मंजिल)', prompt: 'लिफ्ट पैनल उपयोग करें', kind: 'lift_panel' },

  // Extra Battery pickups across accessible areas so player never runs out of flashlight completely
  { id: 'bat_f1_r1', floor: '1', x: -15.2, yOffset: 0.85, z: 3.2, label: 'टॉर्च बैटरी', prompt: 'टॉर्च की बैटरी उठाएँ (+45%)', kind: 'battery' },
  { id: 'bat_f1_r8', floor: '1', x: -18.2, yOffset: 0.85, z: 16.0, label: 'टॉर्च बैटरी', prompt: 'टॉर्च की बैटरी उठाएँ (+45%)', kind: 'battery' },
  { id: 'bat_f2_r15', floor: '2', x: 12.6, yOffset: 0.88, z: 4.5, label: 'टॉर्च बैटरी', prompt: 'टॉर्च की बैटरी उठाएँ (+45%)', kind: 'battery' },
  { id: 'bat_f3_archive', floor: '3', x: 16.0, yOffset: 0.85, z: 13.0, label: 'टॉर्च बैटरी', prompt: 'टॉर्च की बैटरी उठाएँ (+45%)', kind: 'battery' },
  { id: 'bat_b1_records', floor: 'B1', x: 15.0, yOffset: 0.85, z: -8.0, label: 'टॉर्च बैटरी', prompt: 'टॉर्च की बैटरी उठाएँ (+45%)', kind: 'battery' },
];

// Waypoint graph for Kavita's intelligent patrol, sound investigation & chase across floors
export const WAYPOINTS: WaypointNode[] = [
  // Ground floor
  { id: 'wp_g_lobby', floor: 'G', x: 0, y: 0, z: 10, neighbors: ['wp_g_dining', 'wp_g_banquet', 'wp_g_spine_mid'] },
  { id: 'wp_g_dining', floor: 'G', x: -12, y: 0, z: 12, neighbors: ['wp_g_lobby', 'wp_g_spine_w'] },
  { id: 'wp_g_banquet', floor: 'G', x: 12, y: 0, z: 13, neighbors: ['wp_g_lobby'] },
  { id: 'wp_g_spine_w', floor: 'G', x: -12, y: 0, z: 4, neighbors: ['wp_g_dining', 'wp_g_spine_mid', 'wp_g_laundry'] },
  { id: 'wp_g_laundry', floor: 'G', x: -11, y: 0, z: -4, neighbors: ['wp_g_spine_w'] },
  { id: 'wp_g_spine_mid', floor: 'G', x: 0, y: 0, z: 4, neighbors: ['wp_g_lobby', 'wp_g_spine_w', 'wp_g_spine_e', 'wp_g_exit'] },
  { id: 'wp_g_exit', floor: 'G', x: -2, y: 0, z: -3, neighbors: ['wp_g_spine_mid', 'wp_g_kitchen'] },
  { id: 'wp_g_kitchen', floor: 'G', x: -2, y: 0, z: -12, neighbors: ['wp_g_exit'] },
  { id: 'wp_g_spine_e', floor: 'G', x: 12, y: 0, z: 4, neighbors: ['wp_g_spine_mid', 'wp_g_stair'] },
  { id: 'wp_g_stair', floor: 'G', x: 15.5, y: 0, z: 5.5, neighbors: ['wp_g_spine_e', 'wp_1_stair'] },

  // Floor 1
  { id: 'wp_1_stair', floor: '1', x: 15.5, y: 4, z: 5.5, neighbors: ['wp_g_stair', 'wp_1_e', 'wp_2_stair'] },
  { id: 'wp_1_e', floor: '1', x: 11, y: 4, z: 0, neighbors: ['wp_1_stair', 'wp_1_mid'] },
  { id: 'wp_1_mid', floor: '1', x: 0, y: 4, z: 0, neighbors: ['wp_1_e', 'wp_1_w'] },
  { id: 'wp_1_w', floor: '1', x: -13, y: 4, z: 0, neighbors: ['wp_1_mid'] },

  // Floor 2
  { id: 'wp_2_stair', floor: '2', x: 15.5, y: 8, z: 5.5, neighbors: ['wp_1_stair', 'wp_2_e', 'wp_3_stair'] },
  { id: 'wp_2_e', floor: '2', x: 11, y: 8, z: 0, neighbors: ['wp_2_stair', 'wp_2_mid'] },
  { id: 'wp_2_mid', floor: '2', x: -3, y: 8, z: 0, neighbors: ['wp_2_e', 'wp_2_w', 'wp_2_r13_door'] },
  { id: 'wp_2_r13_door', floor: '2', x: -3, y: 8, z: -1.6, neighbors: ['wp_2_mid'] },
  { id: 'wp_2_w', floor: '2', x: -13, y: 8, z: 0, neighbors: ['wp_2_mid'] },

  // Floor 3
  { id: 'wp_3_stair', floor: '3', x: 15.5, y: 12, z: 5.5, neighbors: ['wp_2_stair', 'wp_3_e'] },
  { id: 'wp_3_e', floor: '3', x: 11, y: 12, z: 0, neighbors: ['wp_3_stair', 'wp_3_mid'] },
  { id: 'wp_3_mid', floor: '3', x: 0, y: 12, z: 0, neighbors: ['wp_3_e', 'wp_3_w'] },
  { id: 'wp_3_w', floor: '3', x: -13, y: 12, z: 0, neighbors: ['wp_3_mid'] },

  // Basement
  { id: 'wp_b1_hall', floor: 'B1', x: -12, y: -4, z: 0, neighbors: ['wp_b1_corridor', 'wp_b1_tunnel'] },
  { id: 'wp_b1_corridor', floor: 'B1', x: 0, y: -4, z: -0.5, neighbors: ['wp_b1_hall', 'wp_b1_east'] },
  { id: 'wp_b1_east', floor: 'B1', x: 12, y: -4, z: -0.5, neighbors: ['wp_b1_corridor'] },
  { id: 'wp_b1_tunnel', floor: 'B1', x: -12.25, y: -4, z: -16, neighbors: ['wp_b1_hall'] },
];

export function findRoomAt(floor: FloorId, x: number, z: number): RoomDef | null {
  for (const room of ROOMS) {
    if (
      room.floor === floor &&
      x >= room.x1 &&
      x <= room.x2 &&
      z >= room.z1 &&
      z <= room.z2
    ) {
      return room;
    }
  }
  return null;
}
