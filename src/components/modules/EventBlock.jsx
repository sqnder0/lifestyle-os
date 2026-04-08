import { formatTime, formatDuration, blockColors } from '../../utils/cycleEngine';

/**
 * EventBlock
 * Renders one resolved event. Variant prop controls density:
 *   'week'  — compact horizontal chip for the week grid
 *   'today' — tall card with full detail for the Today view
 */
export default function EventBlock({ event, variant = 'week', onEdit, onDelete }) {
  const c = blockColors(event.type);
  const timeStr = formatTime(event.hour, event.minute ?? 0);
  const durStr  = formatDuration(event.duration);

  const sourceIndicator = event.source === 'override' || event.source === 'added'
    ? <span className="ml-1 text-[10px] opacity-60 italic">
        {event.source === 'added' ? '+ added' : '~ modified'}
      </span>
    : null;

  if (variant === 'today') {
    return (
      <div className={`group relative flex gap-3 p-3 rounded-xl border ${c.bg} ${c.border} ${c.text} transition-all hover:shadow-sm`}>
        {/* Time column */}
        <div className="shrink-0 w-16 text-right">
          <p className="text-xs font-semibold leading-tight">{timeStr}</p>
          <p className="text-[11px] opacity-60 mt-0.5">{durStr}</p>
        </div>

        {/* Divider dot */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <div className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
          <div className="flex-1 w-px bg-current opacity-10" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">
            {event.label}
            {sourceIndicator}
          </p>
          <p className="text-[11px] opacity-60 mt-0.5 capitalize">{event.type}</p>
        </div>

        {/* Actions (shown on hover) */}
        {(onEdit || onDelete) && (
          <div className="absolute right-2 top-2 hidden group-hover:flex gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(event)}
                className="p-1 rounded hover:bg-black/10 transition-colors text-[11px] opacity-70 hover:opacity-100"
                title="Edit"
              >
                ✎
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(event)}
                className="p-1 rounded hover:bg-[var(--fill-red)] transition-colors text-[11px] opacity-70 hover:opacity-100 text-red-600"
                title="Remove"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // variant === 'week' — compact chip
  return (
    <div
      className={`group relative px-2 py-1 rounded-lg border text-[11px] leading-tight cursor-default
        ${c.bg} ${c.border} ${c.text} transition-all hover:shadow-sm`}
      title={`${event.label} · ${timeStr} · ${durStr}`}
    >
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
        <span className="font-medium truncate">{event.label}</span>
        {sourceIndicator}
      </div>
      <span className="opacity-60 ml-3">{timeStr}</span>
    </div>
  );
}
