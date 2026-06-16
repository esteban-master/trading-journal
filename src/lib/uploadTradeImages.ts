import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/config/firebase'

export async function uploadTradeImages(
  files: File[],
  userId: string,
  tradeId: string
): Promise<string[]> {
  return Promise.all(
    files.map(async (file) => {
      const path = `trades/${userId}/${tradeId}/${Date.now()}_${file.name}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file)
      return getDownloadURL(storageRef)
    })
  )
}
