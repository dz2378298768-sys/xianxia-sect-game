// 建筑类型 → 生成的水墨建筑图片路径
export const BUILDING_IMAGE_MAP: Record<string, string> = {
  mountain_gate: '/buildings/mountain-gate.jpg',
  lecture_hall: '/buildings/lecture-hall.jpg',
  servant_hall: '/buildings/servant-hall.jpg',
  secret_library: '/buildings/secret-library.jpg',
  outer_residence: '/buildings/outer-residence.jpg',
  inner_residence: '/buildings/inner-residence.jpg',
  core_residence: '/buildings/core-residence.jpg',
  pill_hall: '/buildings/pill-hall.jpg',
  sutra_hall: '/buildings/sutra-hall.jpg',
  artifact_hall: '/buildings/artifact-hall.jpg',
  array_hall: '/buildings/array-hall.jpg',
  spirit_beast_garden: '/buildings/spirit-beast-garden.jpg',
  cave_mansion: '/buildings/cave-mansion.jpg',
  guardian_array: '/buildings/guardian-array.jpg',
  skyscraper_tower: '/buildings/skyscraper-tower.jpg',
};

export function getBuildingImage(type: string): string | undefined {
  return BUILDING_IMAGE_MAP[type];
}
