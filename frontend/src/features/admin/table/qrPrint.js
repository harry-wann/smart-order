import { fetchTableQrCode } from '@/services/api/table/tableApi'

// S-08 補印 QR：先同步開啟分頁保留使用者手勢，再用員工授權 API 載入圖片並列印。
// tables：[{ id, tableNo }]，印一張就傳一筆，印全部就傳整個清單
export async function openQrPrint(tables) {
  const win = window.open('', '_blank')
  if (!win) {
    alert('瀏覽器擋住了新分頁，請允許彈出視窗後再按一次')
    return
  }

  const objectUrls = []
  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    objectUrls.forEach((url) => URL.revokeObjectURL(url))
    objectUrls.length = 0
  }

  win.document.open()
  win.document.write('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>桌位 QR code</title><body style="font-family:sans-serif;padding:24px">正在載入 QR code…</body></html>')
  win.document.close()

  try {
    const qrResults = await Promise.allSettled(
      tables.map(async (table) => {
        const blob = await fetchTableQrCode(table.id)
        const src = URL.createObjectURL(blob)
        objectUrls.push(src)
        return { src, tableNo: escapeHtml(table.tableNo) }
      }),
    )
    const failedRequest = qrResults.find((result) => result.status === 'rejected')
    if (failedRequest) throw failedRequest.reason
    const cards = qrResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))

    if (win.closed) {
      cleanup()
      return
    }

    win.document.open()
    win.document.write(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>桌位 QR code</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; font-family: sans-serif; }
    .sheet { display: flex; flex-wrap: wrap; gap: 24px; padding: 24px; }
    .card { box-sizing: border-box; width: min(220px, 100%); border: 1px dashed #999; border-radius: 12px; padding: 16px;
            text-align: center; break-inside: avoid; }
    .card img { display: block; width: 100%; }
    .no { font-size: 32px; font-weight: bold; margin-top: 4px; }
    .hint { font-size: 14px; color: #555; }
    @media print { .sheet { padding: 0; } }
  </style>
</head>
<body>
  <div class="sheet">${cards
    .map(
      (card) => `<div class="card"><img src="${card.src}" alt="${card.tableNo} QR code" /><div class="no">${card.tableNo}</div><div class="hint">掃碼點餐</div></div>`,
    )
    .join('')}</div>
</body>
</html>`)
    win.document.close()

    await Promise.all(Array.from(win.document.images, waitForImage))
    if (win.closed) {
      cleanup()
      return
    }

    win.addEventListener('afterprint', cleanup, { once: true })
    win.addEventListener('pagehide', cleanup, { once: true })
    win.focus()
    win.print()
  } catch (error) {
    cleanup()
    if (!win.closed) {
      win.document.open()
      win.document.write(`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>QR code 載入失敗</title><body style="font-family:sans-serif;padding:24px"><h1>QR code 載入失敗</h1><p>${escapeHtml(error?.message ?? '請確認員工登入狀態後重試。')}</p></body></html>`)
      win.document.close()
    }
  }
}

function waitForImage(image) {
  if (image.complete) {
    return image.naturalWidth > 0
      ? Promise.resolve()
      : Promise.reject(new Error('QR code 圖片無法載入。'))
  }
  return new Promise((resolve, reject) => {
    image.addEventListener('load', resolve, { once: true })
    image.addEventListener('error', () => reject(new Error('QR code 圖片無法載入。')), { once: true })
  })
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return entities[character]
  })
}
