
const API_BASE_URL = '/api'

// 取得指定訂單
export async function getOrderTicket(orderTicketId) {
    const response = await fetch(
        `${API_BASE_URL}/order-tickets/${orderTicketId}`,
        {
            credentials: 'include',
        },
    )

    if (!response.ok) {
        throw new Error('取得訂單資料失敗')
    }

    return response.json()
}
