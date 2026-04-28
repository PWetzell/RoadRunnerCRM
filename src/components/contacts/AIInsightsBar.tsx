'use client';

import { useMemo } from 'react';
import { Sparkle, Warning, CheckCircle } from '@phosphor-icons/react';
import { useContactStore } from '@/stores/contact-store';
import { useUserStore } from '@/stores/user-store';
import { isContactComplete } from '@/lib/contact-completeness';

export default function AIInsightsBar() {
  const contacts = useContactStore((s) => s.contacts);
  const aiEnabled = useUserStore((s) => s.aiEnabled);
  const notifications = useUserStore((s) => s.notifications);
  // Real completeness check (shared with the detail header so the two
  // surfaces never disagree). The previous implementation counted
  // `c.stale === true` and labeled the result "incomplete contacts",
  // but `stale` is a hand-set "needs refresh" flag — completely
  // unrelated to whether the contact's required fields are filled in.
  // Result: a freshly-imported Gmail contact with only a name + email
  // would render as "complete" in this bar while EVERY column in the
  // grid below screamed "Incomplete" in red. Paul flagged the lie on
  // 2026-04-27. Now we compute it for real, the same way the detail
  // header pill does.
  const incompleteCount = useMemo(
    () => contacts.filter((c) => !isContactComplete(c)).length,
    [contacts],
  );
  const newAICount = contacts.filter((c) => c.aiStatus === 'new').length;

  // Master AI toggle — hide the entire AI Insights bar when disabled
  if (!aiEnabled) return null;

  const showStale = notifications.staleAlerts;
  const showAI = notifications.aiSuggestions;

  // Nothing to show — hide the bar entirely
  if (!showStale && !showAI) return null;

  return (
    <div data-tour="contacts-insights" className="bg-[var(--ai-bg)] border border-[var(--ai-border)] px-2.5 py-1.5 flex items-center gap-2 flex-wrap rounded-lg w-full min-h-[32px]">
      <div className="w-[18px] h-[18px] bg-[var(--ai)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
        <Sparkle size={11} weight="duotone" className="text-white" />
      </div>
      <div className="text-[11px] text-[var(--text-secondary)]">
        <strong className="font-extrabold text-[var(--text-primary)]">AI Insights</strong>
        <span> · monitoring your contacts</span>
      </div>
      <div className="flex gap-1 flex-wrap ml-1">
        {showStale && incompleteCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)] cursor-pointer">
            <Warning size={10} /> {incompleteCount} incomplete contact{incompleteCount > 1 ? 's' : ''}
          </span>
        )}
        {showAI && newAICount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]">
            <Sparkle size={10} weight="duotone" /> {newAICount} AI-added today
          </span>
        )}
        {showStale && incompleteCount === 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]">
            <CheckCircle size={10} weight="fill" /> All contacts complete
          </span>
        )}
      </div>
    </div>
  );
}
