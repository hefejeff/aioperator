import React, { useCallback, useState, useRef } from 'react';
import { useTranslation } from '../i18n';
import { uploadDocument, deleteDocument, getCompanyDocuments } from '../services/firebaseService';
import { Icons } from '../constants';
import type { UploadedDocument, DocumentCategory } from '../types';

interface RfpUploadFieldProps {
  companyId: string | null;
  onUploadSuccess?: () => void;
  onUploadError?: (error: Error) => void;
  onDelete?: () => void;
  onSelectDocument?: (doc: UploadedDocument) => void;
}

const MAX_DOCUMENTS = 5;
const VALID_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

// Category colors and icons
const categoryConfig: Record<DocumentCategory, { color: string; bgColor: string; label: string }> = {
  'RFP': { color: 'text-wm-accent', bgColor: 'bg-wm-accent/10', label: 'RFP' },
  'SOW': { color: 'text-wm-pink', bgColor: 'bg-wm-pink/10', label: 'SOW' },
  'CONTRACT': { color: 'text-emerald-600', bgColor: 'bg-emerald-50', label: 'Contract' },
  'PROPOSAL': { color: 'text-violet-600', bgColor: 'bg-violet-50', label: 'Proposal' },
  'REQUIREMENTS': { color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'Requirements' },
  'TECHNICAL': { color: 'text-cyan-600', bgColor: 'bg-cyan-50', label: 'Technical' },
  'FINANCIAL': { color: 'text-wm-yellow', bgColor: 'bg-wm-yellow/10', label: 'Financial' },
  'OTHER': { color: 'text-wm-blue/70', bgColor: 'bg-wm-neutral/20', label: 'Document' },
};

const RfpUploadField: React.FC<RfpUploadFieldProps> = ({
  companyId,
  onUploadSuccess,
  onUploadError,
  onDelete,
  onSelectDocument
}) => {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

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
        
        // Check if any documents are still analyzing
        const hasAnalyzing = docs.some(doc => doc.isAnalyzing);
        if (hasAnalyzing && !pollingInterval) {
          // Start polling for updates
          const interval = setInterval(async () => {
            try {
              const updatedDocs = await getCompanyDocuments(companyId);
              setDocuments(updatedDocs);
              
              // Stop polling if no more analyzing
              if (!updatedDocs.some(doc => doc.isAnalyzing)) {
                clearInterval(interval);
                setPollingInterval(null);
              }
            } catch (e) {
              console.error('Polling error:', e);
            }
          }, 3000);
          setPollingInterval(interval);
        }
      } catch (err) {
        console.error('Error loading documents:', err);
      }
    };

    loadExistingDocuments();
    
    // Cleanup polling on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [companyId]);

  // Poll for document analysis completion
  React.useEffect(() => {
    const hasAnalyzing = documents.some(doc => doc.isAnalyzing);
    
    if (hasAnalyzing && !pollingInterval && companyId) {
      const interval = setInterval(async () => {
        try {
          const updatedDocs = await getCompanyDocuments(companyId);
          setDocuments(updatedDocs);
          
          if (!updatedDocs.some(doc => doc.isAnalyzing)) {
            clearInterval(interval);
            setPollingInterval(null);
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }, 3000);
      setPollingInterval(interval);
    }
    
    return () => {
      if (pollingInterval && !hasAnalyzing) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [documents, companyId]);

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

      {/* List of uploaded documents as category buttons */}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {documents.map((doc) => {
            const category = doc.documentAnalysis?.category || 'OTHER';
            const config = categoryConfig[category];
            const displayTitle = doc.documentAnalysis?.title || doc.fileName.replace(/\.[^/.]+$/, '');
            const isAnalyzing = doc.isAnalyzing;
            
            return (
              <div key={doc.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelectDocument?.(doc)}
                  disabled={isAnalyzing}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    isAnalyzing 
                      ? 'bg-wm-neutral/10 border-wm-neutral/30 text-wm-blue/50 cursor-wait'
                      : `${config.bgColor} border-transparent hover:border-current ${config.color} hover:shadow-md cursor-pointer`
                  }`}
                  title={doc.documentAnalysis?.summary || doc.fileName}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-wm-accent border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[150px]">
                        {displayTitle}
                      </span>
                    </>
                  )}
                </button>
                
                {/* Delete button on hover */}
                {!isAnalyzing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id);
                    }}
                    className="absolute -top-1.5 -right-1.5 p-1 bg-wm-pink text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-wm-pink/80 shadow-sm"
                    title={t('research.documentDelete')}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
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