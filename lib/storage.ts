import { supabase } from './supabase/client';

export interface FileUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a file to Supabase storage using quote_id structure
 * Path format: /{bucket}/{quote_id}/{filename}
 */
export async function uploadFile(
  file: File,
  bucket: 'dxf-files' | 'pdf-files' | 'quote-pdfs',
  quoteId: string
): Promise<FileUploadResult> {
  try {
    const fileExtension = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${file.name.replace(/\.[^/.]+$/, '')}_${timestamp}.${fileExtension}`;
    const filePath = `${quoteId}/${fileName}`;

    console.log(`Uploading ${file.name} to ${bucket}/${filePath}`);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL (even though buckets are private, this gives us the path)
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (err) {
    console.error('Upload exception:', err);
    return { success: false, error: 'Upload failed' };
  }
}

/**
 * Get signed URL for private file access
 */
export async function getSignedUrl(
  bucket: 'dxf-files' | 'pdf-files' | 'quote-pdfs',
  path: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      return { error: error.message };
    }

    return { url: data.signedUrl };
  } catch (err) {
    return { error: 'Failed to generate signed URL' };
  }
}

/**
 * List files for a specific quote
 */
export async function listFilesForQuote(
  bucket: 'dxf-files' | 'pdf-files' | 'quote-pdfs',
  quoteId: string
) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(quoteId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('List files error:', error);
      return { files: [], error: error.message };
    }

    return { files: data || [], error: null };
  } catch (err) {
    console.error('List files exception:', err);
    return { files: [], error: 'Failed to list files' };
  }
}

/**
 * Delete a file
 */
export async function deleteFile(
  bucket: 'dxf-files' | 'pdf-files' | 'quote-pdfs',
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to delete file' };
  }
}