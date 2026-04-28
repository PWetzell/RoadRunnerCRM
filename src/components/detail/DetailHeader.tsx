'use client';

import { useState } from 'react';
import { Globe, LinkedinLogo, TwitterLogo, FacebookLogo, Star, Bookmark, Buildings, User, Warning, CheckCircle, Sparkle, EyeSlash, Plus, X as XIcon, MagnifyingGlass, Tag } from '@phosphor-icons/react';
import ListMembershipPill from '@/components/lists/ListMembershipPill';
import { ContactWithEntries, ContactTag } from '@/types/contact';
import { computeMissingFields } from '@/lib/contact-completeness';
import { useContactStore } from '@/stores/contact-store';
import { useListStore, getListsForEntity } from '@/stores/list-store';
import { initials, getAvatarColor, fmtDate } from '@/lib/utils';
import SaveToListPicker from '@/components/lists/SaveToListPicker';
import { useMemo } from 'react';
import { toast } from '@/lib/toast';

interface DetailHeaderProps {
  contact: ContactWithEntries;
  onBack: () => void;
}

const CONTACT_TAG_CATEGORIES = [
  { name: 'CRM', color: '#1955A6', tags: ['Contacts Tag', 'VIP', 'Follow Up', 'Do Not Contact'] as ContactTag[] },
  { name: 'Sales', color: '#DC2626', tags: ['Sales Tag', 'Prospect', 'Client'] as ContactTag[] },
  { name: 'HR', color: '#059669', tags: ['Recruiting', 'Partner', 'Vendor'] as ContactTag[] },
];

function getContactTagColor(tag: string) {
  if (tag === 'Contacts Tag' || tag === 'VIP' || tag === 'Follow Up') return { bg: 'var(--brand-bg)', text: 'var(--brand-primary)', border: 'var(--brand-primary)' };
  if (tag === 'Sales Tag' || tag === 'Prospect' || tag === 'Client') return { bg: 'var(--danger-bg)', text: 'var(--danger)', border: 'var(--danger)' };
  if (tag === 'Recruiting' || tag === 'Partner' || tag === 'Vendor') return { bg: 'var(--success-bg)', text: 'var(--success)', border: 'var(--success)' };
  if (tag === 'Do Not Contact') return { bg: 'var(--warning-bg)', text: 'var(--warning)', border: 'var(--warning)' };
  return { bg: 'var(--surface-raised)', text: 'var(--text-secondary)', border: 'var(--border)' };
}

export default function DetailHeader({ contact: c, onBack }: DetailHeaderProps) {
  const isOrg = c.type === 'org';
  const updateContact = useContactStore((s) => s.updateContact);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  // Lists
  const lists = useListStore((s) => s.lists);
  const memberships = useListStore((s) => s.memberships);
  const pickerOpen = useListStore((s) => s.pickerOpen);
  const pickerEntityId = useListStore((s) => s.pickerEntityId);
  const openPicker = useListStore((s) => s.openPicker);
  const closePicker = useListStore((s) => s.closePicker);
  const openManage = useListStore((s) => s.openManage);
  const toggleFavorite = useListStore((s) => s.toggleFavorite);
  const entityLists = useMemo(() => getListsForEntity(lists, memberships, c.id, 'contact'), [lists, memberships, c.id]);
  const isInAnyList = entityLists.length > 0;
  const isFav = useMemo(
    () => memberships.some((m) => m.listId === 'list-contacts-favorites' && m.entityId === c.id),
    [memberships, c.id],
  );
  const showPicker = pickerOpen && pickerEntityId === c.id;

  // Extract social links from entries
  const websites = c.entries?.websites || [];
  const primaryWebsite = websites.find((w) => w.type === 'Primary')?.value || ('website' in c ? c.website : '') || '';
  const linkedinUrl = websites.find((w) => w.type === 'LinkedIn')?.value || '';
  const twitterUrl = websites.find((w) => w.type === 'Twitter' || w.type === 'Social')?.value || '';
  const facebookUrl = websites.find((w) => w.type === 'Facebook')?.value || '';

  // Primary phone/email from entries
  const primaryPhone = c.entries?.phones?.find((p) => p.primary)?.value || ('phone' in c ? c.phone : '') || '';
  const primaryEmail = c.entries?.emails?.find((e) => e.primary)?.value || ('email' in c ? c.email : '') || '';

  const contactTags = c.tags || [];

  const toggleTag = (tag: ContactTag) => {
    const wasTagged = contactTags.includes(tag);
    const updated = wasTagged ? contactTags.filter((t) => t !== tag) : [...contactTags, tag];
    updateContact(c.id, { tags: updated });
    toast.info(wasTagged ? `Removed tag “${tag}”` : `Added tag “${tag}”`);
  };

  const removeTag = (tag: ContactTag) => {
    updateContact(c.id, { tags: contactTags.filter((t) => t !== tag) });
    toast.info(`Removed tag “${tag}”`);
  };

  return (
    <div className="bg-[var(--surface-card)] border-b border-[var(--border)] px-6" style={{ paddingTop: 'var(--detail-header-py, 12px)', paddingBottom: 'calc(var(--detail-header-py, 12px) - 3px)' }}>
      {/* Breadcrumb */}
      <div className="text-[10px] text-[var(--text-tertiary)] mb-2">
        <button onClick={onBack} className="text-[var(--brand-primary)] hover:underline bg-transparent border-none cursor-pointer font-inherit">
          Contacts
        </button>
        <span> › {c.name}</span>
      </div>

      {/* Hero */}
      <div className="flex items-start gap-3">
        <div
          className="w-[40px] h-[40px] flex items-center justify-center text-[13px] font-extrabold text-white flex-shrink-0"
          style={{
            background: getAvatarColor(c.id, c.avatarColor),
            borderRadius: isOrg ? 'var(--radius-lg)' : 'var(--radius-full)',
          }}
        >
          {initials(c.name)}
        </div>

        <div className="flex-1">
          {/* Name + Privacy Badge */}
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-extrabold text-[var(--text-primary)] leading-tight">{c.name}</h2>
            {c.isPrivate && (
              <span className="text-[var(--danger)]" title="Private Contact">
                <EyeSlash size={20} weight="bold" />
              </span>
            )}
          </div>

          {/* Detail Metadata Line */}
          <div className="text-[9px] text-[var(--text-tertiary)] mt-1 flex items-center gap-1 flex-wrap">
            {c.assignedTo && (
              <>
                <span>Assigned To</span>
                <span className="font-bold text-[var(--text-secondary)]">{c.assignedTo}</span>
                <span className="mx-1">·</span>
              </>
            )}
            {isOrg && 'industry' in c && c.industry && (
              <>
                <span>Title</span>
                <span className="font-bold text-[var(--text-secondary)]">{c.industry}</span>
                <span className="mx-1">·</span>
              </>
            )}
            {!isOrg && 'title' in c && c.title && (
              <>
                <span>Title</span>
                <span className="font-bold text-[var(--text-secondary)]">{c.title}</span>
                <span className="mx-1">·</span>
              </>
            )}
            <span>Updated</span>
            <span suppressHydrationWarning className="font-bold text-[var(--text-secondary)]">{fmtDate(c.lastUpdated)}</span>
            {primaryPhone && (
              <>
                <span className="mx-1">·</span>
                <span>Phone</span>
                <span className="font-bold text-[var(--text-secondary)]">{primaryPhone}</span>
              </>
            )}
            {primaryEmail && (
              <>
                <span className="mx-1">·</span>
                <span>Email</span>
                <a href={`mailto:${primaryEmail}`} className="font-bold text-[var(--brand-primary)] no-underline hover:underline">{primaryEmail}</a>
              </>
            )}
          </div>

          {/* All Tags — status + contact tags on one row */}
          <div className="flex gap-1.5 items-center mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
              isOrg ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]' : 'bg-[var(--brand-bg)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
            }`}>
              {isOrg ? <Buildings size={12} /> : <User size={12} />}
              {isOrg ? 'Org' : 'Person'}
            </span>
            {(() => {
              // Completeness now derived from actual required-field
              // presence (see computeMissingFields above), NOT from the
              // hand-set `c.stale` flag which only tracks "this record
              // hasn't been refreshed in a while" and was misleadingly
              // labelling half-empty records as Complete.
              const missing = computeMissingFields(c);
              if (missing.length === 0) {
                return (
                  <span
                    title="All required fields are filled in"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]"
                  >
                    <CheckCircle size={12} /> Complete
                  </span>
                );
              }
              return (
                <span
                  title={`Missing: ${missing.join(', ')}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]"
                >
                  <Warning size={12} /> Incomplete · {missing.length} missing
                </span>
              );
            })()}
            {c.aiStatus === 'new' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--ai-bg)] text-[var(--ai-dark)] border border-[var(--ai-border)]">
                <Sparkle size={12} weight="duotone" /> AI
              </span>
            )}

            {/* List memberships — shows which list(s) this contact is in */}
            {isInAnyList && <ListMembershipPill lists={entityLists} />}

            {/* Contact Tags (removable) — same row */}
            {contactTags.map((tag) => {
              const colors = getContactTagColor(tag);
              return (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                  <Tag size={11} weight="bold" />
                  {tag}
                  <button onClick={() => removeTag(tag)} className="bg-transparent border-none cursor-pointer p-0 flex" style={{ color: colors.text }}>
                    <XIcon size={10} />
                  </button>
                </span>
              );
            })}

            {/* Add Tags */}
            <div className="relative">
              <button
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--brand-primary)] bg-transparent border-none cursor-pointer"
              >
                <span className="w-4 h-4 rounded-full bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                  <Plus size={10} weight="bold" className="text-white" />
                </span>
                Add Tags
              </button>

              {showTagPicker && (
                <div className="absolute left-0 top-7 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-lg z-50 w-[220px] animate-[fadeUp_0.15s_ease-out]">
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[8.5px] font-bold text-[var(--text-tertiary)] uppercase">Add Tags</span>
                      <button onClick={() => { setShowTagPicker(false); setTagSearch(''); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer p-0.5">
                        <XIcon size={12} />
                      </button>
                    </div>
                    <div className="relative mb-2">
                      <MagnifyingGlass size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                      <input
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        placeholder="Filter by text"
                        className="w-full h-7 pl-6 pr-2 text-[9px] bg-[var(--surface-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {CONTACT_TAG_CATEGORIES.map((cat) => {
                        const filteredTags = cat.tags.filter((t) => !tagSearch || t.toLowerCase().includes(tagSearch.toLowerCase()));
                        if (filteredTags.length === 0) return null;
                        return (
                          <div key={cat.name}>
                            <div className="text-[8.5px] font-bold uppercase tracking-wider px-1 py-1 flex items-center gap-1" style={{ color: cat.color }}>
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: cat.color }} /> {cat.name}
                            </div>
                            {filteredTags.map((tag) => (
                              <label key={tag} className="flex items-center gap-2 px-1 py-1 text-[9.5px] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={contactTags.includes(tag)}
                                  onChange={() => toggleTag(tag)}
                                  className="w-3.5 h-3.5 rounded accent-[var(--brand-primary)]"
                                />
                                {tag}
                              </label>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="border-t border-[var(--border)] px-2 py-1.5">
                    <button
                      onClick={() => { setShowTagPicker(false); setTagSearch(''); }}
                      className="text-[9px] font-semibold text-[var(--text-tertiary)] flex items-center gap-1 bg-transparent border-none cursor-pointer hover:text-[var(--danger)]"
                    >
                      <XIcon size={12} /> Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Social + Actions */}
        <div className="flex items-center gap-3">
          {primaryWebsite && (
            <a href={primaryWebsite.startsWith('http') ? primaryWebsite : `https://${primaryWebsite}`} target="_blank" rel="noopener noreferrer" className="no-underline" title={primaryWebsite}>
              <Globe size={24} className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors" />
            </a>
          )}
          {linkedinUrl && (
            <a href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="no-underline" title="LinkedIn">
              <span className="w-6 h-6 rounded-full bg-[#0A66C2] flex items-center justify-center hover:opacity-80 transition-opacity">
                <LinkedinLogo size={14} weight="fill" className="text-white" />
              </span>
            </a>
          )}
          {twitterUrl && (
            <a href={twitterUrl.startsWith('http') ? twitterUrl : `https://${twitterUrl}`} target="_blank" rel="noopener noreferrer" className="no-underline" title="Twitter">
              <TwitterLogo size={24} weight="fill" className="text-[#1DA1F2] hover:opacity-80 transition-opacity" />
            </a>
          )}
          {facebookUrl && (
            <a href={facebookUrl.startsWith('http') ? facebookUrl : `https://${facebookUrl}`} target="_blank" rel="noopener noreferrer" className="no-underline" title="Facebook">
              <FacebookLogo size={24} weight="fill" className="text-[#1877F2] hover:opacity-80 transition-opacity" />
            </a>
          )}
          {/* Favorite — standalone star toggle */}
          <button
            data-tour="detail-favorite-star"
            onClick={() => toggleFavorite(c.id, 'contact')}
            title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
            aria-label={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
            aria-pressed={isFav}
            className="relative w-6 h-6 rounded-full bg-transparent border-none cursor-pointer flex items-center justify-center hover:bg-[var(--warning-bg)]"
          >
            <Star
              size={22}
              weight={isFav ? 'fill' : 'regular'}
              className={isFav ? 'text-[var(--warning)]' : 'text-[var(--text-tertiary)] hover:text-[var(--warning)] transition-colors'}
            />
          </button>
          {/* Save to list — standalone bookmark, in a relative wrapper so the picker anchors under it */}
          <div className="relative" data-tour="detail-save-to-list">
            <button
              onClick={() => showPicker ? closePicker() : openPicker(c.id, 'contact')}
              title={isInAnyList ? `Save to list (in ${entityLists.length} list${entityLists.length === 1 ? '' : 's'})` : 'Save to list'}
              aria-label="Save to list"
              aria-expanded={showPicker}
              className="w-6 h-6 rounded-full bg-transparent border-none cursor-pointer flex items-center justify-center hover:bg-[var(--brand-primary-tint)]"
            >
              <Bookmark
                size={22}
                weight={isInAnyList ? 'fill' : 'regular'}
                className={isInAnyList ? 'text-[var(--brand-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors'}
              />
            </button>
            {showPicker && (
              <SaveToListPicker
                entityId={c.id}
                entityType="contact"
                onClose={closePicker}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
