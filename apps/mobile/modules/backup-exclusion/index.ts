/**
 * Leaves a file or a folder out of the phone's iCloud and computer backups (K-618, ADR-055 › 97): iOS's
 * `URLResourceValues.isExcludedFromBackup`, set in ios/BackupExclusionModule.swift. Our own local module (ADR-047's way: a thin
 * Expo module, no package). Only in our own build — Expo Go does not carry it, and there this is null.
 */
import { requireOptionalNativeModule } from 'expo';

export type BackupExclusion = {
  /** Marks the file or folder at a file:// uri; throws when iOS refuses (no such file, say). */
  exclude(uri: string): void;
};

export const backupExclusion = (): BackupExclusion | null => requireOptionalNativeModule<BackupExclusion>('BackupExclusion');
