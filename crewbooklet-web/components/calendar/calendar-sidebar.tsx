'use client';

import { useState } from 'react';
import { Plus, Share2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { Project, ProjectCalendar } from '@/lib/types/models';
import { PROJECT_COLORS, PROJECT_COLOR_SHADES, ProjectStatus } from '@/lib/types/models';

const ACTIVE_STATUSES = new Set([ProjectStatus.Inquiry, ProjectStatus.Budget, ProjectStatus.Production]);

interface Props {
  projects: Project[];
  calendars: ProjectCalendar[];
  onToggleVisibility: (id: string, visible: boolean) => void;
  onAddCalendar: (projectId: string, name: string, color: string) => void;
  onDeleteCalendar: (id: string) => void;
  onShareCalendar: (calendar: ProjectCalendar) => void;
}

function getProjectColor(projectId: string, allProjects: Project[]): string {
  const idx = allProjects.findIndex(p => p.id === projectId);
  return PROJECT_COLORS[idx % PROJECT_COLORS.length];
}

function getCalendarColor(projectColor: string, indexInProject: number): string {
  const shades = PROJECT_COLOR_SHADES[projectColor] ?? PROJECT_COLOR_SHADES[PROJECT_COLORS[0]];
  return shades[Math.min(indexInProject, shades.length - 1)];
}

export function CalendarSidebar({ projects, calendars, onToggleVisibility, onAddCalendar, onDeleteCalendar, onShareCalendar }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const toggleCollapse = (projectId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) { next.delete(projectId); } else { next.add(projectId); }
      return next;
    });
  };

  const handleAdd = (projectId: string) => {
    if (!newName.trim()) return;
    const projectColor = getProjectColor(projectId, projects);
    const existing = calendars.filter(c => c.project_id === projectId);
    const color = getCalendarColor(projectColor, existing.length);
    onAddCalendar(projectId, newName.trim(), color);
    setNewName('');
    setAddingTo(null);
  };

  const activeProjects = projects.filter(p => ACTIVE_STATUSES.has(p.status as ProjectStatus));
  const projectsWithCalendars = activeProjects.filter(p => calendars.some(c => c.project_id === p.id));
  const projectsWithout = activeProjects.filter(p => !calendars.some(c => c.project_id === p.id));
  const orderedProjects = [...projectsWithCalendars, ...projectsWithout];

  return (
    <div className="w-52 shrink-0 border-r overflow-y-auto bg-gray-50 dark:bg-gray-950 flex flex-col">
      <div className="px-3 py-2 border-b">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Calendars</span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {orderedProjects.map(project => {
          const projectColor = getProjectColor(project.id, projects);
          const projectCals  = calendars.filter(c => c.project_id === project.id);
          const isCollapsed  = collapsed.has(project.id);

          return (
            <div key={project.id} className="mb-1">
              {/* Project header */}
              <div
                className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group"
                onClick={() => toggleCollapse(project.id)}
              >
                <span style={{ color: projectColor }}>
                  {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </span>
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: projectColor }}
                />
                <span className="text-xs font-medium truncate flex-1">{project.name}</span>
                <button
                  type="button"
                  title="Add sub-calendar"
                  onClick={e => { e.stopPropagation(); setAddingTo(project.id); setNewName(''); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Sub-calendars */}
              {!isCollapsed && (
                <div className="ml-4">
                  {projectCals.map((cal) => (
                    <div key={cal.id} className="flex items-center gap-1.5 px-2 py-0.5 group hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                      <button
                        type="button"
                        onClick={() => onToggleVisibility(cal.id, !cal.is_visible)}
                        className="shrink-0"
                        title={cal.is_visible ? 'Hide' : 'Show'}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-sm inline-block border"
                          style={{
                            background: cal.is_visible ? cal.color : 'transparent',
                            borderColor: cal.color,
                          }}
                        />
                      </button>
                      <span className={`text-xs truncate flex-1 ${!cal.is_visible ? 'text-gray-400 line-through' : ''}`}>
                        {cal.name}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <button
                          type="button"
                          title="Share / Copy ICS link"
                          onClick={() => onShareCalendar(cal)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <Share2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          title="Delete calendar"
                          onClick={() => {
                            if (confirm(`Delete calendar "${cal.name}"? All events will be deleted.`)) {
                              onDeleteCalendar(cal.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Inline add form */}
                  {addingTo === project.id && (
                    <div className="px-2 py-1 flex items-center gap-1">
                      <input
                        autoFocus
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAdd(project.id);
                          if (e.key === 'Escape') setAddingTo(null);
                        }}
                        placeholder="Calendar name…"
                        className="text-xs border rounded px-1.5 py-0.5 flex-1 min-w-0 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button type="button" onClick={() => handleAdd(project.id)} className="text-xs text-blue-600 font-medium">Add</button>
                    </div>
                  )}

                  {projectCals.length === 0 && addingTo !== project.id && (
                    <button
                      type="button"
                      onClick={() => { setAddingTo(project.id); setNewName(''); }}
                      className="w-full text-left px-2 py-0.5 text-[10px] text-gray-400 hover:text-gray-600 italic"
                    >
                      + Add calendar
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
