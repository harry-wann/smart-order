import { Link } from 'react-router';

const componentDemos = [
  {
    code: 'DS-02',
    title: '按鈕',
    description: '主要操作、次要操作與不同狀態的按鈕。',
    path: '/components/ds-02',
  },
  {
    code: 'DS-03',
    title: '輸入元件',
    description: '文字輸入、錯誤狀態與欄位提示。',
    path: '/components/ds-03',
  },
  {
    code: 'DS-04',
    title: '選擇元件',
    description: '單選、多選與下拉選擇的元件骨架。',
    path: '/components/ds-04',
  },
  {
    code: 'DS-05',
    title: '標籤與容器',
    description: '標籤、徽章、卡片與內容容器。',
    path: '/components/ds-05',
  },
  {
    code: 'DS-06',
    title: '品項列與通知',
    description: '點餐品項列、數量與通知提示。',
    path: '/components/ds-06',
  },
  {
    code: 'DS-07',
    title: '其他元件',
    description: '尚未分類的共用元件與互動模式。',
    path: '/components/ds-07',
  },
];

export default function Components() {
  return (
    <main className="min-h-screen bg-paper px-6 py-8 text-ink-900 md:px-10">
      <header className="mx-auto max-w-6xl">
        <p className="type-body-sm text-ink-600">Smart Order · Design System</p>
        <h1 className="type-h1 mt-2">元件展示</h1>
        <p className="type-body mt-3 max-w-2xl text-ink-600">
          從下方選擇一個元件分類，查看目前的設計系統展示與實作骨架。
        </p>
      </header>

      <section className="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {componentDemos.map((demo) => (
          <Link
            key={demo.code}
            to={demo.path}
            className="group rounded-card border border-line bg-surface p-6 shadow-card transition hover:-translate-y-0.5 hover:border-brand-500"
          >
            <p className="type-caption text-brand-600">{demo.code}</p>
            <h2 className="type-h2 mt-2 group-hover:text-brand-600">{demo.title}</h2>
            <p className="type-body-sm mt-3 text-ink-600">{demo.description}</p>
            <span className="type-body-sm mt-6 inline-block text-brand-600">
              查看展示 →
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
