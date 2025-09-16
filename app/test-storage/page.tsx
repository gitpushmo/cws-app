'use client';

import React, { useState } from 'react';
import { uploadFile, listFilesForQuote, getSignedUrl } from '@/lib/storage';

export default function TestStoragePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [quoteId, setQuoteId] = useState('test-quote-123');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setResult('Please select a file first');
      return;
    }

    setUploading(true);
    setResult('Uploading...');

    try {
      // Determine bucket based on file extension
      const ext = file.name.toLowerCase().split('.').pop();
      const bucket = ext === 'dxf' ? 'dxf-files' : 'pdf-files';

      const uploadResult = await uploadFile(file, bucket, quoteId);

      if (uploadResult.success) {
        setResult(`✅ Upload successful!\nPath: ${uploadResult.path}\nURL: ${uploadResult.url}`);
      } else {
        setResult(`❌ Upload failed: ${uploadResult.error}`);
      }
    } catch (error) {
      setResult(`❌ Upload error: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  const handleListFiles = async () => {
    setResult('Listing files...');

    try {
      const dxfFiles = await listFilesForQuote('dxf-files', quoteId);
      const pdfFiles = await listFilesForQuote('pdf-files', quoteId);

      let fileList = `📁 Files for quote ${quoteId}:\n\n`;

      if (dxfFiles.files.length > 0) {
        fileList += `DXF Files:\n`;
        dxfFiles.files.forEach(file => {
          fileList += `- ${file.name} (${Math.round(file.metadata?.size / 1024 || 0)}KB)\n`;
        });
        fileList += '\n';
      }

      if (pdfFiles.files.length > 0) {
        fileList += `PDF Files:\n`;
        pdfFiles.files.forEach(file => {
          fileList += `- ${file.name} (${Math.round(file.metadata?.size / 1024 || 0)}KB)\n`;
        });
      }

      if (dxfFiles.files.length === 0 && pdfFiles.files.length === 0) {
        fileList += 'No files found for this quote ID.';
      }

      setResult(fileList);
    } catch (error) {
      setResult(`❌ Error listing files: ${error}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Storage Test Page</h1>

      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quote ID for testing:
          </label>
          <input
            type="text"
            value={quoteId}
            onChange={(e) => setQuoteId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter a quote ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select a file to upload (DXF or PDF):
          </label>
          <input
            type="file"
            accept=".dxf,.pdf"
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({Math.round(file.size / 1024)}KB)
            </p>
          )}
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`px-4 py-2 rounded-md font-medium ${
              !file || uploading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>

          <button
            onClick={handleListFiles}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium"
          >
            List Files for Quote
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium text-gray-700 mb-2">Result:</h3>
          <pre className="whitespace-pre-wrap text-sm text-gray-600">
            {result || 'No operations performed yet...'}
          </pre>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">Storage Configuration</h2>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>Buckets configured:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><code>dxf-files</code> - For DXF cutting files (50MB limit)</li>
            <li><code>pdf-files</code> - For PDF technical drawings (50MB limit)</li>
            <li><code>quote-pdfs</code> - For generated quotes (50MB limit)</li>
          </ul>
          <p><strong>Path structure:</strong> <code>/{'{bucket}'}/{'{quote_id}'}/{'{filename}'}</code></p>
          <p><strong>Access control:</strong> Users can only access files for quotes they own</p>
        </div>
      </div>
    </div>
  );
}