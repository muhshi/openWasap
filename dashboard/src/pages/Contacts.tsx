import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Search,
  Users,
  Check,
  Loader2,
  Filter,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { sessionApi } from '../services/api';
import type { Contact as ApiContact } from '../services/api';
import { useSessionsQuery } from '../hooks/queries';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRole } from '../hooks/useRole';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import './Contacts.css';

interface DisplayContact {
  id: string;
  name: string;
  phone: string;
  source: 'whatsapp' | 'imported';
  isMyContact?: boolean;
  isBlocked?: boolean;
}

const DEFAULT_CONTACTS: DisplayContact[] = [
  { id: 'default_6285727253827_0', name: 'AHMAD KASYIF SYAROF', phone: '6285727253827', source: 'imported' },
  { id: 'default_6285848480751_1', name: 'AQIM LAKUMAL KIBRIYA', phone: '6285848480751', source: 'imported' },
  { id: 'default_6282226416889_2', name: 'Hasan taufiq', phone: '6282226416889', source: 'imported' },
  { id: 'default_6282310559106_3', name: 'Malikhatun Hidayah', phone: '6282310559106', source: 'imported' },
  { id: 'default_6281225008906_4', name: 'AHMAD GHOZALI', phone: '6281225008906', source: 'imported' },
  { id: 'default_62895352968314_5', name: 'Edi Susanto', phone: '62895352968314', source: 'imported' },
  { id: 'default_628886615482_6', name: 'Muzaki Manaf', phone: '628886615482', source: 'imported' },
  { id: 'default_6285326024321_7', name: 'Nur Hidayat', phone: '6285326024321', source: 'imported' },
  { id: 'default_6289508592098_8', name: 'Ahmad Baihaqi', phone: '6289508592098', source: 'imported' },
  { id: 'default_6282227182516_9', name: 'Fahmi Ainun Najib', phone: '6282227182516', source: 'imported' },
  { id: 'default_6283865650017_10', name: 'IIN ELIVA', phone: '6283865650017', source: 'imported' },
  { id: 'default_6285228199040_11', name: 'NUR MA\'RIFAH', phone: '6285228199040', source: 'imported' },
  { id: 'default_6282328093023_12', name: 'LAILA LATIFATUL MUNAWAROH', phone: '6282328093023', source: 'imported' },
  { id: 'default_6288901293973_13', name: 'Felasuf Al Zaki', phone: '6288901293973', source: 'imported' },
  { id: 'default_628982375060_14', name: 'Muhammad ulfi Sholeh', phone: '628982375060', source: 'imported' },
  { id: 'default_6288215754636_15', name: 'Atik aulia rohmasani', phone: '6288215754636', source: 'imported' },
  { id: 'default_6289630548046_16', name: 'Mina Ulyatul Umroh', phone: '6289630548046', source: 'imported' },
  { id: 'default_62859165961517_17', name: 'Nurun Nafiqoh', phone: '62859165961517', source: 'imported' },
  { id: 'default_6289519688567_18', name: 'Aminatus Soimah', phone: '6289519688567', source: 'imported' },
  { id: 'default_6287766622597_19', name: 'Mohamad Ihwan Zamroni', phone: '6287766622597', source: 'imported' },
  { id: 'default_6281297455382_20', name: 'Muhammad Izzuddin Fikri', phone: '6281297455382', source: 'imported' },
  { id: 'default_6282236177014_21', name: 'IMRON ROSYADI', phone: '6282236177014', source: 'imported' },
  { id: 'default_6282223664373_22', name: 'Kholisotun Naimah', phone: '6282223664373', source: 'imported' },
  { id: 'default_6282134625933_23', name: 'Nur Fatimayasari', phone: '6282134625933', source: 'imported' },
  { id: 'default_62895360596233_24', name: 'Satria Tri Astutik', phone: '62895360596233', source: 'imported' },
  { id: 'default_6282226416524_25', name: 'Azifatul Fatimah', phone: '6282226416524', source: 'imported' },
  { id: 'default_6281390153810_26', name: 'Faisal Basir', phone: '6281390153810', source: 'imported' },
  { id: 'default_6281328767425_27', name: 'ALI RIDHO', phone: '6281328767425', source: 'imported' },
  { id: 'default_6285293033540_28', name: 'Adis Rohmatullah', phone: '6285293033540', source: 'imported' },
  { id: 'default_628871350561_29', name: 'Dwi mustika melati', phone: '628871350561', source: 'imported' },
  { id: 'default_6282310191286_30', name: 'Nur Laili wakhidah', phone: '6282310191286', source: 'imported' },
  { id: 'default_6285290652076_31', name: 'UBAIDILLAH', phone: '6285290652076', source: 'imported' },
  { id: 'default_6281225135321_32', name: 'MUHAMAD LATIF', phone: '6281225135321', source: 'imported' },
  { id: 'default_6285735169571_33', name: 'Muhammad Rifqi Mubarok', phone: '6285735169571', source: 'imported' },
  { id: 'default_6281808040549_34', name: 'Nurma Amaliya', phone: '6281808040549', source: 'imported' },
  { id: 'default_6281393546261_35', name: 'Agus Ubaidillah', phone: '6281393546261', source: 'imported' },
  { id: 'default_6281513898641_36', name: 'Himmatul Cahyani', phone: '6281513898641', source: 'imported' },
  { id: 'default_628895742401_37', name: 'Inayah', phone: '628895742401', source: 'imported' },
  { id: 'default_6289666979475_38', name: 'ULIS SAKHOWATI', phone: '6289666979475', source: 'imported' },
  { id: 'default_6282136428106_39', name: 'muhibbin', phone: '6282136428106', source: 'imported' },
  { id: 'default_6282248969719_40', name: 'Roikhatul Miskiyah', phone: '6282248969719', source: 'imported' },
  { id: 'default_6282131034191_41', name: 'anissaur rohmah', phone: '6282131034191', source: 'imported' },
  { id: 'default_6285326851881_42', name: 'AZIZATUS SAB\'AH', phone: '6285326851881', source: 'imported' },
  { id: 'default_628997346166_43', name: 'Inna Naili Izzatul Laila', phone: '628997346166', source: 'imported' },
  { id: 'default_6281334660013_44', name: 'KHOTIMUL MANAN', phone: '6281334660013', source: 'imported' },
  { id: 'default_6282390611565_45', name: 'MUH. ADIB DAROJAD', phone: '6282390611565', source: 'imported' },
  { id: 'default_62895800022987_46', name: 'Wachidatul Fitriyah', phone: '62895800022987', source: 'imported' },
  { id: 'default_6281912892273_47', name: 'DZIKRULLOH', phone: '6281912892273', source: 'imported' },
  { id: 'default_6283122591676_48', name: 'FATKHUL AFIF', phone: '6283122591676', source: 'imported' },
  { id: 'default_6282324157282_49', name: 'Ifa Nurliana', phone: '6282324157282', source: 'imported' },
  { id: 'default_6285290473613_50', name: 'Mustamiroh', phone: '6285290473613', source: 'imported' },
  { id: 'default_6283850580551_51', name: 'PUTRI SUCI ULYANI', phone: '6283850580551', source: 'imported' },
  { id: 'default_6285238486946_52', name: 'Nur ikhsan', phone: '6285238486946', source: 'imported' },
  { id: 'default_6288216691735_53', name: 'Sukamad', phone: '6288216691735', source: 'imported' }
];

export function Contacts() {
  const { t } = useTranslation();
  useDocumentTitle(t('contacts.title'));
  const { canWrite } = useRole();
  const toast = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sesi
  const { data: allSessions = [], isLoading: loadingSessions } = useSessionsQuery();
  const sessions = allSessions.filter(s => s.status === 'ready');
  const [selectedSession, setSelectedSession] = useState('');

  // Kontak
  const [whatsappContacts, setWhatsappContacts] = useState<DisplayContact[]>([]);
  
  // Load initial contacts from localStorage or use DEFAULT_CONTACTS
  const [importedContacts, setImportedContacts] = useState<DisplayContact[]>(() => {
    const saved = localStorage.getItem('openwa_custom_contacts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved contacts', e);
      }
    }
    // If not saved before, initialize with default contacts and save them
    localStorage.setItem('openwa_custom_contacts', JSON.stringify(DEFAULT_CONTACTS));
    return DEFAULT_CONTACTS;
  });

  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'whatsapp' | 'imported'>('all');

  // Status Load/Loading
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Pembuatan Grup
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Penambahan Kontak Secara Manual
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page to 1 when filters or query change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSource]);

  // Helper to save contacts to state and database (localStorage)
  const saveCustomContacts = (updatedOrUpdater: DisplayContact[] | ((prev: DisplayContact[]) => DisplayContact[])) => {
    setImportedContacts(prev => {
      const next = typeof updatedOrUpdater === 'function' ? updatedOrUpdater(prev) : updatedOrUpdater;
      localStorage.setItem('openwa_custom_contacts', JSON.stringify(next));
      return next;
    });
  };

  // Set default session if available
  useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0].id);
    }
  }, [sessions, selectedSession]);

  // Load WhatsApp contacts when session changes
  const loadWhatsappContacts = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      setWhatsappContacts([]);
      return;
    }

    setIsLoadingContacts(true);
    try {
      const apiContacts = await sessionApi.getContacts(sessionId);
      const mapped: DisplayContact[] = apiContacts.map((c: ApiContact) => ({
        id: c.id,
        name: c.name || c.pushName || t('common.unknownError'),
        phone: c.number,
        source: 'whatsapp',
        isMyContact: c.isMyContact,
        isBlocked: c.isBlocked
      }));
      setWhatsappContacts(mapped);
    } catch (err) {
      console.error(err);
      toast.error(t('contacts.toasts.loadFailed', { error: err instanceof Error ? err.message : '' }));
      setWhatsappContacts([]);
    } finally {
      setIsLoadingContacts(false);
    }
  }, [t, toast]);

  useEffect(() => {
    if (selectedSession) {
      void loadWhatsappContacts(selectedSession);
    } else {
      setWhatsappContacts([]);
    }
  }, [selectedSession, loadWhatsappContacts]);

  // Pembersihan nomor telepon (e.g. 08xx -> 628xx)
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

  // Mencari nilai kolom berdasarkan variasi nama header
  const findColumnValue = (row: Record<string, unknown>, keys: string[]): string => {
    const rowKeys = Object.keys(row);
    for (const k of keys) {
      const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
      if (foundKey) return String(row[foundKey]);
    }
    return '';
  };

  // Parser data kontak dari baris hasil import
  const parseRows = (rows: Record<string, unknown>[]): DisplayContact[] => {
    const parsed: DisplayContact[] = [];
    rows.forEach((row, index) => {
      const name = findColumnValue(row, ['name', 'nama', 'full name', 'nama lengkap', 'display name', 'petugas']);
      const phoneRaw = findColumnValue(row, ['phone', 'phone number', 'no hp', 'number', 'no telepon', 'no telp', 'telepon', 'whatsapp', 'telp']);
      const phone = cleanPhoneNumber(phoneRaw);

      if (phone) {
        parsed.push({
          id: `imported_${phone}_${index}`,
          name: name || `Contact ${phone}`,
          phone,
          source: 'imported'
        });
      }
    });
    return parsed;
  };

  // Menangani file CSV/Excel
  const processFile = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            toast.error(t('contacts.toasts.importFailed', { error: results.errors[0].message }));
            return;
          }
          const parsed = parseRows(results.data as Record<string, unknown>[]);
          if (parsed.length > 0) {
            saveCustomContacts(prev => [...prev, ...parsed]);
            toast.success(t('contacts.toasts.importSuccess', { count: parsed.length }));
          } else {
            toast.error(t('contacts.toasts.importFailed', { error: 'No contacts found or headers mismatched.' }));
          }
        },
        error: (err) => {
          toast.error(t('contacts.toasts.importFailed', { error: err.message }));
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
          const parsed = parseRows(json);

          if (parsed.length > 0) {
            saveCustomContacts(prev => [...prev, ...parsed]);
            toast.success(t('contacts.toasts.importSuccess', { count: parsed.length }));
          } else {
            toast.error(t('contacts.toasts.importFailed', { error: 'No contacts found or headers mismatched.' }));
          }
        } catch (err) {
          toast.error(t('contacts.toasts.importFailed', { error: err instanceof Error ? err.message : '' }));
        }
      };
      reader.onerror = () => {
        toast.error(t('contacts.toasts.importFailed', { error: 'FileReader error' }));
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Unsupported file type. Please upload a CSV or Excel (.xlsx/.xls) file.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Merge dan deduplikasi kontak
  const allContactsMap = new Map<string, DisplayContact>();
  whatsappContacts.forEach(c => allContactsMap.set(c.phone, c));
  importedContacts.forEach(c => {
    if (!allContactsMap.has(c.phone)) {
      allContactsMap.set(c.phone, c);
    }
  });

  const mergedContacts = Array.from(allContactsMap.values());

  // Filter kontak berdasarkan pencarian dan sumber
  const filteredContacts = mergedContacts.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);
    
    const matchesSource =
      filterSource === 'all' ||
      c.source === filterSource;

    return matchesSearch && matchesSource;
  });

  // Pemilihan kontak
  const toggleSelectContact = (phone: string) => {
    setSelectedContacts(prev =>
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const toggleSelectAll = () => {
    const filteredPhones = filteredContacts.map(c => c.phone);
    const allSelected = filteredPhones.every(phone => selectedContacts.includes(phone));

    if (allSelected) {
      setSelectedContacts(prev => prev.filter(phone => !filteredPhones.includes(phone)));
    } else {
      setSelectedContacts(prev => {
        const union = new Set([...prev, ...filteredPhones]);
        return Array.from(union);
      });
    }
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !groupName || selectedContacts.length === 0) return;

    setIsCreatingGroup(true);
    // Format participants: tambahkan @c.us jika belum ada
    const formattedParticipants = selectedContacts.map(phone =>
      phone.includes('@') ? phone : `${phone}@c.us`
    );

    try {
      const res = await sessionApi.createGroup(selectedSession, groupName, formattedParticipants);
      toast.success(t('contacts.toasts.createSuccess', { name: res.name }));
      setGroupName('');
      setSelectedContacts([]);
      setIsCreateGroupOpen(false);
      // Reload groups in active server instances if needed
    } catch (err) {
      toast.error(t('contacts.toasts.createFailed', { error: err instanceof Error ? err.message : '' }));
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const clearImported = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua kontak?')) {
      saveCustomContacts([]);
      setSelectedContacts([]);
      toast.info('Semua kontak berhasil dihapus.');
    }
  };

  const deleteContact = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Hapus kontak ini?')) {
      saveCustomContacts(prev => prev.filter(c => c.phone !== phone));
      setSelectedContacts(prev => prev.filter(p => p !== phone));
      toast.info('Kontak berhasil dihapus.');
    }
  };

  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    const phone = cleanPhoneNumber(newContactPhone);
    if (!phone) {
      toast.error('Format nomor HP tidak valid.');
      return;
    }

    if (importedContacts.some(c => c.phone === phone)) {
      toast.error('Kontak dengan nomor HP ini sudah ada.');
      return;
    }

    const newContact: DisplayContact = {
      id: `imported_${phone}_${Date.now()}`,
      name: newContactName.trim(),
      phone,
      source: 'imported'
    };

    saveCustomContacts(prev => [...prev, newContact]);
    toast.success('Kontak berhasil ditambahkan.');

    setNewContactName('');
    setNewContactPhone('');
    setIsAddContactOpen(false);
  };

  const downloadCsvTemplate = () => {
    const headers = ['Name', 'Phone'];
    const rows = DEFAULT_CONTACTS.map(c => `"${c.name.replace(/"/g, '""')}","${c.phone}"`);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n'); // Add UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'contacts_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV template downloaded successfully.');
  };

  const downloadExcelTemplate = () => {
    try {
      const data = DEFAULT_CONTACTS.map(c => ({
        'Name': c.name,
        'Phone': c.phone
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
      XLSX.writeFile(workbook, 'contacts_template.xlsx');
      toast.success('Excel template downloaded successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Excel template.');
    }
  };

  if (loadingSessions) {
    return (
      <div className="contacts-page loading">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  const isAllSelected =
    filteredContacts.length > 0 &&
    filteredContacts.map(c => c.phone).every(phone => selectedContacts.includes(phone));

  return (
    <div className="contacts-page">
      <PageHeader title={t('contacts.title')} subtitle={t('contacts.subtitle')} />

      <div className="contacts-grid">
        {/* Panel Kiri: Upload dan Aksi */}
        <div className="left-panel">
          <div className="card upload-card">
            <h2>{t('contacts.importTitle')}</h2>
            <p className="description">{t('contacts.importDesc')}</p>

            <div
              className={`dropzone ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleTriggerUpload}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, .xlsx, .xls"
                style={{ display: 'none' }}
              />
              <Upload className="upload-icon" size={36} />
              <span>Drag & drop files here or click to upload</span>
              <span className="file-hint">CSV or Excel (.xlsx, .xls)</span>
            </div>

            <div className="template-downloads">
              <button className="template-btn csv" onClick={(e) => { e.stopPropagation(); downloadCsvTemplate(); }}>
                <FileSpreadsheet size={14} />
                Download CSV Template
              </button>
              <button className="template-btn xlsx" onClick={(e) => { e.stopPropagation(); downloadExcelTemplate(); }}>
                <FileSpreadsheet size={14} />
                Download Excel Template
              </button>
            </div>

            {importedContacts.length > 0 && (
              <div className="import-status">
                <div className="status-info">
                  <Check size={16} className="status-success-icon" />
                  <span>{importedContacts.length} contacts imported.</span>
                </div>
                <button className="clear-btn" onClick={clearImported}>
                  Clear Imported
                </button>
              </div>
            )}
          </div>

          <div className="card session-card">
            <h2>{t('contacts.selectSession')}</h2>
            <div className="form-group">
              <select
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
              >
                {sessions.length === 0 && <option value="">{t('contacts.noReadySessions')}</option>}
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone || 'No PhoneConnected'})
                  </option>
                ))}
              </select>
            </div>
            {selectedSession && (
              <button
                className="refresh-btn"
                onClick={() => void loadWhatsappContacts(selectedSession)}
                disabled={isLoadingContacts}
              >
                <RefreshCw className={isLoadingContacts ? 'animate-spin' : ''} size={16} />
                Refresh WA Contacts
              </button>
            )}
          </div>

          <div className="card action-card">
            <h2>Actions</h2>
            <button
              className="create-group-btn"
              onClick={() => setIsCreateGroupOpen(true)}
              disabled={!canWrite || selectedContacts.length === 0 || !selectedSession}
              title={selectedContacts.length === 0 ? 'Select contacts in table first' : undefined}
            >
              <Plus size={18} />
              {t('contacts.createGroupBtn')}
            </button>
            <button
              className="add-contact-btn"
              onClick={() => setIsAddContactOpen(true)}
            >
              <Plus size={18} />
              Add Contact
            </button>
            <span className="selected-hint">
              {selectedContacts.length} contacts selected
            </span>
          </div>
        </div>

        {/* Panel Kanan: Daftar Kontak */}
        <div className="right-panel">
          <div className="card table-card">
            <div className="table-header-row">
              <h2>
                {t('contacts.contactsCount', {
                  count: filteredContacts.length,
                  selected: selectedContacts.length
                })}
              </h2>

              <div className="filters">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('contacts.searchPlaceholder')}
                  />
                </div>

                <div className="source-filter">
                  <Filter size={16} />
                  <select
                    value={filterSource}
                    onChange={e => setFilterSource(e.target.value as 'all' | 'whatsapp' | 'imported')}
                  >
                    <option value="all">All Sources</option>
                    <option value="whatsapp">WhatsApp Contacts</option>
                    <option value="imported">Imported</option>
                  </select>
                </div>
              </div>
            </div>

            {isLoadingContacts ? (
              <div className="table-loading">
                <Loader2 className="animate-spin" size={24} />
                <span>Loading Contacts...</span>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="table-empty">
                <Users size={48} />
                <p>{t('contacts.noContacts')}</p>
              </div>
            ) : (
              <div className="table-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                  <table className="contacts-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th>{t('contacts.table.name')}</th>
                        <th>{t('contacts.table.phone')}</th>
                        <th>{t('contacts.table.source')}</th>
                        <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedContacts.map(c => {
                        const isSelected = selectedContacts.includes(c.phone);
                        return (
                          <tr
                            key={c.id}
                            className={isSelected ? 'selected-row' : ''}
                            onClick={() => toggleSelectContact(c.phone)}
                          >
                            <td onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectContact(c.phone)}
                              />
                            </td>
                            <td className="contact-name">
                              <span>{c.name}</span>
                            </td>
                            <td className="contact-phone mono">+{c.phone}</td>
                            <td>
                              <span className={`badge badge-${c.source}`}>
                                {c.source === 'whatsapp' ? (
                                  <RefreshCw size={10} />
                                ) : (
                                  <FileSpreadsheet size={10} />
                                )}
                                {t(`contacts.sources.${c.source}`)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                              {c.source === 'imported' && (
                                <button
                                  className="delete-row-btn"
                                  onClick={(e) => deleteContact(c.phone, e)}
                                  title="Hapus Kontak"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pagination-bar">
                  <div className="pagination-info">
                    Showing {filteredContacts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                    {Math.min(filteredContacts.length, currentPage * pageSize)} of{' '}
                    {filteredContacts.length} contacts
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      Previous
                    </button>
                    
                    <span className="page-indicator">
                      Page {currentPage} of {totalPages || 1}
                    </span>

                    <button
                      className="pagination-btn"
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                      Next
                    </button>

                    <select
                      className="page-size-select"
                      value={pageSize}
                      onChange={e => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
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

      {/* Modal Buat Grup */}
      {isCreateGroupOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateGroupOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('contacts.createGroupTitle')}</h2>
              <button className="close-modal-btn" onClick={() => setIsCreateGroupOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateGroupSubmit}>
              <div className="form-group">
                <label htmlFor="group-name">{t('contacts.groupNameLabel')}</label>
                <input
                  id="group-name"
                  type="text"
                  required
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder={t('contacts.groupNamePlaceholder')}
                />
              </div>

              <div className="selected-preview">
                <Users size={16} />
                <span>
                  {t('contacts.selectedCount', { count: selectedContacts.length })}
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsCreateGroupOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isCreatingGroup || !groupName}
                >
                  {isCreatingGroup ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Check size={16} />
                  )}
                  {isCreatingGroup ? t('contacts.creating') : t('contacts.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Kontak */}
      {isAddContactOpen && (
        <div className="modal-overlay" onClick={() => setIsAddContactOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Kontak Baru</h2>
              <button className="close-modal-btn" onClick={() => setIsAddContactOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddContactSubmit}>
              <div className="form-group">
                <label htmlFor="contact-name">Nama Lengkap / Petugas</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  placeholder="Contoh: AHMAD GHOZALI"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-phone">Nomor HP / WhatsApp</label>
                <input
                  id="contact-phone"
                  type="text"
                  required
                  value={newContactPhone}
                  onChange={e => setNewContactPhone(e.target.value)}
                  placeholder="Contoh: 081225008906 atau 6281225008906"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsAddContactOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={!newContactName.trim() || !newContactPhone.trim()}
                >
                  <Check size={16} />
                  Simpan Kontak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
