import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import OrderRecord from './OrderRecord'
import Checkout from './Checkout'
import PaymentProcessing from './PaymentProcessing'
import TopBar from '../../../components/dashboard/TopBar.tsx'
import SOButton from '@/components/SOButton'

import {
    cancelDiningSession,
    getDiningSessionDetail,
    getTableDetail,
    settleDiningSession,
} from '@/services/api/table/tableApi'
import { isApiError } from '@/services/client/ApiError'
import { employeeToken } from '@/services/client/tokenStore'
import { useBillingSocket } from '@/services/realtime/useBillingSocket'

function isCurrentLifecycle(lifecycleRef, mountedRef, tableRef, sessionRef, expected) {
    if (
        !mountedRef.current ||
        lifecycleRef.current !== expected.lifecycle ||
        tableRef.current !== expected.tableNumber
    ) {
        return false
    }
    return expected.sessionId == null || String(sessionRef.current) === String(expected.sessionId)
}

function readEmployeeRole() {
    const token = employeeToken.get()
    if (!token) return null
    try {
        const encoded = token.split('.')[1]
        if (!encoded) return null
        const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
        const binary = window.atob(padded)
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
        const claims = JSON.parse(new TextDecoder().decode(bytes))
        return ['COUNTER', 'KITCHEN', 'MANAGER'].includes(claims.role) ? claims.role : null
    } catch {
        return null
    }
}

function isTableDetail(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        value.sessionId != null &&
        typeof value.tableNumber === 'string' &&
        Array.isArray(value.orders) &&
        value.subtotal != null &&
        value.serviceFee != null &&
        value.total != null,
    )
}

export default function TableDetail() {
    const { tableNumber = '' } = useParams()
    const navigate = useNavigate()

    const [detailState, setDetailState] = useState({ tableNumber: null, status: 'loading', detail: null, error: '' })
    const [reloadKey, setReloadKey] = useState(0)
    const [notice, setNotice] = useState('')
    const [payment, setPayment] = useState(null)
    const [isSettling, setIsSettling] = useState(false)
    const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [cancelError, setCancelError] = useState('')

    const lifecycleRef = useRef(0)
    const mountedRef = useRef(false)
    const activeTableNumberRef = useRef(null)
    const activeSessionIdRef = useRef(null)
    const billingRequestIdRef = useRef(0)
    const paymentSequenceRef = useRef(0)
    const paymentAttemptRef = useRef(null)
    const settlementBusyRef = useRef(false)
    const cancellationBusyRef = useRef(false)
    const cancelSequenceRef = useRef(0)
    const cancelAttemptRef = useRef(null)

    useLayoutEffect(() => {
        const lifecycle = lifecycleRef.current + 1
        lifecycleRef.current = lifecycle
        mountedRef.current = true
        activeTableNumberRef.current = tableNumber
        activeSessionIdRef.current = null

        return () => {
            if (lifecycleRef.current === lifecycle) lifecycleRef.current += 1
            if (activeTableNumberRef.current === tableNumber) activeTableNumberRef.current = null
            activeSessionIdRef.current = null
            billingRequestIdRef.current += 1
            mountedRef.current = false
            paymentAttemptRef.current = null
            cancelAttemptRef.current = null
            settlementBusyRef.current = false
            cancellationBusyRef.current = false
        }
    }, [tableNumber])

    useEffect(() => {
        const controller = new AbortController()
        const lifecycle = lifecycleRef.current
        const expectedTableNumber = tableNumber

        setDetailState({ tableNumber: expectedTableNumber, status: 'loading', detail: null, error: '' })
        setNotice('')
        setPayment(null)
        setIsSettling(false)
        setCancelConfirmationOpen(false)
        setIsCancelling(false)
        setCancelError('')
        settlementBusyRef.current = false
        cancellationBusyRef.current = false

        getTableDetail(expectedTableNumber, controller.signal)
            .then((detail) => {
                if (!isCurrentLifecycle(lifecycleRef, mountedRef, activeTableNumberRef, activeSessionIdRef, {
                    lifecycle,
                    tableNumber: expectedTableNumber,
                })) return
                activeSessionIdRef.current = detail.sessionId == null ? null : String(detail.sessionId)
                setDetailState({ tableNumber: expectedTableNumber, status: 'ready', detail, error: '' })
            })
            .catch((error) => {
                if (
                    controller.signal.aborted ||
                    !isCurrentLifecycle(lifecycleRef, mountedRef, activeTableNumberRef, activeSessionIdRef, {
                        lifecycle,
                        tableNumber: expectedTableNumber,
                    })
                ) return
                setDetailState({
                    tableNumber: expectedTableNumber,
                    status: 'error',
                    detail: null,
                    error: error?.message || '無法載入桌位資料，請重試。',
                })
            })

        return () => controller.abort()
    }, [tableNumber, reloadKey])

    const isCurrent = useCallback((expected) => isCurrentLifecycle(
        lifecycleRef,
        mountedRef,
        activeTableNumberRef,
        activeSessionIdRef,
        expected,
    ), [])

    const tableData = detailState.tableNumber === tableNumber && detailState.status === 'ready'
        ? detailState.detail
        : null
    const isLoading = detailState.tableNumber !== tableNumber || detailState.status === 'loading'
    const loadError = detailState.tableNumber === tableNumber && detailState.status === 'error'
        ? detailState.error
        : ''
    const sessionId = tableData?.sessionId ?? null

    const refreshBilling = useCallback(async () => {
        if (sessionId == null) return
        const expected = {
            lifecycle: lifecycleRef.current,
            tableNumber,
            sessionId: String(sessionId),
        }
        const requestId = ++billingRequestIdRef.current
        try {
            const detail = await getDiningSessionDetail(sessionId)
            if (
                requestId !== billingRequestIdRef.current ||
                !isCurrent(expected) ||
                String(detail.sessionId) !== String(sessionId)
            ) return
            activeSessionIdRef.current = String(sessionId)
            setDetailState((current) => {
                if (
                    requestId !== billingRequestIdRef.current ||
                    current.tableNumber !== tableNumber ||
                    String(current.detail?.sessionId) !== String(sessionId)
                ) return current
                return { ...current, status: 'ready', detail, error: '' }
            })
        } catch (error) {
            if (requestId === billingRequestIdRef.current && isCurrent(expected)) {
                console.error('更新帳單失敗：', error)
            }
        }
    }, [isCurrent, sessionId, tableNumber])

    useBillingSocket(sessionId, refreshBilling)

    const role = readEmployeeRole()
    const isManager = role === 'MANAGER'
    const canSettle = Boolean(tableData && sessionId != null && tableData.sessionStatus === 'OPEN')
    const canCancelSession = Boolean(
        isManager &&
        tableData &&
        sessionId != null &&
        tableData.sessionStatus === 'OPEN' &&
        tableData.hasOrderHistory === false,
    )

    useEffect(() => {
        if (!canCancelSession) setCancelConfirmationOpen(false)
    }, [canCancelSession])

    const startPayment = (method) => {
        if (
            !tableData ||
            !canSettle ||
            paymentAttemptRef.current ||
            settlementBusyRef.current ||
            cancellationBusyRef.current ||
            cancelConfirmationOpen
        ) return

        const attemptId = ++paymentSequenceRef.current
        const frozen = Object.freeze({
            attemptId,
            lifecycle: lifecycleRef.current,
            tableNumber,
            sessionId: tableData.sessionId,
            method,
            subtotal: tableData.subtotal,
            serviceFee: tableData.serviceFee,
            total: tableData.total,
        })
        paymentAttemptRef.current = { ...frozen, submitted: false, redirected: false }
        setNotice('')
        setPayment(frozen)
    }

    const submitPayment = useCallback(async (frozen) => {
        const attempt = paymentAttemptRef.current
        if (
            !attempt ||
            attempt.attemptId !== frozen?.attemptId ||
            attempt.submitted ||
            settlementBusyRef.current ||
            !isCurrent({
                lifecycle: attempt.lifecycle,
                tableNumber: attempt.tableNumber,
                sessionId: String(attempt.sessionId),
            })
        ) return false

        attempt.submitted = true
        settlementBusyRef.current = true
        setIsSettling(true)
        setNotice('')

        try {
            await settleDiningSession(attempt.sessionId, attempt.method, attempt.total)
            if (!isCurrent({
                lifecycle: attempt.lifecycle,
                tableNumber: attempt.tableNumber,
                sessionId: String(attempt.sessionId),
            })) return false
            return true
        } catch (error) {
            if (!isCurrent({
                lifecycle: attempt.lifecycle,
                tableNumber: attempt.tableNumber,
                sessionId: String(attempt.sessionId),
            })) return false

            if (isApiError(error, 'BILL_CHANGED')) {
                const bill = error.bill
                if (isTableDetail(bill) && String(bill.sessionId) === String(attempt.sessionId)) {
                    const billRequestId = ++billingRequestIdRef.current
                    activeSessionIdRef.current = String(bill.sessionId)
                    setDetailState((current) => {
                        if (
                            billRequestId !== billingRequestIdRef.current ||
                            current.tableNumber !== attempt.tableNumber ||
                            String(current.detail?.sessionId) !== String(attempt.sessionId)
                        ) return current
                        return { ...current, status: 'ready', detail: bill, error: '' }
                    })
                    setNotice('金額有變動，帳單已更新。請重新確認後再按付款。')
                } else {
                    setNotice('金額有變動，付款未送出。請重新載入帳單後再確認。')
                }
                setPayment(null)
                paymentAttemptRef.current = null
                return false
            }

            if (isApiError(error, 'SESSION_CLOSED')) {
                setPayment(null)
                paymentAttemptRef.current = null
                setNotice(error.reason === 'PAID' ? '此桌已結帳，不能再次付款。' : '此桌次已取消，不能付款。')
                void refreshBilling()
                return false
            }

            throw error
        } finally {
            if (isCurrent({
                lifecycle: attempt.lifecycle,
                tableNumber: attempt.tableNumber,
                sessionId: String(attempt.sessionId),
            })) {
                settlementBusyRef.current = false
                setIsSettling(false)
            }
        }
    }, [isCurrent, refreshBilling])

    const cancelPayment = (attemptId) => {
        if (settlementBusyRef.current) return
        if (paymentAttemptRef.current?.attemptId !== attemptId) return
        paymentAttemptRef.current = null
        setPayment(null)
    }

    const finishPayment = (attemptId) => {
        const attempt = paymentAttemptRef.current
        if (
            !attempt ||
            attempt.attemptId !== attemptId ||
            attempt.redirected ||
            !isCurrent({
                lifecycle: attempt.lifecycle,
                tableNumber: attempt.tableNumber,
                sessionId: String(attempt.sessionId),
            })
        ) return
        attempt.redirected = true
        paymentAttemptRef.current = null
        navigate('/admin/table_overview', { replace: true })
    }

    const openCancelConfirmation = () => {
        if (!canCancelSession || paymentAttemptRef.current || cancellationBusyRef.current) return
        setCancelError('')
        setCancelConfirmationOpen(true)
    }

    const cancelEmptySession = async () => {
        if (
            !canCancelSession ||
            sessionId == null ||
            cancellationBusyRef.current ||
            settlementBusyRef.current
        ) return

        const attempt = {
            id: ++cancelSequenceRef.current,
            lifecycle: lifecycleRef.current,
            tableNumber,
            sessionId: String(sessionId),
        }
        cancelAttemptRef.current = attempt
        cancellationBusyRef.current = true
        setIsCancelling(true)
        setCancelError('')

        const expected = {
            lifecycle: attempt.lifecycle,
            tableNumber: attempt.tableNumber,
            sessionId: attempt.sessionId,
        }

        try {
            await cancelDiningSession(sessionId)
            if (!isCurrent(expected) || cancelAttemptRef.current?.id !== attempt.id) return
            setCancelConfirmationOpen(false)
            navigate('/admin/table_overview', { replace: true })
        } catch (error) {
            if (!isCurrent(expected) || cancelAttemptRef.current?.id !== attempt.id) return
            if (isApiError(error, 'SESSION_HAS_ORDERS')) {
                setCancelConfirmationOpen(false)
                setNotice('這個用餐場次已有訂單，不能取消。請處理訂單或完成結帳。')
                void refreshBilling()
            } else if (isApiError(error, 'SESSION_CLOSED')) {
                setCancelConfirmationOpen(false)
                setNotice(error.reason === 'PAID' ? '此桌已結帳，無法取消用餐。' : '此桌次已取消。')
                void refreshBilling()
            } else {
                setCancelError(error?.message || '取消用餐失敗，請稍後重試。')
            }
        } finally {
            if (isCurrent(expected) && cancelAttemptRef.current?.id === attempt.id) {
                cancellationBusyRef.current = false
                cancelAttemptRef.current = null
                setIsCancelling(false)
            }
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-ink-600">正在載入桌位資料...</p>
            </div>
        )
    }

    if (loadError) {
        return (
            <div className="p-6">
                <p role="alert" className="text-brand-600">{loadError}</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={() => setReloadKey((key) => key + 1)}
                        className="min-h-11 rounded-btn bg-brand-600 px-4 py-2 text-white"
                    >
                        重新載入
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/table_overview')}
                        className="min-h-11 rounded-btn border border-line px-4 py-2"
                    >
                        返回桌位總覽
                    </button>
                </div>
            </div>
        )
    }

    if (!tableData) return <p className="p-6">找不到桌位資料</p>

    const visiblePayment = payment?.tableNumber === tableNumber && String(payment.sessionId) === String(sessionId)
        ? payment
        : null

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-surface text-ink-900">
            <TopBar
                tag={tableData.tableInfo}
                childrenLeft={(
                    <span className="rounded-pill bg-accent-100 px-3 py-1 type-caption text-hold-ink">
                        {tableData.diningStatus}
                    </span>
                )}
                childrenRight={(
                    <span className="type-body-sm text-ink-600">
                        {tableData.seatedTime} 入座・已 {tableData.diningMinutes} 分鐘
                    </span>
                )}
            />

            {notice && (
                <p role="status" className="mx-4 mt-3 rounded-card border border-warning-line bg-warning-bg px-4 py-3 type-body-sm text-hold-ink sm:mx-6">
                    {notice}
                </p>
            )}

            <main className="flex min-h-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:flex-row">
                <section className="min-w-0 flex-1">
                    <OrderRecord orders={tableData.orders} />
                </section>

                <aside className="w-full shrink-0 lg:w-90">
                    <Checkout
                        orders={tableData.orders}
                        subtotal={tableData.subtotal}
                        serviceFee={tableData.serviceFee}
                        total={tableData.total}
                        adultCount={tableData.adultCount}
                        childCount={tableData.childCount}
                        canSettle={canSettle}
                        isBusy={isSettling || isCancelling || cancelConfirmationOpen}
                        showCancelSession={canCancelSession && !visiblePayment}
                        onCash={() => startPayment('CASH')}
                        onCreditCard={() => startPayment('CARD')}
                        onBarcode={() => startPayment('BARCODE')}
                        onCancelSession={openCancelConfirmation}
                    />
                </aside>
            </main>

            {visiblePayment && (
                <PaymentProcessing
                    key={visiblePayment.attemptId}
                    payment={visiblePayment}
                    submitting={isSettling}
                    onCancel={cancelPayment}
                    onComplete={submitPayment}
                    onSuccess={finishPayment}
                />
            )}

            {cancelConfirmationOpen && canCancelSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cancel-session-title"
                        className="my-auto w-full max-w-md rounded-card bg-surface p-5 shadow-pop sm:p-7"
                    >
                        <h2 id="cancel-session-title" className="type-h2 font-bold text-ink-900">確認取消這次用餐？</h2>
                        <p className="mt-3 type-body-sm text-ink-600">
                            {tableData.tableNumber} 桌目前沒有送出的訂單。確認後會取消本次用餐並將桌位開放。
                        </p>
                        <p className="mt-2 type-caption text-ink-600">這項操作不會建立付款紀錄。</p>
                        {cancelError && <p role="alert" className="mt-4 type-body-sm text-danger">{cancelError}</p>}
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
                            <div className="w-full sm:flex-1">
                                <SOButton
                                    variant="danger"
                                    height="h-11"
                                    text={isCancelling ? '正在取消…' : '確認取消'}
                                    onClick={cancelEmptySession}
                                    disabled={isCancelling}
                                />
                            </div>
                            <div className="w-full sm:flex-1">
                                <SOButton
                                    variant="secondary"
                                    height="h-11"
                                    text="返回"
                                    onClick={() => setCancelConfirmationOpen(false)}
                                    disabled={isCancelling}
                                />
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}
