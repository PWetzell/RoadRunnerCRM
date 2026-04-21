'use client';

import { useRouter } from 'next/navigation';
import { Plus, Minus, ArrowsOut, TreeStructure, MagnifyingGlass } from '@phosphor-icons/react';
import { ContactWithEntries } from '@/types/contact';
import { useContactStore } from '@/stores/contact-store';
import { initials, getAvatarColor } from '@/lib/utils';

interface OrgChartTabProps {
  contact: ContactWithEntries;
}

export default function OrgChartTab({ contact: c }: OrgChartTabProps) {
  const router = useRouter();
  const contacts = useContactStore((s) => s.contacts);
  const isOrg = c.type === 'org';
  const people = isOrg ? contacts.filter((p) => p.type === 'person' && 'orgId' in p && p.orgId === c.id) : [];
  const org = !isOrg && 'orgId' in c && c.orgId ? contacts.find((o) => o.id === c.orgId) : null;
  const orgPeople = org ? contacts.filter((p) => p.type === 'person' && 'orgId' in p && p.orgId === org.id) : [];

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl min-h-[500px]">
      {/* Toolbar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)]">
        <span className="text-base font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <TreeStructure size={18} /> Organization Chart
        </span>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <MagnifyingGlass size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input placeholder="Search organization..." className="h-8 pl-7 pr-3 w-48 text-xs bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]" />
          </div>
          <button className="px-2 py-1 text-xs border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-secondary)] bg-transparent cursor-pointer"><Minus size={14} /></button>
          <button className="px-2 py-1 text-xs border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-secondary)] bg-transparent cursor-pointer"><ArrowsOut size={14} /></button>
          <button className="px-2 py-1 text-xs border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-secondary)] bg-transparent cursor-pointer"><Plus size={14} /></button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer">
            <span className="w-4 h-4 rounded-full bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
              <Plus size={10} weight="bold" className="text-white" />
            </span>
            Add Contact
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex flex-col items-center py-12 px-8 min-h-[400px]">
        {isOrg ? (
          <OrgTree
            parentNode={
              <ChartNode name={c.name} role={'industry' in c ? c.industry || 'Customer' : 'Customer'} color={getAvatarColor(c.id, c.avatarColor)} isSquare isActive onClick={() => {}} />
            }
            childNodes={people.map((p) => ({
              key: p.id,
              node: (
                <ChartNode
                  key={p.id}
                  name={p.name}
                  role={'title' in p ? p.title || 'Contact' : 'Contact'}
                  color={getAvatarColor(p.id, p.avatarColor)}
                  isActive={false}
                  onClick={() => router.push(`/contacts/${p.id}`)}
                />
              ),
            }))}
            emptyMessage="No people linked to this organization"
          />
        ) : org ? (
          <OrgTree
            parentNode={
              <ChartNode
                name={org.name}
                role={'industry' in org ? org.industry || 'Company' : 'Company'}
                color={getAvatarColor(org.id, org.avatarColor)}
                isSquare
                onClick={() => router.push(`/contacts/${org.id}`)}
              />
            }
            childNodes={orgPeople.map((p) => ({
              key: p.id,
              node: (
                <ChartNode
                  key={p.id}
                  name={p.name}
                  role={'title' in p ? p.title || 'Contact' : 'Contact'}
                  color={getAvatarColor(p.id, p.avatarColor)}
                  isActive={p.id === c.id}
                  onClick={() => router.push(`/contacts/${p.id}`)}
                />
              ),
            }))}
          />
        ) : (
          <ChartNode
            name={c.name}
            role={'title' in c ? c.title || 'Contact' : 'Contact'}
            color={getAvatarColor(c.id, c.avatarColor)}
            isActive
            onClick={() => {}}
          />
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-[var(--border)] flex gap-6 text-[11px] text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px] bg-[var(--success)]" /> Company
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[var(--brand-primary)]" /> Person
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px] border-2 border-[var(--brand-primary)]" /> Current
        </span>
      </div>
    </div>
  );
}

/**
 * OrgTree — renders a parent node with T-shaped connector lines down to children.
 * Uses CSS grid so the horizontal bar spans exactly from the center of the first
 * child to the center of the last child, with a vertical stem from the parent.
 */
function OrgTree({ parentNode, childNodes, emptyMessage }: {
  parentNode: React.ReactNode;
  childNodes: { key: string; node: React.ReactNode }[];
  emptyMessage?: string;
}) {
  const count = childNodes.length;

  if (count === 0) {
    return (
      <div className="flex flex-col items-center">
        {parentNode}
        {emptyMessage && <p className="text-xs text-[var(--text-tertiary)] mt-6">{emptyMessage}</p>}
      </div>
    );
  }

  // Single child — straight continuous vertical line, no horizontal bar
  if (count === 1) {
    return (
      <div className="flex flex-col items-center">
        {parentNode}
        <div className="w-0.5 h-16 bg-[var(--border-strong)]" />
        {childNodes[0].node}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Parent card */}
      {parentNode}

      {/* Vertical line from parent down to the horizontal bar */}
      <div className="w-0.5 h-8 bg-[var(--border-strong)]" />

      {/* Children row with T-connector */}
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(180px, 1fr))`, gap: '0px' }}
      >
        {/* Row 1: horizontal connector bar spanning first-child-center to last-child-center */}
        {childNodes.map((child, i) => (
          <div key={child.key + '-bar'} className="flex justify-center">
            <div
              className="h-0.5 w-full"
              style={{
                background:
                  i === 0
                    ? 'linear-gradient(to right, transparent 50%, var(--border-strong) 50%)'
                    : i === count - 1
                    ? 'linear-gradient(to right, var(--border-strong) 50%, transparent 50%)'
                    : 'var(--border-strong)',
              }}
            />
          </div>
        ))}

        {/* Row 2: vertical drop-lines + child cards */}
        {childNodes.map((child) => (
          <div key={child.key} className="flex flex-col items-center">
            <div className="w-0.5 h-8 bg-[var(--border-strong)]" />
            {child.node}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartNode({ name, role, color, isSquare, isActive, onClick }: {
  name: string; role: string; color: string; isSquare?: boolean; isActive?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 px-5 py-3.5 rounded-xl cursor-pointer transition-all hover:shadow-md border-2 bg-[var(--surface-card)] ${
        isActive
          ? 'border-[var(--brand-primary)] shadow-md'
          : 'border-[var(--border)] hover:border-[var(--brand-primary)]'
      }`}
    >
      <div
        className="w-10 h-10 flex items-center justify-center text-[13px] font-extrabold text-white flex-shrink-0"
        style={{ background: color, borderRadius: isSquare ? '8px' : '50%' }}
      >
        {initials(name)}
      </div>
      <div className="text-left">
        <div className="text-[13px] font-bold text-[var(--text-primary)]">{name}</div>
        <div className="text-[11px] text-[var(--text-tertiary)]">{role}</div>
      </div>
    </button>
  );
}
