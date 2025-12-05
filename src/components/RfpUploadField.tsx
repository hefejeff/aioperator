import React, { useCallback, useState, useRef } from 'react';
import { useTranslation } from '../i18n';
import { uploadDocument, deleteDocument, getCompanyDocuments } from '../services/firebaseService';
import { Icons } from '../constants';
import type { UploadedDocument } from '../types';

interface RfpUploadFieldProps {
  companyId: string | null;
  onUploadSuccess?: () => void;
  onUploadError?: (error: Error) => void;
  onDelete?: () => void;
}

const MAX_DOCUMENTS = 5;
const VALID_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

const RfpUploadField: React.FC<RfpUploadFieldProps> = ({
  companyId,
  onUploadSuccess,
  onUploadError,
  onDelete
}) => {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing documents on mount or when companyId changes
  React.useEffect(() => {
    const loadExistingDocuments = async () => {
      if (!companyId) {
        setDocuments([]);
        return;
      }

      try {
        const docs = await getCompanyDocuments(companyId);
        setDocuments(docs);
      } catch (err) {
        console.error('Error loading documents:', err);
      }
    };

    loadExistingDocuments();
  }, [companyId]);

  const uploadFile = useCallback(async (file: File) => {
    if (!companyId) return;

    // Check if we've reached the limit
    if (documents.length >= MAX_DOCUMENTS) {
      setError(t('research.documentMaxReached'));
      return;
    }

    // Validate file type
    if (!VALID_TYPES.includes(file.type)) {
      setError(t('research.documentInvalidType'));
      onUploadError?.(new Error('Invalid file type'));
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Upload document
      await uploadDocument(companyId, file);
      
      // Reload documents list
      const updatedDocs = await getCompanyDocuments(companyId);
      setDocuments(updatedDocs);
      
      onUploadSuccess?.();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || t('research.documentUploadError'));
      onUploadError?.(err as Error);
    } finally {
      setIsUploading(false);
    }
  }, [companyId, documents.length, t, onUploadSuccess, onUploadError]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    await uploadFile(file);
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadFile]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (documents.length < MAX_DOCUMENTS && !isUploading) {
      setIsDragOver(true);
    }
  }, [documents.length, isUploading]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    if (documents.length >= MAX_DOCUMENTS || isUploading) return;

    const file = event.dataTransfer.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  }, [documents.length, isUploading, uploadFile]);

  const handleDropZoneClick = useCallback(() => {
    if (documents.length < MAX_DOCUMENTS && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [documents.length, isUploading]);

  const handleDelete = useCallback(async (documentId: string) => {
    if (!companyId) return;

    const confirmed = window.confirm(t('research.documentDeleteConfirm'));
    if (!confirmed) return;

    try {
      await deleteDocument(companyId, documentId);
      
      // Reload documents list
      const updatedDocs = await getCompanyDocuments(companyId);
      setDocuments(updatedDocs);
      
      onDelete?.();
    } catch (err) {
      console.error('Delete error:', err);
      setError(t('common.error'));
    }
  }, [companyId, t, onDelete]);

  if (!companyId) {
    return (
      <div className="text-wm-blue/50 text-sm">
        {t('research.documentNoCompany')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-bold text-wm-blue">
          {t('research.documentUpload')}
        </label>
        <div className="text-xs text-wm-blue/50">
          {t('research.documentUploadHint')}
        </div>
        <div className="text-xs text-wm-blue/60">
          {t('research.documentsCount', { count: documents.length })}
        </div>
      </div>

      {/* List of uploaded documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center space-x-4 p-3 bg-wm-neutral/10 rounded-lg border border-wm-neutral/30">
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-wm-accent hover:text-wm-accent/80 flex-1 min-w-0"
              >
                <Icons.Document className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{doc.fileName}</span>
              </a>
              <button
                onClick={() => handleDelete(doc.id)}
                className="p-1.5 text-wm-pink hover:text-wm-pink/80 hover:bg-wm-pink/10 rounded flex-shrink-0"
                title={t('research.documentDelete')}
              >
                <Icons.Trash className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drag and Drop Upload Zone - only show if under limit */}
      {documents.length < MAX_DOCUMENTS && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleDropZoneClick}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
            isDragOver 
              ? 'border-wm-accent bg-wm-accent/10' 
              : 'border-wm-neutral/50 hover:border-wm-accent/50 hover:bg-wm-neutral/5'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt"
            disabled={isUploading}
            className="hidden"
          />
          
          <div className="flex flex-col items-center space-y-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isDragOver ? 'bg-wm-accent/20 text-wm-accent' : 'bg-wm-neutral/20 text-wm-blue/50'
            }`}>
              <Icons.Upload className="w-5 h-5" />
            </div>
            <div className="text-sm text-wm-blue/70">
              <span className="font-medium text-wm-accent">{t('research.documentClickToUpload')}</span>
              {' '}{t('research.documentOrDragDrop')}
            </div>
            <div className="text-xs text-wm-blue/50">
              PDF, DOC, DOCX, TXT
            </div>
          </div>

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
              <Icons.Spinner className="w-6 h-6 animate-spin text-wm-accent" />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-wm-pink">
          {error}
        </div>
      )}
    </div>
  );
};

export default RfpUploadField;