import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, FileText, Eye } from 'lucide-react';

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
const PDF_EXTS = ['pdf'];
const VIDEO_EXTS = ['mp4', 'webm', 'ogg'];

export default function FilePreview({ fileName, fileUrl, onClose }) {
  const [showPreview, setShowPreview] = useState(false);
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  const isImage = IMAGE_EXTS.includes(ext);
  const isPdf = PDF_EXTS.includes(ext);
  const isVideo = VIDEO_EXTS.includes(ext);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm flex-1 truncate">{fileName}</span>
        {(isImage || isPdf || isVideo) && (
          <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-3.5 h-3.5 mr-1" /> {showPreview ? 'Hide' : 'Preview'}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Download className="w-3.5 h-3.5 mr-1" /> Download
        </Button>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {showPreview && (
        <div className="rounded-lg border p-2 bg-muted/30">
          {isImage && (
            <img src={fileUrl} alt={fileName} className="max-w-full max-h-96 rounded mx-auto" />
          )}
          {isPdf && (
            <iframe src={fileUrl} className="w-full h-96 rounded" title={fileName} />
          )}
          {isVideo && (
            <video src={fileUrl} controls className="max-w-full max-h-96 rounded mx-auto" />
          )}
        </div>
      )}
    </div>
  );
}