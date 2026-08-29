/**
 * 背景音乐（BGM）管理器
 * 支持两首曲目循环播放，可独立控制音乐和音效开关
 */

// 音乐开关状态（由设置面板控制）
let musicEnabled = true;
let sfxEnabled = true;

let currentAudio: HTMLAudioElement | null = null;
let currentTrackIndex = 0;
let bgmStarted = false;
let currentGen = 0; // 递增，回调中检查是否过期

const TRACKS = [
  '/audio/spirit-herb-courtyard.mp3',
  '/audio/cloud-sect-overture.mp3',
];

/** 获取音乐开关状态 */
export function isMusicEnabled(): boolean {
  return musicEnabled;
}

/** 获取音效开关状态 */
export function isSfxEnabled(): boolean {
  return sfxEnabled;
}

/** 设置音乐开关 */
export function setMusicEnabled(enabled: boolean): void {
  musicEnabled = enabled;
  if (!enabled) {
    stopBGM();
  } else {
    playBGM();
  }
}

/** 设置音效开关 */
export function setSfxEnabled(enabled: boolean): void {
  sfxEnabled = enabled;
}

/** 创建并播放当前 currentTrackIndex 对应的曲目 */
function playCurrentTrack(gen: number): void {
  const src = TRACKS[currentTrackIndex];

  const audio = new Audio(src);
  audio.loop = false;
  audio.volume = 0.35;

  audio.addEventListener('ended', () => {
    if (gen !== currentGen) return;
    currentAudio = null;
    playNextTrack();
  });

  audio.addEventListener('error', () => {
    if (gen !== currentGen) return;
    currentAudio = null;
    setTimeout(playNextTrack, 1000);
  });

  audio.play().catch(() => {
    if (gen !== currentGen) return;
    currentAudio = null;
  });

  currentAudio = audio;
}

/** 顺序播放下一首曲目 */
function playNextTrack(): void {
  if (!musicEnabled) return;

  const gen = ++currentGen;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }

  currentTrackIndex = (currentTrackIndex + 1) % TRACKS.length;
  playCurrentTrack(gen);
}

/** 启动 BGM 播放（随机选择起始曲目） */
export function playBGM(): void {
  if (!musicEnabled) return;
  if (currentAudio) return;

  const gen = ++currentGen;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }

  // 随机选择起始曲目，每次开关音乐都不同
  currentTrackIndex = Math.floor(Math.random() * TRACKS.length);
  playCurrentTrack(gen);
  bgmStarted = true;
}

/** 停止 BGM 播放 */
export function stopBGM(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  ++currentGen; // 自增 generation，使所有旧回调静默失效
  bgmStarted = false;
}

/** 是否已启动 BGM */
export function hasBGMStarted(): boolean {
  return bgmStarted;
}