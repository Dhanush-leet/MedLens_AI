import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle } from 'lucide-react';

interface Props {
  onImageSelected: (base64String: string | null) => void;
}

export const ImageUpload: React.FC<Props> = ({ onImageSelected }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size exceeds the 5MB safety limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreview(reader.result);
        onImageSelected(reader.result);
      }
    };
    reader.onerror = () => {
      setError('Failed to read the image file.');
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearImage = () => {
    setPreview(null);
    onImageSelected(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div id="image-upload-container" className="w-full">
      {preview ? (
        <div className="relative border border-slate-200 rounded-xl bg-white p-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={preview}
              alt="Uploaded prescription or clinical symptom"
              className="w-16 h-16 object-cover rounded-lg border border-slate-100"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="text-xs font-semibold text-slate-800">Selected Attachment</p>
              <p className="text-[10px] text-slate-500">Multimodal vision context loaded</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearImage}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-400 bg-indigo-50/25'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-1.5">
            <UploadCloud className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-xs font-semibold text-slate-700">
                Upload symptom photo or lab report
              </p>
              <p className="text-[10px] text-slate-400">
                Drag and drop, or click to browse (max 5MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
