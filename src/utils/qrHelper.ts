import QRCode from 'qrcode';

export async function generateQRCodeDataUrl(
  text: string, 
  options?: { width?: number; margin?: number; darkColor?: string }
): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: options?.width || 380,
      margin: options?.margin !== undefined ? options.margin : 1,
      color: {
        dark: options?.darkColor || '#000000', // Pure black for maximal scanner contrast
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

