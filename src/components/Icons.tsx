/**
 * WorldSim — SVG Icon System
 * 
 * 替代 emoji 的 SVG 图标库。
 * 风格统一：线条风格、暗色主题优化、16-24px 设计。
 */
import React from 'react'

interface IconProps {
  size?: number
  className?: string
  color?: string
}

// 模式图标
export function IconGlobe({ size = 20, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export function IconClipboard({ size = 20, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  )
}

export function IconFlask({ size = 20, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 3h6" /><path d="M10 3v7.4a2 2 0 0 1-.6 1.4L4 17.2a2 2 0 0 0-.6 1.4V20a2 2 0 0 0 2 2h13.2a2 2 0 0 0 2-2v-1.4a2 2 0 0 0-.6-1.4L14.6 11.8a2 2 0 0 1-.6-1.4V3" />
    </svg>
  )
}

// 预设场景图标
export function IconRocket({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}

export function IconCastle({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 22V8l4-4 4 4 2-2 2 2 4-4 4 4v14" />
      <path d="M3 22h18" /><path d="M10 14v8" /><path d="M14 14v8" /><rect x="10" y="14" width="4" height="4" />
    </svg>
  )
}

export function IconCity({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="1" y="6" width="6" height="16" rx="1" /><rect x="9" y="2" width="6" height="20" rx="1" /><rect x="17" y="8" width="6" height="14" rx="1" />
      <path d="M4 10h.01M4 14h.01M4 18h.01M12 6h.01M12 10h.01M12 14h.01M12 18h.01M20 12h.01M20 16h.01" />
    </svg>
  )
}

export function IconAlert({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  )
}

export function IconBriefcase({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M12 12v.01" />
    </svg>
  )
}

export function IconScale({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v18" /><path d="M5 7l7-4 7 4" /><path d="M5 7l-2 6h4" /><path d="M3 13a4 4 0 0 0 4 0" /><path d="M19 7l-2 6h4" /><path d="M17 13a4 4 0 0 0 4 0" />
    </svg>
  )
}

export function IconCart({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

export function IconBuilding({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  )
}

export function IconTrend({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" /><polyline points="16,7 22,7 22,13" />
    </svg>
  )
}

export function IconLoader({ size = 16, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" className={`animate-spin ${className}`}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

// ============================================================
// Icon 映射器 — 根据 emoji 返回对应组件
// ============================================================

const MODE_ICON_MAP: Record<string, (props: IconProps) => React.JSX.Element> = {
  '🌍': IconGlobe,
  '📋': IconClipboard,
  '🔬': IconFlask,
}

const PRESET_ICON_MAP: Record<string, (props: IconProps) => React.JSX.Element> = {
  '🚀': IconRocket,
  '🏰': IconCastle,
  '🌆': IconCity,
  '🚨': IconAlert,
  '💼': IconBriefcase,
  '⚖️': IconScale,
  '🛒': IconCart,
  '🏢': IconBuilding,
  '📈': IconTrend,
}

/** 渲染模式图标（大尺寸） */
export function ModeIcon({ emoji, size = 24, color = 'currentColor', className = '' }: { emoji: string } & IconProps) {
  const Component = MODE_ICON_MAP[emoji]
  if (Component) return <Component size={size} color={color} className={className} />
  return <span className={className} style={{ fontSize: size * 0.8 }}>{emoji}</span>
}

/** 渲染预设图标（小尺寸） */
export function PresetIcon({ emoji, size = 14, color = 'currentColor', className = '' }: { emoji: string } & IconProps) {
  const Component = PRESET_ICON_MAP[emoji]
  if (Component) return <Component size={size} color={color} className={className} />
  return <span className={className} style={{ fontSize: size * 0.8 }}>{emoji}</span>
}
