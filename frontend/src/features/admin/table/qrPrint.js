import { API_BASE } from '@/services/client/createApiClient'

// S-08 補印 QR：開一個新分頁，排好 QR 圖和桌號，圖片載入完自動跳出列印
// tables：[{ id, tableNo }]，印一張就傳一筆，印全部就傳整個清單
export function openQrPrint(tables) {
  const win = window.open('', '_blank')
  if (!win) {
    alert('瀏覽器擋住了新分頁，請允許彈出視窗後再按一次')
    return
  }

  const cards = tables
    .map((t) => {
      // API_BASE 可能是 /api（相對）或完整網址，用 URL 組，兩種都對
      const src = new URL(`${API_BASE}/admin/tables/${t.id}/qrcode`, window.location.origin).href
      return `
        <div class="card">
          <img src="${src}" alt="${t.tableNo} QR code" />
          <div class="no">${t.tableNo}</div>
          <div class="hint">掃碼點餐</div>
        </div>`
    })
    .join('')

  win.document.write(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>桌位 QR code</title>
  <style>
    body { margin: 0; font-family: sans-serif; }
    .sheet { display: flex; flex-wrap: wrap; gap: 24px; padding: 24px; }
    .card { width: 220px; border: 1px dashed #999; border-radius: 12px; padding: 16px;
            text-align: center; break-inside: avoid; }
    .card img { width: 100%; }
    .no { font-size: 32px; font-weight: bold; margin-top: 4px; }
    .hint { font-size: 14px; color: #555; }
  </style>
</head>
<body>
  <div class="sheet">${cards}</div>
  <script>window.onload = () => window.print()</script>
</body>
</html>`)
  win.document.close()
}