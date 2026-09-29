/**
 * Image Utilities for Student Profile Photo Management
 * Resizes and center-crops images to standard 3:4 portrait ratio
 * Ensures lightweight base64 storage (< 60KB) suitable for localStorage and high-DPI card printing.
 */

export async function processImageFileToPortrait(
  file: File, 
  targetWidth = 360, 
  targetHeight = 480, 
  quality = 0.88
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Tệp đã chọn không phải là định dạng hình ảnh hợp lệ.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Tệp hình ảnh bị lỗi hoặc không thể hiển thị.'));

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Trình duyệt không hỗ trợ xử lý đồ họa Canvas.'));
          }

          const targetAspect = targetWidth / targetHeight; // 0.75
          const imgAspect = img.width / img.height;

          let cropWidth = img.width;
          let cropHeight = img.height;
          let cropX = 0;
          let cropY = 0;

          if (imgAspect > targetAspect) {
            // Image is wider than 3:4 -> crop sides
            cropWidth = img.height * targetAspect;
            cropX = (img.width - cropWidth) / 2;
          } else {
            // Image is taller than 3:4 -> crop top/bottom
            cropHeight = img.width / targetAspect;
            cropY = (img.height - cropHeight) / 2;
          }

          // Smooth resampling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(
            img,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            targetWidth,
            targetHeight
          );

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
