import { Link } from 'react-router';

const defaultSections = ['元件展示區', '互動狀態區', '規格備註區'];

export default function DemoPage({ code, title, description, sections = defaultSections }) {
  return (
    <main className="min-h-screen bg-paper px-6 py-8 text-ink-900 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="type-body-sm text-brand-600 hover:text-brand-700">
          ← 返回元件展示
        </Link>

        <header className="mt-8">
          <p className="type-body-sm text-brand-600">{code}</p>
          <h1 className="type-h1 mt-2">{title}</h1>
          <p className="type-body mt-3 max-w-2xl text-ink-600">{description}</p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {sections.map((section) => (
            <section
              key={section}
              className="min-h-56 rounded-card border border-dashed border-line-strong bg-surface p-6"
            >
              <h2 className="type-h3">{section}</h2>
              <p className="type-body-sm mt-4 text-ink-400">待補上元件內容</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
