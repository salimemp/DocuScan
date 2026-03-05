export interface PageData {
  base64: string;
  thumbnailBase64: string;
  uri: string;
}

let _pages: PageData[] = [];

export const addScanPage = (page: PageData) => {
  _pages.push(page);
};

export const getScanPages = (): PageData[] => [..._pages];
export const clearScanData = () => { _pages = []; };
export const getScanPageCount = () => _pages.length;
export const removeScanPage = (index: number) => { _pages.splice(index, 1); };

// Legacy compat for preview.tsx
export const getScanImage = () =>
  _pages.length > 0
    ? { imageBase64: _pages[0].base64, thumbnailBase64: _pages[0].thumbnailBase64, imageUri: _pages[0].uri }
    : { imageBase64: null, thumbnailBase64: null, imageUri: null };

export const setScanImage = (base64: string, thumbnail: string, uri: string) => {
  _pages = [{ base64, thumbnailBase64: thumbnail, uri }];
};
export const clearScanImage = clearScanData;
