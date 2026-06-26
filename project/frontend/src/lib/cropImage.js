/**
 * Tạo đối tượng Image từ URL để lấy kích thước
 */
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // Tránh lỗi CORS canvas
    image.src = url;
  });

/**
 * Cắt hình ảnh bằng canvas theo thông số crop pixel của react-easy-crop
 */
export async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Set kích thước canvas đúng bằng kích thước mong muốn sau khi crop
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Vẽ hình ảnh đã được crop lên canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Trả về file Blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Canvas is empty');
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
}
