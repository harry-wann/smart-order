import { useEffect, useId, useRef, useState } from 'react'
import {
  ACCEPTED_IMAGE_TYPES,
  completeImageUpload,
  getImageUploadConfig,
  putImageToR2,
  requestImageUpload,
  type UploadedImage,
} from '@/services/api/uploads/uploadApi'
import { ApiError } from '@/services/client/ApiError'

type ImageUploadValue = Pick<UploadedImage, 'imageUrl'> & Partial<Pick<UploadedImage, 'objectKey'>>

type ImageUploadProps = {
  value: ImageUploadValue | null
  onChange: (image: UploadedImage | null) => void
  label?: string
  disabled?: boolean
}

type UploadStage = 'idle' | 'signing' | 'uploading' | 'confirming' | 'success' | 'error'

type PendingUpload = {
  file: File
  uploadToken?: string
  uploaded: boolean
}

const IMAGE_CONFIG_ERROR = '無法讀取後端圖片大小限制，請確認後端 API 後重試。'

async function readMaxUploadBytes() {
  const { maxUploadBytes } = await getImageUploadConfig()
  if (!Number.isSafeInteger(maxUploadBytes) || maxUploadBytes <= 0) {
    throw new Error('後端回傳了無效的圖片大小限制')
  }
  return maxUploadBytes
}

export default function ImageUpload({
  value,
  onChange,
  label = '圖片',
  disabled = false,
}: ImageUploadProps) {
  const inputId = useId()
  const pendingUpload = useRef<PendingUpload | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string>()
  const [maxUploadBytes, setMaxUploadBytes] = useState<number>()
  const [configError, setConfigError] = useState('')
  const [stage, setStage] = useState<UploadStage>('idle')
  const [message, setMessage] = useState('')
  const [canRetry, setCanRetry] = useState(true)

  const isBusy = stage === 'signing' || stage === 'uploading' || stage === 'confirming'

  useEffect(() => {
    let active = true
    readMaxUploadBytes()
      .then((limit) => {
        if (active) setMaxUploadBytes(limit)
      })
      .catch(() => {
        if (active) setConfigError(IMAGE_CONFIG_ERROR)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedFile) {
      setLocalPreview(undefined)
      return
    }

    const preview = URL.createObjectURL(selectedFile)
    setLocalPreview(preview)
    return () => URL.revokeObjectURL(preview)
  }, [selectedFile])

  function chooseFile(file?: File) {
    if (!file) return
    pendingUpload.current = null
    setSelectedFile(null)
    setMessage('')
    setCanRetry(true)
    setStage('idle')

    if (maxUploadBytes === undefined) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      setStage('error')
      setMessage('請選擇 JPEG、PNG 或 WebP 圖片。')
      return
    }
    if (file.size <= 0 || file.size > maxUploadBytes) {
      setStage('error')
      setMessage(`圖片需大於 0，且不可超過 ${(maxUploadBytes / 1024 / 1024).toFixed(2)} MB。`)
      return
    }

    pendingUpload.current = { file, uploaded: false }
    setSelectedFile(file)
    setCanRetry(true)
  }

  async function uploadSelectedFile() {
    const task = pendingUpload.current
    if (!task) return

    setMessage('')
    let confirmingUpload = false
    try {
      if (!task.uploaded) {
        setStage('signing')
        const grant = await requestImageUpload(task.file, task.uploadToken)
        task.uploadToken = grant.uploadToken

        setStage('uploading')
        await putImageToR2(task.file, grant.uploadUrl)
        task.uploaded = true
      }

      if (!task.uploadToken) throw new Error('沒有取得上傳票據，請重新選擇圖片。')
      setStage('confirming')
      confirmingUpload = true
      const image = await completeImageUpload(task.uploadToken)
      onChange(image)
      pendingUpload.current = null
      setSelectedFile(null)
      setStage('success')
      setMessage('圖片已上傳並確認完成。')
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) task.uploaded = false
        if (error.status === 409 && confirmingUpload) task.uploaded = false
        if (error.status === 410) {
          task.uploadToken = undefined
          task.uploaded = false
        }
        setCanRetry(![400, 403].includes(error.status))
      } else {
        setCanRetry(true)
      }
      setStage('error')
      setMessage(error instanceof Error ? error.message : '圖片上傳失敗，請稍後重試。')
    }
  }

  function clearSelection() {
    if (isBusy) return
    pendingUpload.current = null
    setSelectedFile(null)
    setStage('idle')
    setMessage('')
    setCanRetry(true)
    if (!selectedFile && value) onChange(null)
  }

  async function retryLoadConfig() {
    setConfigError('')
    try {
      setMaxUploadBytes(await readMaxUploadBytes())
    } catch {
      setConfigError(IMAGE_CONFIG_ERROR)
    }
  }

  const previewUrl = localPreview ?? value?.imageUrl

  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={inputId} className="type-body-sm font-semibold text-ink-900">
          {label}
        </label>
        <span className="type-caption text-ink-600">
          JPEG／PNG／WebP，最多{' '}
          {maxUploadBytes === undefined ? '載入中…' : `${(maxUploadBytes / 1024 / 1024).toFixed(2)} MB`}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-lg bg-surface-200 sm:w-44">
          {previewUrl ? (
            <img src={previewUrl} alt={`${label}預覽`} className="h-full w-full object-cover" />
          ) : (
            <span className="type-caption text-ink-600">尚未選擇圖片</span>
          )}
        </div>

        <div className="flex flex-1 flex-col items-start gap-3">
          <input
            id={inputId}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            disabled={disabled || isBusy || maxUploadBytes === undefined}
            className="block w-full type-body-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-brand-700 disabled:opacity-60"
            onChange={(event) => {
              chooseFile(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
          />

          {selectedFile && (
            <div className="flex flex-wrap items-center gap-2">
              {canRetry && (
                <button
                  type="button"
                  disabled={disabled || isBusy}
                  onClick={uploadSelectedFile}
                  className="rounded-lg bg-brand-600 px-4 py-2 type-body-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {stage === 'error' ? '重試上傳' : '開始上傳'}
                </button>
              )}
              <button
                type="button"
                disabled={disabled || isBusy}
                onClick={clearSelection}
                className="rounded-lg border border-line px-4 py-2 type-body-sm text-ink-700 hover:bg-surface-200 disabled:opacity-60"
              >
                清除選擇
              </button>
              <span className="type-caption text-ink-600">
                {selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          )}

          {isBusy && (
            <p role="status" className="type-body-sm text-brand-700">
              {stage === 'signing' && '正在向後端取得短效上傳網址…'}
              {stage === 'uploading' && '正在上傳至 R2…'}
              {stage === 'confirming' && '正在確認 R2 中的圖片…'}
            </p>
          )}
          {configError && (
            <div role="alert" className="flex flex-wrap items-center gap-2 type-body-sm text-danger">
              <span>{configError}</span>
              <button type="button" onClick={retryLoadConfig} className="underline">
                再試一次
              </button>
            </div>
          )}
          {message && (
            <p
              role={stage === 'error' ? 'alert' : 'status'}
              className={`type-body-sm ${stage === 'error' ? 'text-danger' : 'text-success'}`}
            >
              {message}
            </p>
          )}
        </div>
      </div>

      {value && !selectedFile && (
        <button
          type="button"
          disabled={disabled || isBusy}
          onClick={clearSelection}
          className="mt-3 type-caption text-ink-600 underline hover:text-ink-900 disabled:opacity-60"
        >
          從表單移除圖片
        </button>
      )}
    </section>
  )
}
