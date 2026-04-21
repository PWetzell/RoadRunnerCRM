'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
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

interface Props {
  widgets: WidgetConfig[];
  onReorder: (fromId: string, toId: string) => void;
}

/**
 * Reusable widget grid. Same visual + drag behavior as the main Dashboard
 * grid, but accepts widgets + reorder handler as props so it can be used
 * by Reporting and Admin dashboards with their own stores.
 */
export default function GenericWidgetGrid({ widgets, onReorder }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  return (
    <div data-tour="widget-grid" className="grid grid-cols-1 md:grid-cols-4 gap-3 auto-rows-[160px]">
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
        widgets.map((w) => (
          <div key={w.id} className="contents">
            {renderWidget(w)}
          </div>
        ))
      )}
      {widgets.length === 0 && (
        <div className="col-span-full bg-[var(--surface-card)] border border-dashed border-[var(--border)] rounded-xl p-10 text-center">
          <p className="text-[13px] font-bold text-[var(--text-secondary)] mb-1">No widgets</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">Add widgets to build this view.</p>
        </div>
      )}
    </div>
  );
}
