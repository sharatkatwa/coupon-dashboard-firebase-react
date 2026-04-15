import imageCompression from "browser-image-compression";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./config";

const compressionOptions = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  initialQuality: 0.78,
  fileType: "image/jpeg",
};

export async function compressImageFile(file) {
  try {
    const compressedFile = await imageCompression(file, compressionOptions);

    return new File(
      [compressedFile],
      `${file.name.replace(/\.[^.]+$/, "") || "store-image"}.jpg`,
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      }
    );
  } catch {
    throw new Error("Unable to compress the selected image.");
  }
}

export async function uploadStoreImage(customerId, file) {
  const compressedFile = await compressImageFile(file);
  const storagePath = `store-images/${customerId}/${Date.now()}-${compressedFile.name}`;
  const imageRef = ref(storage, storagePath);

  await uploadBytes(imageRef, compressedFile, {
    contentType: compressedFile.type,
  });

  const storeImageUrl = await getDownloadURL(imageRef);

  return {
    storeImageUrl,
    storeImagePath: storagePath,
    storeImageSize: compressedFile.size,
  };
}

export async function deleteStoreImage(storagePath) {
  if (!storagePath) {
    return;
  }

  await deleteObject(ref(storage, storagePath));
}
