import React from 'react';

export interface PhotoData {
  file: File | null;
  preview: string | null;
  remark: string;
}

export interface PhotosState {
  [key: number]: PhotoData;
}

export interface RecordData {
  id?: string;
  poNumber: string;
  shippingLocation: string;
  photos: PhotosState;
  status?: 'COMPLETED' | 'DRAFT' | 'PENDING';
}

export interface ContainerRecord {
  id: string;
  poNumber: string;
  shippingLocation: string;
  photoCount: number;
  status: 'COMPLETED' | 'DRAFT' | 'PENDING';
  updatedAt: string;
}

export interface UploadStep {
  id: number;
  label: string;
}

export type ModalType = 'info' | 'warning' | 'primary' | 'success';

export interface ModalState {
  show: boolean;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
  type: ModalType;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  photoCount: number;
  firstMissingRef: React.RefObject<HTMLDivElement> | { current: HTMLDivElement | null } | null;
}