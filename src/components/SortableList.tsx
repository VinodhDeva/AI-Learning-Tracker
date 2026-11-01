import type { ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/** One vertical sortable list. Nest freely: each list has its own DndContext, and items drag by handle only. */
export function SortableList({ ids, onReorder, children }: { ids: string[]; onReorder(ids: string[]): void; children: ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** Renders `children(handle)`; place the handle where the user grabs the item. */
export function Sortable({
  id,
  label,
  as: Tag = 'div',
  children,
}: {
  id: string;
  label: string;
  as?: 'div' | 'li';
  children(handle: ReactNode): ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Reorder ${label}`}
      className="cursor-grab touch-none rounded px-1 text-muted hover:bg-tint/40 hover:text-ink active:cursor-grabbing"
    >
      ⠿
    </button>
  );
  return (
    <Tag
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? 'relative z-10 opacity-70' : undefined}
    >
      {children(handle)}
    </Tag>
  );
}
