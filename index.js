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
// 1. DATA TYPES & NODE STRUCTURES
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

// Struktur Node untuk Linked List Antrean (FIFO dengan Priority)
export class PatientQueueNode {
  patient: Patient;
  next: PatientQueueNode | null = null;

  constructor(patient: Patient) {
    this.patient = patient;
  }
}

// Struktur Node untuk Linked List Rekam Medis (LIFO - Terakhir Masuk, Pertama Keluar)
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
// 2. INITIAL MOCK DATABASE (DATA INITIALIZATION)
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
    registrationTime: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 jam yang lalu
  },
  {
    id: 'P-102',
    name: 'Bapak Harsono',
    age: 68,
    isBpjs: true,
    bpjsNumber: '0005544332211',
    symptoms: 'Nyeri sendi hebat pada kedua lutut saat berjalan (osteoarthritis).',
    urgency: 'medium',
    registrationTime: new Date(Date.now() - 3600000 * 1.5).toISOString(), // 1.5 jam yang lalu
  },
  {
    id: 'P-103',
    name: 'Aditya Pratama',
    age: 28,
    isBpjs: false,
    symptoms: 'Demam tinggi mendadak sejak 3 hari yang lalu disertai sakit kepala.',
    urgency: 'medium',
    registrationTime: new Date(Date.now() - 3600000).toISOString(), // 1 jam yang lalu
  },
  {
    id: 'P-104',
    name: 'Siti Rahmaawati',
    age: 45,
    isBpjs: true,
    bpjsNumber: '0008877665544',
    symptoms: 'Batuk berdahak intensitas sedang dan flu berkepanjangan.',
    urgency: 'low',
    registrationTime: new Date(Date.now() - 1800000).toISOString(), // 30 menit yang lalu
  }
];

export const INITIAL_RECORDS: MedicalRecord[] = [
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
// 3. LINKED LIST CORE ALGORITHMS
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
  const [queueHead, setQueueHead] = useState<PatientQueueNode | null>(null);
  const [queueList, setQueueList] = useState<Patient[]>([]);
  const [patientsDb, setPatientsDb] = useState<Patient[]>(INITIAL_PATIENTS);
  const [recordsMap, setRecordsMap] = useState<Record<string, MedicalRecordNode | null>>({});

  const [logs, setLogs] = useState<VisualStep[]>([
    { type: 'info', message: 'Sistem dimulai. Memuat data awal pasien lansia & BPJS.' }
  ]);

  const [activeTab, setActiveTab] = useState<'queue' | 'records' | 'about'>('queue');

  // Form State
  const [formName, setFormName] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formIsBpjs, setFormIsBpjs] = useState(false);
  const [formBpjsNumber, setFormBpjsNumber] = useState('');
  const [formSymptoms, setFormSymptoms] = useState('');
  const [formUrgency, setFormUrgency] = useState<'low' | 'medium' | 'high'>('medium');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>('P-101');

  // Record Form State
  const [doctorName, setDoctorName] = useState('dr. Andi Wijaya, Sp.PD');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [prescription, setPrescription] = useState('');

  const [completedCount, setCompletedCount] = useState<number>(3);

  // Inisialisasi awal list dari mock data
  useEffect(() => {
    let tempHead: PatientQueueNode | null = null;
    let initialLogs: VisualStep[] = [];
    
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

    const tempRecordsMap: Record<string, MedicalRecordNode | null> = {};
    INITIAL_PATIENTS.forEach(p => {
      tempRecordsMap[p.id] = null;
    });

    INITIAL_RECORDS.forEach(record => {
      const currentHead = tempRecordsMap[record.patientId] || null;
      const result = insertMedicalRecord(currentHead, record);
      tempRecordsMap[record.patientId] = result.newHead;
    });

    setRecordsMap(tempRecordsMap);
  }, []);

  useEffect(() => {
    setQueueList(queueToArray(queueHead));
  }, [queueHead]);

  const handleRegisterPatient = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!formName.trim() || !formAge) return;

    const age = parseInt(formAge);
    const patientId = `P-${Date.now().toString().slice(-3)}`;
    
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

    setPatientsDb(prev => [...prev, newPatient]);

    const result = insertPatient(queueHead, newPatient);
    setQueueHead(result.newHead);
    
    setRecordsMap(prev => ({
      ...prev,
      [patientId]: null
    }));

    setLogs(result.steps);

    setFormName('');
    setFormAge('');
    setFormIsBpjs(false);
    setFormBpjsNumber('');
    setFormSymptoms('');
    setFormUrgency('medium');
  };

  const handleCancelQueue = (patientId: string) => {
    const result = removePatient(queueHead, patientId);
    setQueueHead(result.newHead);
    setLogs(result.steps);
  };

  const handleCompleteCheckup = (e: FormEvent) => {
    e.preventDefault();
    if (!queueHead) return;

    const currentPatient = queueHead.patient;

    const newRecord: MedicalRecord = {
      id: `MR-${Date.now().toString().slice(-4)}`,
      patientId: currentPatient.id,
      date: new Date().toISOString(),
      doctorName: doctorName || 'Dokter Umum Jaga',
      diagnosis: diagnosis || 'Rawat Jalan Umum (Observasi)',
      treatment: treatment || 'Pemberian edukasi gaya hidup sehat dan istirahat.',
      prescription: prescription || 'Multivitamin penunjang imun tubuh'
    };

    const currentRecordsHead = recordsMap[currentPatient.id] || null;
    const recordResult = insertMedicalRecord(currentRecordsHead, newRecord);
    
    setRecordsMap(prev => ({
      ...prev,
      [currentPatient.id]: recordResult.newHead
    }));

    const queueResult = dequeuePatient(queueHead);
    setQueueHead(queueResult.newHead);
    setCompletedCount(prev => prev + 1);

    setLogs([
      ...recordResult.steps,
      ...queueResult.steps,
      { type: 'success', message: `Pasien ${currentPatient.name} selesai ditangani. Berpindah ke pasien berikutnya!` }
    ]);

    setDiagnosis('');
    setTreatment('');
    setPrescription('');
    setSelectedPatientId(currentPatient.id);
  };

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
      setPatientsDb(prev => {
        if (!prev.find(item => item.id === p.id)) {
          return [...prev, p];
        }
        return prev;
      });

      const result = insertPatient(currentHead, p);
      currentHead = result.newHead;
      accumulatedLogs = [...accumulatedLogs, ...result.steps];

      setRecordsMap(prev => ({
        ...prev,
        [p.id]: prev[p.id] || null
      }));
    });

    setQueueHead(currentHead);
    setLogs(accumulatedLogs);
  };

  const handleResetQueue = () => {
    setQueueHead(null);
    setLogs([{ type: 'info', message: 'Antrean pendaftaran telah dikosongkan.' }]);
  };

  const queueLength = queueList.length;
  const lansiaInQueueCount = queueList.filter(p => p.age >= 60).length;
  const bpjsInQueueCount = queueList.filter(p => p.isBpjs).length;

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
              <Stethoscope className="w-8 h-8 animate-pulse text-white" id="hospital_service_
