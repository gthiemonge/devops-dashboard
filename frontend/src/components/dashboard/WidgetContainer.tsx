import { useDashboardStore } from '../../store/dashboardStore';
import { useDeleteWidget } from '../../hooks/useWidgets';
import { GerritRecentChanges } from '../widgets/GerritRecentChanges';
import { GerritMyChanges } from '../widgets/GerritMyChanges';
import { ZuulPeriodicJobs } from '../widgets/ZuulPeriodicJobs';
import type { Widget } from '@dashboard/shared';

interface WidgetContainerProps {
  widget: Widget;
}

export function WidgetContainer({ widget }: WidgetContainerProps) {
  const { editWidget } = useDashboardStore();
  const deleteWidget = useDeleteWidget();

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this widget?')) {
      deleteWidget.mutate(widget.id);
    }
  };

  const renderWidget = () => {
    switch (widget.type) {
      case 'gerrit_recent_changes':
        return <GerritRecentChanges widget={widget} />;
      case 'gerrit_my_changes':
        return <GerritMyChanges widget={widget} />;
      case 'zuul_periodic_jobs':
        return <ZuulPeriodicJobs widget={widget} />;
      default:
        return <div className="text-slate-500">Unknown widget type</div>;
    }
  };

  return (
    <div className="bg-slate-800 border-r border-b border-slate-700 h-full flex flex-col overflow-hidden">
      <div className="widget-drag-handle flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700 cursor-move">
        <h3 className="font-medium text-slate-200 text-sm truncate">{widget.title}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => editWidget(widget.id)}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            title="Configure"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {renderWidget()}
      </div>
    </div>
  );
}
