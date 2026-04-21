'use client';

import Link from 'next/link';
import { MapPin, User, Buildings, Note, ArrowLeft } from '@phosphor-icons/react';
import { Deal } from '@/types/deal';
import { Contact } from '@/types/contact';
import { initials, getAvatarColor } from '@/lib/utils';
import AINextStepSuggestion from '@/components/sales/ai/AINextStepSuggestion';
import AIDealScoring from '@/components/sales/ai/AIDealScoring';

interface Props {
  deal: Deal;
  person?: Contact;
  org?: Contact;
}

/**
 * Overview tab — at-a-glance summary of the deal. Shows address, activity,
 * related contact, and AI cards.
 */
export default function SalesOverviewTab({ deal, person, org }: Props) {
  // Related-contact varies by lead type: company leads show the primary person,
  // person leads show the current employer (if any).
  const related = deal.type === 'company' ? person : org;
  const relatedKind = deal.type === 'company' ? 'Primary contact' : 'Current company';

  // Choose an address to show (org hq for company, person's org hq for person)
  const addressSource = deal.type === 'company' ? org : org; // org always if available
  const hq = addressSource && addressSource.type === 'org' ? addressSource.hq : undefined;

  return (
    <div className="grid grid-cols-[1fr_360px] gap-4">
      {/* Left column */}
      <div className="flex flex-col gap-4">
        {/* Address */}
        <Card title="Address" icon={<MapPin size={16} weight="duotone" className="text-[var(--brand-primary)]" />}>
          {hq ? (
            <div className="text-[13px] text-[var(--text-primary)]">{hq}</div>
          ) : (
            <div className="text-[12px] text-[var(--text-tertiary)] italic">No address on file</div>
          )}
        </Card>

        {/* Activity */}
        <Card title="Activity" icon={<Note size={16} weight="duotone" className="text-[var(--brand-primary)]" />}>
          {deal.notes ? (
            <div className="text-[13px] text-[var(--text-secondary)] whitespace-pre-wrap">{deal.notes}</div>
          ) : (
            <div className="text-[12px] text-[var(--text-tertiary)] italic">No notes yet</div>
          )}
          {deal.lastCommunication && (
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)]">
              Last communication: <span className="font-bold text-[var(--text-secondary)]">{deal.lastCommunication.type}</span> on <span className="font-bold text-[var(--text-secondary)]">{deal.lastCommunication.date}</span>
            </div>
          )}
        </Card>

        {/* Related contact */}
        {related && (
          <Card
            title={relatedKind}
            icon={related.type === 'person'
              ? <User size={16} weight="duotone" className="text-[var(--brand-primary)]" />
              : <Buildings size={16} weight="duotone" className="text-[var(--brand-primary)]" />
            }
          >
            <Link href={`/contacts/${related.id}`} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--surface-raised)] no-underline">
              <div
                className="w-9 h-9 flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0"
                style={{
                  background: getAvatarColor(related.id, related.avatarColor),
                  borderRadius: related.type === 'person' ? 'var(--radius-full)' : 'var(--radius-sm)',
                }}
              >
                {initials(related.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">{related.name}</div>
                <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                  {related.type === 'person' ? related.title : related.industry}
                </div>
              </div>
              <ArrowLeft size={14} weight="bold" className="text-[var(--text-tertiary)] rotate-180" />
            </Link>
          </Card>
        )}
      </div>

      {/* Right column — AI */}
      <div className="flex flex-col gap-4">
        <AINextStepSuggestion deal={deal} />
        <AIDealScoring source={deal.source} amount={deal.amount} personContactId={deal.personContactId} orgContactId={deal.orgContactId} />
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl">
      <header className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        {icon}
        <span className="text-[13px] font-extrabold text-[var(--text-primary)]">{title}</span>
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}
