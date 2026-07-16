'use client'

import { Dropdown, DropdownOption, DropdownProps } from '@/components/ui/Dropdown'

export type { DropdownOption }

interface GlassDropdownProps extends Omit<DropdownProps, 'triggerClassName' | 'menuClassName'> {}

export function GlassDropdown(props: GlassDropdownProps) {
  return (
    <Dropdown
      {...props}
      triggerClassName="w-full justify-between"
    />
  )
}
