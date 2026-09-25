import { useEffect, useState } from 'react'

type Props = {
  type: NotificationType,
  title: string,
  desc: string,
  onClick: () => void
}

export type NotificationType = 'add' | 'send'

export default function DropdownNotification({
  type, title, desc, onClick
}: Props) {

  let isAdd = (type === 'add')
  let typeString = (isAdd) ? "加" : "單"

  return (
    <div 
      onClick={onClick}
      className="relative my-2"
    >
      <div className="w-full flex items-center gap-3 px-4 py-3 bg-surface rounded-card shadow-pop">
        <span className={`
          size-8 
          flex 
          items-center 
          justify-center 
          notification-icon 
          ${ isAdd ? 'text-brand-600' : 'text-success'}
          ${ isAdd ? 'bg-brand-100' : 'bg-success-bg'}
          rounded-pill
          shrink-0
        `}>{typeString}</span>

        <div className="min-w-0 flex flex-col flex-1">
          <span className="notification-title text-ink-900 line-clamp-1">{title}</span>
          <span className="type-caption text-ink-600">{desc}</span>
        </div>

        <span className="notification-time text-ink-400 line-clamp-1 shrink-0">剛剛</span>
      </div>

      <div className="absolute inset-x-0 mx-auto bottom-1.25 w-8 h-0.75 rounded-pill bg-line" />
    </div>
  )
}