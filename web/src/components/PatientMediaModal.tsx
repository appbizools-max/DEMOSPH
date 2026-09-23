import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderPlus,
  Link as LinkIcon,
  ExternalLink,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Sparkles
} from 'lucide-react';
import {
  ClinicFolder,
  ClinicMediaItem,
  MediaCategory,
  MEDIA_CATEGORIES,
  createClinicFolder,
  addClinicMediaItem,
  deleteClinicMediaItem,
  subscribeToPatientMedia
} from '../services/mediaManagerService';

interface PatientMediaModalProps {
  patient: {
    id?: string;
    name: string;
    phone?: string;
    regId?: string;
    branchName?: string;
  } | null;
  onClose: () => void;
  onNavigateToMediaManager?: () => void;
}

export const PatientMediaModal: React.FC<PatientMediaModalProps> = ({
  patient,
  onClose,
  onNavigateToMediaManager
}) => {
  if (!patient) return null;

  const [items, setItems] = useState<ClinicMediaItem[]>([]);
  const [folders, setFolders] = useState<ClinicFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add URL State
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [itemCategory, setItemCategory] = useState<MediaCategory>('lab_reports');
  const [itemNotes, setItemNotes] = useState('');
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Add Folder State
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [folderName, setFolderName] = useState(`${patient.name} - Reports`);
  const [folderColor, setFolderColor] = useState('#258ec8');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Get current username
  let loggedInUser = 'Reception';
  try {
    const saved = localStorage.getItem('sph_auth_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.userName) loggedInUser = parsed.userName;
    }
  } catch (e) {}

  // Subscribe to this patient's media
  useEffect(() => {
    setIsLoading(true);
    const searchTarget = patient.phone || patient.name || patient.regId || '';
    const unsub = subscribeToPatientMedia(searchTarget, (patientItems, patientFolders) => {
      setItems(patientItems);
      setFolders(patientFolders);
      setIsLoading(false);
    });

    return () => unsub();
  }, [patient]);

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemUrl.trim()) {
      setUrlError('Please enter a valid URL / link.');
      return;
    }
    if (!itemTitle.trim()) {
      setUrlError('Please enter a title for this link.');
      return;
    }

    setIsSavingUrl(true);
    setUrlError(null);

    try {
      await addClinicMediaItem({
        folderId: folders[0]?.id || 'root',
        folderName: folders[0]?.name || 'Patient Records',
        title: itemTitle.trim(),
        type: 'url',
        url: itemUrl.trim(),
        category: itemCategory,
        patientName: patient.name,
        patientPhone: patient.phone || '',
        patientId: patient.regId || patient.id || '',
        branchName: patient.branchName || 'Clinic',
        recordDate: new Date().toISOString().split('T')[0],
        notes: itemNotes.trim(),
        uploadedBy: loggedInUser
      });

      setItemTitle('');
      setItemUrl('');
      setItemNotes('');
      setShowAddUrl(false);
    } catch (err: any) {
      setUrlError(err.message || 'Failed to save URL');
    } finally {
      setIsSavingUrl(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      await createClinicFolder({
        name: folderName.trim(),
        color: folderColor,
        patientName: patient.name,
        patientPhone: patient.phone || '',
        patientId: patient.regId || patient.id || '',
        branchName: patient.branchName || 'Clinic',
        createdBy: loggedInUser
      });
      setShowAddFolder(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Delete this report URL?')) return;
    await deleteClinicMediaItem(itemId);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '18px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: '#e0f2fe',
              padding: '10px',
              borderRadius: '12px',
              color: '#0284c7'
            }}>
              <Folder size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {patient.name}
                </h3>
                {patient.regId && (
                  <span style={{ fontSize: '11px', fontWeight: 700, background: '#eff6ff', color: '#258ec8', padding: '2px 7px', borderRadius: '5px' }}>
                    {patient.regId}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                {patient.phone ? `Phone: +91 ${patient.phone}` : 'Patient Records & Diagnostic Links'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Action Bar */}
        <div style={{
          padding: '12px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setShowAddUrl(true);
                setShowAddFolder(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <LinkIcon size={14} /> + Store New URL
            </button>

            <button
              onClick={() => {
                setShowAddFolder(true);
                setShowAddUrl(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <FolderPlus size={14} color="#0284c7" /> + Add Folder
            </button>
          </div>

          {onNavigateToMediaManager && (
            <button
              onClick={() => {
                onClose();
                onNavigateToMediaManager();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0284c7',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Open Full Media Manager →
            </button>
          )}
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Quick Add URL Form Drawer */}
          {showAddUrl && (
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #0284c7',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
                  Store Google Drive / Diagnostic Report URL
                </div>
                <button onClick={() => setShowAddUrl(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={15} color="#64748b" />
                </button>
              </div>

              {urlError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '6px', color: '#b91c1c', fontSize: '12px', marginBottom: '10px' }}>
                  {urlError}
                </div>
              )}

              <form onSubmit={handleSaveUrl}>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="url"
                    required
                    placeholder="Paste link: https://drive.google.com/... or report URL"
                    value={itemUrl}
                    onChange={(e) => setItemUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Title: e.g. Brain MRI / Blood Test"
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />

                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as MediaCategory)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      background: '#ffffff'
                    }}
                  >
                    {MEDIA_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Doctor notes or finding comments..."
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddUrl(false)}
                    style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUrl}
                    style={{ padding: '6px 18px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {isSavingUrl ? 'Saving...' : 'Save URL for Patient'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Quick Add Folder Drawer */}
          {showAddFolder && (
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #0284c7',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
                  Create Dedicated Folder for {patient.name}
                </div>
                <button onClick={() => setShowAddFolder(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={15} color="#64748b" />
                </button>
              </div>

              <form onSubmit={handleCreateFolder}>
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    required
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Folder name"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddFolder(false)}
                    style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingFolder}
                    style={{ padding: '6px 18px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Folders Summary */}
          {folders.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                📁 Patient Folders ({folders.length})
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {folders.map(f => (
                  <div
                    key={f.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#1e293b'
                    }}
                  >
                    <Folder size={16} color={f.color || '#0284c7'} />
                    {f.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stored URLs & Reports */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              🔗 Stored Report Links & Diagnostic URLs ({items.length})
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                Loading patient records...
              </div>
            ) : items.length === 0 ? (
              <div style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '36px 16px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <LinkIcon size={32} color="#94a3b8" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>
                  No stored links or report URLs for {patient.name}
                </div>
                <p style={{ fontSize: '12px', margin: '4px 0 12px 0' }}>
                  Paste Google Drive link or scan URL using "+ Store New URL" above.
                </p>
                <button
                  onClick={() => setShowAddUrl(true)}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 16px',
                    borderRadius: '7px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Add First URL Link
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {items.map((item) => {
                  const catInfo = MEDIA_CATEGORIES.find(c => c.id === item.category) || MEDIA_CATEGORIES[0];
                  const isGdrive = item.url.includes('drive.google.com');

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: '5px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            background: catInfo.bg,
                            color: catInfo.color
                          }}>
                            {catInfo.label}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {item.recordDate}
                          </span>
                        </div>

                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                          {item.title}
                        </div>

                        <div style={{
                          fontSize: '11px',
                          color: '#64748b',
                          fontFamily: 'monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '3px'
                        }}>
                          {item.url}
                        </div>

                        {item.notes && (
                          <div style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', marginTop: '3px' }}>
                            "{item.notes}"
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open URL in new tab"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#0284c7',
                            color: '#ffffff',
                            textDecoration: 'none',
                            padding: '6px 12px',
                            borderRadius: '7px',
                            fontSize: '12px',
                            fontWeight: 700,
                            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
                          }}
                        >
                          <ExternalLink size={12} /> Open
                        </a>

                        <button
                          onClick={() => handleCopy(item.url, item.id!)}
                          title="Copy Link"
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: copiedId === item.id ? '#16a34a' : '#475569',
                            padding: '6px 10px',
                            borderRadius: '7px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          {copiedId === item.id ? <Check size={13} /> : <Copy size={13} />}
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item.id!)}
                          title="Delete URL"
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            padding: '6px 8px',
                            borderRadius: '7px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
