import React from 'react';

interface ExtractedFile {
  name: string;
  content: Uint8Array;
  size: number;
}

interface FileListProps {
  files: ExtractedFile[];
}

export default function FileList({ files }: FileListProps) {
  if (files.length === 0) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="mt-12 border-t border-gray-800 pt-8">
      <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
        </svg>
        System Files ({files.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {files.map((file, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-900/30 border border-gray-800 rounded-lg hover:bg-gray-800/50 transition-colors group"
          >
            <div className="flex items-center gap-2 overflow-hidden">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-mono text-xs text-gray-400 truncate group-hover:text-gray-200 transition-colors">
                {file.name}
                </span>
            </div>
            <span className="text-[10px] text-gray-600 font-mono whitespace-nowrap">
              {formatFileSize(file.size)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
