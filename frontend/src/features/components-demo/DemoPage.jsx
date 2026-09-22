import { Link } from "react-router";

export default function DemoPage({ code, title, description, children }) {
  return (
    <main className="min-h-screen bg-paper px-6 py-8 text-ink-900 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/components"
          className="type-body-sm text-brand-600 hover:text-brand-700"
        >
          ← 返回元件展示
        </Link>

        <header className="mt-8">
          <p className="type-body-sm text-brand-600">{code}</p>
          <h1 className="type-h1 mt-2">{title}</h1>
          <p className="type-body mt-3 max-w-2xl text-ink-600">{description}</p>
        </header>

        <div className="">{children}</div>
      </div>
    </main>
  );
}
