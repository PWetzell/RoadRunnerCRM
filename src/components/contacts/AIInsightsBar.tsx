'use client';

import { Sparkle, Warning, CheckCircle } from '@phosphor-icons/react';
import { useContactStore } from '@/stores/contact-store';
import { useUserStore } from '@/stores/user-store';

export default function AIInsightsBar() {
  const contacts = useContactStore((s) => s.contacts);
  const aiEnabled = useUserStore((s) => s.aiEnabled);
  const notifications = useUserStore((s) => s.notifications);
  const staleCount = contacts.filter((c) => c.stale).length;
  const newAICount = contacts.filter((c) => c.aiStatus === 'new').length;

  // Master AI toggle — hide the entire AI Insights bar when disabled
  if (!aiEnabled) return null;

  const showStale = notifications.staleAlerts;
  const showAI = notifications.aiSuggestions;

  // Nothing to show — hide the bar entirely
  if (!showStale && !showAI) return null;

  return (
    <div data-tour="contacts-insights" className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-3.5 py-2.5 flex items-center gap-2.5 flex-wrap rounded-lg w-full min-h-[48px]">
      <div className="w-[22px] h-[22px] bg-[var(--ai)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
        <Sparkle size={13} weight="duotone" className="text-white" />
      </div>
      <div className="text-[13px] text-[var(--text-secondary)]">
        <strong className="font-extrabold text-[var(--text-primary)]">AI Insights</strong>
        <span> · monitoring your contacts</span>
      </div>
      <div className="flex gap-1.5 flex-wrap ml-1">
        {showStale && staleCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)] cursor-pointer">
            <Warning size={12} /> {staleCount} incomplete contact{staleCount > 1 ? 's' : ''}
          </span>
        )}
        {showAI && newAICount > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]">
            <Sparkle size={12} weight="duotone" /> {newAICount} AI-added today
          </span>
        )}
        {showStale && staleCount === 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]">
            <CheckCircle size={12} weight="fill" /> All contacts complete
          </span>
        )}
      </div>
    </div>
  );
}
