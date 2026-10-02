import { useNavigate } from 'react-router'
import { SvgIconMap } from '@/assets/SvgIconMap'
import type React from 'react'

export type Props = {
  title: string,
  subTitle?: string,
  showBackButton: boolean,
  children?: React.ReactNode
}

function CustomerTopBar({ title, subTitle, showBackButton = true, children }: Props) {
  const navigate = useNavigate()

  return <nav className="flex h-[52] w-full flex-row items-center border-b border-line bg-surface px-2 py-1.5">

    {showBackButton && <SvgIconMap.TopBarBack 
      className="h-[44] w-[44]"
      onClick={() => navigate(-1)}
    />}

    <div className="ml-1 flex flex-col">
      <span className="type-customer-top-bar-title text-ink-900">{title}</span>
      {subTitle && <span className="type-customer-top-bar-sub-title text-ink-600">{subTitle}</span>}
    </div>
    
    {children && <div className="ml-auto">{children}</div>}
  </nav>
}

export default CustomerTopBar
