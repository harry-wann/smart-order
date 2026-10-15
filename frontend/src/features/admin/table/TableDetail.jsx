import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import OrderRecord from './OrderRecord'
import Checkout from './Checkout'
import PaymentProcessing from './PaymentProcessing'
import TopBar from '../../../components/dashboard/TopBar.tsx'

import { getTableDetail, checkoutTable } from '@/api/tableApi'

export default function TableDetail() {
    // 從網址取得桌號
    const { tableNumber } = useParams()
    const navigate = useNavigate()

    // 後端資料
    const [tableData, setTableData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // 付款方式
    const [paymentMethod, setPaymentMethod] = useState(null)

    // 付款送出狀態
    const [isPaying, setIsPaying] = useState(false)

    // 取得桌位資料
    useEffect(() => {
        let active = true

        async function loadData() {
            try {
                setLoading(true)
                setError('')
                setTableData(null)

                const data = await getTableDetail(tableNumber)

                if (active) {
                    setTableData(data)
                }
            } catch (err) {
                if (active) {
                    setError(err.message)
                }
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        if (tableNumber) {
            loadData()
        }

        return () => {
            active = false
        }
    }, [tableNumber])

    // 付款完成
    const handlePaymentComplete = useCallback(async () => {
        if (!paymentMethod) return

        setIsPaying(true)

        try {
            await checkoutTable(tableNumber, paymentMethod)

            // 付款成功，關閉視窗
            setPaymentMethod(null)
            setError('')

            // 返回桌位總覽
            navigate('/admin/table_overview', {
                replace: true,
            })
        } catch (err) {
            setError(err.message)
            throw err
        } finally {
            setIsPaying(false)
        }
    }, [tableNumber, paymentMethod, navigate])

    // 取消付款
    const handleCancelPayment = () => {
        if (!isPaying) {
            setPaymentMethod(null)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-ink-600">正在載入桌位資料...</p>
            </div>
        )
    }

    if (error && !tableData) {
        return (
            <div className="p-6">
                <p role="alert" className="text-brand-600">
                    {error}
                </p>

                <button
                    type="button"
                    onClick={() => navigate('/admin/table_overview')}
                    className="mt-4 rounded-lg border border-line px-4 py-2"
                >
                    返回桌位總覽
                </button>
            </div>
        )
    }

    if (!tableData) {
        return <p className="p-6">找不到桌位資料</p>
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-surface text-ink-900">
            {/* 上方資訊 */}
            <TopBar
                tag={tableData.tableInfo}
                childrenLeft={
                    <span className="rounded-pill bg-accent-100 px-3 py-1 type-caption text-hold-ink">
            {tableData.diningStatus}
          </span>
                }
                childrenRight={
                    <span className="type-body-sm text-ink-600">
            {tableData.seatedTime} 入座・已 {tableData.diningMinutes} 分鐘
          </span>
                }
            />

            {/* 錯誤訊息 */}
            {error && (
                <p role="alert" className="px-6 pt-3 text-brand-600">
                    {error}
                </p>
            )}

            {/* 主要內容 */}
            <main className="flex min-h-0 flex-1 gap-6 p-6">
                {/* 左側：點餐紀錄 */}
                <section className="min-w-0 flex-1">
                    <OrderRecord orders={tableData.orders} />
                </section>

                {/* 右側：結帳 */}
                <aside className="w-90 shrink-0">
                    <Checkout
                        orders={tableData.orders}
                        subtotal={tableData.subtotal}
                        serviceFee={tableData.serviceFee}
                        total={tableData.total}
                        adultCount={tableData.adultCount}
                        childCount={tableData.childCount}
                        onCash={() => setPaymentMethod('cash')}
                        onCreditCard={() => setPaymentMethod('credit')}
                        onBarcode={() => setPaymentMethod('barcode')}
                    />
                </aside>
            </main>

            {/* 付款視窗 */}
            {paymentMethod && (
                <PaymentProcessing
                    paymentMethod={paymentMethod}
                    tableNumber={tableNumber}
                    subtotal={tableData.subtotal}
                    serviceFee={tableData.serviceFee}
                    onCancel={handleCancelPayment}
                    onComplete={handlePaymentComplete}
                />
            )}
        </div>
    )
}