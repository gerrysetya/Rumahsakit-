# Rumahsakit-
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
    
