import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { Upload, File, Trash2, Download, Image as ImageIcon, FileText, Archive, X, Eye } from 'lucide-react';
import { getUserInitials } from '@/lib/userHelpers';

export default function FilesSection({ item, boardId, workspaceId, canEdit }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    loadUser();
    loadFiles();
  }, [item?.id]);

  const loadUser = async () => {
    const me = await base44.auth.me().catch(() => null);
    setCurrentUser(me);
  };

  const loadFiles = async () => {
    if (!item?.id) return;
    setLoading(true);
    try {
      const attachments = await base44.entities.Attachment.filter({
        item: item.id,
      }, '-created_date');
      setFiles(attachments || []);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !item?.id) return;

    setUploading(true);
    try {
      const me = currentUser || await base44.auth.me();
      
      // Upload file - returns file_uri for private storage
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const file_uri = uploadResult?.file_uri;
      
      if (!file_uri) {
        throw new Error('Upload failed: file_uri was not returned.');
      }
      
      // Create signed URL for display/download (optional helper)
      let signed_url = '';
      try {
        const signedRes = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri,
          expires_in: 86400,
        });
        signed_url = signedRes?.signed_url || '';
      } catch (e) {
        // signed_url is optional; file_uri is what matters
      }
      
      // Create attachment record - file_uri is required, file_url is optional
      const attachment = await base44.entities.Attachment.create({
        workspace: item.workspace || workspaceId,
        workboard: item.workboard || boardId,
        item: item.id,
        uploaded_by: me.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_uri,
        file_url: signed_url,
        category: 'item_file',
      });

      setFiles(prev => [attachment, ...prev]);
      toast({ title: 'File uploaded', description: file.name, duration: 3000 });

      // Log activity
      try {
        await base44.entities.Activity.create({
          workspace: item.workspace || workspaceId,
          workboard: item.workboard || boardId,
          record_type: 'WorkboardItem',
          record_id: item.id,
          user: me.id,
          user_name: me.full_name || me.email || 'User',
          action: 'file uploaded',
          before_value: '',
          after_value: file.name,
          created_date: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to log activity:', err);
      }
    } catch (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (fileId, fileName) => {
    const ok = await confirm({
      title: 'Delete File?',
      description: `Are you sure you want to delete "${fileName}"?`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    try {
      await base44.entities.Attachment.delete(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast({ title: 'File deleted', duration: 2000 });

      // Log activity
      try {
        await base44.entities.Activity.create({
          workspace: item.workspace || workspaceId,
          workboard: item.workboard || boardId,
          record_type: 'WorkboardItem',
          record_id: item.id,
          user: currentUser?.id,
          user_name: currentUser?.full_name || 'User',
          action: 'file deleted',
          before_value: fileName,
          after_value: '',
          created_date: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to log activity:', err);
      }
    } catch (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handlePreview = async (file) => {
    try {
      // Must use file_uri, never file_url
      const fileUri = file.file_uri;
      if (!fileUri) {
        toast({ title: 'Preview unavailable', description: 'Legacy file - use download instead', variant: 'destructive', duration: 4000 });
        return;
      }
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: fileUri,
        expires_in: 3600,
      });
      setPreviewFile(file);
      setPreviewUrl(signed_url);
    } catch (error) {
      toast({ title: 'Preview failed', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleDownload = async (file) => {
    try {
      // Prefer file_uri, fallback to file_url for legacy files
      const fileUri = file.file_uri || file.file_url;
      if (!fileUri) {
        toast({ title: 'Download failed', description: 'No file URL available', variant: 'destructive', duration: 4000 });
        return;
      }
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: fileUri,
        expires_in: 3600,
      });
      
      const link = document.createElement('a');
      link.href = signed_url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({ title: 'Download failed', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (fileType?.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (fileType?.includes('zip') || fileType?.includes('rar')) return <Archive className="w-8 h-8 text-yellow-500" />;
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTimestamp = (date) => {
    return new Date(date).toLocaleDateString('en', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canDeleteFile = (file) => {
    if (!canEdit) return false;
    if (!currentUser) return false;
    return file.uploaded_by === currentUser.id;
  };

  return (
    <div className="space-y-4">
      {/* Upload */}
      {canEdit && (
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <label htmlFor="file-upload">
            <Button asChild disabled={uploading}>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload File'}
              </span>
            </Button>
          </label>
          <span className="text-xs text-muted-foreground">
            Attach files to this item
          </span>
        </div>
      )}

      {/* Files List */}
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>
      ) : files.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <File className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No files attached</p>
          {canEdit && <p className="text-xs text-muted-foreground mt-1">Upload a file to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {files.map(file => (
            <Card key={file.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {getFileIcon(file.file_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>•</span>
                        <span>Uploaded {formatTimestamp(file.created_date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(file.file_type?.startsWith('image/') || file.file_type?.includes('pdf')) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePreview(file)}
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(file)}
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {canDeleteFile(file) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(file.id, file.file_name)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) { setPreviewFile(null); setPreviewUrl(null); } }}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewFile?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto" style={{ maxHeight: '60vh' }}>
            {previewFile?.file_type?.startsWith('image/') ? (
              <img src={previewUrl} alt={previewFile.file_name} className="w-full h-auto rounded-lg" />
            ) : previewFile?.file_type?.includes('pdf') ? (
              <iframe src={previewUrl} className="w-full h-[60vh] rounded-lg" title="PDF Preview" />
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setPreviewFile(null); setPreviewUrl(null); }}>Close</Button>
            <Button onClick={() => handleDownload(previewFile)}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}