'use client';

import { useEffect, useRef } from 'react';
import { useSalesStore } from '@/stores/sales-store';
import { useContactStore } from '@/stores/contact-store';
import { useDocumentStore } from '@/stores/document-store';
import { useAlertStore } from '@/stores/alert-store';
import { AlertRule, AlertType, AlertSeverity, CrmAlert } from '@/types/alert';

type AddAlertFn = (alert: Omit<CrmAlert, 'id' | 'createdAt' | 'read' | 'dismissed'>) => void;

/**
 * Alert auto-generation. Watches store state and creates alerts when
 * noteworthy conditions are first detected. Uses a fired-keys set
 * seeded from ALL existing alerts to prevent duplicates across
 * renders and page reloads.
 */
export function useAlertAutoGen() {
  const deals = useSalesStore((s) => s.deals);
  const contacts = useContactStore((s) => s.contacts);
  const documents = useDocumentStore((s) => s.documents);
  const addAlert = useAlertStore((s) => s.addAlert);
  const existingAlerts = useAlertStore((s) => s.alerts);
  const rules = useAlertStore((s) => s.rules);

  const firedRef = useRef<Set<string>>(new Set());
  // Track whether we've already run the initial seed+check
  const initializedRef = useRef(false);

  useEffect(() => {
    // Always rebuild firedRef from ALL existing alerts to prevent duplicates.
    // This is cheap (just building a Set of strings) and handles the case where
    // new alerts were added by a previous effect run.
    const fired = new Set<string>();
    existingAlerts.forEach((a) => {
      if (a.href) {
        fired.add(`${a.type}:${a.href}`);
        // Also add auto-gen-specific key variants
        if (a.type === 'ai-suggestion') fired.add(`ai-suggestion:${a.href}:negotiation`);
        if (a.type === 'deal-stalled') fired.add(`deal-stalled:${a.href}`);
      }
      if (a.type === 'contact-incomplete') {
        for (let i = 0; i <= 10; i++) fired.add(`contact-incomplete:count:${i}`);
      }
      // Mark rule-triggered alerts as fired
      if (a.title.startsWith('Rule:') || a.title.startsWith('High-value deal:')) {
        if (a.href) fired.add(`rule-any:${a.href}`);
      }
    });
    firedRef.current = fired;

    // Only run auto-gen checks once on initial mount, not on every alert change
    if (initializedRef.current) return;
    initializedRef.current = true;

    const now = Date.now();

    // 1. Stalled deals (>21 days no activity)
    deals.forEach((d) => {
      if (d.stage === 'closed-won' || d.stage === 'closed-lost') return;
      const daysIdle = (now - new Date(d.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      const key = `deal-stalled:/sales/${d.id}`;
      if (daysIdle > 21 && !fired.has(key)) {
        fired.add(key);
        addAlert({
          type: 'deal-stalled',
          severity: 'warning',
          title: `Deal stalled: ${d.name}`,
          message: `No activity for ${Math.floor(daysIdle)} days. Consider a follow-up.`,
          href: `/sales/${d.id}`,
        });
      }
    });

    // 2. Negotiation deals (suggest closing)
    deals.forEach((d) => {
      const key = `ai-suggestion:/sales/${d.id}:negotiation`;
      if (d.stage === 'negotiation' && !fired.has(key)) {
        fired.add(key);
        addAlert({
          type: 'ai-suggestion',
          severity: 'info',
          title: `AI: ${d.name} is in negotiation`,
          message: 'One more touch could tip it. Schedule a follow-up call.',
          href: `/sales/${d.id}`,
        });
      }
    });

    // 3. Incomplete contacts (batch into one alert)
    const staleCount = contacts.filter((c) => c.stale).length;
    const staleKey = `contact-incomplete:count:${Math.floor(staleCount / 3)}`;
    if (staleCount >= 3 && !fired.has(staleKey)) {
      fired.add(staleKey);
      addAlert({
        type: 'contact-incomplete',
        severity: 'info',
        title: `${staleCount} contacts need attention`,
        message: 'Several contacts have incomplete profiles — filling these in improves AI suggestions.',
        href: '/contacts',
      });
    }

    // ---- User-created rules ----
    const enabledRules = rules.filter((r) => r.enabled);
    enabledRules.forEach((rule) => {
      switch (rule.template) {
        case 'deal-idle-days':
          checkDealIdle(rule, deals, now, fired, addAlert);
          break;
        case 'deal-amount-exceeds':
          checkDealAmount(rule, deals, fired, addAlert);
          break;
        case 'contact-missing-info':
          checkContactMissing(rule, contacts, fired, addAlert);
          break;
        case 'document-expiring':
          checkDocumentExpiring(rule, documents, now, fired, addAlert);
          break;
      }
    });
  // Only depend on data sources, not on existingAlerts (to avoid re-running on every alert add)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, contacts, documents, rules]);
}

// ---- Rule template handlers ----

function checkDealIdle(
  rule: AlertRule,
  deals: { id: string; name: string; stage: string; lastUpdated: string }[],
  now: number,
  fired: Set<string>,
  addAlert: AddAlertFn,
) {
  const threshold = rule.threshold ?? 14;
  deals.forEach((d) => {
    if (d.stage === 'closed-won' || d.stage === 'closed-lost') return;
    const daysIdle = (now - new Date(d.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    const key = `rule:${rule.id}:deal-idle:/sales/${d.id}`;
    if (daysIdle > threshold && !fired.has(key) && !fired.has(`rule-any:/sales/${d.id}`)) {
      fired.add(key);
      addAlert({
        type: 'deal-stalled',
        severity: rule.severity,
        title: `Rule: ${d.name} idle ${Math.floor(daysIdle)} days`,
        message: `Exceeds your "${rule.name}" threshold of ${threshold} days.`,
        href: `/sales/${d.id}`,
      });
    }
  });
}

function checkDealAmount(
  rule: AlertRule,
  deals: { id: string; name: string; stage: string; amount: number }[],
  fired: Set<string>,
  addAlert: AddAlertFn,
) {
  const threshold = rule.threshold ?? 50000;
  deals.forEach((d) => {
    if (d.stage === 'closed-won' || d.stage === 'closed-lost') return;
    const key = `rule:${rule.id}:deal-amount:/sales/${d.id}`;
    if (d.amount > threshold && !fired.has(key) && !fired.has(`rule-any:/sales/${d.id}`)) {
      fired.add(key);
      addAlert({
        type: 'deal-overdue',
        severity: rule.severity,
        title: `High-value deal: ${d.name}`,
        message: `Deal amount $${d.amount.toLocaleString()} exceeds your $${threshold.toLocaleString()} threshold.`,
        href: `/sales/${d.id}`,
      });
    }
  });
}

function checkContactMissing(
  rule: AlertRule,
  contacts: { id: string; name: string; stale?: boolean }[],
  fired: Set<string>,
  addAlert: AddAlertFn,
) {
  const stale = contacts.filter((c) => c.stale);
  const key = `rule:${rule.id}:contact-missing:batch:${Math.floor(stale.length / 2)}`;
  if (stale.length > 0 && !fired.has(key)) {
    fired.add(key);
    addAlert({
      type: 'contact-incomplete',
      severity: rule.severity,
      title: `${stale.length} contact${stale.length > 1 ? 's' : ''} missing key info`,
      message: `Triggered by your "${rule.name}" rule. Review incomplete profiles.`,
      href: '/contacts',
    });
  }
}

function checkDocumentExpiring(
  rule: AlertRule,
  documents: { id: string; name: string; expiresAt?: string }[],
  now: number,
  fired: Set<string>,
  addAlert: AddAlertFn,
) {
  const threshold = rule.threshold ?? 30;
  documents.forEach((doc) => {
    if (!doc.expiresAt) return;
    const daysUntilExpiry = (new Date(doc.expiresAt).getTime() - now) / (1000 * 60 * 60 * 24);
    const key = `rule:${rule.id}:doc-expiring:${doc.id}`;
    if (daysUntilExpiry > 0 && daysUntilExpiry <= threshold && !fired.has(key)) {
      fired.add(key);
      addAlert({
        type: 'document-expiring',
        severity: rule.severity,
        title: `${doc.name} expires in ${Math.ceil(daysUntilExpiry)} days`,
        message: `Triggered by your "${rule.name}" rule. Review and renew if needed.`,
        href: '/documents',
      });
    }
  });
}
