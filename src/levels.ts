export type WorldType = 'island' | 'mountains' | 'snow' | 'desert' | 'valley';

export interface LevelConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;
  worldType: WorldType;
  skyDayTop: number;
  skyDayHorizon: number;
  groundColor: number;
  oceanDeep: number;
  oceanShallow: number;
  cycleSeconds: number;
  startNight: boolean;
  starCount: number;
  cloudCount: number;
  houseColors: number[];
  music: number;
  vehicle: 'airplane' | 'car' | 'both';
}

export const LEVELS: LevelConfig[] = [
  {
    id: 'vale',
    name: 'Vale Vivo',
    emoji: '🌄',
    description: 'Vila, fazenda, lago e floresta',
    worldType: 'valley',
    skyDayTop: 0x7fc8f8,
    skyDayHorizon: 0xeaf6ff,
    groundColor: 0x74c463,
    oceanDeep: 0x1a7bb0,
    oceanShallow: 0x38b0d8,
    cycleSeconds: 150,
    startNight: false,
    starCount: 18,
    cloudCount: 10,
    houseColors: [0xff8a80, 0x80d8ff, 0xfff176],
    music: 1,
    vehicle: 'both'
  },
  {
    id: 'valenoite',
    name: 'Vale à Noite',
    emoji: '🌙',
    description: 'O vale com as luzes acesas',
    worldType: 'valley',
    skyDayTop: 0x3a6cc8,
    skyDayHorizon: 0x9cc4ff,
    groundColor: 0x5aa86e,
    oceanDeep: 0x0a3d66,
    oceanShallow: 0x2c6fa8,
    cycleSeconds: 180,
    startNight: true,
    starCount: 22,
    cloudCount: 8,
    houseColors: [0xffe08a, 0x9ad0ff, 0xffb3d9],
    music: 3,
    vehicle: 'both'
  },
  {
    id: 'ilha',
    name: 'Ilha Feliz',
    emoji: '🌴',
    description: 'Voe pela ilha e pelo mar',
    worldType: 'island',
    skyDayTop: 0x54b3f0,
    skyDayHorizon: 0xcfeffb,
    groundColor: 0x6fc45c,
    oceanDeep: 0x0e5fa8,
    oceanShallow: 0x45b6d6,
    cycleSeconds: 150,
    startNight: false,
    starCount: 16,
    cloudCount: 10,
    houseColors: [0xff8a80, 0x80d8ff, 0xfff176],
    music: 0,
    vehicle: 'airplane'
  },
  {
    id: 'montanhas',
    name: 'Vale das Montanhas',
    emoji: '⛰️',
    description: 'Voe entre os picos nevados',
    worldType: 'mountains',
    skyDayTop: 0x7fc8f8,
    skyDayHorizon: 0xeaf6ff,
    groundColor: 0x74c463,
    oceanDeep: 0x1a7bb0,
    oceanShallow: 0x3fb0d8,
    cycleSeconds: 150,
    startNight: false,
    starCount: 16,
    cloudCount: 12,
    houseColors: [0xc98a5e, 0xa8d8b9, 0xffd88a],
    music: 1,
    vehicle: 'both'
  },
  {
    id: 'neve',
    name: 'Mundo da Neve',
    emoji: '❄️',
    description: 'Brinque com bonecos de neve',
    worldType: 'snow',
    skyDayTop: 0xb5e4f7,
    skyDayHorizon: 0xf2faff,
    groundColor: 0xf0f6fc,
    oceanDeep: 0x0e5fa8,
    oceanShallow: 0xbfe6f7,
    cycleSeconds: 150,
    startNight: false,
    starCount: 16,
    cloudCount: 10,
    houseColors: [0xc9644a, 0x9fd0f0, 0xe0b060],
    music: 3,
    vehicle: 'both'
  },
  {
    id: 'deserto',
    name: 'Deserto',
    emoji: '🏜️',
    description: 'Descubra a pirâmide e os cactos',
    worldType: 'desert',
    skyDayTop: 0x8ecdf0,
    skyDayHorizon: 0xffe3b8,
    groundColor: 0xe8c98a,
    oceanDeep: 0x1a7bb0,
    oceanShallow: 0x4fb8e8,
    cycleSeconds: 150,
    startNight: false,
    starCount: 16,
    cloudCount: 8,
    houseColors: [0xd9a066, 0xcf9a5a, 0xe0b080],
    music: 2,
    vehicle: 'both'
  },
  {
    id: 'noite',
    name: 'Noite Estrelada',
    emoji: '⭐',
    description: 'Picos nevados sob a lua',
    worldType: 'mountains',
    skyDayTop: 0x3a6cc8,
    skyDayHorizon: 0x9cc4ff,
    groundColor: 0x5aa86e,
    oceanDeep: 0x0a3d66,
    oceanShallow: 0x2c6fa8,
    cycleSeconds: 180,
    startNight: true,
    starCount: 22,
    cloudCount: 9,
    houseColors: [0xffe08a, 0x9ad0ff, 0xffb3d9],
    music: 3,
    vehicle: 'both'
  }
];
