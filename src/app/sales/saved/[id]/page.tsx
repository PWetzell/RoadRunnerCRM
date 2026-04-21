'use client';

import { use } from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowRight, Plus } from '@phosphor-icons/react';
import Topbar from '@/components/layout/Topbar';
import { useSalesStore } from '@/stores/sales-store';
import StagePill from '@/components/sales/StagePill';

export default function DealSavedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const deal = useSalesStore((s) => s.getDeal(id));

  return (
    <>
      <Topbar title="Lead created" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[560px] mx-auto px-6 py-10">
          <div className="bg-[var(--surface-card)] border border-[var(--success)] rounded-xl overflow-hidden">
            <div className="px-6 py-6 text-center border-b border-[var(--border)]">
              <div className="w-14 h-14 rounded-full bg-[var(--success-bg)] flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={28} weight="fill" className="text-[var(--success)]" />
              </div>
              <h1 className="text-[18px] font-extrabold text-[var(--text-primary)] mb-1">Lead created</h1>
              <p className="text-[12px] text-[var(--text-tertiary)]">Your new lead is in the pipeline.</p>
            </div>
            {deal && (
              <div className="px-6 py-4">
                <div className="text-[14px] font-bold text-[var(--text-primary)] mb-2">{deal.name}</div>
                <div className="flex items-center gap-2 mb-1"><StagePill stage={deal.stage} /></div>
              </div>
            )}
            <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-bg)] flex items-center justify-between gap-2">
              <Link href="/sales/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-md no-underline hover:bg-[var(--surface-raised)]">
                <Plus size={12} weight="bold" /> Create another
              </Link>
              {deal && (
                <Link href={`/sales/${deal.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-[var(--brand-primary)] border-none rounded-md no-underline hover:opacity-90">
                  Open deal <ArrowRight size={12} weight="bold" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
