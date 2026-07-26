import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockDb, NotificationRow } from '../utils/mockDb';
import { Bell, CheckCheck, Calendar, BellOff } from 'lucide-react';

export const Notifications: React.FC = () => {
  const { user, role } = useAuth();
  const targetId = role === 'Analytics' ? user?.unitId : user?.employeeId;
  const [notifications, setNotifications] = useState<NotificationRow[]>(
    mockDb.getNotifications(targetId)
  );

  const handleMarkRead = () => {
    mockDb.markNotificationsAsRead(targetId);
    setNotifications(mockDb.getNotifications(targetId));
  };

  return (
    <div className="space-y-6 select-none max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ksp-navy m-0 uppercase tracking-tight">KSP Alert Inbox</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Real-time status changes and assignments</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={handleMarkRead}
            className="text-xs font-bold text-ksp-blue hover:text-ksp-navy flex items-center gap-1 bg-blue-50 border px-3 py-1.5 rounded-lg transition"
          >
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="space-y-3">
        {notifications.map((notif) => (
          <div 
            key={notif.id} 
            className={`p-4 rounded-xl border flex gap-4 hover:shadow transition duration-200 ${
              notif.read ? 'bg-white border-slate-200' : 'bg-blue-50/50 border-blue-200 shadow-sm'
            }`}
          >
            <div className={`p-2.5 rounded-lg shrink-0 w-fit h-fit ${
              notif.read ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-ksp-blue border border-blue-200'
            }`}>
              <Bell size={18} />
            </div>
            
            <div className="flex-grow space-y-1">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                  <Calendar size={10} /> {notif.timestamp.replace('T', ' ').substring(0, 16)}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed m-0 font-medium">
                {notif.message}
              </p>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="bg-white p-12 rounded-xl border border-dashed text-center space-y-3">
            <BellOff className="text-slate-300 mx-auto" size={36} />
            <h4 className="text-sm font-bold text-slate-700 m-0">Inbox is empty</h4>
            <p className="text-xs text-slate-400 m-0">You have no active alerts or case assignments currently.</p>
          </div>
        )}
      </div>

    </div>
  );
};
