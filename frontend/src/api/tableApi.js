const API_BASE = '/api/tables'

// 取得桌位詳細資料
export async function getTableDetail(tableNumber) {
    const response = await fetch(
        `${API_BASE}/${encodeURIComponent(tableNumber)}/detail`
    )

    if (!response.ok) {
        throw new Error(`取得桌位資料失敗（${response.status}）`)
    }
    return response.json()
}

// 模擬結帳
export async function checkoutTable(tableNumber, paymentMethod) {
    const methodMap = {
        cash: 'CASH',
        credit: 'CARD',
        barcode: 'BARCODE',
    }

    const method = methodMap[paymentMethod]

    if (!method) {
        throw new Error('不支援的付款方式')
    }

    const response = await fetch(
        `${API_BASE}/${encodeURIComponent(tableNumber)}/checkout`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentMethod: method }),
        }
    )

    if (!response.ok) {
        let message = '結帳失敗'
        try {
            const error = await response.json()
            message = error.message || message
        } catch {
            // 後端可能沒有回傳
        }
        throw new Error(message)
    }
    return response.json()
}