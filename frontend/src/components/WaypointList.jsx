import { useMemo, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, DragOverlay } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableWaypoint({ waypoint, index, isFirst, isLast, onRemove, onMoveUp, onMoveDown }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: waypoint.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className={`waypoint-item ${isDragging ? 'is-dragging' : ''}`}>
      <button className="drag-handle" {...attributes} {...listeners} title="Drag to reorder">⋮⋮</button>
      <div className="waypoint-text">
        <span className="waypoint-label">{waypoint.label}</span>
        <small className="waypoint-coords">{waypoint.lat.toFixed(5)}, {waypoint.lon.toFixed(5)}</small>
      </div>
      <div className="waypoint-actions">
        <button className="move-waypoint" onClick={() => onMoveUp(index)} disabled={isFirst} title="Move up">↑</button>
        <button className="move-waypoint" onClick={() => onMoveDown(index)} disabled={isLast} title="Move down">↓</button>
        <button className="remove-waypoint" onClick={() => onRemove(waypoint.id)} title="Remove waypoint">✕</button>
      </div>
    </li>
  )
}

export default function WaypointList({ waypoints, setWaypoints }) {
  const sensors = useSensors(useSensor(PointerSensor))
  const [activeId, setActiveId] = useState(null)
  const activeWaypoint = useMemo(() => waypoints.find((w) => w.id === activeId) ?? null, [activeId, waypoints])

  const onDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = waypoints.findIndex((p) => p.id === active.id)
    const newIndex = waypoints.findIndex((p) => p.id === over.id)
    setWaypoints(arrayMove(waypoints, oldIndex, newIndex))
  }

  const onRemove = (id) => setWaypoints(waypoints.filter((w) => w.id !== id))

  const moveUp = (index) => {
    if (index <= 0) return
    setWaypoints(arrayMove(waypoints, index, index - 1))
  }

  const moveDown = (index) => {
    if (index >= waypoints.length - 1) return
    setWaypoints(arrayMove(waypoints, index, index + 1))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={(event) => {
        onDragEnd(event)
        setActiveId(null)
      }}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={waypoints.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        <ul className="waypoint-list">
          {waypoints.map((waypoint, index) => (
            <SortableWaypoint
              key={waypoint.id}
              waypoint={waypoint}
              index={index}
              isFirst={index === 0}
              isLast={index === waypoints.length - 1}
              onRemove={onRemove}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
            />
          ))}
        </ul>
      </SortableContext>
      <DragOverlay adjustScale={true}>
        {activeWaypoint && (
          <div className="waypoint-item is-overlay" aria-hidden="true">
            <button className="drag-handle" type="button">⋮⋮</button>
            <div className="waypoint-text">
              <span className="waypoint-label">{activeWaypoint.label}</span>
              <small className="waypoint-coords">{activeWaypoint.lat.toFixed(5)}, {activeWaypoint.lon.toFixed(5)}</small>
            </div>
            <button className="remove-waypoint" type="button">✕</button>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
