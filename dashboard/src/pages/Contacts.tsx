import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Search,
  Users,
  Check,
  Loader2,
  FileSpreadsheet,
  Plus,
  X,
  Trash2,
  Edit2,
  Send,
  FolderOpen,
  UserPlus,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { importedContactApi, contactGroupApi, messageApi } from '../services/api';
import type { ImportedContact, ContactGroup, ContactGroupDetail } from '../services/api';
import { useSessionsQuery } from '../hooks/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRole } from '../hooks/useRole';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import './Contacts.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = 'contacts' | 'groups';
type GroupView = 'list' | 'detail';

// ─── Component ────────────────────────────────────────────────────────────────

export function Contacts() {
  const { t } = useTranslation();
  useDocumentTitle(t('contacts.title'));
  const { canWrite } = useRole();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sessions
  const { data: allSessions = [], isLoading: loadingSessions } = useSessionsQuery();
  const sessions = allSessions.filter(s => s.status === 'ready');
  const [selectedSession, setSelectedSession] = useState('');

  // Main tab: Contacts | Groups
  const [mainTab, setMainTab] = useState<MainTab>('contacts');

  // ── Contacts State ──────────────────────────────────────────────────────────

  const [importedContacts, setImportedContacts] = useState<ImportedContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]); // used for adding to groups

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Contact modal
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // ── Groups State ────────────────────────────────────────────────────────────

  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupView, setGroupView] = useState<GroupView>('list');
  const [activeGroup, setActiveGroup] = useState<ContactGroupDetail | null>(null);
  const [isLoadingGroupDetail, setIsLoadingGroupDetail] = useState(false);

  // Create Group modal
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Edit Group modal
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  // Add Member modal (within group detail)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  // Blast WA modal (unified: contacts or group)
  const [isBlastOpen, setIsBlastOpen] = useState(false);
  const [blastMode, setBlastMode] = useState<'contacts' | 'group'>('contacts');
  const [blastGroupId, setBlastGroupId] = useState('');
  const [blastMessage, setBlastMessage] = useState('');
  const [blastDelay, setBlastDelay] = useState(3000);
  const [isBlasting, setIsBlasting] = useState(false);
  const [blastProgress, setBlastProgress] = useState<{ done: number; total: number } | null>(null);

  // Bulk delete
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // ── Load Data ───────────────────────────────────────────────────────────────

  const loadImportedContacts = useCallback(async () => {
    setIsLoadingContacts(true);
    try {
      const data = await importedContactApi.list();
      setImportedContacts(data);
    } catch (err) {
      console.error('Failed to load imported contacts:', err);
      toast.error('Gagal mengambil data kontak dari database.');
    } finally {
      setIsLoadingContacts(false);
    }
  }, [toast]);

  const loadGroups = useCallback(async () => {
    setIsLoadingGroups(true);
    try {
      const data = await contactGroupApi.list();
      setGroups(data);
    } catch (err) {
      console.error('Failed to load groups:', err);
      toast.error('Gagal mengambil data group.');
    } finally {
      setIsLoadingGroups(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadImportedContacts();
  }, [loadImportedContacts]);

  useEffect(() => {
    if (mainTab === 'groups') {
      void loadGroups();
    }
  }, [mainTab, loadGroups]);

  useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0].id);
    }
  }, [sessions, selectedSession]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ── Phone helpers ───────────────────────────────────────────────────────────

  const cleanPhoneNumber = (num: string): string => {
    let clean = num.replace(/[^0-9]/g, '');
    while (clean.startsWith('0')) {
      clean = clean.substring(1);
    }
    if (clean.length > 0 && clean.startsWith('8')) {
      clean = '62' + clean;
    }
    return clean;
  };

  const findColumnValue = (row: Record<string, unknown>, keys: string[]): string => {
    const rowKeys = Object.keys(row);
    for (const k of keys) {
      const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
      if (foundKey) return String(row[foundKey]);
    }
    return '';
  };

  const parseRows = (rows: Record<string, unknown>[]): { name: string; phone: string }[] => {
    const parsed: { name: string; phone: string }[] = [];
    rows.forEach(row => {
      const name = findColumnValue(row, ['name', 'nama', 'full name', 'nama lengkap', 'display name', 'petugas']);
      const phoneRaw = findColumnValue(row, ['phone', 'phone number', 'no hp', 'number', 'no telepon', 'no telp', 'telepon', 'whatsapp', 'telp']);
      const phone = cleanPhoneNumber(phoneRaw);
      if (phone) {
        parsed.push({ name: name || `Contact ${phone}`, phone });
      }
    });
    return parsed;
  };

  // ── Import Excel ────────────────────────────────────────────────────────────

  const importContactsToDatabase = async (parsed: { name: string; phone: string }[]) => {
    setIsLoadingContacts(true);
    let successCount = 0;
    try {
      for (const contact of parsed) {
        try {
          await importedContactApi.create(contact.name, contact.phone);
          successCount++;
        } catch (e) {
          console.error(`Failed to import contact: ${contact.name}`, e);
        }
      }
      toast.success(`Berhasil mengimpor ${successCount} kontak ke database.`);
      await loadImportedContacts();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan kontak impor ke database.');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
          const parsed = parseRows(json);
          if (parsed.length > 0) {
            await importContactsToDatabase(parsed);
          } else {
            toast.error('Tidak ada kontak ditemukan. Pastikan header kolom sudah benar (Name, Phone).');
          }
        } catch (err) {
          toast.error(`Gagal memproses file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Hanya file Excel (.xlsx, .xls) yang didukung.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── Download Excel Template ─────────────────────────────────────────────────

  const downloadExcelTemplate = () => {
    try {
      const data = [
        { 'Name': 'Contoh Nama', 'Phone': '628123456789' },
        { 'Name': 'Ahmad Fulan', 'Phone': '628987654321' },
      ];
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
      XLSX.writeFile(workbook, 'contacts_template.xlsx');
      toast.success('Template Excel berhasil diunduh.');
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat template Excel.');
    }
  };

  // ── Contact Selection (for adding to group) ─────────────────────────────────

  const toggleSelectContact = (id: string) => {
    setSelectedContactIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const filteredContacts = importedContacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );
  const totalPages = Math.ceil(filteredContacts.length / pageSize);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const isAllSelected =
    paginatedContacts.length > 0 &&
    paginatedContacts.every(c => selectedContactIds.includes(c.id));

  const toggleSelectAll = () => {
    const ids = paginatedContacts.map(c => c.id);
    if (isAllSelected) {
      setSelectedContactIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedContactIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  // ── Delete Contact ──────────────────────────────────────────────────────────

  const deleteContact = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Hapus kontak ini secara permanen dari database?')) return;
    try {
      await importedContactApi.delete(id);
      setImportedContacts(prev => prev.filter(c => c.id !== id));
      setSelectedContactIds(prev => prev.filter(p => p !== id));
      toast.info('Kontak berhasil dihapus.');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus kontak.');
    }
  };

  // ── Add Contact Manual ──────────────────────────────────────────────────────

  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = cleanPhoneNumber(newContactPhone);
    if (!phone) { toast.error('Format nomor HP tidak valid.'); return; }
    try {
      const created = await importedContactApi.create(newContactName.trim(), phone);
      setImportedContacts(prev => {
        const filtered = prev.filter(c => c.phone !== phone);
        return [...filtered, created];
      });
      toast.success('Kontak berhasil disimpan.');
      setNewContactName(''); setNewContactPhone(''); setIsAddContactOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan kontak.');
    }
  };

  // ── Group CRUD ──────────────────────────────────────────────────────────────

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingGroup(true);
    try {
      const group = await contactGroupApi.create(newGroupName.trim(), newGroupDesc.trim() || undefined);
      setGroups(prev => [...prev, { ...group, memberCount: group.members.length }]);
      toast.success(`Group "${group.name}" berhasil dibuat.`);
      setNewGroupName(''); setNewGroupDesc(''); setIsCreateGroupOpen(false);
    } catch (err) {
      toast.error(`Gagal membuat group: ${err instanceof Error ? err.message : ''}`);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const openGroupDetail = async (groupId: string) => {
    setIsLoadingGroupDetail(true);
    setGroupView('detail');
    try {
      const detail = await contactGroupApi.get(groupId);
      setActiveGroup(detail);
    } catch (err) {
      toast.error('Gagal memuat detail group.');
      setGroupView('list');
    } finally {
      setIsLoadingGroupDetail(false);
    }
  };

  const handleEditGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    setIsSavingGroup(true);
    try {
      await contactGroupApi.update(activeGroup.id, editGroupName.trim(), editGroupDesc.trim() || undefined);
      setActiveGroup(prev => prev ? { ...prev, name: editGroupName.trim(), description: editGroupDesc.trim() } : prev);
      setGroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, name: editGroupName.trim(), description: editGroupDesc.trim() } : g));
      toast.success('Group berhasil diupdate.');
      setIsEditGroupOpen(false);
    } catch (err) {
      toast.error('Gagal mengupdate group.');
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Hapus group "${groupName}"? Kontak di dalamnya tidak akan terhapus.`)) return;
    try {
      await contactGroupApi.delete(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      if (activeGroup?.id === groupId) { setGroupView('list'); setActiveGroup(null); }
      toast.info(`Group "${groupName}" berhasil dihapus.`);
    } catch (err) {
      toast.error('Gagal menghapus group.');
    }
  };

  // ── Member Management ───────────────────────────────────────────────────────

  // contacts not yet in the active group (for Add Member modal)
  const contactsNotInGroup = importedContacts.filter(c =>
    !activeGroup?.members.some(m => m.contactId === c.id) &&
    (c.name.toLowerCase().includes(memberSearch.toLowerCase()) || c.phone.includes(memberSearch))
  );

  const [pendingMemberIds, setPendingMemberIds] = useState<string[]>([]);

  const handleAddMembers = async () => {
    if (!activeGroup || pendingMemberIds.length === 0) return;
    setIsAddingMembers(true);
    try {
      const result = await contactGroupApi.addMembers(activeGroup.id, pendingMemberIds);
      toast.success(`${result.added} anggota berhasil ditambahkan.${result.skipped > 0 ? ` (${result.skipped} sudah ada)` : ''}`);
      // Reload detail
      const detail = await contactGroupApi.get(activeGroup.id);
      setActiveGroup(detail);
      setGroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, memberCount: detail.members.length } : g));
      setPendingMemberIds([]); setMemberSearch(''); setIsAddMemberOpen(false);
    } catch (err) {
      toast.error('Gagal menambahkan anggota.');
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!activeGroup) return;
    if (!window.confirm(`Hapus ${memberName} dari group ini? Kontaknya tidak akan terhapus.`)) return;
    try {
      await contactGroupApi.removeMember(activeGroup.id, memberId);
      const detail = await contactGroupApi.get(activeGroup.id);
      setActiveGroup(detail);
      setGroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, memberCount: detail.members.length } : g));
      toast.info(`${memberName} dihapus dari group.`);
    } catch (err) {
      toast.error('Gagal menghapus anggota dari group.');
    }
  };

  // ── Bulk Delete ─────────────────────────────────────────────────────────────

  const handleBulkDelete = async () => {
    if (selectedContactIds.length === 0) return;
    if (!window.confirm(`Hapus ${selectedContactIds.length} kontak yang dipilih secara permanen dari database?`)) return;
    setIsDeletingBulk(true);
    let deleted = 0;
    try {
      for (const id of selectedContactIds) {
        try { await importedContactApi.delete(id); deleted++; } catch { /* skip */ }
      }
      setImportedContacts(prev => prev.filter(c => !selectedContactIds.includes(c.id)));
      setSelectedContactIds([]);
      toast.info(`${deleted} kontak berhasil dihapus.`);
    } catch (err) {
      toast.error('Terjadi kesalahan saat menghapus kontak.');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // ── Blast WA (Unified) ──────────────────────────────────────────────────────

  const openBlastModal = (mode: 'contacts' | 'group', groupId?: string) => {
    setBlastMode(mode);
    setBlastGroupId(groupId ?? (groups[0]?.id ?? ''));
    setBlastMessage('');
    setBlastProgress(null);
    setIsBlastOpen(true);
  };

  const handleBlast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !blastMessage.trim()) return;
    setIsBlasting(true);
    setBlastProgress(null);

    try {
      if (blastMode === 'group') {
        // Backend handles group blast
        if (!blastGroupId) { toast.error('Pilih group terlebih dahulu.'); return; }
        const result = await contactGroupApi.blast(blastGroupId, selectedSession, blastMessage.trim(), blastDelay);
        toast.success(result.message);
      } else {
        // Frontend loop for selected contacts
        const targets = importedContacts.filter(c => selectedContactIds.includes(c.id));
        if (targets.length === 0) { toast.error('Tidak ada kontak yang dipilih.'); return; }
        let sent = 0; let failed = 0;
        setBlastProgress({ done: 0, total: targets.length });
        for (let i = 0; i < targets.length; i++) {
          const contact = targets[i];
          try {
            const chatId = `${contact.phone}@c.us`;
            const msg = blastMessage.trim().replace(/\{\{name\}\}/g, contact.name);
            await messageApi.sendText(selectedSession, chatId, msg);
            sent++;
          } catch { failed++; }
          setBlastProgress({ done: i + 1, total: targets.length });
          if (i < targets.length - 1) await new Promise(r => setTimeout(r, blastDelay));
        }
        toast.success(`Blast selesai: ${sent} berhasil${failed > 0 ? `, ${failed} gagal` : ''}.`);
      }
      setIsBlastOpen(false); setBlastMessage('');
    } catch (err) {
      toast.error(`Gagal mengirim blast: ${err instanceof Error ? err.message : ''}`);
    } finally {
      setIsBlasting(false);
      setBlastProgress(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingSessions) {
    return (
      <div className="contacts-page loading">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="contacts-page">
      <PageHeader title={t('contacts.title')} subtitle={t('contacts.subtitle')} />

      {/* Main Tabs */}
      <div className="tabs-container" style={{ marginTop: '1.5rem' }}>
        <button
          className={`tab-btn ${mainTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setMainTab('contacts')}
        >
          <FileSpreadsheet size={16} />
          Database Kontak ({importedContacts.length})
        </button>
        <button
          className={`tab-btn ${mainTab === 'groups' ? 'active' : ''}`}
          onClick={() => setMainTab('groups')}
        >
          <Users size={16} />
          Groups ({groups.length})
        </button>
      </div>

      {/* ══════════════════════════════════════════ CONTACTS TAB ══ */}
      {mainTab === 'contacts' && (
        <div className="contacts-grid">
          {/* Left Panel */}
          <div className="left-panel">
            {/* Import Card */}
            <div className="card upload-card">
              <h2><Upload size={18} /> Import Kontak</h2>
              <p className="description">Upload file Excel (.xlsx) dengan kolom <strong>Name</strong> dan <strong>Phone</strong>.</p>

              <div
                className={`dropzone ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                />
                <Upload className="upload-icon" size={36} />
                <span>Drag & drop atau klik untuk upload</span>
                <span className="file-hint">Excel (.xlsx, .xls)</span>
              </div>

              <div className="template-downloads" style={{ marginTop: '0.75rem' }}>
                <button
                  className="template-btn xlsx"
                  style={{ gridColumn: '1 / -1' }}
                  onClick={e => { e.stopPropagation(); downloadExcelTemplate(); }}
                >
                  <FileSpreadsheet size={14} />
                  Download Template Excel
                </button>
              </div>

              {importedContacts.length > 0 && (
                <div className="import-status">
                  <div className="status-info">
                    <Check size={16} className="status-success-icon" />
                    <span>{importedContacts.length} kontak tersimpan di database.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Card */}
            <div className="card action-card">
              <h2>Aksi</h2>
              <button className="add-contact-btn" onClick={() => setIsAddContactOpen(true)}>
                <Plus size={18} /> Tambah Kontak Manual
              </button>

              {selectedContactIds.length > 0 && (
                <>
                  <div style={{ marginTop: '0.75rem', padding: '0.625rem', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 8 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-color,#2563eb)' }}>
                      {selectedContactIds.length} kontak dipilih
                    </span>
                    <button
                      style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-secondary,#94a3b8)', padding: 0 }}
                      onClick={() => setSelectedContactIds([])}
                    >Batal pilih</button>
                  </div>
                  <button
                    className="add-contact-btn"
                    style={{ marginTop: '0.5rem', background: '#16a34a', color: '#fff', border: 'none' }}
                    onClick={() => openBlastModal('contacts')}
                    disabled={!selectedSession}
                    title={!selectedSession ? 'Pilih sesi WA terlebih dahulu' : ''}
                  >
                    <Send size={16} /> Blast WA ke {selectedContactIds.length} Kontak
                  </button>
                  <button
                    className="add-contact-btn"
                    style={{ marginTop: '0.5rem', background: 'rgba(37,99,235,0.08)', color: 'var(--primary-color,#2563eb)', border: '1px solid rgba(37,99,235,0.2)' }}
                    onClick={() => { setMainTab('groups'); }}
                  >
                    <FolderOpen size={16} /> Tambahkan ke Group
                  </button>
                  <button
                    className="add-contact-btn"
                    style={{ marginTop: '0.5rem', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}
                    onClick={handleBulkDelete}
                    disabled={isDeletingBulk}
                  >
                    {isDeletingBulk ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    Hapus {selectedContactIds.length} Kontak
                  </button>
                </>
              )}

              {/* Session picker for blast */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color,#e2e8f0)', paddingTop: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary,#64748b)', display: 'block', marginBottom: '0.4rem' }}>Sesi WA Aktif</label>
                <select
                  value={selectedSession}
                  onChange={e => setSelectedSession(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border-color,#cbd5e1)', background: 'var(--bg-card,#fff)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
                >
                  {sessions.length === 0 && <option value="">Tidak ada sesi READY</option>}
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone ?? 'No Phone'})</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Right Panel: Contact Table */}
          <div className="right-panel">
            <div className="card table-card">
              <div className="table-header-row">
                <h2>
                  Daftar Kontak
                  <span className="count-badge">({filteredContacts.length})</span>
                </h2>
                <div className="filters">
                  <div className="search-box">
                    <Search size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Cari nama atau nomor..."
                    />
                  </div>
                </div>
              </div>

              {isLoadingContacts ? (
                <div className="table-loading">
                  <Loader2 className="animate-spin" size={24} />
                  <span>Memuat kontak...</span>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="table-empty">
                  <Users size={48} />
                  <p>Belum ada kontak. Import dari file Excel atau tambah manual.</p>
                </div>
              ) : (
                <div className="table-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                    <table className="contacts-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>
                            <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} />
                          </th>
                          <th>{t('contacts.table.name')}</th>
                          <th>{t('contacts.table.phone')}</th>
                          <th style={{ width: 80, textAlign: 'right' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedContacts.map(c => {
                          const isSelected = selectedContactIds.includes(c.id);
                          return (
                            <tr
                              key={c.id}
                              className={isSelected ? 'selected-row' : ''}
                              onClick={() => toggleSelectContact(c.id)}
                            >
                              <td onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectContact(c.id)}
                                />
                              </td>
                              <td className="contact-name"><span>{c.name}</span></td>
                              <td className="contact-phone mono">+{c.phone}</td>
                              <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                <button
                                  className="delete-row-btn"
                                  onClick={e => deleteContact(c.id, e)}
                                  title="Hapus Kontak"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination-bar">
                    <div className="pagination-info">
                      Showing {filteredContacts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} –{' '}
                      {Math.min(filteredContacts.length, currentPage * pageSize)} of {filteredContacts.length}
                    </div>
                    <div className="pagination-controls">
                      <button
                        className="pagination-btn"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      >Previous</button>
                      <span className="page-indicator">Page {currentPage} of {totalPages || 1}</span>
                      <button
                        className="pagination-btn"
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      >Next</button>
                      <select
                        className="page-size-select"
                        value={pageSize}
                        onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      >
                        <option value={10}>10 / page</option>
                        <option value={25}>25 / page</option>
                        <option value={50}>50 / page</option>
                        <option value={100}>100 / page</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ GROUPS TAB ══ */}
      {mainTab === 'groups' && (
        <div style={{ marginTop: '1.5rem' }}>
          {groupView === 'list' && (
            <>
              {/* Session Picker + Create Group */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary,#64748b)' }}>Sesi WA:</span>
                  <select
                    value={selectedSession}
                    onChange={e => setSelectedSession(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid var(--border-color,#cbd5e1)', background: 'var(--bg-card,#fff)', color: 'var(--text-primary,#1e293b)', fontSize: '0.875rem', outline: 'none' }}
                  >
                    {sessions.length === 0 && <option value="">Tidak ada sesi READY</option>}
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone || 'No Phone'})</option>
                    ))}
                  </select>
                </div>
                {canWrite && (
                  <button
                    className="btn-submit"
                    onClick={() => setIsCreateGroupOpen(true)}
                  >
                    <Plus size={16} /> Buat Group Baru
                  </button>
                )}
              </div>

              {isLoadingGroups ? (
                <div className="table-loading">
                  <Loader2 className="animate-spin" size={24} />
                  <span>Memuat groups...</span>
                </div>
              ) : groups.length === 0 ? (
                <div className="table-empty" style={{ padding: '6rem 0' }}>
                  <Users size={48} />
                  <p>Belum ada group. Buat group baru dan tambahkan kontak untuk mulai blast WA personal.</p>
                  {canWrite && (
                    <button className="btn-submit" onClick={() => setIsCreateGroupOpen(true)}>
                      <Plus size={16} /> Buat Group Pertama
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                  {groups.map(group => (
                    <div
                      key={group.id}
                      className="card"
                      style={{ marginBottom: 0, cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
                      onClick={() => openGroupDetail(group.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <FolderOpen size={18} style={{ color: 'var(--primary-color,#2563eb)', flexShrink: 0 }} />
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary,#1e293b)' }}>{group.name}</h3>
                          </div>
                          {group.description && (
                            <p style={{ margin: '0.25rem 0 0.5rem 1.625rem', fontSize: '0.8rem', color: 'var(--text-secondary,#64748b)', lineHeight: 1.4 }}>{group.description}</p>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', marginLeft: '1.625rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary,#64748b)' }}>
                              <Users size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                              {group.memberCount} anggota
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          <button
                            className="delete-row-btn"
                            title="Hapus Group"
                            onClick={() => handleDeleteGroup(group.id, group.name)}
                            style={{ padding: '0.375rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                        <button
                          className="btn-submit"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', background: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          disabled={!selectedSession || group.memberCount === 0}
                          title={!selectedSession ? 'Pilih sesi WA terlebih dahulu di tab Contacts' : group.memberCount === 0 ? 'Group kosong' : `Blast WA ke ${group.memberCount} anggota`}
                          onClick={() => openBlastModal('group', group.id)}
                        >
                          <Send size={12} /> Blast WA
                        </button>
                        <span
                          style={{ fontSize: '0.8rem', color: 'var(--primary-color,#2563eb)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                          onClick={() => openGroupDetail(group.id)}
                        >
                          Lihat Detail <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Group Detail View ── */}
          {groupView === 'detail' && (
            <div>
              {/* Back + Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn-cancel"
                  onClick={() => { setGroupView('list'); setActiveGroup(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ArrowLeft size={15} /> Kembali
                </button>
                {isLoadingGroupDetail ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : activeGroup && (
                  <>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{activeGroup.name}</h2>
                      {activeGroup.description && (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary,#64748b)' }}>{activeGroup.description}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                      <button
                        className="btn-cancel"
                        onClick={() => { setEditGroupName(activeGroup.name); setEditGroupDesc(activeGroup.description ?? ''); setIsEditGroupOpen(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      {canWrite && selectedSession && (
                        <button
                          className="btn-submit"
                          onClick={() => openBlastModal('group', activeGroup.id)}
                          disabled={!activeGroup.members.length}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                          title={!activeGroup.members.length ? 'Tambahkan anggota terlebih dahulu' : ''}
                        >
                          <Send size={14} /> Blast WA Personal
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {isLoadingGroupDetail ? (
                <div className="table-loading"><Loader2 className="animate-spin" size={24} /></div>
              ) : activeGroup && (
                <div className="card table-card">
                  <div className="table-header-row">
                    <h2>
                      Anggota Group
                      <span className="count-badge">({activeGroup.members.length})</span>
                    </h2>
                    <button
                      className="btn-submit"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      onClick={() => { setPendingMemberIds([]); setMemberSearch(''); setIsAddMemberOpen(true); }}
                    >
                      <UserPlus size={15} /> Tambah Anggota
                    </button>
                  </div>

                  {activeGroup.members.length === 0 ? (
                    <div className="table-empty">
                      <Users size={40} />
                      <p>Group masih kosong. Tambahkan kontak ke group ini.</p>
                      <button className="btn-submit" onClick={() => setIsAddMemberOpen(true)}>
                        <UserPlus size={15} /> Tambah Anggota
                      </button>
                    </div>
                  ) : (
                    <table className="contacts-table">
                      <thead>
                        <tr>
                          <th>Nama</th>
                          <th>Nomor</th>
                          <th style={{ width: 80, textAlign: 'right' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeGroup.members.map(m => (
                          <tr key={m.id}>
                            <td className="contact-name">{m.name}</td>
                            <td className="contact-phone mono">+{m.phone}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="delete-row-btn"
                                title="Hapus dari group"
                                onClick={() => handleRemoveMember(m.id, m.name)}
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════ MODALS ══ */}

      {/* Add Contact Manual */}
      {isAddContactOpen && (
        <div className="modal-overlay" onClick={() => setIsAddContactOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Kontak Baru</h2>
              <button className="close-modal-btn" onClick={() => setIsAddContactOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddContactSubmit}>
              <div className="form-group">
                <label htmlFor="contact-name">Nama Lengkap</label>
                <input id="contact-name" type="text" required value={newContactName} onChange={e => setNewContactName(e.target.value)} placeholder="Contoh: Ahmad Fulan" />
              </div>
              <div className="form-group">
                <label htmlFor="contact-phone">Nomor HP / WhatsApp</label>
                <input id="contact-phone" type="text" required value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} placeholder="Contoh: 081234567890 atau 6281234567890" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsAddContactOpen(false)}>Batal</button>
                <button type="submit" className="btn-submit" disabled={!newContactName.trim() || !newContactPhone.trim()}>
                  <Check size={16} /> Simpan Kontak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group */}
      {isCreateGroupOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateGroupOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Buat Group Baru</h2>
              <button className="close-modal-btn" onClick={() => setIsCreateGroupOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label htmlFor="group-name">Nama Group</label>
                <input id="group-name" type="text" required value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Contoh: Tim Santri 2024" />
              </div>
              <div className="form-group">
                <label htmlFor="group-desc">Deskripsi (opsional)</label>
                <input id="group-desc" type="text" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Contoh: Group untuk blast info pesantren" />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary,#64748b)', marginBottom: '1rem' }}>
                💡 Setelah dibuat, tambahkan kontak ke group dari halaman detail group.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsCreateGroupOpen(false)}>Batal</button>
                <button type="submit" className="btn-submit" disabled={isCreatingGroup || !newGroupName.trim()}>
                  {isCreatingGroup ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  {isCreatingGroup ? 'Membuat...' : 'Buat Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Group */}
      {isEditGroupOpen && activeGroup && (
        <div className="modal-overlay" onClick={() => setIsEditGroupOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Group</h2>
              <button className="close-modal-btn" onClick={() => setIsEditGroupOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditGroupSubmit}>
              <div className="form-group">
                <label>Nama Group</label>
                <input type="text" required value={editGroupName} onChange={e => setEditGroupName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Deskripsi (opsional)</label>
                <input type="text" value={editGroupDesc} onChange={e => setEditGroupDesc(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsEditGroupOpen(false)}>Batal</button>
                <button type="submit" className="btn-submit" disabled={isSavingGroup || !editGroupName.trim()}>
                  {isSavingGroup ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {isAddMemberOpen && activeGroup && (
        <div className="modal-overlay" onClick={() => setIsAddMemberOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Anggota ke "{activeGroup.name}"</h2>
              <button className="close-modal-btn" onClick={() => setIsAddMemberOpen(false)}><X size={20} /></button>
            </div>
            <div className="search-box" style={{ marginBottom: '1rem' }}>
              <Search size={16} />
              <input
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Cari kontak..."
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: 8, marginBottom: '1rem' }}>
              {contactsNotInGroup.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary,#94a3b8)', fontSize: '0.875rem' }}>
                  Semua kontak sudah ada di group ini.
                </div>
              ) : (
                contactsNotInGroup.map(c => (
                  <label
                    key={c.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color,#f1f5f9)', transition: 'background 0.15s' }}
                  >
                    <input
                      type="checkbox"
                      checked={pendingMemberIds.includes(c.id)}
                      onChange={() => setPendingMemberIds(prev =>
                        prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                      )}
                      style={{ accentColor: 'var(--primary-color,#2563eb)' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary,#64748b)' }}>+{c.phone}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setIsAddMemberOpen(false)}>Batal</button>
              <button
                className="btn-submit"
                disabled={isAddingMembers || pendingMemberIds.length === 0}
                onClick={handleAddMembers}
              >
                {isAddingMembers ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                Tambahkan ({pendingMemberIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blast WA Modal - Unified */}
      {isBlastOpen && (
        <div className="modal-overlay" onClick={() => !isBlasting && setIsBlastOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Send size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Blast WA Personal</h2>
              <button className="close-modal-btn" onClick={() => setIsBlastOpen(false)} disabled={isBlasting}><X size={20} /></button>
            </div>

            {/* Info bar */}
            <div style={{ padding: '0.75rem', background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 8, marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <strong>Sesi:</strong> {sessions.find(s => s.id === selectedSession)?.name ?? selectedSession}
              &nbsp;·&nbsp;
              {blastMode === 'group'
                ? <><strong>Group:</strong> {groups.find(g => g.id === blastGroupId)?.name} ({groups.find(g => g.id === blastGroupId)?.memberCount ?? 0} anggota)</>
                : <><strong>{selectedContactIds.length} kontak</strong> dipilih</>
              }
            </div>

            {/* Group selector (only for group mode) */}
            {blastMode === 'group' && (
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Pilih Group</label>
                <select
                  value={blastGroupId}
                  onChange={e => setBlastGroupId(e.target.value)}
                  disabled={isBlasting}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 6, border: '1px solid var(--border-color,#cbd5e1)', background: 'var(--bg-card,#fff)', color: 'var(--text-primary,#1e293b)', outline: 'none' }}
                >
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.memberCount} anggota)</option>)}
                </select>
              </div>
            )}

            <form onSubmit={handleBlast}>
              <div className="form-group">
                <label htmlFor="blast-msg">Pesan</label>
                <textarea
                  id="blast-msg"
                  required
                  disabled={isBlasting}
                  value={blastMessage}
                  onChange={e => setBlastMessage(e.target.value)}
                  placeholder="Halo {{name}}, ini pengumuman penting dari kami."
                  rows={5}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 6, border: '1px solid var(--border-color,#cbd5e1)', background: 'var(--bg-card,#fff)', color: 'var(--text-primary,#1e293b)', fontSize: '0.95rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary,#94a3b8)', marginTop: '0.35rem' }}>
                  Gunakan <code style={{ background: 'rgba(0,0,0,0.06)', padding: '0 0.3rem', borderRadius: 3 }}>{'{{name}}'}</code> untuk menyisipkan nama penerima.
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="blast-delay">Jeda antar pesan (ms)</label>
                <input
                  id="blast-delay"
                  type="number"
                  min={1000}
                  max={30000}
                  step={500}
                  disabled={isBlasting}
                  value={blastDelay}
                  onChange={e => setBlastDelay(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 6, border: '1px solid var(--border-color,#cbd5e1)', background: 'var(--bg-card,#fff)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                />
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary,#94a3b8)', marginTop: '0.35rem' }}>Rekomendasi: 3000ms. Jeda terlalu pendek berisiko akun WA dibatasi.</p>
              </div>

              {/* Progress bar */}
              {blastProgress && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary,#64748b)', marginBottom: '0.35rem' }}>
                    <span>Mengirim...</span>
                    <span>{blastProgress.done}/{blastProgress.total}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-body,#f1f5f9)', borderRadius: 9999 }}>
                    <div style={{ height: '100%', background: '#16a34a', borderRadius: 9999, width: `${(blastProgress.done / blastProgress.total) * 100}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsBlastOpen(false)} disabled={isBlasting}>Batal</button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isBlasting || !blastMessage.trim() || !selectedSession}
                  style={{ background: isBlasting ? undefined : '#16a34a' }}
                >
                  {isBlasting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  {isBlasting
                    ? blastProgress ? `Mengirim ${blastProgress.done}/${blastProgress.total}...` : 'Mengirim...'
                    : `Kirim ke ${blastMode === 'group' ? (groups.find(g => g.id === blastGroupId)?.memberCount ?? 0) : selectedContactIds.length} Penerima`
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
