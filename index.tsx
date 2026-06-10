/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  UserPlus,
  Users,
  Search,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  ChevronRight,
  Trash2,
  Stethoscope,
  Sparkles,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

// ============================================================================
// 1. DATA TYPES & NODE STRUCTURES (TYPES.TS INLINED)
// ============================================================================

export interface Patient {
  id: string;
  name: string;
  age: number;
  bpjsNumber?: string;
  isBpjs: boolean;
  symptoms: string;
  urgency: 'low' | 'medium' | 'high';
  registrationTime: string; // ISO string
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  date: string; // ISO string
  doctorName: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
}

// Node structure for Queue linked list (FIFO with priority)
export class PatientQueueNode {
  patient: Patient;
  next: PatientQueueNode | null = null;

  constructor(patient: Patient) {
    this.patient = patient;
  }
}

// Node structure for Medical Record linked list (LIFO)
export class MedicalRecordNode {
  record: MedicalRecord;
  next: MedicalRecordNode | null = null;

  constructor(record: MedicalRecord) {
    this.record = record;
  }
}

export interface VisualStep {
  type: 'info' | 'traverse' | 'pointer_update' | 'success';
  message: string;
  targetNodeId?: string;
}

// ============================================================================
// 2. INITIAL MOCK DATABASE (DATA.TS INLINED)
// ============================================================================

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'P-101',
    name: 'Ibu Aminah',
    age: 72,
    isBpjs: true,
    bpjsNumber: '0001928374655',
    symptoms: 'Pusing berputar, lemas, dan riwayat tekanan darah tinggi (hipertensi).',
    urgency: 'high',
    registrationTime: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'P-102',
    name: 'Bapak Harsono',
    age: 68,
    isBpjs: true,
    bpjsNumber: '0005544332211',
    symptoms: 'Nyeri sendi hebat pada kedua lutut saat berjalan (osteoarthritis).',
    urgency: 'medium',
    registrationTime: new Date(Date.now() - 3600000 * 1.5).toISOString(), // 1.5 hours ago
  },
  {
    id: 'P-103',
    name: 'Aditya Pratama',
    age: 28,
    isBpjs: false,
    symptoms: 'Demam tinggi mendadak sejak 3 hari yang lalu disertai sakit kepala.',
    urgency: 'medium',
    registrationTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: 'P-104',
    name: 'Siti Rahmaawati',
    age: 45,
    isBpjs: true,
    bpjsNumber: '0008877665544',
    symptoms: 'Batuk berdahak intensitas sedang dan flu berkepanjangan.',
    urgency: 'low',
    registrationTime: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
  }
];

export const INITIAL_RECORDS: MedicalRecord[] = [
  // History for Ibu Aminah (linked list demo)
  {
    id: 'MR-001',
    patientId: 'P-101',
    date: '2026-05-15T09:00:00.000Z',
    doctorName: 'dr. Andi Wijaya, Sp.PD',
    diagnosis: 'Hipertensi Essensial Stage II & Vertigo Perifer',
    treatment: 'Edukasi istirahat cukup, hindari gerakan kepala mendadak, dan kurangi konsumsi garam.',
    prescription: 'Amlodipine 5mg (1x1), Betahistine Mesylate 6mg (3x1 PRN), Paracetamol 500mg (3x1 PRN)'
  },
  {
    id: 'MR-002',
    patientId: 'P-101',
    date: '2026-04-10T10:30:00.000Z',
    doctorName: 'dr. Andi Wijaya, Sp.PD',
    diagnosis: 'Hipertensi Essensial Mild',
    treatment: 'Edukasi gaya hidup sehat dan modifikasi diet kolesterol.',
    prescription: 'Captopril 12.5mg (2x1 setelah makan)'
  },

  // History for Bapak Harsono
  {
    id: 'MR-003',
    patientId: 'P-102',
    date: '2026-05-20T08:15:00.000Z',
    doctorName: 'dr. Sarah Hutapea, Sp.OT',
    diagnosis: 'Osteoarthritis Genu Dextra Stage II',
    treatment: 'Kompres hangat dingin bergantian, disarankan fisioterapi dan senam sendi mandiri.',
    prescription: 'Meloxicam 15mg (1x1 setelah makan), Glucosamine Condroitin (1x1), Gel analgesik topikal'
  }
];

// ============================================================================
// 3. LINKED LIST CORE ALGORITHMS (LINKEDLIST.TS INLINED)
// ============================================================================

export function insertPatient(
  head: PatientQueueNode | null,
  patient: Patient
): { newHead: PatientQueueNode | null; steps: VisualStep[] } {
  const steps: VisualStep[] = [];
  const newNode = new PatientQueueNode(patient);
  
  steps.push({
    type: 'info',
    message: `Memulai pendaftaran untuk ${patient.name} (${patient.age} tahun, ${patient.isBpjs ? 'BPJS' : 'Umum'}).`
  });

  const isLansia = patient.age >= 60;

  // Kasus 1: Antrean kosong
  if (!head) {
    steps.push({
      type: 'pointer_update',
      message: 'Antrean masih kosong. Pasien baru ditunjuk sebagai Kepala (Head) antrean.'
    });
    return { newHead: newNode, steps };
  }

  // Kasus 2: Pasien baru adalah LANSIA dan harus berada di depan Kepala (Head) yang bukan lansia
  if (isLansia && head.patient.age < 60) {
    steps.push({
      type: 'pointer_update',
      message: `Kepala antrean (${head.patient.name}, ${head.patient.age} thn) adalah non-lansia. ${patient.name} (Lansia) disisipkan ke depan menjadi Head baru.`,
      targetNodeId: head.patient.id
    });
    newNode.next = head;
    return { newHead: newNode, steps };
  }

  // Kasus 3: Traversing untuk mencari posisi penyisipan yang tepat
  let current: PatientQueueNode = head;
  steps.push({
    type: 'traverse',
    message: `Memulai penelusuran antrean dari Kepala: ${current.patient.name}.`,
    targetNodeId: current.patient.id
  });

  if (isLansia) {
    // Cari pasien lansia terakhir
    while (current.next !== null && current.next.patient.age >= 60) {
      current = current.next;
      steps.push({
        type: 'traverse',
        message: `Pasien berikutnya (${current.patient.name}, ${current.patient.age} thn) juga Lansia. Lanjut menelusuri penunjuk 'next'.`,
        targetNodeId: current.patient.id
      });
    }

    // Sisipkan setelah 'current' (lansia terakhir)
    steps.push({
      type: 'pointer_update',
      message: `Ditemukan posisi penyisipan. Menyambungkan penunjuk 'next' dari ${patient.name} ke ${current.next ? current.next.patient.name : 'NULL'}.`,
      targetNodeId: current.patient.id
    });
    newNode.next = current.next;

    steps.push({
      type: 'pointer_update',
      message: `Memperbarui penunjuk 'next' dari pasien lansia terakhir (${current.patient.name}) ke pasien baru (${patient.name}).`,
      targetNodeId: current.patient.id
    });
    current.next = newNode;
  } else {
    // Pasien umum (non-lansia) disisipkan di paling akhir (FIFO biasa)
    while (current.next !== null) {
      current = current.next;
      steps.push({
        type: 'traverse',
        message: `Menelusuri ke pasien berikutnya (${current.patient.name}) untuk mencapai akhir antrean.`,
        targetNodeId: current.patient.id
      });
    }

    steps.push({
      type: 'pointer_update',
      message: `Mencapai akhir antrean (${current.patient.name}). Menyisipkan ${patient.name} di ujung antrean (next = NULL).`,
      targetNodeId: current.patient.id
    });
    current.next = newNode;
  }

  steps.push({
    type: 'success',
    message: `Berhasil menyisipkan ${patient.name} ke dalam linked list antrean.`
  });

  return { newHead: head, steps };
}

export function dequeuePatient(
  head: PatientQueueNode | null
): { dequeuedPatient: Patient | null; newHead: PatientQueueNode | null; steps: VisualStep[] } {
  const steps: VisualStep[] = [];
  if (!head) {
    steps.push({
      type: 'info',
      message: 'Antrean kosong. Tidak ada pasien untuk dilayani.'
    });
    return { dequeuedPatient: null, newHead: null, steps };
  }

  const dequeuedPatient = head.patient;
  const newHead = head.next;

  steps.push({
    type: 'pointer_update',
    message: `Memanggil pasien ${dequeuedPatient.name}. Menggeser Kepala (Head) antrean ke pasien berikutnya: ${newHead ? newHead.patient.name : 'NULL'}.`,
    targetNodeId: dequeuedPatient.id
  });

  return { dequeuedPatient, newHead, steps };
}

export function removePatient(
  head: PatientQueueNode | null,
  patientId: string
): { newHead: PatientQueueNode | null; steps: VisualStep[] } {
  const steps: VisualStep[] = [];
  
  if (!head) {
    steps.push({
      type: 'info',
      message: 'Antrean kosong, tidak bisa melakukan penghapusan.'
    });
    return { newHead: null, steps };
  }

  // Jika pasien yang dihapus ada di Head
  if (head.patient.id === patientId) {
    steps.push({
      type: 'pointer_update',
      message: `Pasien ${head.patient.name} berada di Kepala antrean. Menghapus Head dan memindahkan ke 'next' (${head.next ? head.next.patient.name : 'NULL'}).`,
      targetNodeId: head.patient.id
    });
    return { newHead: head.next, steps };
  }

  let prev: PatientQueueNode = head;
  let current: PatientQueueNode | null = head.next;

  steps.push({
    type: 'traverse',
    message: `Memulai pencarian pasien ID "${patientId}" dari Head: ${head.patient.name}.`,
    targetNodeId: head.patient.id
  });

  while (current !== null) {
    if (current.patient.id === patientId) {
      steps.push({
        type: 'pointer_update',
        message: `Ditemukan! Mengubah penunjuk 'next' dari ${prev.patient.name} yang sebelumnya mengarah ke ${current.patient.name}, kini langsung mengarah ke ${current.next ? current.next.patient.name : 'NULL'}.`,
        targetNodeId: current.patient.id
      });
      prev.next = current.next;
      steps.push({
        type: 'success',
        message: `Pasien ${current.patient.name} berhasil dikeluarkan dari antrean.`
      });
      return { newHead: head, steps };
    }

    steps.push({
      type: 'traverse',
      message: `Memeriksa ${current.patient.name} (Bukan target). Melanjutkan penelusuran.`,
      targetNodeId: current.patient.id
    });

    prev = current;
    current = current.next;
  }

  steps.push({
    type: 'info',
    message: 'Pasien tidak ditemukan dalam antrean.'
  });

  return { newHead: head, steps };
}

export function queueToArray(head: PatientQueueNode | null): Patient[] {
  const arr: Patient[] = [];
  let current = head;
  while (current !== null) {
    arr.push(current.patient);
    current = current.next;
  }
  return arr;
}

export function insertMedicalRecord(
  head: MedicalRecordNode | null,
  record: MedicalRecord
): { newHead: MedicalRecordNode; steps: VisualStep[] } {
  const steps: VisualStep[] = [];
  const newNode = new MedicalRecordNode(record);

  steps.push({
    type: 'info',
    message: `Menambahkan rekam medis baru tertanggal ${new Date(record.date).toLocaleDateString('id-ID')}.`
  });

  if (!head) {
    steps.push({
      type: 'pointer_update',
      message: 'Belum ada riwayat medis sebelumnya. Rekam medis ini menjadi Kepala (Head) riwayat.'
    });
    return { newHead: newNode, steps };
  }

  // Sisipkan di Head (LIFO)
  steps.push({
    type: 'pointer_update',
    message: `Rekam medis baru ditunjuk sebagai Head. Menghubungkan 'next' ke Kepala lama (diagnosis: ${head.record.diagnosis}).`
  });
  newNode.next = head;

  steps.push({
    type: 'success',
    message: 'Berhasil mendaftarkan rekam medis baru di awal riwayat kunjungan.'
  });

  return { newHead: newNode, steps };
}

export function recordsToArray(head: MedicalRecordNode | null): MedicalRecord[] {
  const arr: MedicalRecord[] = [];
  let current = head;
  while (current !== null) {
    arr.push(current.record);
    current = current.next;
  }
  return arr;
}

// ============================================================================
// 4. MAIN LANDING REACT APP COMPONENT
// ============================================================================

export default function App() {
  // State manajemen Linked List
  const [queueHead, setQueueHead] = useState<PatientQueueNode | null>(null);
  const [queueList, setQueueList] = useState<Patient[]>([]);
  
  // Database Pasien (semua pasien yang terdaftar di sistem agar riwayat rekam medis tetap tersimpan setelah dipanggil)
  const [patientsDb, setPatientsDb] = useState<Patient[]>(INITIAL_PATIENTS);
  
  // Map rekam medis pasien: patientId -> Head dari MedicalRecordNode
  const [recordsMap, setRecordsMap] = useState<Record<string, MedicalRecordNode | null>>({});

  // Riwayat pelacakan pointer log untuk visualisasi Linked List
  const [logs, setLogs] = useState<VisualStep[]>([
    { type: 'info', message: 'Sistem dimulai. Memuat data awal pasien lansia & BPJS.' }
  ]);

  // Tab aktif
  const [activeTab, setActiveTab] = useState<'queue' | 'records' | 'about'>('queue');

  // State Form pendaftaran pasien baru
  const [formName, setFormName] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formIsBpjs, setFormIsBpjs] = useState(false);
  const [formBpjsNumber, setFormBpjsNumber] = useState('');
  const [formSymptoms, setFormSymptoms] = useState('');
  const [formUrgency, setFormUrgency] = useState<'low' | 'medium' | 'high'>('medium');

  // State pencarian rekam medis
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>('P-101');

  // State Form Rekam Medis Baru (untuk konsultasi aktif saat ini)
  const [doctorName, setDoctorName] = useState('dr. Andi Wijaya, Sp.PD');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [prescription, setPrescription] = useState('');

  // Sesi statistik pasien yang telah diperiksa
  const [completedCount, setCompletedCount] = useState<number>(3);

  // Inisialisasi awal list dari mock data
  useEffect(() => {
    // 1. Konstruksi pasien queue linked list satu per satu dari data awal
    let tempHead: PatientQueueNode | null = null;
    let initialLogs: VisualStep[] = [];
    
    // Urutkan initial patients berdasarkan waktu registrasi lama -> baru, disisipkan menggunakan algoritma sorting priority
    const sortedInitials = [...INITIAL_PATIENTS].sort(
      (a, b) => new Date(a.registrationTime).getTime() - new Date(b.registrationTime).getTime()
    );

    sortedInitials.forEach(p => {
      const result = insertPatient(tempHead, p);
      tempHead = result.newHead;
      initialLogs = [...initialLogs, ...result.steps];
    });

    setQueueHead(tempHead);
    setQueueList(queueToArray(tempHead));
    setLogs([
      { type: 'success', message: 'Inisialisasi Linked List antrean sukses.' },
      ...initialLogs
    ]);

    // 2. Konstruksi rekam medis linked list dari data awal
    const tempRecordsMap: Record<string, MedicalRecordNode | null> = {};
    INITIAL_PATIENTS.forEach(p => {
      tempRecordsMap[p.id] = null;
    });

    // Masukkan record awal
    INITIAL_RECORDS.forEach(record => {
      const currentHead = tempRecordsMap[record.patientId] || null;
      const result = insertMedicalRecord(currentHead, record);
      tempRecordsMap[record.patientId] = result.newHead;
    });

    setRecordsMap(tempRecordsMap);
  }, []);

  // Update visual queue list array setiap kali head linked list berubah
  useEffect(() => {
    setQueueList(queueToArray(queueHead));
  }, [queueHead]);

  // Handler: Tambah Pasien Baru ke Antrean (Linked List Insertion dengan prioritas Lansia)
  const handleRegisterPatient = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!formName.trim() || !formAge) return;

    const age = parseInt(formAge);
    const patientId = `P-${Date.now().toString().slice(-3)}`;
    
    // Periksa kategori Lansia (Usia >= 60 tahun mendapatkan Prioritas)
    const isLansia = age >= 60;

    const newPatient: Patient = {
      id: patientId,
      name: formName,
      age: age,
      isBpjs: formIsBpjs,
      bpjsNumber: formIsBpjs ? formBpjsNumber : undefined,
      symptoms: formSymptoms || 'Pemeriksaan rutin / konsultasi umum',
      urgency: formUrgency,
      registrationTime: new Date().toISOString()
    };

    // Tambah ke Database Pasien global (agar rekam medisnya nanti tersimpan)
    setPatientsDb(prev => [...prev, newPatient]);

    // Masukkan ke struktur Linked List Antrean
    const result = insertPatient(queueHead, newPatient);
    setQueueHead(result.newHead);
    
    // Tambah catatan inisialisasi rekam medis kosong di map jika belum ada
    setRecordsMap(prev => ({
      ...prev,
      [patientId]: null
    }));

    // Scroll otomatis ke log pelacakan pointer dan tampilkan step
    setLogs(result.steps);

    // Reset Form
    setFormName('');
    setFormAge('');
    setFormIsBpjs(false);
    setFormBpjsNumber('');
    setFormSymptoms('');
    setFormUrgency('medium');
  };

  // Handler: Batalkan antrean (Menghapus node dari tengah linked list)
  const handleCancelQueue = (patientId: string) => {
    const result = removePatient(queueHead, patientId);
    setQueueHead(result.newHead);
    setLogs(result.steps);
  };

  // Handler: Pemeriksaan Dokter Selesai (Submit Medical Record dan Dequeue Pasien / Head removal)
  const handleCompleteCheckup = (e: FormEvent) => {
    e.preventDefault();
    if (!queueHead) return;

    const currentPatient = queueHead.patient;

    // Masukkan Rekam Medis baru
    const newRecord: MedicalRecord = {
      id: `MR-${Date.now().toString().slice(-4)}`,
      patientId: currentPatient.id,
      date: new Date().toISOString(),
      doctorName: doctorName || 'Dokter Umum Jaga',
      diagnosis: diagnosis || 'Rawat Jalan Umum (Observasi)',
      treatment: treatment || 'Pemberian edukasi gaya hidup sehat dan istirahat.',
      prescription: prescription || 'Multivitamin penunjang imun tubuh'
    };

    // Sisipkan ke awal Linked List Rekam Medis Pasien Terkait (LIFO)
    const currentRecordsHead = recordsMap[currentPatient.id] || null;
    const recordResult = insertMedicalRecord(currentRecordsHead, newRecord);
    
    setRecordsMap(prev => ({
      ...prev,
      [currentPatient.id]: recordResult.newHead
    }));

    // Lakukan Dequeue (mengambil pasien berikutnya dari Kepala / Head antrean)
    const queueResult = dequeuePatient(queueHead);
    setQueueHead(queueResult.newHead);
    setCompletedCount(prev => prev + 1);

    // Gabungkan langkah visualisasi
    setLogs([
      ...recordResult.steps,
      ...queueResult.steps,
      { type: 'success', message: `Pasien ${currentPatient.name} selesai ditangani. Berpindah ke pasien berikutnya!` }
    ]);

    // Reset Form Konsultasi
    setDiagnosis('');
    setTreatment('');
    setPrescription('');

    // Set pasien yang baru selesai ini terpilih untuk langsung melihat rekam medisnya
    setSelectedPatientId(currentPatient.id);
  };

  // Generator Data Demo Instan untuk simulasi Linked List
  const handleInjectDemoPatients = () => {
    const demoPatients: Patient[] = [
      {
        id: `P-${Math.floor(Math.random() * 900) + 100}`,
        name: 'Mbah Kromo',
        age: 81,
        isBpjs: true,
        bpjsNumber: '0003112233445',
        symptoms: 'Nyeri punggung kronis dan batuk kering berat selama seminggu.',
        urgency: 'high',
        registrationTime: new Date().toISOString()
      },
      {
        id: `P-${Math.floor(Math.random() * 900) + 100}`,
        name: 'Ibu Sukmawati',
        age: 63,
        isBpjs: true,
        bpjsNumber: '0004928172648',
        symptoms: 'Sesak napas ringan setelah beraktivitas dan mudah lelah.',
        urgency: 'medium',
        registrationTime: new Date().toISOString()
      },
      {
        id: `P-${Math.floor(Math.random() * 900) + 100}`,
        name: 'Guntur Prasetyo',
        age: 19,
        isBpjs: false,
        symptoms: 'Sakit gigi berlubang parah pada bagian geraham bawah kiri.',
        urgency: 'low',
        registrationTime: new Date().toISOString()
      }
    ];

    let currentHead = queueHead;
    let accumulatedLogs: VisualStep[] = [{ type: 'info', message: 'Melakukan injeksi masal 3 pasien demo ke sistem.' }];

    demoPatients.forEach(p => {
      // Tambah ke DB global
      setPatientsDb(prev => {
        if (!prev.find(item => item.id === p.id)) {
          return [...prev, p];
        }
        return prev;
      });

      // Sisipkan di Linked List
      const result = insertPatient(currentHead, p);
      currentHead = result.newHead;
      accumulatedLogs = [...accumulatedLogs, ...result.steps];

      // Inisialisasi map rekam medis
      setRecordsMap(prev => ({
        ...prev,
        [p.id]: prev[p.id] || null
      }));
    });

    setQueueHead(currentHead);
    setLogs(accumulatedLogs);
  };

  // Reset Antrean
  const handleResetQueue = () => {
    setQueueHead(null);
    setLogs([{ type: 'info', message: 'Antrean pendaftaran telah dikosongkan.' }]);
  };

  // Get statistics
  const queueLength = queueList.length;
  const lansiaInQueueCount = queueList.filter(p => p.age >= 60).length;
  const bpjsInQueueCount = queueList.filter(p => p.isBpjs).length;

  // Filter patients database for medical records list
  const filteredPatients = patientsDb.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.bpjsNumber && p.bpjsNumber.includes(searchQuery))
  );

  return (
    <div className="min-h-screen bg-brand-sand text-brand-charcoal antialiased flex flex-col justify-between" id="main_app_container">
      {/* HEADER UTAMA */}
      <header className="bg-brand-beige border-b border-brand-border text-brand-charcoal shadow-sm" id="app_header">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-moss rounded-xl text-white shadow-sm" id="logo_bg">
              <Stethoscope className="w-8 h-8 animate-pulse text-white" id="hospital_service_icon" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-brand-moss font-sans">Klinik Kinasih</h1>
              <p className="text-brand-charcoal/70 text-xs font-mono tracking-wider">
                SISTEM ANTREAN PRIORITAS LANSIA & REKAM MEDIS LINKED LIST
              </p>
            </div>
          </div>
          
          {/* Navigasi Tab */}
          <nav className="flex items-center bg-brand-border/40 p-1.5 rounded-xl border border-brand-border/50" id="navigation_tabs">
            <button
              id="tab_btn_queue"
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'queue' ? 'bg-brand-moss text-white shadow-md' : 'text-brand-charcoal hover:bg-brand-border/60'
              }`}
            >
              <Users className="w-4 h-4" />
              Kelola Antrean
            </button>
            <button
              id="tab_btn_records"
              onClick={() => setActiveTab('records')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'records' ? 'bg-brand-moss text-white shadow-md' : 'text-brand-charcoal hover:bg-brand-border/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Database Rekam Medis
            </button>
            <button
              id="tab_btn_about"
              onClick={() => setActiveTab('about')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'about' ? 'bg-brand-moss text-white shadow-md' : 'text-brand-charcoal hover:bg-brand-border/60'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Informasi Pointers
            </button>
          </nav>
        </div>
      </header>

      {/* OPERATIONAL STATS PANEL */}
      <section className="bg-brand-moss text-white border-t border-brand-border/20 py-3.5 shadow-inner" id="system_statistics_row">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 border-r border-brand-sage/40 pr-4" id="stat_total_queue">
            <div className="p-2 bg-brand-sage/45 rounded-lg">
              <Users className="w-5 h-5 text-brand-peach" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brand-peach font-bold font-sans">Dalam Antrean</p>
              <p className="text-xl font-bold font-mono">{queueLength} Pasien</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-r border-brand-sage/40 pr-4" id="stat_elderly_priority">
            <div className="p-2 bg-brand-peach/20 rounded-lg border border-brand-peach/25 animate-pulse">
              <Sparkles className="w-5 h-5 text-brand-peach" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brand-peach font-bold font-sans">Prioritas Lansia</p>
              <p className="text-xl font-bold font-mono text-brand-peach">{lansiaInQueueCount} Orang</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-r border-brand-sage/40 pr-4" id="stat_bpjs_coverage">
            <div className="p-2 bg-brand-lime/25 rounded-lg border border-brand-lime/30">
              <ShieldCheck className="w-5 h-5 text-brand-lime" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brand-lime font-bold">Pasien BPJS Kesehatan</p>
              <p className="text-xl font-bold font-mono text-brand-cream">{bpjsInQueueCount} Pasien</p>
            </div>
          </div>
          <div className="flex items-center gap-3" id="stat_serviced_count">
            <div className="p-2 bg-brand-sage/45 rounded-lg">
              <CheckCircle className="w-5 h-5 text-brand-cream" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brand-cream font-bold">Telah Dilayani</p>
              <p className="text-xl font-bold font-mono text-white">{completedCount} Selesai</p>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTAINER CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        
        {/* TAB ANTREAN */}
        {activeTab === 'queue' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="queue_tab_content">
            
            {/* KOLOM KIRI: FORM & TRACING */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Box 1: Form Registrasi Pasien Baru */}
              <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden" id="registration_form_card">
                <div className="bg-brand-beige px-5 py-4 text-brand-charcoal border-b border-brand-border flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-brand-moss" />
                  <h2 className="font-bold tracking-wide text-brand-moss">Pendaftaran Pasien Baru</h2>
                </div>
                
                <form onSubmit={handleRegisterPatient} className="p-5 space-y-4" id="add_patient_form">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-sage mb-1.5">
                      Nama Pasien <span className="text-brand-clay">*</span>
                    </label>
                    <input
                      id="input_patient_name"
                      type="text"
                      required
                      placeholder="Masukkan nama lengkap"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-moss bg-brand-sand/40 text-brand-charcoal placeholder-brand-sage/80 font-medium text-sm transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-sage mb-1.5">
                        Usia <span className="text-brand-clay">*</span>
                      </label>
                      <input
                        id="input_patient_age"
                        type="number"
                        required
                        min="1"
                        max="120"
                        placeholder="Thn"
                        value={formAge}
                        onChange={(e) => setFormAge(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-moss bg-brand-sand/40 text-brand-charcoal placeholder-brand-sage/80 font-medium text-sm transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-sage mb-1.5">
                        Urgensi Medis
                      </label>
                      <select
                        id="input_patient_urgency"
                        value={formUrgency}
                        onChange={(e) => setFormUrgency(e.target.value as 'low' | 'medium' | 'high')}
                        className="w-full px-3.5 py-2 rounded-xl border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-moss bg-brand-sand/40 text-brand-charcoal font-semibold text-sm transition cursor-pointer"
                      >
                        <option value="low">Rendah (Pemeriksaan)</option>
                        <option value="medium">Sedang (Butuh Cepat)</option>
                        <option value="high">Darurat (Mendesak)</option>
                      </select>
                    </div>
                  </div>

                  {/* Deteksi Lansia otomatis secara visual */}
                  {formAge && parseInt(formAge) >= 60 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 bg-brand-lime/30 border border-brand-sage/40 text-brand-charcoal rounded-xl flex items-start gap-2.5 text-xs"
                      id="priority_detection_box"
                    >
                      <Sparkles className="w-4 h-4 text-brand-moss shrink-0 mt-0.5" />
                      <div>
                        <strong>Terdeteksi lansia (Usia &ge; 60 thn):</strong> Pasien akan otomatis ditempatkan di depan antrean non-lansia menggunakan sistem pencarian prioritas Linked List.
                      </div>
                    </motion.div>
                  )}

                  {/* BPJS validation indicator */}
                  <div className="pt-2">
                    <label className="inline-flex items-center cursor-pointer" id="bpjs_checkbox_wrapper">
                      <input
                        id="checkbox_is_bpjs"
                        type="checkbox"
                        checked={formIsBpjs}
                        onChange={(e) => {
                          setFormIsBpjs(e.target.checked);
                          if (!e.target.checked) setFormBpjsNumber('');
                        }}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-brand-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#6B705C] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-brand-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-moss"></div>
                      <span className="ms-3 text-sm font-semibold text-brand-charcoal flex items-center gap-1">
                        Metode BPJS Kesehatan
                        <ShieldCheck className="w-4 h-4 text-brand-moss" />
                      </span>
                    </label>
                  </div>

                  {formIsBpjs && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-1.5"
                      id="bpjs_details_input"
                    >
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-sage">
                        Nomor Kartu BPJS <span className="text-brand-clay">*</span>
                      </label>
                      <input
                        id="input_bpjs_number"
                        type="text"
                        required={formIsBpjs}
                        maxLength={13}
                        placeholder="Misal: 0001928374655"
                        value={formBpjsNumber}
                        onChange={(e) => setFormBpjsNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3.5 py-2 rounded-xl border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-moss bg-brand-sand/40 text-brand-charcoal placeholder-brand-sage/80 font-mono text-sm tracking-wider"
                      />
                      <span className="text-[10px] text-brand-sage font-medium block">Harus berisi 13 digit angka kartu jaminan BPJS Aktif.</span>
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-sage mb-1.5">
                      Keluhan atau Gejala <span className="text-brand-clay">*</span>
                    </label>
                    <textarea
                      id="input_patient_symptoms"
                      required
                      rows={2}
                      placeholder="Contoh: pusing berputar, pegal linu, flu berat"
                      value={formSymptoms}
                      onChange={(e) => setFormSymptoms(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-moss bg-brand-sand/40 text-brand-charcoal placeholder-brand-sage/80 font-medium text-sm transition resize-none"
                    />
                  </div>

                  <button
                    id="submit_register_patient"
                    type="submit"
                    className="w-full py-2.5 bg-brand-moss hover:bg-brand-moss/90 text-white font-bold rounded-xl text-sm shadow hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                  >
                    <UserPlus className="w-4 h-4" />
                    Daftarkan Ke Antrean
                  </button>
                </form>
              </div>

              {/* Sandbox Controls / Cheat Buttons */}
              <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-4 space-y-3" id="dev_sandbox_tools">
                <div className="flex justify-between items-center border-b border-brand-border pb-2">
                  <span className="text-xs font-bold text-brand-moss flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-clay" />
                    Sandbox Simulasi Cepat
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2" id="demo_injection_buttons">
                  <button
                    id="btn_inject_demo"
                    onClick={handleInjectDemoPatients}
                    className="py-1.5 px-3 bg-brand-lime/30 hover:bg-brand-lime/50 text-brand-moss border border-brand-sage/30 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-brand-moss" />
                    Demo (+3)
                  </button>
                  <button
                    id="btn_clear_queue"
                    onClick={handleResetQueue}
                    className="py-1.5 px-3 bg-brand-peach/40 hover:bg-brand-peach/60 text-brand-clay border border-brand-clay/20 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-brand-clay" />
                    Kosongkan
                  </button>
                </div>
              </div>

              {/* Box 2: Pointer Operations Trace Logs */}
              <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden" id="linked_list_operations_tracker">
                <div className="bg-brand-beige px-5 py-4 text-brand-charcoal flex items-center justify-between border-b border-brand-border">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-brand-moss animate-pulse" />
                    <h2 className="font-bold text-sm tracking-wide text-brand-moss">Pointer Tracker Console</h2>
                  </div>
                  <span className="text-[10px] bg-brand-moss text-white font-mono px-2 py-0.5 rounded border border-brand-moss">
                    O(n) Traversal
                  </span>
                </div>
                
                <div className="p-4 bg-brand-sand/20 space-y-2.5 max-h-[290px] overflow-y-auto font-mono text-xs text-brand-charcoal" id="pointer_logs_console">
                  <AnimatePresence mode="popLayout">
                    {logs.map((log, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className={`p-2.5 rounded-xl border ${
                          log.type === 'success'
                            ? 'bg-brand-lime/40 border-brand-sage/35 text-brand-moss font-medium'
                            : log.type === 'pointer_update'
                            ? 'bg-[#FAEDCD]/70 border-brand-clay/35 text-brand-clay font-medium'
                            : log.type === 'traverse'
                            ? 'bg-white border-brand-border text-brand-charcoal font-medium shadow-xs'
                            : 'bg-brand-sand border-brand-border text-brand-sage'
                        }`}
                        id={`log_item_${index}`}
                      >
                        <div className="flex gap-2">
                          <span className="font-bold select-none text-brand-sage">[{index + 1}]</span>
                          <div>
                            {log.type === 'pointer_update' && <span className="font-bold text-brand-clay">[POINTER] </span>}
                            {log.type === 'traverse' && <span className="font-bold text-brand-moss">[TRAVERSE] </span>}
                            {log.type === 'success' && <span className="font-bold text-brand-sage">[SUCCESS] </span>}
                            {log.message}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

            </div>

            {/* KOLOM KANAN & TENGAH: VISUAL ANTREAN & PELAYANAN DOKTER */}
            <div className="lg:col-span-2 space-y-6">

              {/* DIAGRAM INTERAKTIF LINKED LIST */}
              <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-6" id="linked_list_visual_canvas">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-brand-moss flex items-center gap-2">
                      Visualisasi Rantai Pointer Linked List Antrean
                    </h2>
                    <p className="text-brand-sage text-xs">
                      Setiap Node saling terhubung dengan pointer <code className="bg-brand-sand text-brand-clay px-1 rounded font-mono">next</code> ke alamat memori (ID Pasien) berikutnya.
                    </p>
                  </div>
                  
                  <div className="self-start sm:self-center shrink-0">
                    <span className="text-[11px] font-mono text-brand-sage block text-right">
                      Head: <span className="font-bold text-brand-moss">{queueHead ? queueHead.patient.id : 'NULL'}</span>
                    </span>
                  </div>
                </div>

                {/* Canvas Render Node Chains */}
                <div className="relative overflow-x-auto py-6 px-2 flex items-center min-h-[140px] bg-brand-sand/20 rounded-xl border border-brand-border" id="node_chains_container">
                  {queueList.length === 0 ? (
                    <div className="w-full text-center py-8 text-brand-sage flex flex-col items-center justify-center gap-2" id="empty_queue_fallback">
                      <Users className="w-12 h-12 text-brand-border stroke-1" />
                      <div>
                        <p className="font-bold text-sm text-brand-charcoal">Tidak ada pasien dalam antrean</p>
                        <p className="text-xs text-brand-sage">Silakan isi formulir atau tekan "Demo" untuk menyimulasikan pendaftaran.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 flex-nowrap" id="node_chain_flex_row">
                      
                      {/* HEAD INDICATOR */}
                      <div className="flex flex-col items-center justify-center mr-2 select-none" id="pointer_head_flag">
                        <span className="text-[10px] font-mono font-bold text-brand-moss uppercase border border-brand-sage bg-brand-lime/40 px-2 py-0.5 rounded-full shadow-xs mb-1">
                          Head
                        </span>
                        <div className="w-0.5 h-6 bg-brand-moss"></div>
                        <ArrowRight className="w-4 h-4 text-brand-moss transform rotate-90" />
                      </div>

                      {/* RENDERING INDIVIDUAL NODES */}
                      <AnimatePresence>
                        {queueList.map((patient, index) => {
                          const isLansia = patient.age >= 60;
                          const nextNodeId = queueList[index + 1]?.id || 'NULL';
                          
                          return (
                            <div key={patient.id} className="flex items-center gap-3 shrink-0" id={`queue_node_wrapper_${patient.id}`}>
                              
                              {/* PASIEN NODE BODY */}
                              <motion.div
                                layoutId={`node_card_${patient.id}`}
                                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -15 }}
                                transition={{ type: 'spring', damping: 20 }}
                                className={`w-64 rounded-xl border-2 p-4 shadow-sm relative transition-all ${
                                  index === 0
                                    ? 'bg-brand-lime/30 border-brand-moss shadow-brand-lime/10 ring-2 ring-brand-moss/20'
                                    : isLansia
                                    ? 'bg-brand-cream/40 border-brand-clay/60 text-brand-charcoal'
                                    : 'bg-white border-brand-border'
                                }`}
                                id={`node_card_inner_${patient.id}`}
                              >
                                {index === 0 && (
                                  <span className="absolute -top-3 left-3 bg-brand-moss text-white font-bold px-2.5 py-0.5 text-[9px] rounded-full uppercase tracking-wider border border-white shadow-xs">
                                    Sedang Diperiksa
                                  </span>
                                )}

                                {/* Header Node */}
                                <div className="flex justify-between items-start">
                                  <span className="text-[10px] font-bold font-mono text-brand-moss bg-brand-beige px-1.5 py-0.5 rounded border border-brand-border">
                                    ADDR: {patient.id}
                                  </span>
                                  
                                  {/* Urgensi indicator */}
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    patient.urgency === 'high' 
                                      ? 'bg-brand-peach text-brand-clay' 
                                      : patient.urgency === 'medium' 
                                      ? 'bg-brand-cream text-brand-charcoal font-semibold' 
                                      : 'bg-brand-sand text-brand-charcoal'
                                  }`}>
                                    {patient.urgency === 'high' ? 'Darurat' : patient.urgency === 'medium' ? 'Sedang' : 'Rendah'}
                                  </span>
                                </div>

                                {/* Body Node */}
                                <div className="mt-2.5">
                                  <h3 className="font-bold text-sm text-brand-charcoal truncate" title={patient.name}>
                                    {patient.name}
                                  </h3>
                                  <p className="text-brand-sage text-xs mt-0.5 font-bold">{patient.age} Tahun</p>
                                  
                                  {/* Badges container */}
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {isLansia && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] bg-brand-clay text-white px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        <Sparkles className="w-2.5 h-2.5" /> LANSIA
                                      </span>
                                    )}
                                    {patient.isBpjs ? (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] bg-brand-moss text-white px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider" title={`BPJS ID: ${patient.bpjsNumber}`}>
                                        <ShieldCheck className="w-2.5 h-2.5" /> BPJS
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] bg-brand-sage/60 text-white px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        UMUM
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-3 pt-2 border-t border-dashed border-brand-border">
                                    <p className="text-[10px] text-brand-charcoal font-medium line-clamp-1 italic">
                                      &ldquo;{patient.symptoms}&rdquo;
                                    </p>
                                  </div>
                                </div>

                                {/* Footer Pointer Block */}
                                <div className="mt-3.5 bg-brand-charcoal text-brand-beige font-mono text-[10px] p-1.5 rounded-lg flex justify-between items-center">
                                  <span className="text-brand-lime">next:</span>
                                  <span className={nextNodeId === 'NULL' ? 'text-brand-peach font-bold' : 'text-brand-cream font-semibold'}>
                                    {nextNodeId}
                                  </span>
                                </div>

                                {/* Cancel / Deletion Button (O(n) Node removal) */}
                                {index > 0 && (
                                  <button
                                    id={`cancel_btn_${patient.id}`}
                                    onClick={() => handleCancelQueue(patient.id)}
                                    className="absolute -bottom-2 -right-2 p-1 bg-white border border-brand-border rounded-full text-brand-clay hover:bg-brand-peach/40 hover:text-brand-clay transition shadow-sm cursor-pointer"
                                    title="Batalkan Pendaftaran"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </motion.div>

                              {/* LINK ARROW POINTER */}
                              {nextNodeId !== 'NULL' && (
                                <div className="flex flex-col items-center justify-center shrink-0" id={`arrow_pointer_after_${patient.id}`}>
                                  <span className="text-[9px] font-mono text-brand-clay font-bold mb-1">next</span>
                                  <ArrowRight className="w-6 h-6 text-brand-clay stroke-2 animate-pulse" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </AnimatePresence>

                      {/* TAIL POINTER (NULL) */}
                      <div className="flex flex-col items-center justify-center shrink-0 pr-8 select-none" id="pointer_tail_flag">
                        <ArrowRight className="w-5 h-5 text-brand-sage" />
                        <span className="text-xs font-mono font-bold text-brand-clay bg-brand-sand border border-brand-border/80 px-2.5 py-1 rounded-lg shadow-xs mt-2">
                          NULL (Ujung)
                        </span>
                      </div>

                    </div>
                  )}
                </div>
              </div>

              {/* SESI PEMERIKSAAN AKTIF (RUANG DOKTER) */}
              <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden" id="doctor_examination_room">
                <div className="bg-brand-moss text-white px-5 py-4 flex justify-between items-center" id="room_header">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-white" />
                    <h2 className="font-bold tracking-wide">Konsultasi Medis Aktif &mdash; Ruang Dokter</h2>
                  </div>
                  <span className="text-[10px] bg-white/20 border border-white/30 text-white font-mono px-2 py-0.5 rounded">
                    PROSES: DEQUEUE() + INSERT_RECORDS(LIFO)
                  </span>
                </div>

                <div className="p-6" id="examination_box_body">
                  {!queueHead ? (
                    <div className="text-center py-12 text-brand-sage flex flex-col items-center justify-center gap-2" id="no_active_patient_room">
                      <Clock className="w-12 h-12 text-brand-border stroke-1" />
                      <div>
                        <p className="font-bold text-sm text-brand-charcoal">Dokter Siap Melayani</p>
                        <p className="text-xs text-brand-sage">Belum ada pasien terdaftar dalam antrean saat ini.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6" id="active_consultation_form_wrapper">
                      
                      {/* Sub-Panel Informasi Pasien Tertanggung */}
                      <div className="md:col-span-2 space-y-4 bg-brand-sand/20 p-4 rounded-xl border border-brand-border" id="active_patient_identity_panel">
                        <h3 className="text-xs font-bold font-sans uppercase text-brand-moss tracking-wider pb-1.5 border-b border-brand-border flex items-center justify-between">
                          <span>Identitas Pasien</span>
                          <span className="text-[10px] font-mono text-brand-charcoal bg-brand-lime px-2 py-0.5 rounded font-bold">ADDR: {queueHead.patient.id}</span>
                        </h3>

                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-brand-sage tracking-wider">Nama Pasien</span>
                            <p className="font-bold text-brand-charcoal text-base">{queueHead.patient.name}</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-brand-sage tracking-wider">Usia</span>
                            <p className="font-bold text-brand-charcoal text-sm">{queueHead.patient.age} Tahun {queueHead.patient.age >= 60 ? '(Kategori Lansia / Prioritas)' : '(Kategori Umum)'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-brand-sage tracking-wider">Metode Jaminan</span>
                            <p className="font-bold text-brand-charcoal text-sm flex items-center gap-1 mt-0.5">
                              {queueHead.patient.isBpjs ? (
                                <>
                                  <ShieldCheck className="w-4 h-4 text-brand-moss" />
                                  BPJS ({queueHead.patient.bpjsNumber})
                                </>
                              ) : (
                                'Mandiri / Umum'
                              )}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-brand-sage tracking-wider">Gejala Terdaftar</span>
                            <div className="p-3 bg-white border border-brand-border rounded-xl text-xs text-brand-charcoal leading-relaxed italic mt-1 font-medium">
                              &ldquo;{queueHead.patient.symptoms}&rdquo;
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Form Pengisian Hasil Diagnosis Medis */}
                      <form onSubmit={handleCompleteCheckup} className="md:col-span-3 space-y-4" id="consultation_form">
                        <h3 className="text-xs font-bold uppercase text-brand-moss tracking-wider pb-1.5 border-b border-brand-border">
                          Pengisian Hasil Diagnosis & Terapi
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-brand-sage font-sans mb-1">
                              Dokter Penanggung Jawab
                            </label>
                            <input
                              id="input_doc_name"
                              type="text"
                              required
                              placeholder="dr. Andi Wijaya, Sp.PD"
                              value={doctorName}
                              onChange={(e) => setDoctorName(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-moss bg-brand-sand/20 text-brand-charcoal font-semibold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-brand-sage font-sans mb-1">
                              Hasil Diagnosis <span className="text-brand-clay">*</span>
                            </label>
                            <input
                              id="input_diagnosis"
                              type="text"
                              required
                              placeholder="Misal: Hipertensi Stage II"
                              value={diagnosis}
                              onChange={(e) => setDiagnosis(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-moss bg-brand-sand/20 text-brand-charcoal font-semibold text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase text-brand-sage font-sans mb-1">
                            Tindakan Medis / Anjuran <span className="text-brand-clay">*</span>
                          </label>
                          <textarea
                            id="input_treatment"
                            required
                            rows={1.5}
                            placeholder="Misal: Istirahat cukup, kurangi garam jenuh berlebih"
                            value={treatment}
                            onChange={(e) => setTreatment(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-moss bg-brand-sand/20 text-brand-charcoal text-xs resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase text-brand-sage font-sans mb-1">
                            Resep Obat / Terapi Farmasi <span className="text-brand-clay">*</span>
                          </label>
                          <textarea
                            id="input_prescription"
                            required
                            rows={1.5}
                            placeholder="Misal: Amlodipine 5mg (1x1), Paracetamol 500mg (3x1)"
                            value={prescription}
                            onChange={(e) => setPrescription(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-moss bg-brand-sand/20 text-brand-charcoal font-mono text-[11px] resize-none"
                          />
                        </div>

                        <button
                          id="btn_submit_consultation"
                          type="submit"
                          className="w-full py-2 bg-brand-moss hover:bg-brand-moss/90 text-white font-bold rounded-lg text-xs shadow hover:shadow-md transition cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
                        >
                          <CheckCircle className="w-4 h-4 text-white" />
                          Selesaikan Pemeriksaan & Panggil Berikutnya
                        </button>
                      </form>

                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB DATABASE REKAM MEDIS */}
        {activeTab === 'records' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="records_tab_content">
            
            {/* KOLOM KIRI: PASIEN LIST NAVIGATOR */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-4 space-y-4" id="records_nav_sidebar">
                <div className="space-y-1">
                  <h2 className="font-bold text-brand-moss text-sm uppercase tracking-wider">Database Pasien Klinik</h2>
                  <p className="text-brand-sage text-[11px]">Bebas mencari histori rekam medis yang telah tersimpan di dalam memori heap pointer.</p>
                </div>

                {/* Search Box */}
                <div className="relative" id="db_search_wrapper">
                  <Search className="w-4 h-4 text-brand-sage absolute left-3 top-2.5" />
                  <input
                    id="input_search_patient"
                    type="text"
                    placeholder="Cari nama / ID / nomor BPJS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-brand-border bg-brand-sand/30 focus:outline-none focus:ring-2 focus:ring-brand-moss font-medium text-xs transition"
                  />
                </div>

                {/* Patient DB List Container */}
                <div className="space-y-2 max-h-[480px] overflow-y-auto" id="records_patient_list">
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-8 text-brand-sage text-xs" id="empty_search_fallback">
                      Tidak ditemukan pasien yang cocok.
                    </div>
                  ) : (
                    filteredPatients.map(p => {
                      const isActive = selectedPatientId === p.id;
                      const isLansia = p.age >= 60;
                      // Ambil head rekam medis untuk status
                      const recordsHead = recordsMap[p.id] || null;
                      const hasRecords = recordsHead !== null;

                      return (
                        <button
                          key={p.id}
                          id={`nav_patient_item_${p.id}`}
                          onClick={() => setSelectedPatientId(p.id)}
                          className={`w-full p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                            isActive
                              ? 'bg-brand-moss/10 border-brand-moss text-brand-charcoal ring-1 ring-brand-moss/25'
                              : 'bg-white hover:bg-brand-sand/45 border-brand-border text-brand-charcoal'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold font-mono text-brand-moss bg-brand-beige px-1.5 py-0.5 rounded border border-brand-border">
                                {p.id}
                              </span>
                              {isLansia && (
                                <span className="text-[9px] font-bold font-sans bg-brand-clay text-white px-1.5 rounded-full uppercase tracking-wider">Lansia</span>
                              )}
                              {p.isBpjs && (
                                <span className="text-[9px] font-bold font-sans bg-brand-lime text-brand-charcoal px-1.5 rounded-full uppercase tracking-wider">BPJS</span>
                              )}
                            </div>
                            <h3 className="font-bold text-xs text-brand-charcoal">{p.name}</h3>
                            <p className="text-[10px] text-brand-sage font-medium">{p.age} Tahun &bull; {p.isBpjs ? 'BPJS Kesehatan' : 'Umum'}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {hasRecords ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-brand-moss" title="Memiliki riwayat rekam medis" />
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full bg-brand-border" title="Belum memiliki kunjungan" />
                            )}
                            <ChevronRight className="w-4 h-4 text-brand-sage" />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* KOLOM KANAN: TIMELINE REKAM MEDIS (LIFO LINKED LIST) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-6 min-h-[450px]" id="records_history_content">
                {selectedPatientId ? (
                  (() => {
                    const patient = patientsDb.find(p => p.id === selectedPatientId);
                    if (!patient) return null;

                    const recordsHead = recordsMap[patient.id] || null;
                    const recordsList = recordsToArray(recordsHead);

                    return (
                      <div className="space-y-6" id={`visual_records_container_${patient.id}`}>
                        
                        {/* Header rekam medis pasien terpilih */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-4" id="records_owner_header">
                          <div>
                            <h2 className="text-lg font-bold text-brand-moss flex items-center gap-2">
                              Riwayat Rekam Medis (LIFO Linked List)
                            </h2>
                            <p className="text-brand-sage text-xs">
                              Riwayat kunjungan tersimpan secara mundur (LIFO). Item teratas menunjuk ke kunjungan sebelumnya.
                            </p>
                          </div>

                          <div className="shrink-0 bg-brand-sand/55 py-2 px-3.5 rounded-xl border border-brand-border text-xs text-brand-charcoal font-semibold">
                            Pemilik Kartu: <strong className="text-brand-moss font-bold">{patient.name} ({patient.id})</strong>
                          </div>
                        </div>

                        {/* Timeline List Nodes */}
                        <div className="space-y-6" id="records_timeline_scroller">
                          {recordsList.length === 0 ? (
                            <div className="text-center py-16 text-brand-sage flex flex-col items-center justify-center gap-3" id="empty_patient_records_fallback">
                              <FileText className="w-12 h-12 text-brand-border stroke-1" />
                              <div className="space-y-1">
                                <p className="font-bold text-brand-charcoal text-sm">Belum Ada Catatan Konsultasi Medis</p>
                                <p className="text-xs text-brand-sage">Pasien belum pernah berkonsultasi atau rekam medis kunjungan belum didokumentasikan.</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              
                              {/* MEMORY INFO BAR */}
                              <div className="p-3.5 bg-brand-charcoal text-brand-beige font-mono text-xs rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <span className="text-brand-lime">LIFO Head Address:</span> <strong className="text-white">{recordsList[0].id}</strong>
                                </div>
                                <div>
                                  Chain Length: <strong className="text-brand-lime">{recordsList.length} Nodes</strong>
                                </div>
                              </div>

                              {/* Timeline Cards */}
                              <div className="relative border-l border-brand-border pl-6 ml-4 space-y-6" id="records_timeline_container">
                                {recordsList.map((rec, index) => {
                                  const nextAddress = recordsList[index + 1]?.id || 'NULL';
                                  
                                  return (
                                    <motion.div
                                      key={rec.id}
                                      initial={{ opacity: 0, x: -15 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="relative bg-white rounded-xl border border-brand-border p-5 shadow-xs space-y-3"
                                      id={`record_timeline_card_${rec.id}`}
                                    >
                                      {/* Timeline dot badge */}
                                      <span className="absolute -left-[31px] top-5 bg-brand-moss ring-4 ring-white w-2.5 h-2.5 rounded-full" />
                                      
                                      {/* Header card */}
                                      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-brand-border pb-2">
                                        <div>
                                          <span className="text-[10px] font-mono text-brand-moss bg-brand-beige px-1.5 py-0.5 rounded mr-2 font-bold">
                                            ID: {rec.id}
                                          </span>
                                          <span className="text-xs font-bold text-brand-charcoal">
                                            {new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                          </span>
                                        </div>

                                        <span className="text-[10px] bg-brand-charcoal text-brand-lime font-mono px-2 py-0.5 rounded-lg">
                                          next: <strong className={nextAddress === 'NULL' ? 'text-brand-peach' : 'text-brand-cream'}>{nextAddress}</strong>
                                        </span>
                                      </div>

                                      {/* Body rekam medis */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs" id={`record_fields_${rec.id}`}>
                                        <div className="md:col-span-1 border-r border-brand-border/40 pr-2">
                                          <span className="text-[9px] uppercase font-bold tracking-wider text-brand-sage font-mono">Dokter Pemeriksa</span>
                                          <p className="font-bold text-brand-charcoal mt-0.5 flex items-center gap-1">
                                            <Stethoscope className="w-3.5 h-3.5 text-brand-moss" />
                                            {rec.doctorName}
                                          </p>
                                        </div>

                                        <div className="md:col-span-2">
                                          <span className="text-[9px] uppercase font-bold tracking-wider text-brand-sage font-mono">Hasil Diagnosis Medis</span>
                                          <p className="font-bold text-brand-charcoal mt-0.5 text-sm">{rec.diagnosis}</p>
                                        </div>
                                      </div>

                                      <div className="p-3 bg-brand-sand/60 rounded-lg text-xs grid grid-cols-1 md:grid-cols-2 gap-3" id={`record_details_grayblock_${rec.id}`}>
                                        <div>
                                          <span className="text-[9px] uppercase font-bold tracking-wider text-brand-sage font-mono">Tindakan Jaringan</span>
                                          <p className="text-brand-charcoal mt-0.5 leading-relaxed font-medium">{rec.treatment}</p>
                                        </div>
                                        <div>
                                          <span className="text-[9px] uppercase font-bold tracking-wider text-brand-sage font-mono">Resep Terapi Obat</span>
                                          <p className="text-brand-charcoal mt-0.5 leading-relaxed font-mono text-[11px] bg-white border border-brand-border p-1 rounded font-medium">{rec.prescription}</p>
                                        </div>
                                      </div>

                                      {/* Visual instruction explaining LIFO Link */}
                                      {index === 0 && (
                                        <div className="text-[10px] text-brand-moss font-bold flex items-center gap-1.5 mt-2 bg-brand-lime/20 px-2.5 py-1.5 rounded-lg" id="lifo_pointer_edu_tag">
                                          <Sparkles className="w-3.5 h-3.5 text-brand-moss" />
                                          Kunjungan terakhir ini merupakan Kepala (Head) riwayat. Pointer next menunjuk ke kunjungan sebelumnya ({nextAddress}).
                                        </div>
                                      )}
                                    </motion.div>
                                  );
                                })}
                              </div>

                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-16 text-brand-sage flex flex-col items-center justify-center gap-3" id="no_selected_db_patient">
                    <UserPlus className="w-12 h-12 text-brand-border stroke-1" />
                    <div>
                      <p className="font-bold text-brand-charcoal text-sm">Pilih pasien di samping untuk melacak rekam medis</p>
                      <p className="text-xs text-brand-sage">Pencarian dapat disaring berdasarkan kriteria nama atau nomor kartu BPJS.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB INFORMASI POINTERS */}
        {activeTab === 'about' && (
          <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-6 space-y-6" id="about_tab_content">
            <h2 className="text-xl font-bold text-brand-moss border-b border-brand-border pb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-brand-moss" />
              Sistem Prioritas Linked List - Apa & Mengapa?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="about_cards_grid">
              <div className="bg-brand-sand/30 p-5 rounded-2xl border border-brand-border space-y-2" id="about_card_queue">
                <div className="p-2 bg-brand-lime/40 text-brand-moss rounded-lg w-fit">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-brand-charcoal">Antrean (Queue Node)</h3>
                <p className="text-xs text-brand-sage leading-relaxed font-medium">
                  Antrean umum rumah sakit diimplementasikan menggunakan tipe struktur dwi-penunjuk, dengan penyisipan prioritas LANSIA (umur &ge; 60 tahun). Node Lansia disisipkan di awal kelompok lansia secara sekuensial (FIFO dalam prioritas), sementara pasien umum mengantre di belakang.
                </p>
              </div>

              <div className="bg-brand-sand/30 p-5 rounded-2xl border border-brand-border space-y-2" id="about_card_lifo">
                <div className="p-2 bg-[#FAEDCD] text-brand-clay rounded-lg w-fit">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-brand-charcoal">Rekam Medis (LIFO Node)</h3>
                <p className="text-xs text-brand-sage leading-relaxed font-medium">
                  Catatan resume medis pasien dihubungkan secara terbalik (LIFO - Last In First Out). Setiap konsultasi baru disisipkan di posisi Kepala (Head), dan menunjuk ke riwayat kunjungan yang lebih lama melalui penunjuk <code className="bg-white border border-brand-border px-1 rounded text-brand-clay font-mono">next</code>. Dokter dapat melihat hasil analisis diagnosis terkini secara instan dan efisien.
                </p>
              </div>

              <div className="bg-brand-sand/30 p-5 rounded-2xl border border-brand-border space-y-2" id="about_card_validation">
                <div className="p-2 bg-brand-peach text-brand-clay rounded-lg w-fit">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-brand-charcoal">Verifikasi BPJS</h3>
                <p className="text-xs text-brand-sage leading-relaxed font-medium">
                  Menyediakan slot penampung untuk status BPJS Kesehatan pasien lengkap dengan jaminan nomor kepesertaan unik guna mempermudah administrasi jaminan kesehatan secara otomatis oleh petugas pasca keluar dari ruang konsultasi.
                </p>
              </div>
            </div>

            <div className="bg-brand-sand/20 p-5 rounded-xl border border-brand-border space-y-3" id="about_code_logic">
              <h3 className="font-bold text-xs text-brand-moss uppercase tracking-wider">Representasi Struktur Kode Pointer</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-brand-charcoal text-brand-beige p-4 rounded-xl border border-brand-charcoal">
                  <span className="text-brand-sage block mb-2">// Definisi Node Antrean</span>
                  <p className="text-brand-beige/80">class PatientQueueNode &#123;</p>
                  <p className="text-brand-lime ml-4">patient: Patient;</p>
                  <p className="text-brand-cream ml-4">next: PatientQueueNode | null = null;</p>
                  <p className="text-brand-beige/80">&#125;</p>
                </div>
                <div className="bg-brand-charcoal text-brand-beige p-4 rounded-xl border border-brand-charcoal">
                  <span className="text-brand-sage block mb-2">// Ilustrasi Logika Penyisipan Lansia (Priority Linked List)</span>
                  <p className="text-brand-beige/80">if (isLansia && head.patient.age &lt; 60) &#123;</p>
                  <p className="text-brand-lime ml-4">newNode.next = head;</p>
                  <p className="text-brand-lime ml-4">return newNode; <span className="text-brand-sage text-[11px]">// Head Baru</span></p>
                  <p className="text-brand-beige/80">&#125; else &#123;</p>
                  <p className="text-brand-sage/60 ml-4 mt-1">/* Cari node lansia terakhir, lalu sambungkan: */</p>
                  <p className="text-brand-lime ml-4">newNode.next = current.next;</p>
                  <p className="text-brand-lime ml-4">current.next = newNode;</p>
                  <p className="text-brand-beige/80">&#125;</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-brand-charcoal text-brand-beige/70 py-6 text-center border-t border-brand-border mt-12 text-xs" id="app_footer_bottom">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-bold text-brand-beige">Aplikasi Sistem Rumah Sakit &mdash; Klinik Kinasih</p>
          <p>Didesorpsi & diregenerasi dengan tema premium <strong className="text-brand-lime">Natural Tones</strong>. Memvisualisasi queueing dan rekam medis modular murni.</p>
          <p className="text-[10px] text-brand-sage font-mono">Dijalankan pada server terkompilasi Client-Side React &bull; Port 3000</p>
        </div>
      </footer>
    </div>
  );
}