import type { ComponentType } from 'react'
import { icons, type LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

/** kebab-case → PascalCase (vd "phone-incoming" → "PhoneIncoming"). */
function pascal(name: string): string {
  return name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

interface IconProps {
  name: string
  size?: number
  className?: string
}

/**
 * Icon Lucide theo tên kebab-case. Màu kế thừa currentColor (điều khiển qua
 * class text-*), kích thước qua prop `size`.
 */
export function Icon({ name, size = 16, className }: IconProps) {
  const Cmp = (icons as Record<string, ComponentType<LucideProps>>)[pascal(name)]
  if (!Cmp) return null
  return <Cmp size={size} className={cn('shrink-0', className)} aria-hidden />
}
