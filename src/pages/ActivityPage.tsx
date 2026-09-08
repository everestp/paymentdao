import { ArrowUpRight, ArrowDownLeft, FileText, Check, ThumbsUp, ThumbsDown, Minus, Users, UserPlus, MessageSquare } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { PixelCard, SectionHeader, StatusBadge } from '@/components/retro';

const iconMap: Record<string, typeof ArrowUpRight> = {
  'arrow-up': ArrowUpRight, 'arrow-down': ArrowDownLeft, 'file-text': FileText,
  'check': Check, 'thumbs-up': ThumbsUp, 'thumbs-down': ThumbsDown, 'minus': Minus,
  'user-plus': UserPlus, 'users': Users, 'message': MessageSquare, 'vote': FileText,
};

export function ActivityPage() {
  const { activity } = useApp();

  const groups: Record<string, typeof activity> = {};
  activity.forEach(e => {
    const key = e.timeAgo === 'Just now' ? 'Today' : e.timeAgo.includes('min') || e.timeAgo.includes('hour') ? 'Today' : e.timeAgo.includes('Yesterday') ? 'Yesterday' : e.timeAgo.includes('day') ? 'This Week' : 'Earlier';
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  const orderedKeys = ['Today', 'Yesterday', 'This Week', 'Earlier'].filter(k => groups[k]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <SectionHeader title="Activity" subtitle="Real-time feed of everything happening in PayDAO" />

      <div className="space-y-6">
        {orderedKeys.map(dateKey => (
          <div key={dateKey}>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-sm font-heading font-semibold text-cyan uppercase tracking-wide">{dateKey}</h3>
              <div className="flex-1 h-px bg-bdlight" />
            </div>
            <PixelCard className="p-0">
              <div className="relative">
                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-bdlight" />
                <div className="space-y-1">
                  {groups[dateKey].map((event) => {
                    const Icon = iconMap[event.icon] || FileText;
                    return (
                      <div key={event.id} className="relative flex items-start gap-4 p-4 hover:bg-bgpanel2 transition-colors">
                        <div className="relative z-10 w-8 h-8 flex items-center justify-center shrink-0 mt-0.5 rounded-lg" style={{ background: `${event.userColor}20`, border: `2px solid ${event.userColor}` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: event.userColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-txprim">
                            <span className="font-semibold" style={{ color: event.userColor }}>{event.user}</span>{' '}
                            {event.action}{' '}
                            <span className="text-txsec">{event.detail}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-txdim">{event.timeAgo}</span>
                            {event.status !== 'info' && (
                              <StatusBadge variant={event.status === 'completed' ? 'success' : event.status === 'approved' ? 'approved' : event.status === 'rejected' ? 'rejected' : 'pending'}>{event.status}</StatusBadge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PixelCard>
          </div>
        ))}
      </div>
    </div>
  );
}
