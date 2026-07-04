import React, { useState, useEffect, useRef } from "react";

interface UploadCardProps {
  onSubmitting: (text: string, file: File | null) => Promise<void>;
  isLoading: boolean;
}

export const UploadCard: React.FC<UploadCardProps> = ({ onSubmitting, isLoading }) => {
  const [text, setText] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const validateAndSetFile = (selectedFile: File | null) => {
    setFileError(null);
    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Integrity: accept only image/jpeg and image/png
    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(selectedFile.type)) {
      setFileError("Invalid format. Please upload a JPEG or PNG image.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Integrity: cap size at 8MB
    const maxSize = 8 * 1024 * 1024; // 8MB
    if (selectedFile.size > maxSize) {
      setFileError("File too large. Maximum size is 8MB.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || (!text.trim() && !file)) return;

    try {
      await onSubmitting(text.trim(), file);
      setText("");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      // Retain inputs on error so the farmer does not lose their typed question
    }
  };

  const isSubmitDisabled = isLoading || (!text.trim() && !file);

  return (
    <form 
      onSubmit={handleSubmit}
      className="glass-panel rounded-2xl p-5 flex flex-col gap-5 animate-in fade-in select-none"
    >
      <div>
        <h2 className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2.5 font-semibold">
          Input Channel
        </h2>
        
        {/* Drag-and-Drop Crop leaf image upload */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? "border-sunset-orange bg-sunset-orange/5 scale-[1.01]"
              : "border-white/10 hover:border-white/20 hover:bg-white/5"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png"
            className="hidden"
          />

          {previewUrl ? (
            <div 
              className="flex flex-col items-center gap-3.5 w-full"
              onClick={(e) => e.stopPropagation()} // Stop click propagation to input upload trigger
            >
              <div className="relative border border-white/10 max-h-48 overflow-hidden rounded-lg bg-black/40 flex items-center justify-center p-1.5">
                <img 
                  src={previewUrl} 
                  alt="Crop preview" 
                  className="object-contain max-h-36 max-w-full rounded-md"
                />
              </div>
              <div className="flex items-center justify-between w-full">
                <span className="font-mono text-xs text-slate-300 truncate max-w-[220px]" title={file?.name}>
                  {file?.name}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="font-outfit text-xs text-red-400 hover:text-red-300 border border-red-500/20 bg-red-500/5 px-2.5 py-1 rounded-md transition-colors"
                >
                  REMOVE
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-slate-400">
                <svg 
                  className="w-5 h-5 text-slate-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                  />
                </svg>
              </div>
              <p className="font-sans text-xs text-slate-300 leading-normal">
                Drop an image of your crop or leaf, or <span className="text-sunset-orange font-semibold hover:underline">tap to upload</span>
              </p>
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">
                JPG, PNG ONLY (MAX 8MB)
              </span>
            </div>
          )}
        </div>

        {/* Validation Errors */}
        {fileError && (
          <div className="mt-2 text-xs text-red-400 font-sans border-l-2 border-red-500 pl-2">
            {fileError}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-2.5 font-semibold">
          Context Query
        </h2>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Or ask a question, like local prices, weather conditions, or irrigation tips"
          className="w-full glass-input rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none font-sans leading-relaxed"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className={`w-full py-2.5 rounded-xl font-mono text-[11px] uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
          isSubmitDisabled
            ? "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
            : "bg-sunset-orange hover:bg-sunset-orange/90 text-slate-950 shadow-md cursor-pointer active:scale-[0.98]"
        }`}
      >
        {isLoading ? (
          <>
            <svg 
              className="animate-spin h-3.5 w-3.5" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="3"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Routing Query...
          </>
        ) : (
          "Run Diagnostics"
        )}
      </button>
    </form>
  );
};
