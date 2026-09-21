import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export interface NotificationItem {
  id: string;
  type?: 'booking' | 'payment' | 'staff_login' | 'staff_logout' | 'staff_report' | string;
  title?: string;
  body?: string;
  patientName?: string;
  staffName?: string;
  staffId?: string;
  appointmentTime?: string;
  appointmentDate?: string;
  branch?: string;
  targetBranch?: string;
  doctorName?: string;
  consultationMode?: string;
  amount?: number | string;
  paymentMode?: string;
  loginTime?: string;
  logoutTime?: string;
  totalCalls?: number | string;
  followUps?: number | string;
  createdAt?: string;
}

interface NotificationsScreenProps {
  notifications: NotificationItem[];
  readNotiIds: Set<string>;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onBack?: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  notifications,
  readNotiIds,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  // Show ONLY the latest 10 notifications
  const latest10 = useMemo(() => {
    return (notifications || []).slice(0, 10);
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return latest10.filter((n) => !readNotiIds.has(n.id)).length;
  }, [latest10, readNotiIds]);

  const formatTimestamp = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const getNotificationMeta = (item: NotificationItem, isRead: boolean) => {
    switch (item.type) {
      case 'booking':
        return {
          iconName: 'calendar-outline' as const,
          iconColor: isRead ? '#64748b' : '#0284c7',
          circleStyle: isRead ? styles.iconCircleRead : styles.iconCircleUnread,
          title: item.patientName || 'Appointment Booked',
          tagText: 'BOOKED',
          tagStyle: styles.bookingTypeTag,
          tagTextStyle: styles.bookingTypeTagText,
        };
      case 'payment':
        return {
          iconName: 'cash' as const,
          iconColor: isRead ? '#64748b' : '#16a34a',
          circleStyle: isRead ? styles.iconCircleRead : styles.iconCirclePayment,
          title: item.patientName || 'Payment Received',
          tagText: 'PAID',
          tagStyle: styles.paymentTypeTag,
          tagTextStyle: styles.paymentTypeTagText,
        };
      case 'staff_login':
        return {
          iconName: 'log-in-outline' as const,
          iconColor: isRead ? '#64748b' : '#7c3aed',
          circleStyle: isRead ? styles.iconCircleRead : styles.iconCircleLogin,
          title: item.staffName || 'Staff Member',
          tagText: 'LOGIN',
          tagStyle: styles.loginTypeTag,
          tagTextStyle: styles.loginTypeTagText,
        };
      case 'staff_logout':
        return {
          iconName: 'log-out-outline' as const,
          iconColor: isRead ? '#64748b' : '#d97706',
          circleStyle: isRead ? styles.iconCircleRead : styles.iconCircleLogout,
          title: item.staffName || 'Staff Member',
          tagText: 'LOGOUT',
          tagStyle: styles.logoutTypeTag,
          tagTextStyle: styles.logoutTypeTagText,
        };
      case 'staff_report':
        return {
          iconName: 'document-text-outline' as const,
          iconColor: isRead ? '#64748b' : '#4f46e5',
          circleStyle: isRead ? styles.iconCircleRead : styles.iconCircleReport,
          title: item.staffName ? `${item.staffName} (Report)` : 'Daily Report',
          tagText: 'REPORT',
          tagStyle: styles.reportTypeTag,
          tagTextStyle: styles.reportTypeTagText,
        };
      default:
        return {
          iconName: 'calendar-outline' as const,
          iconColor: isRead ? '#64748b' : '#0284c7',
          circleStyle: isRead ? styles.iconCircleRead : styles.iconCircleUnread,
          title: item.patientName || 'Patient',
          tagText: null,
          tagStyle: null,
          tagTextStyle: null,
        };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header Bar */}
      <View style={styles.topHeaderBar}>
        <View style={styles.titleInfo}>
          <Text style={styles.headerTitle}>Latest Notifications</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{latest10.length}/10</Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount} unread</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={onMarkAllAsRead}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done-circle" size={16} color="#0284c7" />
            <Text style={styles.markAllBtnText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List (Top 10 Only) */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {latest10.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={42} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>
              New appointment bookings and alerts will appear here in real-time.
            </Text>
          </View>
        ) : (
          latest10.map((item, index) => {
            const isRead = readNotiIds.has(item.id);
            const meta = getNotificationMeta(item, isRead);

            return (
              <TouchableOpacity
                key={item.id || index}
                activeOpacity={0.8}
                style={[styles.card, isRead ? styles.cardRead : styles.cardUnread]}
                onPress={() => {
                  if (!isRead) onMarkAsRead(item.id);
                }}
              >
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={[styles.iconCircle, meta.circleStyle]}>
                      <Ionicons
                        name={meta.iconName}
                        size={14}
                        color={meta.iconColor}
                      />
                    </View>
                    <Text style={[styles.patientName, isRead && styles.textMuted]} numberOfLines={1}>
                      {meta.title}
                    </Text>
                    {meta.tagText && meta.tagStyle && meta.tagTextStyle && (
                      <View style={meta.tagStyle}>
                        <Text style={meta.tagTextStyle}>{meta.tagText}</Text>
                      </View>
                    )}
                    {!isRead && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.timeText}>{formatTimestamp(item.createdAt)}</Text>
                </View>

                {/* Body Text */}
                <Text style={[styles.bodyText, isRead && styles.bodyTextRead]}>
                  {item.body || (item.type === 'payment'
                    ? `Payment received from ${item.patientName || 'Patient'}`
                    : `Appointment booked for ${item.patientName || 'Patient'}`)}
                </Text>

                {/* Details Tags */}
                <View style={styles.tagsContainer}>
                  {item.amount != null && item.amount !== '' ? (
                    <View style={styles.tagAmount}>
                      <Ionicons name="wallet-outline" size={12} color="#16a34a" />
                      <Text style={styles.tagTextAmount}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
                    </View>
                  ) : null}

                  {item.paymentMode ? (
                    <View style={styles.tag}>
                      <Ionicons name="card-outline" size={12} color="#475569" />
                      <Text style={styles.tagTextSecondary}>{item.paymentMode}</Text>
                    </View>
                  ) : null}

                  {item.loginTime ? (
                    <View style={styles.tagPurple}>
                      <Ionicons name="log-in-outline" size={12} color="#7c3aed" />
                      <Text style={styles.tagTextPurple}>In: {item.loginTime}</Text>
                    </View>
                  ) : null}

                  {item.logoutTime ? (
                    <View style={styles.tagAmber}>
                      <Ionicons name="log-out-outline" size={12} color="#d97706" />
                      <Text style={styles.tagTextAmber}>Out: {item.logoutTime}</Text>
                    </View>
                  ) : null}

                  {item.totalCalls != null && item.totalCalls !== '' && Number(item.totalCalls) > 0 ? (
                    <View style={styles.tagIndigo}>
                      <Ionicons name="call-outline" size={12} color="#4f46e5" />
                      <Text style={styles.tagTextIndigo}>{item.totalCalls} Calls</Text>
                    </View>
                  ) : null}

                  {item.followUps != null && item.followUps !== '' && Number(item.followUps) > 0 ? (
                    <View style={styles.tagGreen}>
                      <Ionicons name="people-outline" size={12} color="#059669" />
                      <Text style={styles.tagTextGreen}>{item.followUps} Follow-ups</Text>
                    </View>
                  ) : null}

                  {item.appointmentTime ? (
                    <View style={styles.tag}>
                      <Ionicons name="time-outline" size={12} color="#0284c7" />
                      <Text style={styles.tagTextPrimary}>{item.appointmentTime}</Text>
                    </View>
                  ) : null}

                  {item.branch ? (
                    <View style={styles.tag}>
                      <Ionicons name="location-outline" size={12} color="#64748b" />
                      <Text style={styles.tagTextSecondary}>{item.branch}</Text>
                    </View>
                  ) : null}

                  {item.doctorName ? (
                    <View style={styles.tag}>
                      <Ionicons name="medkit-outline" size={12} color="#0284c7" />
                      <Text style={styles.tagTextDoctor}>{item.doctorName}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Card Action Row */}
                <View style={styles.cardFooter}>
                  {!isRead ? (
                    <TouchableOpacity
                      style={styles.markAsReadBtn}
                      onPress={() => onMarkAsRead(item.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color="#0284c7" />
                      <Text style={styles.markAsReadBtnText}>Mark as read</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.readTag}>
                      <Ionicons name="checkmark-done" size={13} color="#94a3b8" />
                      <Text style={styles.readTagText}>Read</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  titleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  unreadBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  markAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardUnread: {
    borderColor: '#bae6fd',
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  cardRead: {
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleUnread: {
    backgroundColor: '#e0f2fe',
  },
  iconCirclePayment: {
    backgroundColor: '#dcfce7',
  },
  iconCircleLogin: {
    backgroundColor: '#ede9fe',
  },
  iconCircleLogout: {
    backgroundColor: '#fef3c7',
  },
  iconCircleReport: {
    backgroundColor: '#e0e7ff',
  },
  iconCircleRead: {
    backgroundColor: '#f1f5f9',
  },
  bookingTypeTag: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  bookingTypeTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0284c7',
  },
  paymentTypeTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  paymentTypeTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803d',
  },
  loginTypeTag: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  loginTypeTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7c3aed',
  },
  logoutTypeTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  logoutTypeTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#d97706',
  },
  reportTypeTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  reportTypeTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4f46e5',
  },
  patientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    flexShrink: 1,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0284c7',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 6,
  },
  bodyText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  bodyTextRead: {
    color: '#64748b',
  },
  textMuted: {
    color: '#475569',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tagAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  tagTextAmount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
  },
  tagPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f3ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  tagTextPurple: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  tagAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  tagTextAmber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  tagIndigo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  tagTextIndigo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
  },
  tagGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  tagTextGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  tagTextPrimary: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  tagTextSecondary: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tagTextDoctor: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369a1',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  markAsReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
  },
  markAsReadBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284c7',
  },
  readTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  readTagText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
