/**
 * useOSState
 * Ergonomic hook that returns a slice of the OS state for a given module,
 * alongside all CRUD operations for that module.
 *
 * Usage:
 *   const { items, add, remove, update } = useOSState('capture');
 *   const { projects, tasks, addProject, addTask } = useOSState('projects');
 */
import { useOS } from '../context/OSContext';

export function useOSState(module) {
  const os = useOS();
  const { state, selectors } = os;

  switch (module) {
    case 'capture':
      return {
        items: state.capture,
        inbox: selectors.inbox(),
        add: os.addCapture,
        update: os.updateCapture,
        remove: os.deleteCapture,
        markProcessed: os.markCaptureProcessed,
        promote: os.promoteCapture,
      };

    case 'projects':
      return {
        projects: state.projects,
        tasks: state.tasks,
        activeProjects: selectors.activeProjects(),
        orphanTasks: selectors.orphanTasks(),
        addProject: os.addProject,
        updateProject: os.updateProject,
        deleteProject: os.deleteProject,
        setProjectStatus: os.setProjectStatus,
        reorderProjectTasks: os.reorderProjectTasks,
        addTask: os.addTask,
        updateTask: os.updateTask,
        deleteTask: os.deleteTask,
        setTaskStatus: os.setTaskStatus,
        moveTask: os.moveTask,
        projectTasks: selectors.projectTasks,
        projectProgress: selectors.projectProgress,
      };

    case 'metrics':
      return {
        metrics: state.metrics,
        today: selectors.todayMetric(),
        logMetric: os.logMetric,
        logToday: os.logToday,
        deleteMetric: os.deleteMetric,
        getRange: os.getMetricsRange,
      };

    case 'crm':
      return {
        contacts: state.crm,
        byOverdue: os.getCRMByOverdue(),
        addContact: os.addContact,
        updateContact: os.updateContact,
        deleteContact: os.deleteContact,
        touch: os.touchContact,
        daysSince: os.daysSince,
      };

    case 'cycles':
      return {
        cycles: state.cycles,
        activeLetter: state.activeCycle,
        activeCycle: selectors.activeCycle(),
        setActive: os.setActiveCycle,
        addBlock: os.addCycleBlock,
        updateBlock: os.updateCycleBlock,
        deleteBlock: os.deleteCycleBlock,
        duplicateCycle: os.duplicateCycle,
      };

    case 'ui':
      return {
        ...state.ui,
        setActiveModule: os.setActiveModule,
        toggleSidebar: os.toggleSidebar,
      };

    default:
      return os;
  }
}
