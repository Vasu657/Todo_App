import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

// Maximum file size in bytes (1MB)
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

/**
 * Get the size of a base64 image string in bytes
 * @param {string} base64String - The base64 image string
 * @returns {number} Size in bytes
 */
export const getBase64Size = (base64String) => {
  if (!base64String) return 0;
  
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
  
  // Calculate size: base64 encoding increases size by ~33%, so we divide by 0.75
  const sizeInBytes = (base64Data.length * 3) / 4;
  
  // Account for padding
  const padding = base64Data.match(/=/g);
  const paddingSize = padding ? padding.length : 0;
  
  return sizeInBytes - paddingSize;
};

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Compress image to meet size requirements
 * @param {string} imageUri - The image URI
 * @param {number} maxSizeBytes - Maximum size in bytes (default: 1MB)
 * @param {number} initialQuality - Initial compression quality (default: 0.8)
 * @returns {Promise<Object>} Compressed image result with uri and base64
 */
export const compressImage = async (imageUri, maxSizeBytes = MAX_FILE_SIZE, initialQuality = 0.8) => {
  try {
    let quality = initialQuality;
    let compressedImage = null;
    let attempts = 0;
    const maxAttempts = 8; // Prevent infinite loop
    
    // Initial compression
    compressedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 800, height: 800 } }], // Resize to max 800x800
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    
    // Check size and compress further if needed
    while (attempts < maxAttempts) {
      const base64String = `data:image/jpeg;base64,${compressedImage.base64}`;
      const currentSize = getBase64Size(base64String);
      
      console.log(`Compression attempt ${attempts + 1}: ${formatFileSize(currentSize)} (Quality: ${quality})`);
      
      if (currentSize <= maxSizeBytes) {
        console.log(`Image compressed successfully to ${formatFileSize(currentSize)}`);
        return {
          uri: compressedImage.uri,
          base64: compressedImage.base64,
          size: currentSize,
          quality: quality
        };
      }
      
      // Reduce quality for next attempt
      quality = Math.max(0.1, quality - 0.1);
      attempts++;
      
      // If we're still over the limit, try smaller dimensions
      const newWidth = Math.max(400, 800 - (attempts * 100));
      const newHeight = Math.max(400, 800 - (attempts * 100));
      
      compressedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: newWidth, height: newHeight } }],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
    }
    
    // If we still can't compress enough, return the best we could do
    const finalBase64String = `data:image/jpeg;base64,${compressedImage.base64}`;
    const finalSize = getBase64Size(finalBase64String);
    
    console.warn(`Could not compress image below ${formatFileSize(maxSizeBytes)}. Final size: ${formatFileSize(finalSize)}`);
    
    return {
      uri: compressedImage.uri,
      base64: compressedImage.base64,
      size: finalSize,
      quality: quality
    };
    
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Failed to compress image');
  }
};

/**
 * Process and validate image with size check and compression
 * @param {Object} imageAsset - Image asset from ImagePicker
 * @param {number} maxSizeBytes - Maximum size in bytes (default: 1MB)
 * @returns {Promise<Object>} Processed image result
 */
export const processImage = async (imageAsset, maxSizeBytes = MAX_FILE_SIZE) => {
  try {
    if (!imageAsset || !imageAsset.uri) {
      throw new Error('Invalid image asset');
    }
    
    // First, get the original image with base64
    const originalImage = await ImageManipulator.manipulateAsync(
      imageAsset.uri,
      [],
      {
        compress: 1.0,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    
    const originalBase64String = `data:image/jpeg;base64,${originalImage.base64}`;
    const originalSize = getBase64Size(originalBase64String);
    
    console.log(`Original image size: ${formatFileSize(originalSize)}`);
    
    // If image is already under the limit, return as is
    if (originalSize <= maxSizeBytes) {
      console.log('Image is already under size limit');
      return {
        uri: originalImage.uri,
        base64: originalImage.base64,
        size: originalSize,
        compressed: false
      };
    }
    
    // Show compression alert
    Alert.alert(
      'Image Too Large',
      `The selected image is ${formatFileSize(originalSize)}. It will be compressed to under ${formatFileSize(maxSizeBytes)}.`,
      [{ text: 'OK' }]
    );
    
    // Compress the image
    const compressedResult = await compressImage(imageAsset.uri, maxSizeBytes);
    
    return {
      ...compressedResult,
      compressed: true,
      originalSize: originalSize
    };
    
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};

/**
 * Validate image size and show appropriate alerts
 * @param {string} base64String - Base64 image string
 * @param {number} maxSizeBytes - Maximum size in bytes
 * @returns {boolean} Whether the image is valid
 */
export const validateImageSize = (base64String, maxSizeBytes = MAX_FILE_SIZE) => {
  if (!base64String) return true;
  
  const size = getBase64Size(base64String);
  
  if (size > maxSizeBytes) {
    Alert.alert(
      'Image Too Large',
      `The image size is ${formatFileSize(size)}. Please select an image smaller than ${formatFileSize(maxSizeBytes)}.`
    );
    return false;
  }
  
  return true;
};

export { MAX_FILE_SIZE };