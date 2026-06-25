import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { Paperclip, Download, Trash2, FileText, Image as ImageIcon, File } from 'lucide-react';

export default function FilesSection({ item, canEdit }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFiles(item?.files || []);
  }, [item?.id, item?.files]);

  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of selectedFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      const updatedFiles = [...files, ...uploadedUrls];
      await base44.entities.WorkboardItem.update(item.id, { files: updatedFiles });
      setFiles(updatedFiles);
      toast({ title: `${uploadedUrls.length} file${uploadedUrls.length > 1 ? 's' : ''} uploaded`, duration: 2000 });
    } catch (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = (fileUrl) => {
    const fileName = fileUrl.split('/').pop()?.split('?')[0] || 'file';
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRemove = async (fileUrl) => {
    const ok = await confirm({
      title: 'Remove File?',
      description: 'Are you sure you want to remove this file?',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    setSaving(true);
    try {
      const updatedFiles = files.filter(f => f !== fileUrl);
      await base44.entities.WorkboardItem.update(item.id, { files: updatedFiles });
      setFiles(updatedFiles);
      toast({ title: 'File removed', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to remove file', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const getFileIcon = (url) => {
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return ImageIcon;
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return FileText;
    return File;
  };

  const getFileName = (url) => {
    const decoded = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'file');
    return decoded.length > 40 ? decoded.substring(0, 37) + '...' : decoded;
  };

  const isImage = (url) => {
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  };

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Paperclip className="w-3.5 h-3.5 mr-1.5" />
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      )}

      {files.length === 0 ? (
        <div className="text-center py-8">
          <Paperclip className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No files attached</p>
          {canEdit && <p className="text-xs text-muted-foreground/60 mt-1">Upload files to attach them to this item</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {files.map((fileUrl, idx) => {
            const Icon = getFileIcon(fileUrl);
            return (
              <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                {isImage(fileUrl) ? (
                  <img src={fileUrl} alt={getFileName(fileUrl)} className="w-10 h-10 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getFileName(fileUrl)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(fileUrl)} title="Download">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  {canEdit && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemove(fileUrl)} disabled={saving} title="Remove">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}