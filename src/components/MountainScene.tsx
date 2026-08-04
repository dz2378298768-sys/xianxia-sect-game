import React from 'react';
import { BuildingTypeNames } from '@/types/building';
import { BUILDING_IMAGE_MAP } from '@/data/buildingImages';

// 建筑在山脉上的位置（百分比坐标）+ 缩放 + 分层
const BUILDING_POSITIONS: Record<string, { x: number; y: number; scale?: number; layer?: 1 | 2 | 3 }> = {
  // 顶层（最高峰）
  skyscraper_tower: { x: 50, y: 22, scale: 1.1, layer: 1 },
  // 中上层（核心建筑）
  cave_mansion: { x: 80, y: 34, scale: 0.85, layer: 2 },
  secret_library: { x: 74, y: 42, scale: 0.95, layer: 2 },
  array_hall: { x: 50, y: 44, scale: 0.9, layer: 2 },
  // 中层（主殿）
  lecture_hall: { x: 33, y: 48, scale: 0.95, layer: 2 },
  pill_hall: { x: 20, y: 50, scale: 0.85, layer: 2 },
  artifact_hall: { x: 87, y: 50, scale: 0.85, layer: 2 },
  sutra_hall: { x: 13, y: 56, scale: 0.8, layer: 3 },
  mountain_gate: { x: 50, y: 56, scale: 1.15, layer: 2 },
  servant_hall: { x: 67, y: 56, scale: 0.9, layer: 3 },
  spirit_beast_garden: { x: 90, y: 62, scale: 0.85, layer: 3 },
  // 前层（居所群）
  outer_residence: { x: 41, y: 68, scale: 0.8, layer: 3 },
  inner_residence: { x: 60, y: 68, scale: 0.8, layer: 3 },
  core_residence: { x: 73, y: 64, scale: 0.85, layer: 3 },
};

// 灵气光点（中景飘动）
const SPIRIT_PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const seed = i * 7919 + 104729;
  const rand = (n: number) => ((seed * (n + 1)) % 10000) / 10000;
  return {
    x: rand(1) * 100,
    y: 35 + rand(2) * 50,
    size: 2 + rand(3) * 3,
    delay: rand(4) * 8,
    duration: 6 + rand(5) * 6,
  };
});

// 顶部少量星辰（叠加在全景图上方）
const STARS = Array.from({ length: 30 }, (_, i) => {
  const seed = i * 9301 + 49297;
  const rand = (n: number) => ((seed * (n + 1)) % 10000) / 10000;
  return {
    x: rand(1) * 100,
    y: rand(2) * 30,
    size: 0.8 + rand(3) * 1.6,
    delay: rand(4) * 5,
    duration: 2.5 + rand(5) * 3,
    opacity: 0.3 + rand(6) * 0.5,
  };
});

interface Props {
  buildings: { id: string; type: string; name: string; level: number; status: string }[];
  onBuildingClick: (id: string) => void;
}

export const MountainScene: React.FC<Props> = ({ buildings, onBuildingClick }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none mountain-scene">
      {/* ===== 全景背景图（核心视觉锚点） ===== */}
      <div
        className="absolute inset-0 sect-panorama-bg"
        style={{ backgroundImage: 'url(/scenes/sect-panorama.jpg)' }}
      />
      {/* 顶部渐变压暗，让星辰和 UI 更清晰 */}
      <div className="absolute inset-0 panorama-vignette" />

      {/* ===== 叠加星辰（增强夜空感） ===== */}
      {STARS.map((s, i) => (
        <div
          key={`star-${i}`}
          className="star-twinkle"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      {/* ===== 灵气粒子层 ===== */}
      {SPIRIT_PARTICLES.map((p, i) => (
        <div
          key={`spirit-${i}`}
          className="spirit-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      {/* ===== 流星 ===== */}
      <div className="shooting-star" style={{ animationDelay: '4s' }} />

      {/* ===== 建筑节点层（使用生成的建筑图片） ===== */}
      {buildings.map(b => {
        const pos = BUILDING_POSITIONS[b.type] || { x: 50, y: 50, scale: 1, layer: 2 };
        const img = BUILDING_IMAGE_MAP[b.type];
        const scale = pos.scale || 1;
        const isActive = b.status === 'active';
        const layerClass = `building-layer-${pos.layer || 2}`;

        return (
          <div
            key={b.id}
            className={`building-node building-img-node ${isActive ? 'building-active' : ''} ${layerClass} pointer-events-auto`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -100%) scale(${scale})`,
            }}
            onClick={() => onBuildingClick(b.id)}
          >
            <div className="building-pedestal" />
            <div className="building-glow" />
            <div className="building-img-wrap">
              {img ? (
                <img src={img} alt={b.name} className="building-img" draggable={false} />
              ) : (
                <div className="building-img-fallback">{BuildingTypeNames[b.type]?.[0] || '建'}</div>
              )}
            </div>
            <div className="building-label">{BuildingTypeNames[b.type] || b.name}</div>
            <div className="building-level">Lv.{b.level}</div>
          </div>
        );
      })}

      {/* ===== 前景：地面雾气 ===== */}
      <div className="foreground-mist" />
    </div>
  );
};
