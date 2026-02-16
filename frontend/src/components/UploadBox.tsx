import { useRef, useState } from "react";
import { TbUpload } from "react-icons/tb";

type Props = {
  onFileSelect: (file: File) => void;
};

const UploadBox = ({ onFileSelect }: Props) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    onFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onFileSelect(file);
  };
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={handleFileChange}
      />
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className="text-center"
      >
        <TbUpload size={48} className="mx-auto mb-2 text-blue-400" />
        <span className="block text-xl font-semibold text-[#343A40] mb-2">Upload Audio File</span>
        <span className="text-[#6C757D] font-medium text-lg">{isDragging ? "Drop the file here..." : "Drag and drop or click to browse"}</span>
        <span className="text-[#6C757D] text-xs block mt-2">Supported formats: MP3, WAV, M4A, WebM, OGG</span>
      </div>
    </>
  );
};

export default UploadBox;
