import type {
  BoardConfig,
  CustomAccessoryDefinition,
  CustomCategory,
  PlacedChannel,
  ProjectItem,
} from './types';

export const PROJECT_SCHEMA_VERSION = '1.0.0';
const SUPPORTED_MAJOR_VERSION = '1';

export interface ProjectPlanPayload {
  schemaVersion: string;
  exportedAt: string;
  projectTitle?: string;
  boardConfig: BoardConfig;
  channels: PlacedChannel[];
  categories?: CustomCategory[];
  customAccessories?: CustomAccessoryDefinition[];
  projects?: ProjectItem[];
  activeProjectId?: string;
}

export interface ProjectPlanInput {
  projectTitle: string;
  boardConfig: BoardConfig;
  channels: PlacedChannel[];
  categories?: CustomCategory[];
  customAccessories?: CustomAccessoryDefinition[];
  projects?: ProjectItem[];
  activeProjectId?: string;
}

export interface ParsedProjectPlan {
  projectTitle?: string;
  boardConfig: BoardConfig;
  channels: PlacedChannel[];
  categories?: CustomCategory[];
  customAccessories?: CustomAccessoryDefinition[];
  projects?: ProjectItem[];
  activeProjectId?: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function buildExportFilename(projectTitle: string, date = new Date()): string {
  const baseTitle = projectTitle.trim() ? projectTitle : 'underplan-config';
  const safeTitle = baseTitle.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_');
  const dateStamp = date.toISOString().slice(0, 10);
  return `${safeTitle}-${dateStamp}.json`;
}

export function serializeProjectPlan(input: ProjectPlanInput, now = new Date()): string {
  const payload: ProjectPlanPayload = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    projectTitle: input.projectTitle || 'My Setup',
    boardConfig: input.boardConfig,
    channels: input.channels,
    categories: input.categories,
    customAccessories: input.customAccessories,
    projects: input.projects,
    activeProjectId: input.activeProjectId,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseProjectPlan(rawText: string): ParsedProjectPlan {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Configuration file is empty');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Invalid JSON syntax');
  }

  if (!isPlainObject(parsed)) {
    throw new Error('Configuration root must be a JSON object');
  }

  const candidate = isPlainObject(parsed.data) ? parsed.data : parsed;

  if (candidate.schemaVersion !== undefined) {
    if (typeof candidate.schemaVersion !== 'string' || !candidate.schemaVersion.trim()) {
      throw new Error('Invalid schemaVersion format');
    }
    const major = candidate.schemaVersion.split('.')[0];
    if (major !== SUPPORTED_MAJOR_VERSION) {
      throw new Error(`Unsupported schemaVersion: ${candidate.schemaVersion}`);
    }
  }

  if (!isPlainObject(candidate.boardConfig)) {
    throw new Error('Missing or invalid boardConfig');
  }

  if (!Array.isArray(candidate.channels)) {
    throw new Error('Missing or invalid channels list');
  }

  return {
    boardConfig: candidate.boardConfig as unknown as BoardConfig,
    channels: candidate.channels as PlacedChannel[],
    categories: Array.isArray(candidate.categories)
      ? (candidate.categories as CustomCategory[])
      : undefined,
    customAccessories: Array.isArray(candidate.customAccessories)
      ? (candidate.customAccessories as CustomAccessoryDefinition[])
      : undefined,
    projectTitle:
      typeof candidate.projectTitle === 'string' ? candidate.projectTitle : undefined,
    projects: Array.isArray(candidate.projects)
      ? (candidate.projects as ProjectItem[])
      : undefined,
    activeProjectId:
      typeof candidate.activeProjectId === 'string' ? candidate.activeProjectId : undefined,
  };
}
