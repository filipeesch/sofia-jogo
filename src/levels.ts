export type WorldType = 'island' | 'mountains';

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
}

export const LEVELS: LevelConfig[] = [
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
    cloudCount: 6,
    houseColors: [0xff8a80, 0x80d8ff, 0xfff176]
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
    cloudCount: 8,
    houseColors: [0xc98a5e, 0xa8d8b9, 0xffd88a]
  },
  {
    id: 'noite',
    name: 'Noite Estrelada',
    emoji: '🌙',
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
    cloudCount: 5,
    houseColors: [0xffe08a, 0x9ad0ff, 0xffb3d9]
  }
];
