export interface SkillMeta {
  key: string;
  emoji: string;
  en: string;
  mr: string;
  hue: number;
}

export const SKILLS_DATA: Record<string, SkillMeta> = {
  plumber: { key: 'plumber', emoji: '🔧', en: 'Plumber', mr: 'प्लंबर', hue: 205 },
  electrician: { key: 'electrician', emoji: '💡', en: 'Electrician', mr: 'इलेक्ट्रिशियन', hue: 48 },
  carpenter: { key: 'carpenter', emoji: '🪚', en: 'Carpenter', mr: 'सुतार', hue: 28 },
  painter: { key: 'painter', emoji: '🖌️', en: 'Painter', mr: 'पेंटर', hue: 330 },
  mason: { key: 'mason', emoji: '🧱', en: 'Mason', mr: 'गवंडी', hue: 12 },
  helper: { key: 'helper', emoji: '🧰', en: 'Helper', mr: 'मदतनीस', hue: 150 },
};

export const SKILL_KEYS = ['plumber', 'electrician', 'carpenter', 'painter', 'mason', 'helper'] as const;

export const AREAS = [
  'CIDCO N-3',
  'Garkheda',
  'Osmanpura',
  'Jalna Road',
  'Beed Bypass',
  'Samarth Nagar',
  'Waluj',
  'Harsul'
] as const;

export const TIME_SLOTS = [
  { id: 0, en: 'Morning 8–12', mr: 'सकाळ ८–१२' },
  { id: 1, en: 'Afternoon 12–4', mr: 'दुपार १२–४' },
  { id: 2, en: 'Evening 4–7', mr: 'संध्याकाळ ४–७' },
] as const;

export const AURANGABAD_COORDS = {
  center: { lat: 19.8762, lng: 75.3433 },
  areas: {
    'CIDCO N-3': { lat: 19.8821, lng: 75.3621 },
    'Garkheda': { lat: 19.8654, lng: 75.3489 },
    'Osmanpura': { lat: 19.8712, lng: 75.3256 },
    'Jalna Road': { lat: 19.8798, lng: 75.3512 },
    'Beed Bypass': { lat: 19.8512, lng: 75.3345 },
    'Samarth Nagar': { lat: 19.8865, lng: 75.3312 },
    'Waluj': { lat: 19.8321, lng: 75.2412 },
    'Harsul': { lat: 19.9212, lng: 75.3489 },
  } as Record<string, { lat: number; lng: number }>,
};
