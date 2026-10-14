const API_BASE_URL = '/api'

// 統一處理 API 請求
async function request(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    credentials: 'include',
    ...options,
  })

  if (!response.ok) {
    let message = `操作失敗 (${response.status})`

    try {
      const data = await response.json()
      message = data.message || data.detail || message
    } catch {
      // 後端沒有回傳錯誤訊息
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return null
  }
  return response.json()
}

// 取得整桌購物車
export function getCart(sessionId) {
  return request(`/dining-sessions/${sessionId}/cart`)
}

// 修改自己加入的商品數量
export function updateCartQuantity(sessionId, itemId, quantity) {
  return request(
    `/dining-sessions/${sessionId}/cart/items/${itemId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity }),
    },
  )
}

// 刪除自己加入的商品
export function deleteCartItem(sessionId, itemId) {
  return request(
    `/dining-sessions/${sessionId}/cart/items/${itemId}`,
    {
      method: 'DELETE',
    },
  )
}

// 送出整桌訂單
export function submitOrder(sessionId) {
  return request(`/dining-sessions/${sessionId}/orders`, {
    method: 'POST',
  })
}
