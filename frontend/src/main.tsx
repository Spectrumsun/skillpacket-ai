import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, ApiError } from './api.ts';
import { starterPacket, starterSession } from './data.ts';
import { careers, careerNames } from '../../backend/src/careers.ts';
import type { CareerName } from '../../backend/src/careers.ts';
import { canCheckQuiz, formatBytes, packetBytes, parsePacket, quizScore, RoadmapSchema, safeSourceUrl } from './model.ts';
import type { Packet, PendingJob, Profile, Progress, Session } from './model.ts';
import { localStore, requestPersistentStorage } from './storage.ts';
import { Icon } from './icons.tsx';
import './styles.css';
import { themes } from './themes.ts';
import { useAppearance, ThemeSwitcher } from './appearance.tsx';
import { Landing } from './Landing.tsx';

type View = 'learning' | 'roadmap' | 'library' | 'settings';
type ModalName = 'profile' | 'source' | 'reader' | null;
type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
function exportJson(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Modal({ title, close, children, wide = false, busy = false }: { title: string; close(): void; children: React.ReactNode; wide?: boolean; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'reader-modal' : ''}`} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); if (!busy) close(); }}>
    <div className="modal-header"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close} disabled={busy}><Icon name="close"/></button></div>
    {children}
  </dialog>;
}
function Reader({ packet, saved, save, close, refresh, notify }: { packet: Packet; saved: boolean; save(packet: Packet): Promise<void>; close(): void; refresh(): Promise<void>; notify(message: string): void }) {
  const [tab, setTab] = useState<'lesson' | 'quiz'>('lesson');
  const [progress, setProgress] = useState<Progress>({ packetId: packet.id, answers: {}, checked: false });
  const [loaded, setLoaded] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [working, setWorking] = useState(false);
  useEffect(() => { let live = true; localStore.progress(packet.id).then(p => { if (live) { if (p) setProgress(p); setLoaded(true); } }).catch(error => { if (live) notify(errorMessage(error)); }); return () => { live = false; }; }, [packet.id]);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const update = () => setVoices(window.speechSynthesis.getVoices().filter(v => v.localService && v.lang.startsWith(packet.language)));
    update(); window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => { window.speechSynthesis.cancel(); window.speechSynthesis.removeEventListener('voiceschanged', update); };
  }, [packet.language]);
  async function commit(next: Progress) {
    setWorking(true);
    try { await save(packet); await localStore.saveProgress(next); setProgress(next); await refresh(); return true; }
    catch (error) { notify(errorMessage(error)); return false; }
    finally { setWorking(false); }
  }
  function speak() {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const voice = voices[0]; if (!voice) return;
    const utterance = new SpeechSynthesisUtterance(packet.narrationScript); utterance.voice = voice; utterance.lang = voice.lang;
    utterance.onend = () => setSpeaking(false); utterance.onerror = () => { setSpeaking(false); notify('This device could not play the local voice. You can still read the lesson.'); };
    setSpeaking(true); window.speechSynthesis.speak(utterance);
  }
  return <Modal title={packet.title} close={close} wide>
    <div className="reader-meta"><span><Icon name="clock" size={15}/>{packet.estimatedMinutes} min</span><span><Icon name="leaf" size={15}/>{formatBytes(packetBytes(packet))}</span><span className="badge">{saved ? 'Saved on this device' : 'Not saved yet'}</span></div>
    <div className="notice">{packet.generator === 'starter-lesson-v1' ? 'Starter lesson · hand-authored and unreviewed.' : 'Development preview · an unreviewed source excerpt. The quiz does not assess skill mastery.'}</div>
    <div className="reader-toolbar"><div className="tabs" aria-label="Packet sections"><button className={tab === 'lesson' ? 'active' : ''} onClick={() => setTab('lesson')}>Read lesson</button><button className={tab === 'quiz' ? 'active' : ''} onClick={() => setTab('quiz')}>Check yourself <span>{packet.quiz.length}</span></button></div><button className="text-button" disabled={!voices.length} onClick={speak}><Icon name={speaking ? 'pause' : 'play'} size={16}/>{speaking ? 'Stop audio' : 'Listen'}</button></div>
    {!voices.length && <p className="subtle small">A local English voice is needed for offline audio. Text learning is available.</p>}
    {tab === 'lesson' ? <div className="lesson-content">
      <p className="eyebrow">WHAT YOU’LL LEARN</p><p className="objective">{packet.objective}</p>
      <h3>The idea, made simple</h3>{packet.summary.split('\n\n').map((paragraph, i) => <p className="lesson-paragraph" key={i}>{paragraph}</p>)}
      <div className="takeaways"><h3><Icon name="book"/>Keep these with you</h3><ul>{packet.takeaways.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
      <h3>See it in practice</h3><pre className="code-block">{packet.workedExample}</pre>
      <div className="practice"><p className="eyebrow">YOUR TURN</p><h3>A small step into practice</h3><p>{packet.practicalTask}</p></div>
      <h3>Where this skill takes you</h3><p>{packet.careerConnection}</p>
      <details className="source-details"><summary>Sources & attribution</summary>{packet.sources.map(source => <p key={source.sourceId}>{safeSourceUrl(source.url) ? <a href={safeSourceUrl(source.url)} target="_blank" rel="noreferrer">{source.title} ↗</a> : source.title}<br/><span className="subtle small">{source.locator}</span></p>)}</details>
      <div className="reader-footer"><button className="secondary" onClick={() => { void save(packet).catch(error => notify(errorMessage(error))); }}><Icon name={saved ? 'check' : 'download'}/>{saved ? 'Saved offline' : 'Save for offline'}</button><button className="primary" onClick={() => setTab('quiz')}>Check yourself<Icon name="arrow"/></button></div>
    </div> : <div className="quiz-content">
      <p className="subtle">A quick check to help the ideas stick. Your answers stay on this device.</p>
      {packet.quiz.map((question, index) => <fieldset key={question.id} disabled={progress.checked || !loaded || working}>
        <legend><span className="question-number">0{index + 1}</span>{question.question}</legend>
        {question.options.map((option, optionIndex) => <label className={`quiz-option ${progress.answers[question.id] === optionIndex ? 'selected' : ''} ${progress.checked && optionIndex === question.correctIndex ? 'correct' : ''}`} key={optionIndex}>
          <input type="radio" name={question.id} checked={progress.answers[question.id] === optionIndex} onChange={() => setProgress(previous => ({ ...previous, answers: { ...previous.answers, [question.id]: optionIndex } }))}/><span>{option}</span>{progress.checked && optionIndex === question.correctIndex && <Icon name="check" size={18}/>}
        </label>)}
        {progress.checked && <p className="answer-explanation">{question.explanation}</p>}
      </fieldset>)}
      {progress.checked && <div className="quiz-result"><Icon name="check"/><div><strong>{quizScore(packet, progress.answers)} of {packet.quiz.length} correct</strong><p>Read the explanations, then try the practical task.</p></div></div>}
      <div className="reader-footer">
        {progress.checked ? <><button className="secondary" disabled={working} onClick={() => { void commit({ packetId: packet.id, answers: {}, checked: false }); }}>Try again</button><button className="primary" disabled={working} onClick={() => { void commit({ ...progress, completedAt: new Date().toISOString() }).then(success => { if (success) notify('Study progress saved on this device.'); }); }}>{progress.completedAt ? 'Studied ✓' : 'Mark as studied'}<Icon name="check"/></button></> : <button className="primary" disabled={!loaded || working || !canCheckQuiz(packet, progress.answers)} onClick={() => { void commit({ ...progress, checked: true }); }}>{working ? 'Saving…' : 'Check my answers'}<Icon name="arrow"/></button>}
      </div>
    </div>}
  </Modal>;
}

function App({ initialCareer, showStarter }: { initialCareer?: CareerName; showStarter?: boolean }) {
  const [view, setView] = useState<View>('learning');
  const [session, setSession] = useState<Session>(starterSession);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [modal, setModal] = useState<ModalName>(initialCareer ? 'profile' : showStarter ? 'reader' : null);
  const [readerPacket, setReaderPacket] = useState<Packet>(starterPacket);
  const [selectedNode, setSelectedNode] = useState('dart');
  const [online, setOnline] = useState(navigator.onLine);
  const [backend, setBackend] = useState(false);
  const [shellReady, setShellReady] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(window.matchMedia('(display-mode: standalone)').matches);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingJob[]>([]);
  const [ready, setReady] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [profileForm, setProfileForm] = useState<Profile>({ targetCareer: initialCareer ?? 'Flutter Mobile Developer', region: '', experience: 'beginner', minutesPerDay: 15 });
  const [sourceForm, setSourceForm] = useState({ title: '', text: '', kind: 'text' as 'text' | 'transcript', url: '' });
  const [formError, setFormError] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const sourceFileRef = useRef<HTMLInputElement>(null);
  const notify = useCallback((message: string) => setToast(message), []);
  const { theme, changeTheme } = useAppearance(notify);
  const refresh = useCallback(async () => { const [saved, studied] = await Promise.all([localStore.packets(), localStore.allProgress()]); setPackets(saved.sort((a, b) => b.createdAt.localeCompare(a.createdAt))); setProgress(studied); }, []);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        await refresh();
        const stored = await localStore.setting<Session>('session');
        const jobs = await localStore.setting<PendingJob[]>('pending-jobs');
        if (live) {
          if (stored) { const roadmap = RoadmapSchema.parse(stored.roadmap); const profile = { ...stored.profile, targetCareer: roadmap.targetCareer }; setSession({ ...stored, roadmap, profile }); setProfileForm({ ...profile, targetCareer: initialCareer ?? profile.targetCareer }); setSelectedNode(roadmap.nodes[0].id); }
          setPending(jobs ?? []);
        }
      } catch (error) { if (live) notify(`Device storage: ${errorMessage(error)}`); }
      finally { if (live) setReady(true); }
    })();
    return () => { live = false; };
  }, [refresh, notify]);
  useEffect(() => {
    const connected = () => setOnline(true), disconnected = () => { setOnline(false); setBackend(false); };
    window.addEventListener('online', connected); window.addEventListener('offline', disconnected);
    return () => { window.removeEventListener('online', connected); window.removeEventListener('offline', disconnected); };
  }, []);
  const checkBackend = useCallback(async () => { try { await api.health(); setBackend(true); } catch { setBackend(false); } }, []);
  useEffect(() => { if (online) { void checkBackend(); const timer = setInterval(() => { void checkBackend(); }, 30_000); return () => clearInterval(timer); } }, [online, checkBackend]);
  useEffect(() => {
    const beforeInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const installed = () => { setStandalone(true); setInstallEvent(null); };
    window.addEventListener('beforeinstallprompt', beforeInstall); window.addEventListener('appinstalled', installed);
    if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(async () => { const shell = await caches.match('/index.html'); setShellReady(Boolean(shell)); }).catch(error => notify(`Offline app setup: ${errorMessage(error)}`));
    return () => { window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', installed); };
  }, [notify]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 6000); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => {
    if (!online || !backend || !ready || !pending.length) return;
    let disposed = false, checking = false;
    async function poll() {
      if (checking) return; checking = true;
      const finished = new Set<string>();
      try {
        for (const tracked of pending) {
          const job = await api.job(tracked.id).catch(error => { if (error instanceof ApiError && error.status === 404) return null; throw error; });
          if (!job) { finished.add(tracked.id); notify('A pending packet is no longer on the service. Please submit its source again.'); continue; }
          if (disposed) return;
          if (job.status === 'failed') { finished.add(job.id); notify(job.error ?? 'Packet generation failed. Please try another source.'); }
          else if (job.status === 'succeeded' && job.packetId) {
            const packet = await api.packet(job.packetId);
            await localStore.savePacket(packet);
            finished.add(job.id); notify('Your packet is ready and saved on this device.');
          }
        }
        if (!disposed && finished.size) {
          const remaining = pending.filter(job => !finished.has(job.id));
          await localStore.setSetting('pending-jobs', remaining); setPending(remaining); await refresh();
        }
      } catch (error) { if (!disposed) notify(errorMessage(error)); }
      finally { checking = false; }
    }
    void poll(); const timer = setInterval(() => { void poll(); }, 2000);
    return () => { disposed = true; clearInterval(timer); };
  }, [online, backend, ready, pending, refresh, notify]);

  async function savePacket(packet: Packet) {
    await localStore.savePacket(packet); await refresh();
    void requestPersistentStorage();
  }
  async function storeSession(next: Session) { await localStore.setSetting('session', next); setSession(next); }
  function openModal(name: ModalName) { setFormError(''); setModal(name); }
  function read(packet: Packet) { setReaderPacket(packet); openModal('reader'); }
  async function setup(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setFormError('');
    try {
      const roadmap = await api.roadmap({ ...profileForm, region: profileForm.region.trim() });
      await storeSession({ mode: 'connected', roadmap, profile: { ...profileForm, region: profileForm.region.trim() } });
      if (initialCareer) window.history.replaceState({}, '', '/learn');
      setSelectedNode(roadmap.nodes[0].id); setModal(null); notify(`Your ${roadmap.targetCareer} pathway is ready. Add a source to create your first packet.`);
    } catch (error) { setFormError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function generate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setFormError('');
    try {
      if (session.mode !== 'connected') throw new Error('Set up your learning path first.');
      const text = sourceForm.text.trim();
      if (text.length < 40 || text.length > 200_000) throw new Error('Please include between 40 and 200,000 characters of source text.');
      if (sourceForm.url && !safeSourceUrl(sourceForm.url)) throw new Error('Use an https:// or http:// source link.');
      const source = await api.source({ title: sourceForm.title.trim(), text, kind: sourceForm.kind, ...(sourceForm.url ? { url: sourceForm.url } : {}) });
      const job = await api.generate(session.roadmap.id, selectedNode, source.id);
      const next = [...pending, { id: job.id, roadmapId: session.roadmap.id, nodeId: selectedNode }];
      await localStore.setSetting('pending-jobs', next); setPending(next);
      setModal(null); setSourceForm({ title: '', text: '', kind: 'text', url: '' }); notify('Creating your packet. You can keep browsing.');
    } catch (error) { setFormError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function importPacket(file?: File) {
    if (!file) return;
    try {
      if (file.size >= 100_000) throw new Error('Choose a packet smaller than 100KB.');
      const packet = parsePacket(JSON.parse(await file.text())); await savePacket(packet); notify('Packet imported and saved offline.');
    } catch (error) { notify(`Import failed: ${errorMessage(error)}`); }
    if (importRef.current) importRef.current.value = '';
  }
  async function removePacket(id: string) { try { await localStore.removePacket(id); await refresh(); notify('Packet removed from this device.'); } catch (error) { notify(errorMessage(error)); } }
  async function install() {
    if (installEvent) { await installEvent.prompt(); const result = await installEvent.userChoice; setInstallEvent(null); if (result.outcome === 'accepted') notify('Installation accepted. Follow your browser to finish.'); }
    else notify('Use your browser’s “Install app” or “Add to Home Screen” menu. On iPhone, open Share → Add to Home Screen.');
  }
  const activePacket = packets.find(packet => packet.roadmapId === session.roadmap.id && packet.nodeId === selectedNode) ?? (session.mode === 'starter' && selectedNode === 'dart' ? starterPacket : undefined);
  const activeCareer = careers[session.roadmap.targetCareer];
  const milestoneCount = session.roadmap.nodes.length;
  const activeNode = session.roadmap.nodes.find(node => node.id === selectedNode) ?? session.roadmap.nodes[0];
  const completed = session.roadmap.nodes.filter(node => packets.some(packet => packet.roadmapId === session.roadmap.id && packet.nodeId === node.id && progress.some(p => p.packetId === packet.id && p.completedAt))).length;
  const totalBytes = packets.reduce((sum, packet) => sum + packetBytes(packet), 0);
  const navItems: { id: View; label: string; icon: 'home' | 'route' | 'download' | 'settings' }[] = [{ id: 'learning', label: 'My learning', icon: 'home' }, { id: 'roadmap', label: 'Skill roadmap', icon: 'route' }, { id: 'library', label: 'Offline library', icon: 'download' }, { id: 'settings', label: 'Settings', icon: 'settings' }];
  function addSource() { openModal(session.mode === 'starter' ? 'profile' : 'source'); }
  const packetTile = (packet: Packet) => <article className="library-card" key={packet.id}>
    <div className="library-top"><span className="packet-symbol"><Icon name="book" size={25}/></span><span className="badge"><Icon name="check" size={12}/>On this device</span></div>
    <p className="eyebrow">{packet.generator === 'starter-lesson-v1' ? 'STARTER LESSON' : 'SOURCE PREVIEW'}</p><h3>{packet.title}</h3>
    <p className="subtle">{packet.objective}</p><div className="packet-meta"><span><Icon name="clock" size={14}/>{packet.estimatedMinutes} min</span><span>{formatBytes(packetBytes(packet))}</span></div>
    <div className="card-bottom"><button className="text-button" onClick={() => read(packet)}>Open packet<Icon name="arrow" size={18}/></button><div className="card-actions"><button className="icon-button" title="Export packet JSON" aria-label={`Export ${packet.title}`} onClick={() => exportJson(packet, `skillpacket-${packet.id}.json`)}><Icon name="download" size={17}/></button><button className="icon-button" title="Remove from this device" aria-label={`Remove ${packet.title}`} onClick={() => { void removePacket(packet.id); }}><Icon name="trash" size={17}/></button></div></div>
  </article>;
  return <div className="app">
    <a className="skip-link" href="#main">Skip to main content</a>
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <a className="brand" href="/"><span className="brand-symbol"><Icon name="layers" size={24}/></span><span>SkillPacket<span className="brand-ai">AI</span></span></a>
      <p className="sidebar-label">YOUR LEARNING SPACE</p><nav aria-label="Main navigation">{navItems.map(item => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} aria-current={view === item.id ? 'page' : undefined} onClick={() => { setView(item.id); setMobileNav(false); }}><Icon name={item.icon}/><span>{item.label}</span>{item.id === 'library' && packets.length > 0 && <span className="nav-count">{packets.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="offline-callout"><span className="round-icon"><Icon name="leaf"/></span><strong>Big dreams.<br/>Small downloads.</strong><p>Keep learning wherever life takes you.</p><button className="sidebar-link" onClick={() => { setView('library'); setMobileNav(false); }}>Your offline library<Icon name="arrow" size={17}/></button></div><button className="sidebar-profile" onClick={() => openModal('profile')}><span className="avatar">Y</span><span><strong>Your learning journey</strong><small>{session.mode === 'starter' ? 'Start with a free preview' : session.profile.region}</small></span><Icon name="chevron" size={14}/></button></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu" aria-label="Toggle navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)}><Icon name="menu"/></button><span>Workspace</span><Icon name="chevron" size={12}/><strong>{navItems.find(item => item.id === view)?.label}</strong></div><div className="topbar-right"><ThemeSwitcher theme={theme} changeTheme={changeTheme}/><span className={`connection ${online ? '' : 'disconnected'}`}><span className="status-dot"/>{online ? 'Online' : 'Offline mode'}</span><button className="top-avatar" aria-label="Open your learning settings" onClick={() => setView('settings')}>Y</button></div></header>
      <main id="main">
        {!online && <div className="connection-banner"><Icon name="offline" size={18}/>You’re offline. Saved packets and quizzes are ready on this device.</div>}
        {pending.length > 0 && <div className="connection-banner"><span className="spinner"/>{pending.length} packet{pending.length !== 1 ? 's' : ''} being prepared. {online ? 'They’ll appear in your library when ready.' : 'Reconnect to receive them.'}</div>}
        {(view === 'learning' || view === 'roadmap') && <>
          <div className="page-heading"><div><p className="eyebrow">SMALL STEPS. REAL POSSIBILITIES.</p><h1>{view === 'learning' ? <>Your next chapter,<br/>one packet at a time.</> : <>A clear path to<br/>your next skill.</>}</h1><p className="page-subtitle">Build useful skills, at your pace. Take your learning with you.</p></div><button className="secondary setup-button" onClick={() => openModal('profile')}><Icon name="plus" size={18}/>{session.mode === 'starter' ? 'Set up my pathway' : 'New pathway'}</button></div>
          <div className="stats-row"><div className="stat"><span className="stat-icon"><Icon name="route"/></span><div><strong>{completed}<span> / {session.roadmap.nodes.length}</span></strong><p>Milestones studied</p></div></div><div className="stat"><span className="stat-icon"><Icon name="download"/></span><div><strong>{packets.length}</strong><p>Packets on this device</p></div></div><div className="stat"><span className="stat-icon"><Icon name="clock"/></span><div><strong>{session.profile.minutesPerDay}<span> min</span></strong><p>Your daily study goal</p></div></div><div className="stat"><span className="stat-icon"><Icon name="leaf"/></span><div><strong>{formatBytes(totalBytes)}</strong><p>Total saved lesson data</p></div></div></div>
          <section className="path-section" aria-labelledby="path-title"><div className="section-heading"><h2 id="path-title">Your skill pathway</h2><span className="small subtle">{session.mode === 'starter' ? 'Explore a starter pathway' : 'Your curated pathway'}</span></div>
            <div className="path-card"><div className="path-card-top"><span className="career-icon"><Icon name={activeCareer.icon} size={26}/></span><div className="career-title"><div className="career-title-row"><h3>{activeCareer.title}</h3><span className="badge">{session.profile.experience === 'beginner' ? 'Beginner friendly' : 'Core pathway'}</span></div><p>{activeCareer.description}</p></div><span className="path-label">{milestoneCount} MILESTONES</span></div>
            <div className="path-progress"><div><span>{completed === 0 ? 'Every journey starts with a first step' : `${completed} milestones studied — keep going`}</span><strong>{Math.round(completed / milestoneCount * 100)}%</strong></div><div className="progress-track"><span style={{ width: `${completed / milestoneCount * 100}%` }}/></div></div>
            <div className="roadmap-nodes">{session.roadmap.nodes.map((node, index) => {
              const studied = packets.some(packet => packet.roadmapId === session.roadmap.id && packet.nodeId === node.id && progress.some(p => p.packetId === packet.id && p.completedAt));
              return <button className={`roadmap-node ${selectedNode === node.id ? 'selected' : ''} ${studied ? 'studied' : ''}`} key={node.id} onClick={() => setSelectedNode(node.id)} aria-pressed={selectedNode === node.id}><span className="node-number">{studied ? <Icon name="check" size={17}/> : String(index + 1).padStart(2, '0')}</span><strong>{node.title}</strong><small>{studied ? 'Studied' : selectedNode === node.id ? 'Your focus' : 'Up ahead'}</small></button>;
            })}</div></div>
          </section>
          <div className="learning-grid"><section className="next-section" aria-labelledby="next-title"><div className="section-heading"><h2 id="next-title">{activePacket ? 'Your next small step' : 'Make this milestone yours'}</h2><span className="small subtle">One idea at a time</span></div>
            <article className="featured-packet"><div className="featured-main"><div className="featured-copy"><span className="featured-tag"><span/>{activePacket?.generator === 'starter-lesson-v1' ? 'STARTER PACKET' : activePacket ? 'SOURCE PREVIEW' : 'NEXT MILESTONE'}</span><h3>{activeNode.title}</h3><p>{activePacket ? activePacket.objective : activeNode.objective}</p><div className="packet-meta">{activePacket ? <><span><Icon name="clock" size={15}/>{activePacket.estimatedMinutes} min read</span><span><Icon name="leaf" size={15}/>{formatBytes(packetBytes(activePacket))}</span></> : <span>Add your notes or a transcript</span>}</div></div><div className="packet-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-code"><span className="code-dot"/><span className="code-dot"/><span className="code-dot"/><div><span className="art-purple">void</span> main() {'{'}<br/>&nbsp; <span className="art-purple">final</span> dream =<br/>&nbsp; &nbsp;<span className="art-green">'Build something.'</span>;<br/>&nbsp; start(dream);<br/>{'}'}</div></div><span className="art-badge"><Icon name="check" size={15}/>A little progress</span></div></div>
            <div className="featured-bottom"><span className="small"><Icon name="book" size={15}/>Read · Practice · Reflect</span>{activePacket ? <button className="primary" onClick={() => read(activePacket)}>Open packet<Icon name="arrow" size={18}/></button> : <button className="primary" onClick={addSource} disabled={!online || !backend}>Add a source<Icon name="plus" size={18}/></button>}</div></article>
          </section><aside className="opportunity-section"><div className="section-heading"><h2>A skill with a purpose</h2></div><div className="opportunity-card"><span className="opportunity-icon"><Icon name="route" size={24}/></span><p className="eyebrow">FROM LEARNING TO DOING</p><h3>Put your knowledge<br/>to work.</h3><p>{activeNode.careerTask}</p><div className="opportunity-footer"><span>Career connection</span><span className="subtle small">Task example</span></div></div></aside></div>
          <section className="bottom-strip"><span className="round-icon"><Icon name="download" size={23}/></span><div><h3>Your learning doesn’t need a signal.</h3><p>Save a packet once. Read, practice, and check yourself anywhere.</p></div><button className="text-button" onClick={() => setView('library')}>Explore offline library<Icon name="arrow" size={17}/></button></section>
          {activeCareer.guidance && <div className="notice roadmap-note">{activeCareer.guidance}</div>}
          {view === 'roadmap' && <div className="notice roadmap-note">Recommended order: follow the milestones from left to right. This is a curated {activeCareer.title} template; regional job demand has not been verified.</div>}
        </>}
        {view === 'library' && <>
          <div className="page-heading"><div><p className="eyebrow">ALWAYS WITHIN REACH</p><h1>Your learning.<br/>Ready to go.</h1><p className="page-subtitle">A small library for big possibilities. Yours, even without a signal.</p></div><button className="secondary" onClick={() => importRef.current?.click()}><Icon name="plus" size={18}/>Import a packet</button></div>
          <div className="library-toolbar"><span><strong>{packets.length}</strong> saved packets <span className="divider">/</span> {formatBytes(totalBytes)}</span><label className="search-field"><Icon name="search" size={18}/><input aria-label="Search saved packets" placeholder="Find a packet…" value={search} onChange={event => setSearch(event.target.value)}/></label></div>
          {packets.length ? <div className="library-grid">{packets.filter(packet => `${packet.title} ${packet.objective}`.toLowerCase().includes(search.toLowerCase())).map(packetTile)}{packets.every(packet => !`${packet.title} ${packet.objective}`.toLowerCase().includes(search.toLowerCase())) && <div className="empty-state"><h3>No matching packets</h3><p>Try another search.</p></div>}</div> : <div className="empty-library"><div className="empty-illustration"><Icon name="layers" size={52}/><span><Icon name="download" size={20}/></span></div><p className="eyebrow">YOUR FIRST PACKET IS WAITING</p><h2>A little knowledge, wherever you go.</h2><p>Save the starter lesson to try offline reading and quizzes.<br/>It’s only {formatBytes(packetBytes(starterPacket))}.</p><button className="primary" disabled={!ready} onClick={() => { void savePacket(starterPacket).then(() => notify('Starter packet saved on this device.')).catch(error => notify(errorMessage(error))); }}><Icon name="download" size={18}/>Save starter packet</button><button className="text-button" onClick={() => read(starterPacket)}>Read it first<Icon name="arrow" size={16}/></button></div>}
          <div className="library-note"><Icon name="leaf" size={19}/><p>{shellReady ? 'The app is ready to reopen offline. Saved packets and quiz progress stay on this device.' : 'Packets save to this device. The app shell is cached after loading the production PWA.'}</p></div>
        </>}
        {view === 'settings' && <>
          <div className="page-heading"><div><p className="eyebrow">MAKE ROOM FOR LEARNING</p><h1>Your pace.<br/>Your possibilities.</h1><p className="page-subtitle">A few simple preferences for your learning journey.</p></div></div>
          <section className="settings-card appearance-card"><h2>Make it feel like you</h2><p className="subtle small">Choose your view. Your preference stays on this device.</p><div className="theme-options" role="group" aria-label="Choose appearance">{themes.map(option => <button key={option} className={`theme-option ${theme === option ? 'selected' : ''}`} aria-pressed={theme === option} onClick={() => changeTheme(option)}><span className={`theme-swatch swatch-${option}`} aria-hidden="true"><span/><span/><span/></span><span className="theme-option-title">{option[0].toUpperCase() + option.slice(1)}{theme === option && <Icon name="check" size={15}/>}</span><small>{option === 'mix' ? 'The original balance' : option === 'dark' ? 'Softer in low light' : 'Bright and clear'}</small></button>)}</div></section>
          <div className="settings-grid"><section className="settings-card"><h2>Learning preferences</h2><dl><div><dt>Career pathway</dt><dd>{activeCareer.title}</dd></div><div><dt>Your region</dt><dd>{session.profile.region}</dd></div><div><dt>Daily study goal</dt><dd>{session.profile.minutesPerDay} minutes</dd></div><div><dt>Current pathway</dt><dd>{session.mode === 'starter' ? 'Starter preview' : 'Connected to backend'}</dd></div></dl><button className="secondary" onClick={() => openModal('profile')}>Set up a new pathway<Icon name="arrow" size={18}/></button><p className="small subtle">Existing saved packets stay in your library.</p></section>
          <section className="settings-card"><h2>Keep learning offline</h2><dl><div><dt>Saved lesson data</dt><dd>{formatBytes(totalBytes)}</dd></div><div><dt>Offline app shell</dt><dd>{shellReady ? 'Ready' : 'Available in production build'}</dd></div><div><dt>Learning service</dt><dd>{backend ? 'Connected' : 'Unavailable'}</dd></div><div><dt>Install status</dt><dd>{standalone ? 'App mode' : 'Browser mode'}</dd></div></dl><button className="primary" onClick={() => { void install(); }}><Icon name="download" size={18}/>{standalone ? 'App installed' : 'Install SkillPacket'}</button><button className="text-button" onClick={() => { void requestPersistentStorage().then(granted => notify(granted ? 'Persistent storage enabled on this device.' : 'The browser manages storage availability. You can export packets as a backup.')); }}>Keep device storage persistent<Icon name="arrow" size={17}/></button></section></div>
          <div className="notice">This preview supports English and four curated skill pathways. New lessons are unreviewed source previews while the teaching engine is being built. Quiz progress is saved locally.</div>
        </>}
        <footer className="page-footer"><span><Icon name="layers" size={15}/>Made for curiosity. Built for possibility.</span><button onClick={addSource} className="text-button" disabled={!online || !backend}><Icon name="plus" size={15}/>Create a packet</button></footer>
      </main>
    </div>
    <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={event => { void importPacket(event.target.files?.[0]); }}/>
    {toast && <div className="toast" role="status"><Icon name="check" size={19}/><span>{toast}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><Icon name="close" size={16}/></button></div>}
    {modal === 'profile' && <Modal title="A pathway for your next chapter" close={() => setModal(null)} busy={busy}><form onSubmit={event => { void setup(event); }} className="form-body"><p className="subtle">Choose a skill and tell us where you’re starting. Each pathway follows a curated learning sequence.</p><label>What do you want to become?<select value={profileForm.targetCareer} onChange={event => setProfileForm({ ...profileForm, targetCareer: event.target.value as CareerName })}>{careerNames.map(name => <option key={name} value={name}>{name}</option>)}</select><small>{careers[profileForm.targetCareer].description}</small></label>{careers[profileForm.targetCareer].guidance && <div className="notice career-guidance">{careers[profileForm.targetCareer].guidance}</div>}<label>Your region<input required maxLength={200} placeholder="e.g. Lagos, Nigeria" value={profileForm.region} onChange={event => setProfileForm({ ...profileForm, region: event.target.value })}/></label><div className="form-columns"><label>Starting point<select value={profileForm.experience} onChange={event => setProfileForm({ ...profileForm, experience: event.target.value as Profile['experience'] })}><option value="beginner">Just getting started</option><option value="intermediate">Some experience</option></select></label><label>Minutes per day<input type="number" min={5} max={180} required value={profileForm.minutesPerDay} onChange={event => setProfileForm({ ...profileForm, minutesPerDay: Number(event.target.value) })}/></label></div>{(!online || !backend) && <div className="notice">The learning service is unavailable. You can still explore and save the starter lesson.</div>}{formError && <p className="form-error" role="alert">{formError}</p>}<button className="primary full-width" type="submit" disabled={busy || !online || !backend}>{busy ? 'Preparing your pathway…' : 'Build my pathway'}<Icon name="arrow" size={18}/></button></form></Modal>}
    {modal === 'source' && <Modal title="Turn a resource into a small step" close={() => setModal(null)} busy={busy}><form onSubmit={event => { void generate(event); }} className="form-body"><p className="subtle">Add notes or a transcript for <strong>{activeNode.title}</strong>. Your packet will be saved to this device when ready.</p><label>Milestone<select value={selectedNode} onChange={event => setSelectedNode(event.target.value)}>{session.roadmap.nodes.map(node => <option key={node.id} value={node.id}>{node.title}</option>)}</select></label><label>Resource title<input required maxLength={200} placeholder="Give your resource a name" value={sourceForm.title} onChange={event => setSourceForm({ ...sourceForm, title: event.target.value })}/></label><div className="form-columns"><label>Resource type<select value={sourceForm.kind} onChange={event => setSourceForm({ ...sourceForm, kind: event.target.value as 'text' | 'transcript' })}><option value="text">Notes or plain text</option><option value="transcript">Video transcript</option></select></label><label>Source link (optional)<input type="url" placeholder="https://…" value={sourceForm.url} onChange={event => setSourceForm({ ...sourceForm, url: event.target.value })}/></label></div><label>Your resource text<textarea required minLength={40} maxLength={200_000} rows={7} placeholder="Paste your notes or transcript here…" value={sourceForm.text} onChange={event => setSourceForm({ ...sourceForm, text: event.target.value })}/></label><div className="source-upload-row"><button className="text-button" type="button" onClick={() => sourceFileRef.current?.click()}><Icon name="plus" size={16}/>Attach a text file</button><span className="small subtle">{sourceForm.text.length.toLocaleString()} characters</span></div><input ref={sourceFileRef} type="file" hidden accept=".txt,.srt,.vtt,text/plain" onChange={event => { const file = event.target.files?.[0]; if (file) void (async () => { try { if (file.size > 800_000) throw new Error('Choose a text file smaller than 800KB.'); const text = await file.text(); if (text.length > 200_000) throw new Error('Please use a shorter excerpt.'); setSourceForm(current => ({ ...current, text, title: current.title || file.name })); } catch (error) { setFormError(errorMessage(error)); } if (sourceFileRef.current) sourceFileRef.current.value = ''; })(); }}/><p className="small subtle">Text and transcript files are supported. PDF and YouTube extraction are coming later.</p><div className="notice">This version creates an unreviewed source preview, not an AI teaching lesson.</div>{formError && <p className="form-error" role="alert">{formError}</p>}<button className="primary full-width" type="submit" disabled={busy || !online || !backend}>{busy ? 'Sending your resource…' : 'Create my packet'}<Icon name="arrow" size={18}/></button></form></Modal>}
    {modal === 'reader' && <Reader key={readerPacket.id} packet={readerPacket} saved={packets.some(packet => packet.id === readerPacket.id)} save={savePacket} close={() => setModal(null)} refresh={refresh} notify={notify}/>}
  </div>;
}
function Router() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => { window.scrollTo(0, 0); }, [path]);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update);
  }, []);
  function openApp(career?: CareerName, starter?: boolean) { window.history.pushState({}, '', career ? `/learn?career=${encodeURIComponent(career)}` : starter ? '/learn?packet=starter' : '/learn'); setPath('/learn'); }
  const requestedCareer = new URLSearchParams(window.location.search).get('career');
  const initialCareer = careerNames.find(career => career === requestedCareer);
  return path === '/learn' || path.startsWith('/learn/') ? <App initialCareer={initialCareer} showStarter={new URLSearchParams(window.location.search).get('packet') === 'starter'}/> : <Landing openApp={openApp}/>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Router/></React.StrictMode>);
