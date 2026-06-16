import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';

export async function uploadImages(files: File[], storagePath: string): Promise<string[]> {
  return Promise.all(
    files.map(async (file) => {
      const storageRef = ref(storage, `${storagePath}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    }),
  );
}
