import React from 'react'

function WaypointItem({ waypoint, index, isFirst, isLast, onRemove, onMove, t }) {
  return (
    <li className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => onMove(index, -1)}
          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent`}
          aria-label={t.moveUp}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => onMove(index, 1)}
          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent`}
          aria-label={t.moveDown}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate text-sm">{waypoint.label}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{waypoint.lat.toFixed(5)}, {waypoint.lon.toFixed(5)}</div>
      </div>
      <button
        onClick={() => onRemove(waypoint.id)}
        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
        aria-label={t.removeWaypoint}
      >
        ✕
      </button>
    </li>
  )
}

export default function WaypointList({ waypoints, setWaypoints, onMove, t }) {
  const onRemove = (id) => setWaypoints(waypoints.filter((w) => w.id !== id))

  return (
    <ul className="flex flex-col gap-2 my-4">
      {waypoints.map((waypoint, index) => (
        <WaypointItem
          key={waypoint.id}
          waypoint={waypoint}
          index={index}
          isFirst={index === 0}
          isLast={index === waypoints.length - 1}
          onRemove={onRemove}
          onMove={onMove}
          t={t}
        />
      ))}
    </ul>
  )
}
