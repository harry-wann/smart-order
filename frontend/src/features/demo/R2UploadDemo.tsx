import { useState } from 'react'
import ImageUpload from '@/components/upload/ImageUpload'
import type { UploadedImage } from '@/services/api/uploads/uploadApi'
import DemoLayout from './DemoLayout'

export default function R2UploadDemo() {
  const [image, setImage] = useState<UploadedImage | null>(null)

  return (
    <DemoLayout
      title="Cloudflare R2 圖片上傳"
      description="展示共用 ImageUpload 元件：向 Spring Boot 取得短效網址、由瀏覽器直傳 R2，再由後端確認檔案後回傳圖片網址。"
      backTo="/demo"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-4">
          <ImageUpload value={image} onChange={setImage} label="菜單圖片" />
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="type-h2">範例用法</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-200 p-4 type-caption text-ink-900">
              <code>{`const [image, setImage] = useState<UploadedImage | null>(null)

<ImageUpload
  value={image}
  onChange={setImage}
  label="菜單圖片"
/>`}</code>
            </pre>
            <p className="mt-3 type-body-sm text-ink-600">
              新增／更新菜單時，把 <code>image?.objectKey</code> 傳給菜單 API；後端確認 key 後再寫入資料庫。
            </p>
          </section>
        </div>

        <section className="rounded-card border border-line bg-surface p-5 shadow-card">
          <h2 className="type-h2">上傳結果</h2>
          {image ? (
            <div className="mt-4 space-y-3">
              <a href={image.imageUrl} target="_blank" rel="noreferrer" className="break-all type-body-sm text-brand-700 underline">
                {image.imageUrl}
              </a>
              <p className="break-all type-caption text-ink-600">Object key：{image.objectKey}</p>
              <img src={image.imageUrl} alt="已上傳圖片" className="max-h-72 w-full rounded-lg object-contain bg-surface-200" />
            </div>
          ) : (
            <p className="mt-3 type-body-sm text-ink-600">完成上傳後，這裡會顯示公開圖片網址與 object key。</p>
          )}
          <p className="mt-5 rounded-lg bg-surface-200 p-3 type-caption text-ink-600">
            開始測試前，請先以店長帳號登入後台（簽發與確認上傳只給 MANAGER），在後端設定 R2 環境變數，並在 Bucket CORS 放行前端來源的 PUT 與 Content-Type。
          </p>
        </section>
      </div>
    </DemoLayout>
  )
}
