import { Link } from 'react-router'
import DemoLayout from './DemoLayout'

function DemoIndex() {
  return (
    <DemoLayout
      title="API 範例"
      description="串接後端 /api/northwind 的練習頁。兩頁的畫面一樣，差別只在資料怎麼拿，可以對照著看。教學見 docs/tech/frontend/53-Northwind範例。"
      backTo="/components"
    >
      <section className="grid gap-4 sm:grid-cols-2">
        {DEMOS.map((demo) => (
          <Link
            key={demo.path}
            to={demo.path}
            className="group rounded-card border border-line bg-surface p-6 shadow-card transition hover:-translate-y-0.5 hover:border-brand-500"
          >
            <p className="type-caption text-brand-600">{demo.tag}</p>
            <h2 className="mt-2 type-h2 group-hover:text-brand-600">{demo.title}</h2>
            <p className="mt-3 type-body-sm text-ink-600">{demo.description}</p>
          </Link>
        ))}
      </section>
    </DemoLayout>
  )
}

export default DemoIndex

const DEMOS = [
  {
    tag: 'Axios',
    title: 'Northwind：純 Axios',
    description: '用 useState + useEffect 直接呼叫 services/api/northwind，自己管載入中、錯誤與重抓。',
    path: '/demo/northwind/axios',
  },
  {
    tag: 'TanStack Query',
    title: 'Northwind：TanStack Query',
    description: '用 hooks/northwind 的 useQuery／useMutation，快取、重抓、樂觀更新交給 TanStack Query。',
    path: '/demo/northwind/tanstack',
  },
]
