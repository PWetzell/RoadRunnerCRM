/**
 * Curated Phosphor icon catalog for the widget icon picker.
 *
 * Phosphor ships ~9,000 icons. We don't need all of them for a dashboard
 * configurator — this is a focused ~110-icon shortlist that covers common
 * CRM / B2B / productivity contexts. Each entry has tags so users can
 * search by concept ("money", "chart", "people") not just by name.
 *
 * To add more icons: import them from '@phosphor-icons/react' and add a
 * new entry here. Keep the list curated — dumping all 9k icons in would
 * balloon the bundle.
 */

import {
  Handbag, Briefcase, Folder, Target, TrendUp, TrendDown, ChartLineUp, ChartLine,
  ChartBar, ChartPieSlice, ChartDonut, CurrencyDollar, CurrencyCircleDollar, Coin,
  Trophy, Medal, Star, CheckCircle, XCircle, Warning, WarningCircle, Info, Clock,
  Hourglass, UsersThree, Users, User, UserCircle, AddressBook, IdentificationCard,
  Envelope, Phone, Chat, Bell, Sparkle, Lightning, Robot, Brain, MagicWand, Heart,
  Fire, Rocket, ListBullets, ListChecks, CheckSquare, Circle, Question, House,
  Buildings, Storefront, Package, Cube, Gear, Calendar, CalendarCheck, Flag, MapPin,
  MapTrifold, Compass, Globe, Suitcase, Stack, Books, Note, NotePencil, PencilSimple, File,
  FileText, FilePdf, Image, Camera, Video, MusicNote, Tag, Bookmark, Plus, Check,
  ArrowRight, ArrowsClockwise, Shuffle, Database, Cloud, Hash, Lock, Key, ShieldCheck,
  Kanban, GridFour, SquaresFour, Handshake, Gift, PresentationChart, PlayCircle, Eye,
  MagnifyingGlass, Funnel, DotsSixVertical, Palette, PaintBrush, Swatches, Wrench,
  Wallet, Receipt, Bank, ChartBarHorizontal, TreeStructure, GitBranch, ListPlus,
  ClipboardText, BookOpen,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

export interface IconEntry {
  /** Canonical name used in WidgetConfig.iconName — matches the Phosphor component name. */
  name: string;
  Component: Icon;
  /** Tags used for search (case-insensitive match). Name is implicitly searchable. */
  tags: string[];
}

export const ICONS: IconEntry[] = [
  // Commerce / money
  { name: 'Handbag',            Component: Handbag,            tags: ['deal', 'bag', 'shopping', 'commerce', 'sales'] },
  { name: 'Briefcase',          Component: Briefcase,          tags: ['work', 'business', 'case', 'job'] },
  { name: 'CurrencyDollar',     Component: CurrencyDollar,     tags: ['money', 'dollar', 'cash', 'finance'] },
  { name: 'CurrencyCircleDollar', Component: CurrencyCircleDollar, tags: ['money', 'dollar', 'coin', 'finance'] },
  { name: 'Coin',               Component: Coin,               tags: ['money', 'coin', 'cash'] },
  { name: 'Wallet',             Component: Wallet,             tags: ['money', 'wallet', 'payment'] },
  { name: 'Receipt',            Component: Receipt,            tags: ['receipt', 'payment', 'invoice', 'transaction'] },
  { name: 'Bank',               Component: Bank,               tags: ['bank', 'finance', 'institution'] },

  // Trends / charts
  { name: 'TrendUp',            Component: TrendUp,            tags: ['up', 'growth', 'trend', 'increase'] },
  { name: 'TrendDown',          Component: TrendDown,          tags: ['down', 'decline', 'trend', 'decrease'] },
  { name: 'ChartLineUp',        Component: ChartLineUp,        tags: ['chart', 'line', 'up', 'growth', 'trend'] },
  { name: 'ChartLine',          Component: ChartLine,          tags: ['chart', 'line', 'graph'] },
  { name: 'ChartBar',           Component: ChartBar,           tags: ['chart', 'bar', 'report'] },
  { name: 'ChartBarHorizontal', Component: ChartBarHorizontal, tags: ['chart', 'bar', 'horizontal', 'report'] },
  { name: 'ChartPieSlice',      Component: ChartPieSlice,      tags: ['chart', 'pie', 'slice'] },
  { name: 'ChartDonut',         Component: ChartDonut,         tags: ['chart', 'donut', 'pie'] },
  { name: 'PresentationChart',  Component: PresentationChart,  tags: ['chart', 'presentation', 'report'] },

  // Status / awards
  { name: 'Trophy',             Component: Trophy,             tags: ['win', 'award', 'trophy', 'success'] },
  { name: 'Medal',              Component: Medal,              tags: ['award', 'medal', 'achievement'] },
  { name: 'Star',               Component: Star,               tags: ['favorite', 'star', 'important'] },
  { name: 'CheckCircle',        Component: CheckCircle,        tags: ['check', 'done', 'complete', 'success'] },
  { name: 'XCircle',            Component: XCircle,            tags: ['x', 'cancel', 'fail', 'error'] },
  { name: 'Warning',            Component: Warning,            tags: ['warning', 'alert', 'attention'] },
  { name: 'WarningCircle',      Component: WarningCircle,      tags: ['warning', 'alert', 'error'] },
  { name: 'Info',               Component: Info,               tags: ['info', 'information', 'help'] },
  { name: 'Question',           Component: Question,           tags: ['question', 'help', 'faq'] },

  // Time
  { name: 'Clock',              Component: Clock,              tags: ['clock', 'time', 'schedule'] },
  { name: 'Hourglass',          Component: Hourglass,          tags: ['time', 'hourglass', 'waiting', 'stalled'] },
  { name: 'Calendar',           Component: Calendar,           tags: ['calendar', 'date', 'schedule'] },
  { name: 'CalendarCheck',      Component: CalendarCheck,      tags: ['calendar', 'done', 'scheduled'] },

  // People
  { name: 'User',               Component: User,               tags: ['person', 'user', 'contact'] },
  { name: 'UserCircle',         Component: UserCircle,         tags: ['person', 'user', 'profile'] },
  { name: 'Users',              Component: Users,              tags: ['people', 'users', 'team'] },
  { name: 'UsersThree',         Component: UsersThree,         tags: ['people', 'team', 'group'] },
  { name: 'AddressBook',        Component: AddressBook,        tags: ['contacts', 'address', 'book'] },
  { name: 'IdentificationCard', Component: IdentificationCard, tags: ['id', 'identity', 'card', 'badge'] },
  { name: 'Handshake',          Component: Handshake,          tags: ['handshake', 'deal', 'partnership'] },

  // Communication
  { name: 'Envelope',           Component: Envelope,           tags: ['email', 'mail', 'message'] },
  { name: 'Phone',              Component: Phone,              tags: ['phone', 'call'] },
  { name: 'Chat',               Component: Chat,               tags: ['chat', 'message', 'conversation'] },
  { name: 'Bell',               Component: Bell,               tags: ['notification', 'bell', 'alert'] },

  // AI / magic
  { name: 'Sparkle',            Component: Sparkle,            tags: ['ai', 'magic', 'sparkle', 'smart'] },
  { name: 'Lightning',          Component: Lightning,          tags: ['fast', 'lightning', 'bolt', 'energy'] },
  { name: 'Robot',              Component: Robot,              tags: ['robot', 'ai', 'automation'] },
  { name: 'Brain',              Component: Brain,              tags: ['brain', 'ai', 'thinking'] },
  { name: 'MagicWand',          Component: MagicWand,          tags: ['magic', 'wand', 'ai'] },

  // Misc state
  { name: 'Heart',              Component: Heart,              tags: ['love', 'favorite', 'heart'] },
  { name: 'Fire',               Component: Fire,               tags: ['hot', 'fire', 'trending'] },
  { name: 'Rocket',             Component: Rocket,             tags: ['launch', 'rocket', 'fast'] },
  { name: 'Gift',               Component: Gift,               tags: ['gift', 'present', 'reward'] },
  { name: 'Eye',                Component: Eye,                tags: ['view', 'eye', 'watch'] },

  // Lists / layout
  { name: 'ListBullets',        Component: ListBullets,        tags: ['list', 'bullets'] },
  { name: 'ListChecks',         Component: ListChecks,         tags: ['list', 'checklist', 'todo'] },
  { name: 'ListPlus',           Component: ListPlus,           tags: ['list', 'add'] },
  { name: 'CheckSquare',        Component: CheckSquare,        tags: ['todo', 'check', 'checklist'] },
  { name: 'ClipboardText',      Component: ClipboardText,      tags: ['clipboard', 'notes', 'list'] },
  { name: 'Circle',             Component: Circle,             tags: ['circle', 'dot'] },
  { name: 'Kanban',             Component: Kanban,             tags: ['kanban', 'board', 'columns'] },
  { name: 'GridFour',           Component: GridFour,           tags: ['grid', 'layout'] },
  { name: 'SquaresFour',        Component: SquaresFour,        tags: ['grid', 'cards', 'layout'] },
  { name: 'Funnel',             Component: Funnel,             tags: ['filter', 'funnel', 'pipeline'] },

  // Places / structure
  { name: 'House',              Component: House,              tags: ['home', 'house'] },
  { name: 'Buildings',          Component: Buildings,          tags: ['company', 'building', 'org'] },
  { name: 'Storefront',         Component: Storefront,         tags: ['store', 'shop', 'retail'] },
  { name: 'MapPin',             Component: MapPin,             tags: ['location', 'pin', 'map'] },
  { name: 'MapTrifold',         Component: MapTrifold,         tags: ['map', 'location'] },
  { name: 'Compass',            Component: Compass,            tags: ['compass', 'direction'] },
  { name: 'Globe',              Component: Globe,              tags: ['world', 'global', 'globe'] },
  { name: 'Flag',               Component: Flag,               tags: ['flag', 'milestone', 'marker'] },
  { name: 'Target',             Component: Target,             tags: ['target', 'goal', 'bullseye'] },
  { name: 'TreeStructure',      Component: TreeStructure,      tags: ['tree', 'hierarchy', 'structure'] },
  { name: 'GitBranch',          Component: GitBranch,          tags: ['branch', 'git', 'flow'] },

  // Objects
  { name: 'Package',            Component: Package,            tags: ['package', 'product', 'box'] },
  { name: 'Cube',               Component: Cube,               tags: ['cube', 'object', '3d'] },
  { name: 'Suitcase',           Component: Suitcase,           tags: ['suitcase', 'travel', 'business'] },
  { name: 'Stack',              Component: Stack,              tags: ['stack', 'layers'] },
  { name: 'Folder',             Component: Folder,             tags: ['folder', 'file'] },
  { name: 'Books',              Component: Books,              tags: ['library', 'books'] },
  { name: 'BookOpen',           Component: BookOpen,           tags: ['book', 'read'] },
  { name: 'File',               Component: File,               tags: ['file', 'document'] },
  { name: 'FileText',           Component: FileText,           tags: ['document', 'text'] },
  { name: 'FilePdf',            Component: FilePdf,            tags: ['pdf', 'document'] },
  { name: 'Note',               Component: Note,               tags: ['note', 'memo'] },
  { name: 'NotePencil',         Component: NotePencil,         tags: ['note', 'edit'] },
  { name: 'PencilSimple',       Component: PencilSimple,       tags: ['edit', 'pencil'] },
  { name: 'Image',              Component: Image,              tags: ['image', 'photo', 'picture'] },
  { name: 'Camera',             Component: Camera,             tags: ['camera', 'photo'] },
  { name: 'Video',              Component: Video,              tags: ['video', 'media'] },
  { name: 'MusicNote',          Component: MusicNote,          tags: ['music', 'audio'] },
  { name: 'Tag',                Component: Tag,                tags: ['tag', 'label'] },
  { name: 'Bookmark',           Component: Bookmark,           tags: ['bookmark', 'saved'] },

  // UI / actions
  { name: 'Plus',               Component: Plus,               tags: ['add', 'new', 'plus'] },
  { name: 'Check',              Component: Check,              tags: ['check', 'done'] },
  { name: 'ArrowRight',         Component: ArrowRight,         tags: ['arrow', 'next'] },
  { name: 'ArrowsClockwise',    Component: ArrowsClockwise,    tags: ['refresh', 'reload'] },
  { name: 'Shuffle',            Component: Shuffle,            tags: ['shuffle', 'random'] },
  { name: 'MagnifyingGlass',    Component: MagnifyingGlass,    tags: ['search', 'find', 'magnify'] },
  { name: 'Wrench',             Component: Wrench,             tags: ['tools', 'wrench', 'fix'] },
  { name: 'Gear',               Component: Gear,               tags: ['settings', 'gear', 'config'] },
  { name: 'Palette',            Component: Palette,            tags: ['palette', 'color', 'design'] },
  { name: 'PaintBrush',         Component: PaintBrush,         tags: ['paint', 'brush', 'color'] },
  { name: 'Swatches',           Component: Swatches,           tags: ['swatches', 'color', 'palette'] },
  { name: 'PlayCircle',         Component: PlayCircle,         tags: ['play', 'start'] },
  { name: 'DotsSixVertical',    Component: DotsSixVertical,    tags: ['drag', 'handle', 'reorder'] },

  // Data / tech
  { name: 'Database',           Component: Database,           tags: ['database', 'data', 'storage'] },
  { name: 'Cloud',              Component: Cloud,              tags: ['cloud', 'storage'] },
  { name: 'Hash',               Component: Hash,               tags: ['hash', 'number', 'id'] },
  { name: 'Lock',               Component: Lock,               tags: ['lock', 'secure', 'private'] },
  { name: 'Key',                Component: Key,                tags: ['key', 'access'] },
  { name: 'ShieldCheck',        Component: ShieldCheck,        tags: ['security', 'shield', 'protected'] },
];

const ICON_MAP: Record<string, IconEntry> = ICONS.reduce((acc, i) => {
  acc[i.name] = i;
  return acc;
}, {} as Record<string, IconEntry>);

export function getIcon(name: string | undefined): Icon | null {
  if (!name) return null;
  return ICON_MAP[name]?.Component ?? null;
}

/** Case-insensitive search across name + tags. */
export function searchIcons(query: string, limit = 60): IconEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return ICONS.slice(0, limit);
  const matches = ICONS.filter((i) =>
    i.name.toLowerCase().includes(q) || i.tags.some((t) => t.includes(q)),
  );
  return matches.slice(0, limit);
}
