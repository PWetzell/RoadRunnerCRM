'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDashboardStore } from '@/stores/dashboard-store';
import { WidgetConfig } from '@/types/dashboard';
import KPIWidget from './widgets/KPIWidget';
import ListWidget from './widgets/ListWidget';
import PipelineChartWidget from './widgets/PipelineChartWidget';
import DealsBySourceWidget from './widgets/DealsBySourceWidget';
import TodoWidget from './widgets/TodoWidget';
import AISuggestionsWidget from './widgets/AISuggestionsWidget';
import CustomReportWidget from './widgets/CustomReportWidget';

function renderWidget(widget: WidgetConfig) {
  switch (widget.type) {
    case 'kpi-open-deals':
    case 'kpi-pipeline-value':
    case 'kpi-won-this-month':
    case 'kpi-stalled-deals':
    case 'kpi-active-contacts':
    case 'kpi-incomplete-contacts':
      return <KPIWidget widget={widget} />;
    case 'list-recent-deals':
    case 'list-recent-contacts':
    case 'list-stalled-deals':
      return <ListWidget widget={widget} />;
    case 'chart-pipeline-by-stage':
      return <PipelineChartWidget widget={widget} />;
    case 'chart-deals-by-source':
      return <DealsBySourceWidget widget={widget} />;
    case 'todo':
      return <TodoWidget widget={widget} />;
    case 'ai-suggestions':
      return <AISuggestionsWidget widget={widget} />;
    case 'custom-report':
      return <CustomReportWidget widget={widget} />;
    default:
      return null;
  }
}

/**
 * The main widget canvas. Uses CSS grid (4 cols on md+, auto rows at 160px)
 * and dnd-kit sortable for reorder. Drag is always available — each widget
 * has its own settings popover; there is no global edit mode.
 */
export default function DashboardGrid() {
  const activeView = useDashboardStore((s) => s.views.find((v) => v.id === s.activeViewId));
  const reorderWidgets = useDashboardStore((s) => s.reorderWidgets);

  // SSR guard to avoid dnd-kit hydration warnings
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const widgets = activeView?.widgets || [];

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    reorderWidgets(String(active.id), String(over.id));
  }

  if (!activeView) {
    return (
      <div className="text-[12px] italic text-[var(--text-tertiary)] p-5">No active view. Pick one from the toolbar.</div>
    );
  }

  return (
    <div data-tour="dashboard-grid" className="grid grid-cols-1 md:grid-cols-4 gap-3 auto-rows-[160px]">
      {mounted ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            {widgets.map((w) => (
              <div key={w.id} className="contents">
                {renderWidget(w)}
              </div>
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        // SSR-rendered static version (no dnd)
        widgets.map((w) => (
          <div key={w.id} className="contents">
            {renderWidget(w)}
          </div>
        ))
      )}

      {widgets.length === 0 && (
        <div className="col-span-full bg-[var(--surface-card)] border border-dashed border-[var(--border)] rounded-xl p-10 text-center">
          <p className="text-[13px] font-bold text-[var(--text-secondary)] mb-1">This view is empty</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Click &quot;Add widget&quot; above to start building your layout.
          </p>
        </div>
      )}
    </div>
  );
}
