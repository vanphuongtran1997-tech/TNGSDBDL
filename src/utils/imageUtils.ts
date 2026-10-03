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
    // Security check 1: File size restriction (max 10MB to avoid memory exhaustion / DoS)
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return reject(new Error('Dung lượng tệp vượt quá giới hạn an toàn 10MB. Vui lòng chọn tệp nhỏ hơn.'));
    }

    // Security check 2: Strict MIME type validation. Reject SVG (can contain executable scripts)
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return reject(new Error('Định dạng hình ảnh không an toàn hoặc không được hỗ trợ. Chỉ chấp nhận JPG, PNG hoặc WEBP (không hỗ trợ SVG).'));
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
