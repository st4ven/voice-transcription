import { useState, useRef } from 'react';
import { TbUpload, TbFileMusic, TbCheck, TbX } from 'react-icons/tb';
import { MdCloudUpload } from 'react-icons/md';

interface FileDropProps {
  onFileSelect: (file: File) => void;
  loading: boolean;
}

const FileDrop = ({ onFileSelect, loading }: FileDropProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!loading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/mp4', 'audio/m4a', 'audio/ogg'];
    const allowedExtensions = ['.mp3', '.wav', '.webm', '.m4a', '.ogg'];

    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);

    if (!isValidType) {
      setError('Unsupported file format. Please upload an audio file (MP3, WAV, M4A, WebM, OGG)');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit. Please choose a smaller file.');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={handleFileChange}
        disabled={loading}
      />

      {/* Main Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative overflow-hidden
          transition-all duration-300 ease-in-out
          rounded-2xl border-2 border-dashed
          ${isDragging
            ? 'border-blue-500 bg-blue-50 scale-102 shadow-lg'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
          }
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${selectedFile ? 'border-green-500 bg-green-50/30' : ''}
          p-8
        `}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 10px 10px, currentColor 1px, transparent 1px)`,
            backgroundSize: '30px 30px'
          }} />
        </div>

        {/* Content */}
        <div className="relative flex flex-col items-center text-center">
          {selectedFile ? (
            <>
              {/* Success State */}
              <div className="relative mb-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce-subtle">
                  <TbCheck size={40} className="text-green-600" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                  ✓
                </div>
              </div>

              <span className="text-lg font-semibold text-gray-800 mb-1">
                {selectedFile.name.length > 30
                  ? selectedFile.name.substring(0, 27) + '...'
                  : selectedFile.name
                }
              </span>

              <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                <span className="px-2 py-1 bg-gray-100 rounded-full">
                  {formatFileSize(selectedFile.size)}
                </span>
                <span className="px-2 py-1 bg-gray-100 rounded-full">
                  {selectedFile.name.substring(selectedFile.name.lastIndexOf('.') + 1).toUpperCase()}
                </span>
              </div>

              <button
                onClick={removeFile}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
              >
                <TbX size={16} />
                Remove
              </button>
            </>
          ) : (
            <>
              {/* Default State */}
              <div className={`
                mb-4 transition-transform duration-300
                ${isDragging ? 'scale-110' : 'scale-100'}
              `}>
                <div className="relative">
                  <TbUpload size={64} className="text-blue-400 mx-auto" />
                  {isDragging && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-ping" />
                  )}
                </div>
              </div>

              <span className="text-xl font-semibold text-gray-800 mb-2">
                {isDragging ? 'Drop to Upload' : 'Upload Audio File'}
              </span>

              <span className={`
                text-gray-600 font-medium transition-colors
                ${isDragging ? 'text-blue-600' : 'text-gray-600'}
              `}>
                {isDragging ? (
                  <span className="flex items-center gap-2">
                    <MdCloudUpload size={20} />
                    Release to upload
                  </span>
                ) : (
                  'Drag and drop or click to browse'
                )}
              </span>

              {/* Supported Formats */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {['MP3', 'WAV', 'M4A', 'WebM', 'OGG'].map((format) => (
                  <span
                    key={format}
                    className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full"
                  >
                    {format}
                  </span>
                ))}
              </div>

              <div className="mt-4 text-xs text-gray-400 flex items-center gap-1">
                <TbFileMusic size={14} />
                Max size: 10MB
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg animate-slideDown">
          <TbX size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileDrop;
