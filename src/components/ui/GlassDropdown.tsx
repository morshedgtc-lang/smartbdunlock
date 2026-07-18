'use client'

import { Dropdown, DropdownOption, DropdownProps } from '@/components/ui/Dropdown'

export type { DropdownOption }

type GlassDropdownProps = Omit<DropdownProps, 'triggerClassName' | 'menuClassName'>

export function GlassDropdown(props: GlassDropdownProps) {
  return (
    <Dropdown
      {...props}
      triggerClassName="w-full justify-between glass-input-dropdown"
    />
  )
}
