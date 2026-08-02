// AI 生成的弟子头像池（30 张）
// 弟子通过 avatarSeed % 30 选择对应头像
export const AI_AVATAR_COUNT = 30;

export function getAIAvatarPath(seed: number): string | undefined {
  if (!Number.isFinite(seed)) return undefined;
  // seed % 30 → 1..30
  const idx = ((Math.abs(Math.floor(seed)) % AI_AVATAR_COUNT) + 1);
  return `/avatars/avatar-${idx}.jpg`;
}
