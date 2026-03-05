// Simple singleton to pass image data between scan → preview screens
// Avoids large base64 in URL params

let _imageBase64: string | null = null;
let _thumbnailBase64: string | null = null;
let _imageUri: string | null = null;

export const setScanImage = (base64: string, thumbnail: string, uri: string) => {
  _imageBase64 = base64;
  _thumbnailBase64 = thumbnail;
  _imageUri = uri;
};

export const getScanImage = () => ({
  imageBase64: _imageBase64,
  thumbnailBase64: _thumbnailBase64,
  imageUri: _imageUri,
});

export const clearScanImage = () => {
  _imageBase64 = null;
  _thumbnailBase64 = null;
  _imageUri = null;
};
