import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Camera, CheckCircle, Sparkles, AlertCircle, Upload, Trash2,
  Calendar, Clock, ShieldCheck, XCircle, Info, RefreshCw, Eye, X, ZoomIn
} from 'lucide-react';
import { db } from '@app/shared';
import {
  collection, doc, getDocs, setDoc, addDoc, updateDoc, onSnapshot, query, where, orderBy
} from 'firebase/firestore';
import {
  CleaningSchedule, CleaningSubmission, normalizeBranchName,
  getTodayDateString, formatDisplayDate, checkBranchLockoutStatus, compressImageFile, BRANCH_LIST
} from '../../../utils/cleaningService';

interface CleaningPhotosPageProps {
  currentBranch?: string;
  onSubmittedSuccess?: () => void;
  isOverdueLocked?: boolean;
}

export const CleaningPhotosPage: React.FC<CleaningPhotosPageProps> = ({
  currentBranch = 'KPHB',
  onSubmittedSuccess,
  isOverdueLocked = false,
}) => {
  const branch = normalizeBranchName(currentBranch);

  // Auth session info
  let userName = 'Receptionist';
  try {
    const saved = localStorage.getItem('sph_auth_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.userName) userName = parsed.userName;
    }
  } catch (e) {}

  const [schedule, setSchedule] = useState<CleaningSchedule>({
    branch,
    assignedDate: getTodayDateString()
  });

  const [submissions, setSubmissions] = useState<CleaningSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // New submission form state
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lightbox modal state
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Listen to Cleaning Schedule for this branch
  useEffect(() => {
    const schedDocRef = doc(db, 'branch_cleaning_schedules', branch);
    const unsub = onSnapshot(schedDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSchedule({
          branch,
          assignedDate: data.assignedDate || getTodayDateString(),
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy
        });
      } else {
        setSchedule({ branch, assignedDate: getTodayDateString() });
      }
    }, (err) => console.warn('Schedule listener error:', err));
    return () => unsub();
  }, [branch]);

  // 2. Listen to Submissions for this branch
  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, 'branch_cleaning_submissions');
    const q = query(colRef, where('branch', '==', branch));
    const unsub = onSnapshot(q, (snap) => {
      const list: CleaningSubmission[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      // Sort newest first
      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setSubmissions(list);
      setLoading(false);
    }, (err) => {
      console.warn('Submissions listener error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [branch]);

  // Evaluate current status
  const lockoutInfo = useMemo(() => {
    return checkBranchLockoutStatus(schedule.assignedDate, submissions, new Date());
  }, [schedule.assignedDate, submissions]);

  const activeSubmission = lockoutInfo.currentSubmission;

  // Handle image files selection (Camera / Gallery)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSubmitMessage(null);
    const remainingSlots = 7 - selectedPhotos.length;
    if (remainingSlots <= 0) {
      setSubmitMessage({ type: 'error', text: 'Maximum limit of 7 photos reached.' });
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    setIsSubmitting(true);

    try {
      const compressedList: string[] = [];
      for (const file of filesToProcess) {
        const compressed = await compressImageFile(file);
        compressedList.push(compressed);
      }
      setSelectedPhotos(prev => [...prev, ...compressedList].slice(0, 7));
    } catch (err) {
      console.error('Error compressing image:', err);
      setSubmitMessage({ type: 'error', text: 'Failed to process images. Please try again.' });
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Submit to Firestore
  const handleSubmitVerification = async () => {
    if (selectedPhotos.length < 5) {
      setSubmitMessage({
        type: 'error',
        text: `Please upload at least 5 photos (currently ${selectedPhotos.length}). HR requires 5 to 7 photos.`
      });
      return;
    }
    if (selectedPhotos.length > 7) {
      setSubmitMessage({
        type: 'error',
        text: `Maximum 7 photos allowed (currently ${selectedPhotos.length}). Please remove excess photos.`
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const newSubmission: Omit<CleaningSubmission, 'id'> = {
        branch,
        assignedDate: schedule.assignedDate || getTodayDateString(),
        submittedAt: new Date().toISOString(),
        submittedBy: userName,
        photos: selectedPhotos,
        notes: notes.trim() || 'Weekly clinic sanitation completed and inspected.',
        status: 'Pending',
      };

      await addDoc(collection(db, 'branch_cleaning_submissions'), newSubmission);

      setSelectedPhotos([]);
      setNotes('');
      setSubmitMessage({
        type: 'success',
        text: '✅ Cleaning photos submitted successfully! Awaiting HR / Admin approval.'
      });

      if (onSubmittedSuccess) {
        onSubmittedSuccess();
      }
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitMessage({
        type: 'error',
        text: 'Failed to submit cleaning photos. Please check your network and try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(37, 142, 200, 0.15) 0%, rgba(168, 206, 58, 0.25) 100%)',
            padding: '14px',
            borderRadius: '16px',
            border: '1px solid rgba(37, 142, 200, 0.2)'
          }}>
            <Sparkles color="#258ec8" size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {branch} Branch • Clinic Hygiene & Cleaning Portal
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', marginBottom: 0 }}>
              Weekly clinic sanitation audit, 5–7 sterilization photos submission, & HR verification
            </p>
          </div>
        </div>

        {/* Assigned Schedule Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '10px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <Calendar size={18} color="#258ec8" />
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Assigned Cleaning Date
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              {formatDisplayDate(schedule.assignedDate)}
            </div>
          </div>
        </div>
      </div>

      {/* OVERDUE / URGENT LOCKOUT BANNER */}
      {lockoutInfo.isBlocked && (
        <div style={{
          background: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: '16px',
          padding: '18px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.12)'
        }}>
          <AlertCircle size={26} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#991b1b', margin: '0 0 6px 0' }}>
              🚨 URGENT ACTION REQUIRED: Clinic Cleaning Photos Overdue!
            </h3>
            <p style={{ fontSize: '13.5px', color: '#b91c1c', margin: 0, lineHeight: 1.5 }}>
              {lockoutInfo.reason}
            </p>
            <p style={{ fontSize: '13px', color: '#7f1d1d', marginTop: '6px', fontWeight: 600, marginBottom: 0 }}>
              All regular reception services (patient booking, billing, patient files) are temporarily locked until 5 to 7 clinic cleaning photos are uploaded below and approved by HR.
            </p>
          </div>
        </div>
      )}

      {/* CURRENT WEEK STATUS CARD */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '22px',
        marginBottom: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Scheduled Date: {formatDisplayDate(schedule.assignedDate)}
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: '4px 0 0 0' }}>
              Cleaning Verification Status
            </h3>
          </div>

          {/* Status Chip */}
          <div>
            {lockoutInfo.status === 'Approved' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '30px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                fontWeight: 800,
                fontSize: '13px',
                border: '1px solid #86efac'
              }}>
                <CheckCircle size={16} color="#16a34a" /> Approved by HR ✅
              </span>
            )}
            {lockoutInfo.status === 'Pending' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '30px',
                backgroundColor: '#fef9c3',
                color: '#854d0e',
                fontWeight: 800,
                fontSize: '13px',
                border: '1px solid #fde047'
              }}>
                <Clock size={16} color="#ca8a04" /> Under Review by HR ⏳
              </span>
            )}
            {lockoutInfo.status === 'Rejected' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '30px',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                fontWeight: 800,
                fontSize: '13px',
                border: '1px solid #fca5a5'
              }}>
                <XCircle size={16} color="#dc2626" /> Rejected - Re-upload Needed ❌
              </span>
            )}
            {lockoutInfo.status === 'Due Today' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '30px',
                backgroundColor: '#fef3c7',
                color: '#b45309',
                fontWeight: 800,
                fontSize: '13px',
                border: '1px solid #fcd34d'
              }}>
                <AlertCircle size={16} color="#d97706" /> Cleaning Due Today 📅
              </span>
            )}
            {lockoutInfo.status === 'Not Submitted' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '30px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontWeight: 800,
                fontSize: '13px',
                border: '1px solid #cbd5e1'
              }}>
                <Clock size={16} color="#64748b" /> Not Submitted Yet
              </span>
            )}
          </div>
        </div>

        {/* Status Description / Details */}
        <div style={{
          background: lockoutInfo.status === 'Approved' ? '#f0fdf4' : lockoutInfo.status === 'Rejected' ? '#fff1f2' : '#f8fafc',
          borderRadius: '12px',
          padding: '14px 18px',
          border: '1px solid',
          borderColor: lockoutInfo.status === 'Approved' ? '#bbf7d0' : lockoutInfo.status === 'Rejected' ? '#fecdd3' : '#e2e8f0',
          fontSize: '13.5px',
          color: '#334155',
          lineHeight: 1.5
        }}>
          {activeSubmission ? (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '8px', fontSize: '12.5px', color: '#64748b' }}>
                <span><strong>Submitted by:</strong> {activeSubmission.submittedBy}</span>
                <span><strong>Date:</strong> {new Date(activeSubmission.submittedAt).toLocaleString()}</span>
                <span><strong>Photos:</strong> {activeSubmission.photos.length} uploaded</span>
                {activeSubmission.reviewedBy && (
                  <span><strong>Reviewed by:</strong> {activeSubmission.reviewedBy}</span>
                )}
              </div>

              {activeSubmission.status === 'Rejected' && activeSubmission.rejectReason && (
                <div style={{ marginTop: '8px', color: '#991b1b', fontWeight: 600 }}>
                  <strong>HR Feedback / Reason:</strong> "{activeSubmission.rejectReason}"
                </div>
              )}

              {activeSubmission.status === 'Approved' && (
                <div style={{ marginTop: '4px', color: '#166534', fontWeight: 600 }}>
                  ✅ Clinic hygiene verified and approved by HR. All branch features are fully active.
                </div>
              )}

              {activeSubmission.status === 'Pending' && (
                <div style={{ marginTop: '4px', color: '#854d0e', fontWeight: 600 }}>
                  ⏳ Submitted photos are under review. Once HR verifies, status will update to Approved.
                </div>
              )}
            </div>
          ) : (
            <div>
              {lockoutInfo.reason}
            </div>
          )}
        </div>
      </div>

      {/* PHOTO UPLOAD SUBMISSION CARD (Only show if not approved or if re-uploading) */}
      {(lockoutInfo.status !== 'Approved' || lockoutInfo.isBlocked) && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '26px',
          marginBottom: '28px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Upload Clinic Cleaning Photos (5 to 7 Photos Max)
              </h3>
              <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px', marginBottom: 0 }}>
                Capture or select photos of cleaned consultation rooms, sterilization, and waiting area
              </p>
            </div>

            {/* Photo Counter Badge */}
            <div style={{
              padding: '6px 14px',
              borderRadius: '20px',
              background: selectedPhotos.length >= 5 && selectedPhotos.length <= 7 ? '#dcfce7' : '#f1f5f9',
              border: `1px solid ${selectedPhotos.length >= 5 && selectedPhotos.length <= 7 ? '#86efac' : '#cbd5e1'}`,
              color: selectedPhotos.length >= 5 && selectedPhotos.length <= 7 ? '#15803d' : '#475569',
              fontWeight: 800,
              fontSize: '13px'
            }}>
              Photos: {selectedPhotos.length} / 7 (Min: 5)
            </div>
          </div>

          {/* Audit Guidelines Checklist */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '20px',
            border: '1px dashed #cbd5e1'
          }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={15} color="#0284c7" /> Required Cleaning Areas to Photograph:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', fontSize: '12px', color: '#475569' }}>
              <div>• Doctor Consultation Room 1 & 2</div>
              <div>• Patient Examination / Therapy Bed</div>
              <div>• Waiting Lounge & Sofa Seating</div>
              <div>• Reception Counter & Desk Cleanliness</div>
              <div>• Medicine Dispensing Area & Restroom</div>
            </div>
          </div>

          {/* Upload Dropzone / Button */}
          <div style={{ marginBottom: '20px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
              disabled={isSubmitting || selectedPhotos.length >= 7}
            />

            <div
              onClick={() => {
                if (selectedPhotos.length < 7 && !isSubmitting) {
                  fileInputRef.current?.click();
                }
              }}
              style={{
                border: '2px dashed #94a3b8',
                borderRadius: '16px',
                padding: '28px 20px',
                textAlign: 'center',
                background: selectedPhotos.length >= 7 ? '#f1f5f9' : '#fafafa',
                cursor: selectedPhotos.length >= 7 || isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '50%' }}>
                  <Camera size={28} color="#0284c7" />
                </div>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                {selectedPhotos.length >= 7
                  ? 'Maximum 7 photos selected'
                  : 'Click to Take Photo or Choose from Gallery'}
              </div>
              <p style={{ color: '#64748b', fontSize: '12.5px', marginTop: '4px', marginBottom: 0 }}>
                Select between 5 and 7 clear photos. Automatically compressed for fast upload.
              </p>
            </div>
          </div>

          {/* Photos Grid Preview */}
          {selectedPhotos.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>
                Selected Photos ({selectedPhotos.length} of 7):
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '12px'
              }}>
                {selectedPhotos.map((photoUrl, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      height: '110px',
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                      backgroundColor: '#0f172a'
                    }}
                  >
                    <img
                      src={photoUrl}
                      alt={`Cleaning Photo ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => setLightboxImg(photoUrl)}
                    />
                    {/* Photo number tag */}
                    <div style={{
                      position: 'absolute',
                      top: '6px',
                      left: '6px',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '6px'
                    }}>
                      #{idx + 1}
                    </div>

                    {/* Zoom preview button */}
                    <button
                      type="button"
                      onClick={() => setLightboxImg(photoUrl)}
                      style={{
                        position: 'absolute',
                        bottom: '6px',
                        left: '6px',
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '4px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="View Zoomed"
                    >
                      <ZoomIn size={14} color="#ffffff" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: '#ef4444',
                        border: 'none',
                        color: '#ffffff',
                        padding: '4px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove Photo"
                    >
                      <Trash2 size={14} color="#ffffff" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cleaning Notes Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Cleaning Notes / Observations:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Deep cleaned doctor consultation rooms, sanitized chairs, mopped floors with disinfectant..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Feedback Message */}
          {submitMessage && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '13.5px',
              fontWeight: 600,
              background: submitMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: submitMessage.type === 'success' ? '#15803d' : '#b91c1c',
              border: `1px solid ${submitMessage.type === 'success' ? '#86efac' : '#fca5a5'}`
            }}>
              {submitMessage.text}
            </div>
          )}

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleSubmitVerification}
              disabled={isSubmitting || selectedPhotos.length < 5 || selectedPhotos.length > 7}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 26px',
                borderRadius: '12px',
                background: selectedPhotos.length >= 5 && selectedPhotos.length <= 7 && !isSubmitting
                  ? 'linear-gradient(135deg, #258ec8 0%, #1d70a2 100%)'
                  : '#94a3b8',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '14px',
                border: 'none',
                cursor: selectedPhotos.length >= 5 && selectedPhotos.length <= 7 && !isSubmitting ? 'pointer' : 'not-allowed',
                boxShadow: selectedPhotos.length >= 5 ? '0 4px 12px rgba(37, 142, 200, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Submitting Photos...
                </>
              ) : (
                <>
                  <Upload size={16} /> Submit Cleaning Photos to HR for Verification
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* RECENT SUBMISSIONS HISTORY */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
          Branch Cleaning Submissions History
        </h3>

        {submissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 12px', color: '#94a3b8' }}>
            <Camera size={36} color="#cbd5e1" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>No cleaning photo logs submitted for {branch} branch yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {submissions.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '16px',
                  background: item.status === 'Approved' ? '#f0fdf4' : item.status === 'Rejected' ? '#fff1f2' : '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                      Scheduled Date: {formatDisplayDate(item.assignedDate)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '10px' }}>
                      Submitted by {item.submittedBy} on {new Date(item.submittedAt).toLocaleDateString()} at {new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    {item.status === 'Approved' && (
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '4px 12px', borderRadius: '20px', border: '1px solid #86efac' }}>
                        Approved ✅
                      </span>
                    )}
                    {item.status === 'Pending' && (
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#854d0e', background: '#fef9c3', padding: '4px 12px', borderRadius: '20px', border: '1px solid #fde047' }}>
                        Under Review ⏳
                      </span>
                    )}
                    {item.status === 'Rejected' && (
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#b91c1c', background: '#fee2e2', padding: '4px 12px', borderRadius: '20px', border: '1px solid #fca5a5' }}>
                        Rejected ❌
                      </span>
                    )}
                  </div>
                </div>

                {item.notes && (
                  <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px 0' }}>
                    <strong>Notes:</strong> {item.notes}
                  </p>
                )}

                {item.rejectReason && item.status === 'Rejected' && (
                  <div style={{ fontSize: '12.5px', color: '#991b1b', background: '#fee2e2', padding: '8px 12px', borderRadius: '8px', marginBottom: '10px', fontWeight: 600 }}>
                    <strong>Rejection Reason:</strong> {item.rejectReason}
                  </div>
                )}

                {/* Photos thumbnails */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {item.photos?.map((pUrl, pIdx) => (
                    <div
                      key={pIdx}
                      onClick={() => setLightboxImg(pUrl)}
                      style={{
                        width: '74px',
                        height: '74px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '1px solid #cbd5e1'
                      }}
                      title="Click to zoom photo"
                    >
                      <img src={pUrl} alt={`Photo ${pIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FULL-SIZE LIGHTBOX MODAL */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
          >
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}
            >
              <X size={20} color="#0f172a" />
            </button>
            <img
              src={lightboxImg}
              alt="Clinic Cleaning Zoomed"
              style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
