/**
 * Image Compression Utility for DocScan Pro
 * Optimizes images for storage and transmission
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CompressionResult {
  uri: string;
  base64?: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  format: 'jpeg',
};

/**
 * Compress a single image
 */
export async function compressImage(
  uri: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Get original file info
  const originalInfo = await FileSystem.getInfoAsync(uri);
  const originalSize = originalInfo.exists ? (originalInfo as any).size || 0 : 0;
  
  // Calculate resize dimensions
  const actions: ImageManipulator.Action[] = [];
  
  if (opts.maxWidth || opts.maxHeight) {
    actions.push({
      resize: {
        width: opts.maxWidth,
        height: opts.maxHeight,
      },
    });
  }
  
  // Process image
  const result = await ImageManipulator.manipulateAsync(
    uri,
    actions,
    {
      compress: opts.quality,
      format: opts.format === 'png' 
        ? ImageManipulator.SaveFormat.PNG 
        : ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );
  
  // Get compressed file info
  const compressedInfo = await FileSystem.getInfoAsync(result.uri);
  const compressedSize = compressedInfo.exists ? (compressedInfo as any).size || 0 : 0;
  
  return {
    uri: result.uri,
    base64: result.base64,
    width: result.width,
    height: result.height,
    originalSize,
    compressedSize,
    compressionRatio: originalSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0,
  };
}

/**
 * Compress multiple images in batch
 */
export async function compressImages(
  uris: string[],
  options: CompressionOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  
  for (let i = 0; i < uris.length; i++) {
    const result = await compressImage(uris[i], options);
    results.push(result);
    onProgress?.(i + 1, uris.length);
  }
  
  return results;
}

/**
 * Get optimal compression settings based on use case
 */
export function getCompressionPreset(preset: 'thumbnail' | 'preview' | 'document' | 'highQuality'): CompressionOptions {
  switch (preset) {
    case 'thumbnail':
      return { maxWidth: 200, maxHeight: 200, quality: 0.6, format: 'jpeg' };
    case 'preview':
      return { maxWidth: 800, maxHeight: 800, quality: 0.7, format: 'jpeg' };
    case 'document':
      return { maxWidth: 1920, maxHeight: 1920, quality: 0.85, format: 'jpeg' };
    case 'highQuality':
      return { maxWidth: 3840, maxHeight: 3840, quality: 0.95, format: 'png' };
    default:
      return DEFAULT_OPTIONS;
  }
}

/**
 * Estimate file size after compression
 */
export function estimateCompressedSize(
  originalSize: number,
  quality: number = 0.8
): number {
  // Rough estimation: JPEG at 80% quality typically reduces size by 60-70%
  const compressionFactor = 0.3 + (quality * 0.5);
  return Math.round(originalSize * compressionFactor);
}

export default {
  compressImage,
  compressImages,
  getCompressionPreset,
  estimateCompressedSize,
};
