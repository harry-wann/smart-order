import { employeeClient } from '@/services/client/employeeClient'

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type UploadedImage = {
  objectKey: string
  imageUrl: string
}

type UploadGrant = {
  uploadUrl: string
  uploadToken: string
}

export type ImageUploadConfig = {
  maxUploadBytes: number
}

export async function getImageUploadConfig() {
  const response = await employeeClient.get<ImageUploadConfig>('/uploads/config')
  return response.data
}

export async function requestImageUpload(file: File, uploadToken?: string) {
  const response = await employeeClient.post<UploadGrant>('/uploads/presign', {
    contentType: file.type,
    size: file.size,
    uploadToken,
  })
  return response.data
}

export async function putImageToR2(file: File, uploadUrl: string) {
  let response: Response
  try {
    response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
  } catch {
    throw new Error('連線到 R2 失敗，請檢查網路或 Bucket 的 CORS 設定後重試。')
  }

  if (response.ok) return
  if (response.status === 403) {
    throw new Error('R2 拒絕上傳，網址可能已過期；重試會重新取得上傳網址。')
  }
  throw new Error(`R2 上傳失敗（HTTP ${response.status}），請稍後重試。`)
}

export async function completeImageUpload(uploadToken: string) {
  const response = await employeeClient.post<UploadedImage>('/uploads/complete', { uploadToken })
  return response.data
}
