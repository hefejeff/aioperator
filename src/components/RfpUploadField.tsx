import React, { useCallback, useState } from 'react';
import { useTranslation } from '../i18n';
import { uploadRfpDocument, deleteRfpDocument, getRfpDocumentUrl } from '../services/firebaseService';
import { Icons } from '../constants';

interface RfpUploadFieldProps {
  companyId: string | null;
  onUploadSuccess?: () => void;
  onUploadError?: (error: Error) => void;
  onDelete?: () => void;
}

const RfpUploadField: React.FC<RfpUploadFieldProps> = ({
  companyId,
  onUploadSuccess,
  onUploadError,
  onDelete
}) => {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load existing RFP document URL on mount or when companyId changes
  React.useEffect(() => {
    const loadExistingDocument = async () => {
      if (!companyId) {
        setDocumentUrl(null);
        return;
      }

      try {
        const url = await getRfpDocumentUrl(companyId);
        setDocumentUrl(url);
      } catch (err) {
        console.error('Error loading RFP document:', err);
      }
    };

    loadExistingDocument();
  }, [companyId]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !companyId) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      setError(t('research.rfpInvalidType'));
      onUploadError?.(new Error('Invalid file type'));
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Upload document and analyze
      const url = await uploadRfpDocument(companyId, file);
      setDocumentUrl(url);
      onUploadSuccess?.();
      
      // Immediately load the new URL after upload
      const newUrl = await getRfpDocumentUrl(companyId);
      setDocumentUrl(newUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError(t('research.rfpUploadError'));
      onUploadError?.(err as Error);
    } finally {
      setIsUploading(false);
    }
  }, [companyId, t, onUploadSuccess, onUploadError]);

  const handleDelete = useCallback(async () => {
    if (!companyId || !documentUrl) return;

    const confirmed = window.confirm(t('research.rfpDeleteConfirm'));
    if (!confirmed) return;

    try {
      await deleteRfpDocument(companyId);
      setDocumentUrl(null);
      onDelete?.();
    } catch (err) {
      console.error('Delete error:', err);
      setError(t('common.error'));
    }
  }, [companyId, documentUrl, t, onDelete]);

  if (!companyId) {
    return (
      <div className="text-slate-400 text-sm">
        {t('research.rfpNoCompany')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-slate-200">
          {t('research.rfpUpload')}
        </label>
        <div className="text-xs text-slate-400">
          {t('research.rfpUploadHint')}
        </div>
      </div>

      {documentUrl ? (
        <div className="flex items-center space-x-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-sky-400 hover:text-sky-300 flex-1"
          >
            <Icons.Document className="w-4 h-4" />
            <span>{t('research.rfpDocumentLink')}</span>
          </a>
          <button
            onClick={handleDelete}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded"
            title={t('research.rfpDelete')}
          >
            <Icons.Trash className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx"
            disabled={isUploading}
            className="block w-full text-sm text-slate-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-slate-700 file:text-slate-200
              file:cursor-pointer file:hover:bg-slate-600
              file:transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
              <Icons.Spinner className="w-5 h-5 animate-spin text-sky-400" />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};

export default RfpUploadField;