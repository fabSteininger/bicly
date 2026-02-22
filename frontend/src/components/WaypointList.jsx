import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableWaypoint({ waypoint, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: waypoint.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li ref={setNodeRef} style={style} className="waypoint-item">
      <button className="drag" {...attributes} {...listeners}>⋮⋮</button>
      <span>{waypoint.label}</span>
      <button onClick={() => onRemove(waypoint.id)}>✕</button>
    </li>
  )
}

export default function WaypointList({ waypoints, setWaypoints }) {
  const sensors = useSensors(useSensor(PointerSensor))

  const onDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = waypoints.findIndex((p) => p.id === active.id)
    const newIndex = waypoints.findIndex((p) => p.id === over.id)
    setWaypoints(arrayMove(waypoints, oldIndex, newIndex))
  }

  const onRemove = (id) => setWaypoints(waypoints.filter((w) => w.id !== id))

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={waypoints.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        <ul className="waypoint-list">
          {waypoints.map((waypoint) => (
            <SortableWaypoint key={waypoint.id} waypoint={waypoint} onRemove={onRemove} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
