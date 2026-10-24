import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDownUp, ArrowUpRight, CalendarDays, Check, CheckCircle2, Circle, Clock3,
  Flower2, Leaf, MapPin, Plus, RefreshCw, Search, Shovel, Sprout, Sun,
  Trash2, Wheat, X
} from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_URL || '/api';
const stages = ['Planned', 'Growing', 'Ready to Harvest', 'Harvested'];
const availabilityOptions = ['In use', 'Reserved', 'Available'];
const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};
const dateInput = value => value ? new Date(value).toISOString().slice(0, 10) : '';
const plotBlank = () => ({ plotName: '', areaSqM: '6', availability: 'In use', gardener: '', crop: '', plantedOn: today(), expectedHarvestOn: '', wateringSchedule: 'Every 2–3 days', status: 'Planned', expectedHarvestKg: '0' });
const taskBlank = () => ({ title: '', assignedTo: '', dueOn: today(), plotId: '' });

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'That garden update could not be saved. Please try again.');
  return payload;
}

function App() {
  const [plots, setPlots] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All stages');
  const [availabilityFilter, setAvailabilityFilter] = useState('All plots');
  const [sortBy, setSortBy] = useState('recent');
  const [plotForm, setPlotForm] = useState(plotBlank);
  const [taskForm, setTaskForm] = useState(taskBlank);
  const [editingId, setEditingId] = useState('');
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const [nextPlots, nextTasks, nextActivity] = await Promise.all([
        request('/plots'), request('/tasks'), request('/activity')
      ]);
      setPlots(nextPlots);
      setTasks(nextTasks);
      setActivity(nextActivity);
    } catch (cause) {
      setError(cause.message || 'Could not reach the garden API. Check that the server and database are running.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filteredPlots = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const rows = plots.filter(plot => {
      const matchesText = [plot.plotName, plot.gardener, plot.crop, plot.status, plot.availability]
        .some(value => String(value || '').toLocaleLowerCase().includes(needle));
      return matchesText && (stageFilter === 'All stages' || plot.status === stageFilter)
        && (availabilityFilter === 'All plots' || plot.availability === availabilityFilter);
    });
    return rows.sort((a, b) => {
      if (sortBy === 'name') return a.plotName.localeCompare(b.plotName);
      if (sortBy === 'area') return Number(b.areaSqM || 0) - Number(a.areaSqM || 0);
      if (sortBy === 'harvest') return new Date(a.expectedHarvestOn || '9999-12-31') - new Date(b.expectedHarvestOn || '9999-12-31');
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });
  }, [plots, query, stageFilter, availabilityFilter, sortBy]);

  const growing = plots.filter(plot => plot.status === 'Growing').length;
  const ready = plots.filter(plot => plot.status === 'Ready to Harvest').length;
  const available = plots.filter(plot => plot.availability === 'Available').length;
  const expected = plots.filter(plot => plot.availability === 'In use' && plot.status !== 'Harvested')
    .reduce((sum, plot) => sum + Number(plot.expectedHarvestKg || 0), 0);
  const openTasks = tasks.filter(task => !task.completed).length;

  function startNewPlot() {
    setEditingId('');
    setPlotForm(plotBlank());
    setShowPlotForm(true);
    setError('');
    setNotice('');
    document.getElementById('plot-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startEditPlot(plot) {
    setEditingId(plot._id);
    setPlotForm({
      plotName: plot.plotName || '', areaSqM: String(plot.areaSqM ?? 6), availability: plot.availability || 'In use',
      gardener: plot.gardener || '', crop: plot.crop || '', plantedOn: dateInput(plot.plantedOn),
      expectedHarvestOn: dateInput(plot.expectedHarvestOn), wateringSchedule: plot.wateringSchedule || '',
      status: plot.status || 'Planned', expectedHarvestKg: String(plot.expectedHarvestKg ?? 0)
    });
    setShowPlotForm(true);
    setError('');
    setNotice('');
    document.getElementById('plot-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function savePlot(event) {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    const payload = {
      ...plotForm,
      areaSqM: Number(plotForm.areaSqM),
      expectedHarvestKg: Number(plotForm.expectedHarvestKg || 0),
      gardener: plotForm.availability === 'Available' ? '' : plotForm.gardener.trim(),
      crop: plotForm.availability === 'Available' ? '' : plotForm.crop.trim(),
      plantedOn: plotForm.availability === 'Available' ? '' : plotForm.plantedOn,
      expectedHarvestOn: plotForm.availability === 'Available' ? '' : plotForm.expectedHarvestOn
    };
    try {
      const saved = await request(editingId ? `/plots/${editingId}` : '/plots', {
        method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload)
      });
      setPlots(current => editingId ? current.map(plot => plot._id === saved._id ? saved : plot) : [saved, ...current]);
      setNotice(editingId ? `${saved.plotName} was updated.` : `${saved.plotName} was added to the garden.`);
      setShowPlotForm(false); setEditingId(''); setPlotForm(plotBlank());
      await load({ quiet: true });
    } catch (cause) { setError(cause.message); }
    finally { setSaving(false); }
  }

  async function changeStage(plot, status) {
    setError(''); setNotice('');
    try {
      const updated = await request(`/plots/${plot._id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setPlots(current => current.map(item => item._id === updated._id ? updated : item));
      setNotice(`${plot.plotName} is now marked ${status.toLowerCase()}.`);
      await load({ quiet: true });
    } catch (cause) { setError(cause.message); }
  }

  async function deletePlot(plot) {
    if (!window.confirm(`Remove “${plot.plotName}” from the garden register?`)) return;
    setError(''); setNotice('');
    try {
      await request(`/plots/${plot._id}`, { method: 'DELETE' });
      setPlots(current => current.filter(item => item._id !== plot._id));
      setNotice(`${plot.plotName} was removed from the garden.`);
      await load({ quiet: true });
    } catch (cause) { setError(cause.message); }
  }

  async function addTask(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const created = await request('/tasks', { method: 'POST', body: JSON.stringify({ ...taskForm, plotId: taskForm.plotId || null }) });
      setTasks(current => [...current, created].sort((a, b) => Number(a.completed) - Number(b.completed) || new Date(a.dueOn) - new Date(b.dueOn)));
      setNotice(`“${created.title}” was added to the garden list.`);
      setTaskForm(taskBlank()); setShowTaskForm(false);
      await load({ quiet: true });
    } catch (cause) { setError(cause.message); }
    finally { setSaving(false); }
  }

  async function toggleTask(task) {
    setError(''); setNotice('');
    try {
      const updated = await request(`/tasks/${task._id}`, { method: 'PATCH', body: JSON.stringify({ completed: !task.completed }) });
      setTasks(current => current.map(item => item._id === updated._id ? updated : item));
      setNotice(updated.completed ? 'Task marked complete.' : 'Task moved back to the garden list.');
      await load({ quiet: true });
    } catch (cause) { setError(cause.message); }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Remove “${task.title}” from the garden list?`)) return;
    setError(''); setNotice('');
    try {
      await request(`/tasks/${task._id}`, { method: 'DELETE' });
      setTasks(current => current.filter(item => item._id !== task._id));
      setNotice('Task removed from the garden list.');
      await load({ quiet: true });
    } catch (cause) { setError(cause.message); }
  }

  return <div className="app-shell">
    <aside className="rail" aria-label="Garden identity">
      <a className="brand-mark" href="#overview" aria-label="Plot and Petal home"><Sprout size={22}/></a>
      <span className="rail-label">GARDEN<br/>COLLECTIVE</span>
      <div className="rail-divider" />
      <a className="rail-icon active" href="#overview" aria-label="Garden overview" title="Garden overview"><Flower2 size={18}/></a>
      <a className="rail-icon" href="#plots" aria-label="Garden plots" title="Garden plots"><Leaf size={18}/></a>
      <a className="rail-icon" href="#tasks" aria-label="Garden tasks" title="Garden tasks"><CalendarDays size={18}/></a>
      <div className="rail-bottom"><Sun size={17}/><span>GROW<br/>TOGETHER</span></div>
    </aside>

    <main className="main" id="overview">
      <header className="masthead">
        <div>
          <div className="overline"><span className="tiny-dot"/> COMMUNITY GARDEN <span className="overline-slash">/</span> FIELD NOTES</div>
          <h1>Plot <em>&amp;</em> Petal<span className="period">.</span></h1>
          <p className="subtitle">A little structure for everything you grow together.</p>
        </div>
        <div className="mast-actions">
          <div className="season-chip"><Sun size={15}/> A shared patch, all year round</div>
          <button className="button button-dark" type="button" onClick={startNewPlot}><Plus size={16}/> Add a plot</button>
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Page sections">
        <a href="#overview">Overview</a><a href="#plots">Garden plots</a><a href="#tasks">Tasks &amp; notes</a>
      </nav>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="hero-kicker"><Sprout size={15}/> THE SHARED PATCH</div>
          <h2 id="hero-title">Good things take<br/><i>time to grow.</i></h2>
          <p>Keep your plots, people and harvest plans in one calm, shared space.</p>
          <button className="text-link" type="button" onClick={startNewPlot}>Plan a new planting <ArrowUpRight size={15}/></button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun-disc"/><div className="art-circle art-circle-one"/><div className="art-circle art-circle-two"/>
          <div className="stem stem-one"/><div className="stem stem-two"/><div className="leaf-shape leaf-one"/><div className="leaf-shape leaf-two"/><div className="leaf-shape leaf-three"/><div className="ground-line"/>
        </div>
        <div className="hero-caption">GROW LOCAL <span>✳</span> GROW TOGETHER</div>
      </section>

      <section className="stats-grid" aria-label="Garden at a glance">
        <article className="stat-card stat-featured"><div className="stat-top"><span>IN THE GARDEN</span><Shovel size={17}/></div><strong>{loading ? '—' : plots.length.toString().padStart(2, '0')}</strong><div className="stat-foot">Registered plots <span>↗</span></div><div className="stat-decoration">01</div></article>
        <article className="stat-card"><div className="stat-top"><span>IN THE GROUND</span><Sprout size={17}/></div><strong>{loading ? '—' : growing.toString().padStart(2, '0')}</strong><div className="stat-foot">Plants growing <span className="sage-dot"/></div></article>
        <article className="stat-card"><div className="stat-top"><span>NEAR THE BASKET</span><Wheat size={17}/></div><strong>{loading ? '—' : expected.toLocaleString(undefined, { maximumFractionDigits: 1 })}<small> kg</small></strong><div className="stat-foot">{ready} ready · {available} open plots <span>↗</span></div></article>
      </section>

      {(error || notice) && <div className={`feedback ${error ? 'feedback-error' : ''}`} role={error ? 'alert' : 'status'}>{error ? error : <><CheckCircle2 size={16}/>{notice}</>}</div>}

      {showPlotForm && <section className="form-card" id="plot-form" aria-labelledby="plot-form-title">
        <div className="section-head">
          <div><div className="overline">GIVE IT A PLACE TO GROW</div><h2 id="plot-form-title">{editingId ? 'Update a plot' : 'Register a plot'}</h2><p className="muted">Keep plot details and plant care together.</p></div>
          <button className="icon-button" type="button" onClick={() => { setShowPlotForm(false); setEditingId(''); }} aria-label="Close plot form"><X size={17}/></button>
        </div>
        <form onSubmit={savePlot}>
          <div className="form-grid">
            <label>Plot name<input required maxLength="80" value={plotForm.plotName} onChange={event => setPlotForm({ ...plotForm, plotName: event.target.value })} placeholder="The Sunny Corner"/></label>
            <label>Plot size (m²)<input required type="number" min="0.5" max="10000" step="0.5" value={plotForm.areaSqM} onChange={event => setPlotForm({ ...plotForm, areaSqM: event.target.value })}/></label>
            <label>Availability<select value={plotForm.availability} onChange={event => setPlotForm({ ...plotForm, availability: event.target.value })}>{availabilityOptions.map(option => <option key={option}>{option}</option>)}</select></label>
            {plotForm.availability !== 'Available' && <>
              <label>Gardener<input maxLength="80" required={plotForm.availability === 'In use'} value={plotForm.gardener} onChange={event => setPlotForm({ ...plotForm, gardener: event.target.value })} placeholder="Who tends this plot?"/></label>
              <label>Plant<input maxLength="80" required={plotForm.availability === 'In use'} value={plotForm.crop} onChange={event => setPlotForm({ ...plotForm, crop: event.target.value })} placeholder="Tomatoes, basil…"/></label>
              <label>Planting date<input type="date" value={plotForm.plantedOn} onChange={event => setPlotForm({ ...plotForm, plantedOn: event.target.value })}/></label>
              <label>Expected harvest date<input type="date" value={plotForm.expectedHarvestOn} onChange={event => setPlotForm({ ...plotForm, expectedHarvestOn: event.target.value })}/></label>
              <label>Watering schedule<input maxLength="80" value={plotForm.wateringSchedule} onChange={event => setPlotForm({ ...plotForm, wateringSchedule: event.target.value })} placeholder="Every 2–3 days"/></label>
              <label>Growing stage<select value={plotForm.status} onChange={event => setPlotForm({ ...plotForm, status: event.target.value })}>{stages.map(stage => <option key={stage}>{stage}</option>)}</select></label>
              <label>Expected harvest (kg)<input type="number" min="0" max="10000" step="0.1" value={plotForm.expectedHarvestKg} onChange={event => setPlotForm({ ...plotForm, expectedHarvestKg: event.target.value })}/></label>
            </>}
          </div>
          <div className="form-footer"><span className="muted">Your garden notes stay with the plot.</span><button className="button button-dark" disabled={saving}>{saving ? 'Saving…' : <><Check size={15}/> {editingId ? 'Save changes' : 'Save plot'}</>}</button></div>
        </form>
      </section>}

      <section className="register-card" id="plots" aria-labelledby="plots-title">
        <div className="register-head">
          <div><div className="overline">THE COMMUNITY REGISTER</div><h2 id="plots-title">What we’re growing</h2><p className="muted">Plots, people and plants growing side by side.</p></div>
          <button className="icon-button refresh" type="button" onClick={() => load()} title="Refresh garden information" aria-label="Refresh garden information"><RefreshCw size={16}/></button>
        </div>
        <div className="tools-row">
          <label className="search-wrap"><Search size={16}/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search plots, gardeners, plants…" aria-label="Search plots, gardeners, and plants"/></label>
          <label className="filter-control"><span>Stage</span><select value={stageFilter} onChange={event => setStageFilter(event.target.value)} aria-label="Filter by growing stage"><option>All stages</option>{stages.map(stage => <option key={stage}>{stage}</option>)}</select></label>
          <label className="filter-control"><span>Plot</span><select value={availabilityFilter} onChange={event => setAvailabilityFilter(event.target.value)} aria-label="Filter by availability"><option>All plots</option>{availabilityOptions.map(option => <option key={option}>{option}</option>)}</select></label>
          <label className="filter-control sort-control"><span><ArrowDownUp size={13}/> Sort</span><select value={sortBy} onChange={event => setSortBy(event.target.value)} aria-label="Sort plots"><option value="recent">Recently updated</option><option value="name">Name</option><option value="area">Largest first</option><option value="harvest">Harvest date</option></select></label>
          <div className="results-count" aria-live="polite">{filteredPlots.length} PLOT{filteredPlots.length === 1 ? '' : 'S'}</div>
        </div>
        <div className="table-scroll"><table><thead><tr><th>Plot &amp; plant</th><th>Size</th><th>Gardener</th><th>Care &amp; harvest</th><th>Availability</th><th>Stage</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{loading ? <tr><td colSpan="7" className="empty-state"><span className="loading-mark"><Sprout size={18}/></span>Gathering the garden notes…</td></tr> : filteredPlots.length === 0 ? <tr><td colSpan="7" className="empty-state"><span className="empty-icon"><Flower2 size={20}/></span><strong>{query || stageFilter !== 'All stages' || availabilityFilter !== 'All plots' ? 'No plots found' : 'Your garden is ready to grow'}</strong><span>{query || stageFilter !== 'All stages' || availabilityFilter !== 'All plots' ? 'Try changing your search or filters.' : 'Add a plot to begin your shared garden register.'}</span>{!query && stageFilter === 'All stages' && availabilityFilter === 'All plots' && <button className="button button-outline" type="button" onClick={startNewPlot}><Plus size={15}/> Add your first plot</button>}</td></tr> : filteredPlots.map(plot => <tr key={plot._id}>
            <td><div className="plot-name">{plot.plotName}</div><div className="crop-name">{plot.crop || 'Ready for planting'}</div></td>
            <td>{Number(plot.areaSqM || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</td>
            <td>{plot.gardener || <span className="muted-inline">Unassigned</span>}</td>
            <td><div className="care-cell">{plot.wateringSchedule && plot.wateringSchedule !== 'Not planted' && <span><Sun size={13}/>{plot.wateringSchedule}</span>}{plot.expectedHarvestOn && <span><CalendarDays size={13}/>Harvest {new Date(plot.expectedHarvestOn).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })}</span>}{!plot.wateringSchedule || plot.wateringSchedule === 'Not planted' ? <span className="muted-inline">No care due yet</span> : null}</div></td>
            <td><span className={`availability availability-${plot.availability?.toLowerCase().replaceAll(' ', '-') || 'in-use'}`}>{plot.availability || 'In use'}</span></td>
            <td>{plot.crop ? <select className={`status-select status-${plot.status.toLowerCase().replaceAll(' ', '-')}`} value={plot.status} onChange={event => changeStage(plot, event.target.value)} aria-label={`Growing stage for ${plot.crop} in ${plot.plotName}`}>{stages.map(stage => <option key={stage}>{stage}</option>)}</select> : <span className="muted-inline">Not planted</span>}</td>
            <td><div className="row-actions"><button className="action-button" type="button" onClick={() => startEditPlot(plot)} aria-label={`Edit ${plot.plotName}`} title="Edit plot"><Leaf size={15}/></button><button className="delete-button" type="button" onClick={() => deletePlot(plot)} title="Delete plot" aria-label={`Delete ${plot.plotName}`}><Trash2 size={15}/></button></div></td>
          </tr>)}</tbody></table></div>
        <footer className="register-footer"><span><span className="tiny-dot"/> GROWING IN GOOD COMPANY</span><span>Plot &amp; Petal · Garden notes</span></footer>
      </section>

      <section className="community-grid" id="tasks">
        <article className="panel-card task-panel">
          <div className="panel-heading"><div><div className="overline">A FEW GOOD THINGS TO DO</div><h2>Garden tasks</h2><p className="muted">{openTasks} task{openTasks === 1 ? '' : 's'} on the list.</p></div><button className="button button-outline button-small" type="button" onClick={() => { setShowTaskForm(value => !value); setError(''); }}>{showTaskForm ? <X size={14}/> : <Plus size={14}/>} {showTaskForm ? 'Close' : 'Add task'}</button></div>
          {showTaskForm && <form className="task-form" onSubmit={addTask}>
            <label>Task<input required maxLength="120" value={taskForm.title} onChange={event => setTaskForm({ ...taskForm, title: event.target.value })} placeholder="Water the seedlings"/></label>
            <div className="task-form-row"><label>Due date<input required type="date" value={taskForm.dueOn} onChange={event => setTaskForm({ ...taskForm, dueOn: event.target.value })}/></label><label>Gardener<input maxLength="80" value={taskForm.assignedTo} onChange={event => setTaskForm({ ...taskForm, assignedTo: event.target.value })} placeholder="Optional"/></label></div>
            <label>Related plot<select value={taskForm.plotId} onChange={event => setTaskForm({ ...taskForm, plotId: event.target.value })}><option value="">Garden-wide task</option>{plots.map(plot => <option key={plot._id} value={plot._id}>{plot.plotName}</option>)}</select></label>
            <button className="button button-dark" disabled={saving}>{saving ? 'Saving…' : 'Add to task list'}</button>
          </form>}
          {loading ? <div className="panel-empty">Loading the garden list…</div> : tasks.length === 0 ? <div className="panel-empty"><CalendarDays size={20}/><strong>No tasks on the list yet</strong><span>Keep watering, tending and harvest plans together here.</span></div> : <ul className="task-list">{tasks.map(task => <li className={task.completed ? 'task-item task-complete' : 'task-item'} key={task._id}>
            <button className="task-toggle" type="button" onClick={() => toggleTask(task)} aria-label={task.completed ? `Reopen ${task.title}` : `Mark ${task.title} complete`}>{task.completed ? <CheckCircle2 size={19}/> : <Circle size={19}/>}</button>
            <div className="task-copy"><strong>{task.title}</strong><span><Clock3 size={12}/>{new Date(task.dueOn).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })}{task.assignedTo ? ` · ${task.assignedTo}` : ''}{task.plotId?.plotName ? ` · ${task.plotId.plotName}` : ''}</span></div>
            <button className="delete-button" type="button" onClick={() => deleteTask(task)} title="Delete task" aria-label={`Delete ${task.title}`}><Trash2 size={14}/></button>
          </li>)}</ul>}
        </article>

        <article className="panel-card activity-panel">
          <div className="panel-heading"><div><div className="overline">LITTLE MOMENTS, GROWING TOGETHER</div><h2>Recent activity</h2><p className="muted">Fresh notes from around the garden.</p></div><div className="activity-icon"><MapPin size={17}/></div></div>
          {loading ? <div className="panel-empty">Gathering recent notes…</div> : activity.length === 0 ? <div className="panel-empty"><Sprout size={20}/><strong>Your garden story starts here</strong><span>Plot and task updates will appear as they happen.</span></div> : <ol className="activity-list">{activity.map(item => <li key={item._id}><span className={`activity-symbol activity-${item.kind}`} aria-hidden="true">{item.kind === 'task' ? <Check size={14}/> : item.kind === 'harvest' ? <Wheat size={14}/> : <Leaf size={14}/>}</span><div><p>{item.message}</p><time dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })}</time></div></li>)}</ol>}
        </article>
      </section>

      <footer className="page-footer"><span>MADE FOR SHARED SPACES <span>✳</span></span><span>SEASONAL BY NATURE.</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
