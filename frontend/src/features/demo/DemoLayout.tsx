import type { ReactNode } from 'react'
import { Link } from 'react-router'

export type Props = {
  title: string
  description: string
  backTo?: string
  children: ReactNode
}

function DemoLayout({ title, description, backTo = '/demo', children }: Props) {
  return (
    <main className="min-h-screen bg-paper px-6 py-8 text-ink-900 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link to={backTo} className="type-body-sm text-brand-600 hover:text-brand-700">
          ← 返回
        </Link>
        <h1 className="mt-6 type-h1">{title}</h1>
        <p className="mt-3 max-w-3xl type-body text-ink-600">{description}</p>
        <div className="mt-8 flex flex-col gap-6">{children}</div>
      </div>
    </main>
  )
}

export default DemoLayout
