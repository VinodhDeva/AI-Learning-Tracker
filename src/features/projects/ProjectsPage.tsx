import { useRef, useState, type ChangeEvent } from 'react';
import { ProjectStatus, type Project } from '../../types/schema';
import { useTracker } from '../../store/useTracker';
import { InlineEdit } from '../../components/InlineEdit';
import { DraftInput } from '../../components/DraftInput';
import { Sortable, SortableList } from '../../components/SortableList';
import { btn, btnDanger, btnPrimary, field } from '../../components/ui';
import { byOrder } from '../../lib/select';
import { STORAGE_LIMIT_CHARS, downscaleImage, storageChars } from '../../lib/image';

const STATUS_LABEL: Record<ProjectStatus, string> = { planned: 'Planned', in_progress: 'In progress', shipped: 'Shipped' };
const STATUS_STYLE: Record<ProjectStatus, string> = {
  planned: 'border-line',
  in_progress: 'border-teal',
  shipped: 'border-accent',
};

export function ProjectsPage() {
  const data = useTracker((s) => s.data);
  const { addProject, reorderProjects } = useTracker.getState();
  const projects = byOrder(Object.values(data.projects));
  const phases = byOrder(Object.values(data.phases));
  const used = storageChars(data) / STORAGE_LIMIT_CHARS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className={`text-sm ${used > 0.8 ? 'font-medium text-danger' : 'text-muted'}`}>
            Browser storage about {Math.round(used * 100)}% used
            {used > 0.8 && '. Remove screenshots or export a backup soon.'}
          </p>
        </div>
        {phases[0] && (
          <button className={btnPrimary} onClick={() => addProject(phases[0]!.id, { name: 'New project' })}>
            + Add project
          </button>
        )}
      </div>
      {projects.length === 0 && <p className="text-sm italic text-muted">No projects yet.</p>}
      <SortableList ids={projects.map((p) => p.id)} onReorder={reorderProjects}>
        <div className="space-y-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </SortableList>
    </div>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  const { updateProject, deleteProject } = useTracker.getState();
  const phases = useTracker((s) => s.data.phases);
  const update = (patch: Partial<Project>) => updateProject(p.id, patch);

  return (
    <Sortable id={p.id} label={`project ${p.name}`}>
      {(handle) => (
        <article aria-label={`Project: ${p.name}`} className={`rounded-xl border-2 bg-surface p-4 ${STATUS_STYLE[p.status]}`}>
          <header className="flex flex-wrap items-center gap-2">
            {handle}
            <h2 className="min-w-48 flex-1 text-lg font-semibold">
              <InlineEdit label="Project name" value={p.name} onSave={(name) => update({ name })} />
            </h2>
            <select aria-label={`Phase of ${p.name}`} className={field} value={p.phaseId} onChange={(e) => update({ phaseId: e.target.value })}>
              {byOrder(Object.values(phases)).map((ph) => <option key={ph.id} value={ph.id}>{ph.title}</option>)}
            </select>
            <select
              aria-label={`Status of ${p.name}`}
              className={field}
              value={p.status}
              onChange={(e) => update({ status: ProjectStatus.parse(e.target.value) })}
            >
              {ProjectStatus.options.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <button
              className={btnDanger}
              aria-label={`Delete project ${p.name}`}
              onClick={() => confirm(`Delete project "${p.name}" and its screenshots?`) && deleteProject(p.id)}
            >
              ✕
            </button>
          </header>

          <div className="mt-1 text-sm text-muted">
            <InlineEdit label="Description" multiline value={p.description} onSave={(description) => update({ description })} />
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex min-w-64 flex-1 flex-col gap-1 text-xs font-medium text-muted">
              GitHub URL
              <DraftInput
                key={p.id}
                label="GitHub URL"
                type="url"
                value={p.githubUrl}
                onChange={(githubUrl) => update({ githubUrl: githubUrl.trim() })}
              />
            </label>
            {p.githubUrl && (
              <a href={p.githubUrl} target="_blank" rel="noreferrer noopener" className={btn}>
                Open repo ↗
              </a>
            )}
          </div>

          <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted">
            Eval results
            <textarea
              className={`${field} min-h-28 font-mono text-ink`}
              maxLength={50000}
              placeholder="Paste eval output, metrics tables, notes…"
              value={p.evalResults}
              onChange={(e) => update({ evalResults: e.target.value })}
            />
          </label>

          <Screenshots project={p} onChange={(screenshots) => update({ screenshots })} />
        </article>
      )}
    </Sortable>
  );
}

function Screenshots({ project, onChange }: { project: Project; onChange(s: string[]): void }) {
  const input = useRef<HTMLInputElement>(null);
  const viewer = useRef<HTMLDialogElement>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    setBusy(true);
    setError(null);
    const added: string[] = [];
    for (const f of files) {
      try {
        added.push(await downscaleImage(f));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    if (added.length) onChange([...project.screenshots, ...added]);
    setBusy(false);
  };
  const view = (i: number) => {
    setViewing(i);
    viewer.current?.showModal();
  };

  return (
    <section aria-label="Screenshots" className="mt-3">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-medium text-muted">Screenshots ({project.screenshots.length})</h3>
        <button className={btn} onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Adding…' : '+ Add images'}
        </button>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={onFiles} aria-label="Upload screenshots" />
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
      {project.screenshots.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {project.screenshots.map((src, i) => (
            <li key={i} className="group relative">
              <button onClick={() => view(i)} aria-label={`View screenshot ${i + 1}`} className="block overflow-hidden rounded-md border border-line">
                <img src={src} alt="" className="h-24 w-36 object-cover" />
              </button>
              <button
                onClick={() => confirm('Remove this screenshot?') && onChange(project.screenshots.filter((_, j) => j !== i))}
                aria-label={`Remove screenshot ${i + 1}`}
                className="absolute top-1 right-1 rounded bg-ink/70 px-1.5 text-xs text-canvas opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <dialog
        ref={viewer}
        aria-label={`Screenshot ${(viewing ?? 0) + 1} of ${project.name}`}
        onClose={() => setViewing(null)}
        onClick={(e) => e.currentTarget.close()}
        className="m-auto max-h-[90dvh] max-w-[90vw] bg-transparent p-0 backdrop:bg-black/70"
      >
        {viewing !== null && project.screenshots[viewing] && (
          <img src={project.screenshots[viewing]} alt={`Screenshot ${viewing + 1} of ${project.name}`} className="max-h-[90dvh] max-w-[90vw] rounded-lg" />
        )}
      </dialog>
    </section>
  );
}
