// src/lib/incident-types.ts — Incident type data for the report funnel

export type SeverityLevel = 'low' | 'moderate' | 'high';

export type IncidentCategory = {
  id: string;
  label: string;
};

export type IncidentType = {
  id: string;
  label: string;
  category: string;
  dbCategory: string;
};

export type SeverityOption = {
  level: SeverityLevel;
  shortLabel: string;
  dbValue: 'low' | 'med' | 'high';
  color: string;
};

export const incidentCategories: IncidentCategory[] = [
  { id: 'interpersonal', label: 'Comportement' },
  { id: 'environment', label: 'Environnement' },
  { id: 'emergency', label: 'Urgence' },
];

export const incidentTypes: IncidentType[] = [
  // Comportement
  { id: 'harassment', label: 'Harcèlement', category: 'interpersonal', dbCategory: 'harassment' },
  { id: 'stalking', label: 'Filature', category: 'interpersonal', dbCategory: 'stalking' },
  { id: 'aggression', label: 'Agression', category: 'interpersonal', dbCategory: 'aggression' },
  { id: 'verbal_abuse', label: 'Insultes / Menaces', category: 'interpersonal', dbCategory: 'verbal_abuse' },
  { id: 'theft', label: 'Vol / Pickpocket', category: 'interpersonal', dbCategory: 'theft' },
  { id: 'suspicious', label: 'Comportement suspect', category: 'interpersonal', dbCategory: 'suspicious' },
  { id: 'drunk', label: 'Personne en état d\'ivresse', category: 'interpersonal', dbCategory: 'drunk' },
  // Environnement
  { id: 'poor_lighting', label: 'Mauvais éclairage', category: 'environment', dbCategory: 'poor_lighting' },
  { id: 'unsafe_road', label: 'Route dangereuse', category: 'environment', dbCategory: 'unsafe_road' },
  { id: 'isolated', label: 'Zone isolée', category: 'environment', dbCategory: 'isolated' },
  { id: 'obstacle', label: 'Obstacle sur la voie', category: 'environment', dbCategory: 'obstacle' },
  { id: 'construction', label: 'Travaux / Chantier', category: 'environment', dbCategory: 'construction' },
  { id: 'bad_parking', label: 'Véhicule mal garé', category: 'environment', dbCategory: 'bad_parking' },
  // Urgence
  { id: 'accident', label: 'Accident', category: 'emergency', dbCategory: 'accident' },
  { id: 'medical_emergency', label: 'Urgence médicale', category: 'emergency', dbCategory: 'medical_emergency' },
  { id: 'fire', label: 'Incendie', category: 'emergency', dbCategory: 'fire' },
  { id: 'flood', label: 'Inondation', category: 'emergency', dbCategory: 'flood' },
];

export const severityOptions: SeverityOption[] = [
  { level: 'low', shortLabel: 'Faible', dbValue: 'low', color: '#3b82f6' },
  { level: 'moderate', shortLabel: 'Modéré', dbValue: 'med', color: '#f59e0b' },
  { level: 'high', shortLabel: 'Grave', dbValue: 'high', color: '#ef4444' },
];
