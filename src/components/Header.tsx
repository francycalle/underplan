import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  ClipboardCopy,
  Download,
  Check,
  Trash2,
  X,
  Settings2,
  ArrowLeft,
  CopyPlus,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { BoardConfig, CustomCategory, GridPlatform, ProjectItem, TileDefinition } from '../lib/types';
import {
  calculateBoardDimensions,
  findBestMultiboardModule,
  findBestOpenGridModule,
  DEFAULT_BOARD_CONFIG,
  DEFAULT_OPENGRID_CONFIG,
  validateMultiboardDimensions,
  getCompatibleDimensions,
  STANDARD_MULTIBOARD_DIMENSIONS,
  optimizeOpenGridTiles,
} from '../lib/geometry';
import { BrandLogo } from './BrandLogo';
import { ChannelDropdown, MiniNewPopover } from './ChannelDropdown';

export const OPENGRID_BED_OPTIONS = [
  { size: 12, label: '12×12 OU (336×336 mm)' },
  { size: 10, label: '10×10 OU (280×280 mm)' },
  { size: 9, label: '9×9 OU (252×252 mm)' },
  { size: 8, label: '8×8 OU (224×224 mm)' },
  { size: 7, label: '7×7 OU (196×196 mm)' },
  { size: 6, label: '6×6 OU (168×168 mm)' },
  { size: 5, label: '5×5 OU (140×140 mm)' },
  { size: 4, label: '4×4 OU (112×112 mm)' },
  { size: 3, label: '3×3 OU (84×84 mm)' },
  { size: 2, label: '2×2 OU (56×56 mm)' },
];

const PRESET_COLORS = [
  '#38BDF8', // Blue (HDMI)
  '#F59E0B', // Orange (Power)
  '#10B981', // Emerald (Network)
  '#06B6D4', // Cyan (Data)
  '#8B5CF6', // Purple (Video)
  '#EC4899', // Pink
  '#EAB308', // Yellow
  '#EF4444', // Red
];

interface HeaderProps {
  boardConfig: BoardConfig;
  onUpdateConfig: (newConfig: Partial<BoardConfig>) => void;
  onClearBoard?: () => void;
  onExportCSV: () => void;
  onCopyBOM: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onToggleBOMDrawer: () => void;
  channelCount?: number;
  snapCount?: number;
  categories: CustomCategory[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  onAddCategory: (cat: CustomCategory) => void;
  onDeleteCategory?: (id: string) => void;
  onUpdateCategory?: (cat: CustomCategory) => void;
  projectTitle?: string;
  onUpdateTitle?: (title: string) => void;
  projects?: ProjectItem[];
  activeProjectId?: string;
  onSelectProject?: (id: string) => void;
  onCreateProject?: (name?: string, config?: BoardConfig) => void;
  onDeleteProject?: (id: string) => void;
  onDuplicateProject?: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  boardConfig,
  onUpdateConfig,
  onExportCSV,
  onCopyBOM,
  onExportPNG,
  onExportSVG,
  onToggleBOMDrawer,
  categories,
  activeCategory,
  onSelectCategory,
  onAddCategory,
  onDeleteCategory,
  onUpdateCategory,
  projectTitle = 'My Setup',
  onUpdateTitle,
  projects,
  activeProjectId = 'proj_default',
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onDuplicateProject,
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMiniNewCategoryOpen, setIsMiniNewCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#10B981');

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatColor, setEditingCatColor] = useState('#38BDF8');

  // Project & Surface management states
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [projectTab, setProjectTab] = useState<'list' | 'surface' | 'new'>('list');
  const [newProjName, setNewProjName] = useState('');
  const [newProjPlatform, setNewProjPlatform] = useState<GridPlatform>('multiboard');
  const [newProjWidthMm, setNewProjWidthMm] = useState('900');
  const [newProjHeightMm, setNewProjHeightMm] = useState('300');
  const [newProjMaxTile, setNewProjMaxTile] = useState<number>(8);

  const dims = calculateBoardDimensions(boardConfig);
  const isOpenGrid = boardConfig.platform === 'opengrid';
  const [tempTitle, setTempTitle] = useState(projectTitle);
  const [inputWidthMm, setInputWidthMm] = useState(String(dims.totalWidthMm));
  const [inputHeightMm, setInputHeightMm] = useState(String(dims.totalHeightMm));
  const [warningInfo, setWarningInfo] = useState<{ title: string; message: string } | null>(null);
  const [newWarningInfo, setNewWarningInfo] = useState<{ title: string; message: string } | null>(null);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempTitle(projectTitle);
  }, [projectTitle]);

  useEffect(() => {
    setInputWidthMm(String(dims.totalWidthMm));
    setInputHeightMm(String(dims.totalHeightMm));
  }, [dims.totalWidthMm, dims.totalHeightMm]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setIsCategoryMenuOpen(false);
        setIsMiniNewCategoryOpen(false);
        setEditingCatId(null);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setIsProjectMenuOpen(false);
        setProjectTab('list');
        setWarningInfo(null);
        setNewWarningInfo(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    const id = `cat_${Date.now()}_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const newCat: CustomCategory = {
      id,
      name: trimmed,
      color: newCatColor,
    };
    onAddCategory(newCat);
    setNewCatName('');
    setIsMiniNewCategoryOpen(false);
  };

  const handleSaveEditCategory = (cat: CustomCategory) => {
    const trimmed = editingCatName.trim();
    if (!trimmed) return;
    onUpdateCategory?.({
      ...cat,
      name: trimmed,
      color: editingCatColor,
    });
    setEditingCatId(null);
  };

  const handleSwitchPlatform = (newPlatform: GridPlatform) => {
    if ((boardConfig.platform ?? 'multiboard') === newPlatform) return;
    if (newPlatform === 'opengrid') {
      const maxTile = boardConfig.maxTileHoles || 8;
      const initialW = 1008;
      const initialH = 504;
      const holesX = Math.round(initialW / 28);
      const holesY = Math.round(initialH / 28);
      const optimized = optimizeOpenGridTiles(holesX, holesY, maxTile);
      onUpdateConfig({
        platform: 'opengrid',
        holePitchMm: 28,
        maxTileHoles: maxTile,
        customTiles: optimized,
        tileWidthHoles: maxTile,
        tileHeightHoles: maxTile,
        cols: Math.ceil(holesX / maxTile),
        rows: Math.ceil(holesY / maxTile),
        customDeskWidthMm: initialW,
        customDeskHeightMm: initialH,
      });
      setInputWidthMm('1008');
      setInputHeightMm('504');
      setWarningInfo(null);
    } else {
      onUpdateConfig({
        platform: 'multiboard',
        holePitchMm: 25,
        customTiles: undefined,
        maxTileHoles: undefined,
        tileWidthHoles: 8,
        tileHeightHoles: 8,
        cols: 6,
        rows: 3,
        customDeskWidthMm: 1200,
        customDeskHeightMm: 600,
      });
      setInputWidthMm('1200');
      setInputHeightMm('600');
      setWarningInfo(null);
    }
  };

  const applyMmDimensions = (
    wStr: string,
    hStr: string,
    explicitWarning?: { title: string; message: string } | null,
    maxTileOverride?: number
  ) => {
    const w = parseInt(wStr, 10);
    const h = parseInt(hStr, 10);
    if (!isNaN(w) && !isNaN(h) && w >= 100 && h >= 100) {
      if (isOpenGrid) {
        const maxTile = maxTileOverride ?? (boardConfig.maxTileHoles || 8);
        const holesX = Math.max(4, Math.round(w / 28));
        const holesY = Math.max(4, Math.round(h / 28));
        const effectiveW = holesX * 28;
        const effectiveH = holesY * 28;
        const optimized = optimizeOpenGridTiles(holesX, holesY, maxTile);
        if (explicitWarning !== undefined) {
          setWarningInfo(explicitWarning);
        } else if (effectiveW !== w || effectiveH !== h) {
          setWarningInfo({
            title: `Dimensioni adattate alla griglia openGrid (28 mm)`,
            message: `Superficie impostata su ${effectiveW}×${effectiveH} mm (${holesX}×${holesY} OU).`,
          });
        } else {
          setWarningInfo(null);
        }
        onUpdateConfig({
          platform: 'opengrid',
          holePitchMm: 28,
          maxTileHoles: maxTile,
          customTiles: optimized,
          cols: Math.ceil(holesX / maxTile),
          rows: Math.ceil(holesY / maxTile),
          tileWidthHoles: maxTile,
          tileHeightHoles: maxTile,
          customDeskWidthMm: effectiveW,
          customDeskHeightMm: effectiveH,
        });
      } else {
        const validation = validateMultiboardDimensions(w, h, boardConfig.holePitchMm);
        if (explicitWarning !== undefined) {
          setWarningInfo(explicitWarning);
        } else if (!validation.isExactMatch && validation.warningTitle && validation.warningMessage) {
          setWarningInfo({
            title: validation.warningTitle,
            message: validation.warningMessage,
          });
        } else {
          setWarningInfo(null);
        }
        onUpdateConfig({
          customTiles: undefined,
          cols: validation.cols,
          rows: validation.rows,
          tileWidthHoles: validation.moduleSize,
          tileHeightHoles: validation.moduleSize,
          customDeskWidthMm: validation.effectiveWidthMm,
          customDeskHeightMm: validation.effectiveHeightMm,
        });
      }
    }
  };

  const handleStepWidthMm = (direction: 1 | -1) => {
    const current = parseInt(inputWidthMm, 10) || dims.totalWidthMm;
    const currentH = parseInt(inputHeightMm, 10) || dims.totalHeightMm;
    if (isOpenGrid) {
      const currentHoles = Math.max(4, Math.round(current / 28));
      const nextHoles = Math.max(4, Math.min(60, currentHoles + direction));
      const nextMm = nextHoles * 28;
      setInputWidthMm(String(nextMm));
      setWarningInfo(null);
      applyMmDimensions(String(nextMm), inputHeightMm, null);
    } else {
      const compatible = getCompatibleDimensions(currentH, boardConfig.holePitchMm);
      let next = current;
      if (direction === 1) {
        next = compatible.find((d) => d > current) ?? current;
      } else {
        next = compatible.slice().reverse().find((d) => d < current) ?? current;
      }
      setInputWidthMm(String(next));
      setWarningInfo(null);
      applyMmDimensions(String(next), inputHeightMm, null);
    }
  };

  const handleStepHeightMm = (direction: 1 | -1) => {
    const current = parseInt(inputHeightMm, 10) || dims.totalHeightMm;
    const currentW = parseInt(inputWidthMm, 10) || dims.totalWidthMm;
    if (isOpenGrid) {
      const currentHoles = Math.max(4, Math.round(current / 28));
      const nextHoles = Math.max(4, Math.min(40, currentHoles + direction));
      const nextMm = nextHoles * 28;
      setInputHeightMm(String(nextMm));
      setWarningInfo(null);
      applyMmDimensions(inputWidthMm, String(nextMm), null);
    } else {
      const compatible = getCompatibleDimensions(currentW, boardConfig.holePitchMm);
      let next = current;
      if (direction === 1) {
        next = compatible.find((d) => d > current) ?? current;
      } else {
        next = compatible.slice().reverse().find((d) => d < current) ?? current;
      }
      setInputHeightMm(String(next));
      setWarningInfo(null);
      applyMmDimensions(inputWidthMm, String(next), null);
    }
  };

  const handleBlurWidth = () => {
    const val = parseInt(inputWidthMm, 10);
    if (isNaN(val) || val < 100) {
      setInputWidthMm(String(dims.totalWidthMm));
      setWarningInfo(null);
      return;
    }

    if (isOpenGrid) {
      const holes = Math.max(4, Math.round(val / 28));
      const effectiveW = holes * 28;
      let warning: { title: string; message: string } | null = null;
      if (effectiveW !== val) {
        warning = {
          title: `Misura ${val} mm non multiplo di 28 mm`,
          message: `Adattata a ${effectiveW} mm (${holes} OU) per la griglia openGrid.`,
        };
      }
      setInputWidthMm(String(effectiveW));
      applyMmDimensions(String(effectiveW), inputHeightMm, warning);
      return;
    }

    const standardDims = STANDARD_MULTIBOARD_DIMENSIONS;
    const isValStandard = standardDims.includes(val);
    const currentH = parseInt(inputHeightMm, 10) || dims.totalHeightMm;
    const validation = validateMultiboardDimensions(val, currentH, boardConfig.holePitchMm);

    let warning: { title: string; message: string } | null = null;
    if (!isValStandard) {
      warning = {
        title: `Misura ${val} mm non standard`,
        message: `Adattata a ${validation.effectiveWidthMm} mm (multiplo di tile standard Multiboard).`,
      };
    } else if (validation.effectiveWidthMm !== val) {
      if (validation.warningTitle && validation.warningMessage) {
        warning = { title: validation.warningTitle, message: validation.warningMessage };
      }
    } else {
      warning = null;
    }

    setInputWidthMm(String(validation.effectiveWidthMm));
    setInputHeightMm(String(validation.effectiveHeightMm));
    applyMmDimensions(String(validation.effectiveWidthMm), String(validation.effectiveHeightMm), warning);
  };

  const handleBlurHeight = () => {
    const val = parseInt(inputHeightMm, 10);
    if (isNaN(val) || val < 100) {
      setInputHeightMm(String(dims.totalHeightMm));
      setWarningInfo(null);
      return;
    }

    if (isOpenGrid) {
      const holes = Math.max(4, Math.round(val / 28));
      const effectiveH = holes * 28;
      let warning: { title: string; message: string } | null = null;
      if (effectiveH !== val) {
        warning = {
          title: `Misura ${val} mm non multiplo di 28 mm`,
          message: `Adattata a ${effectiveH} mm (${holes} OU) per la griglia openGrid.`,
        };
      }
      setInputHeightMm(String(effectiveH));
      applyMmDimensions(inputWidthMm, String(effectiveH), warning);
      return;
    }

    const standardDims = STANDARD_MULTIBOARD_DIMENSIONS;
    const isValStandard = standardDims.includes(val);
    const currentW = parseInt(inputWidthMm, 10) || dims.totalWidthMm;
    const validation = validateMultiboardDimensions(currentW, val, boardConfig.holePitchMm);

    let warning: { title: string; message: string } | null = null;
    if (!isValStandard) {
      warning = {
        title: `Misura ${val} mm non standard`,
        message: `Adattata a ${validation.effectiveHeightMm} mm (multiplo di tile standard Multiboard).`,
      };
    } else if (validation.effectiveHeightMm !== val) {
      if (validation.warningTitle && validation.warningMessage) {
        warning = { title: validation.warningTitle, message: validation.warningMessage };
      }
    } else {
      warning = null;
    }

    setInputHeightMm(String(validation.effectiveHeightMm));
    setInputWidthMm(String(validation.effectiveWidthMm));
    applyMmDimensions(String(validation.effectiveWidthMm), String(validation.effectiveHeightMm), warning);
  };

  const handleStepNewProjWidthMm = (direction: 1 | -1) => {
    const current = parseInt(newProjWidthMm, 10) || (newProjPlatform === 'opengrid' ? 1008 : 900);
    if (newProjPlatform === 'opengrid') {
      const currentHoles = Math.max(4, Math.round(current / 28));
      const nextHoles = Math.max(4, Math.min(60, currentHoles + direction));
      const nextMm = nextHoles * 28;
      setNewProjWidthMm(String(nextMm));
      setNewWarningInfo(null);
    } else {
      const currentH = parseInt(newProjHeightMm, 10) || 300;
      const compatible = getCompatibleDimensions(currentH, 25);
      let next = current;
      if (direction === 1) {
        next = compatible.find((d) => d > current) ?? current;
      } else {
        next = compatible.slice().reverse().find((d) => d < current) ?? current;
      }
      setNewProjWidthMm(String(next));
      setNewWarningInfo(null);
    }
  };

  const handleStepNewProjHeightMm = (direction: 1 | -1) => {
    const current = parseInt(newProjHeightMm, 10) || (newProjPlatform === 'opengrid' ? 504 : 300);
    if (newProjPlatform === 'opengrid') {
      const currentHoles = Math.max(4, Math.round(current / 28));
      const nextHoles = Math.max(4, Math.min(40, currentHoles + direction));
      const nextMm = nextHoles * 28;
      setNewProjHeightMm(String(nextMm));
      setNewWarningInfo(null);
    } else {
      const currentW = parseInt(newProjWidthMm, 10) || 900;
      const compatible = getCompatibleDimensions(currentW, 25);
      let next = current;
      if (direction === 1) {
        next = compatible.find((d) => d > current) ?? current;
      } else {
        next = compatible.slice().reverse().find((d) => d < current) ?? current;
      }
      setNewProjHeightMm(String(next));
      setNewWarningInfo(null);
    }
  };

  const handleBlurNewProjWidth = () => {
    const val = parseInt(newProjWidthMm, 10);
    if (isNaN(val) || val < 100) {
      setNewProjWidthMm(newProjPlatform === 'opengrid' ? '1008' : '900');
      setNewWarningInfo(null);
      return;
    }

    if (newProjPlatform === 'opengrid') {
      const holes = Math.max(4, Math.round(val / 28));
      const effectiveW = holes * 28;
      let warning: { title: string; message: string } | null = null;
      if (effectiveW !== val) {
        warning = {
          title: `Misura ${val} mm non multiplo di 28 mm`,
          message: `Adattata a ${effectiveW} mm (${holes} OU) per la griglia openGrid.`,
        };
      }
      setNewProjWidthMm(String(effectiveW));
      setNewWarningInfo(warning);
      return;
    }

    const standardDims = STANDARD_MULTIBOARD_DIMENSIONS;
    const isValStandard = standardDims.includes(val);
    const currentH = parseInt(newProjHeightMm, 10) || 300;
    const validation = validateMultiboardDimensions(val, currentH, 25);

    let warning: { title: string; message: string } | null = null;
    if (!isValStandard) {
      warning = {
        title: `Misura ${val} mm non standard`,
        message: `Adattata a ${validation.effectiveWidthMm} mm (multiplo di tile standard Multiboard).`,
      };
    } else if (validation.effectiveWidthMm !== val) {
      if (validation.warningTitle && validation.warningMessage) {
        warning = { title: validation.warningTitle, message: validation.warningMessage };
      }
    } else {
      warning = null;
    }

    setNewProjWidthMm(String(validation.effectiveWidthMm));
    setNewProjHeightMm(String(validation.effectiveHeightMm));
    setNewWarningInfo(warning);
  };

  const handleBlurNewProjHeight = () => {
    const val = parseInt(newProjHeightMm, 10);
    if (isNaN(val) || val < 100) {
      setNewProjHeightMm(newProjPlatform === 'opengrid' ? '504' : '300');
      setNewWarningInfo(null);
      return;
    }

    if (newProjPlatform === 'opengrid') {
      const holes = Math.max(4, Math.round(val / 28));
      const effectiveH = holes * 28;
      let warning: { title: string; message: string } | null = null;
      if (effectiveH !== val) {
        warning = {
          title: `Misura ${val} mm non multiplo di 28 mm`,
          message: `Adattata a ${effectiveH} mm (${holes} OU) per la griglia openGrid.`,
        };
      }
      setNewProjHeightMm(String(effectiveH));
      setNewWarningInfo(warning);
      return;
    }

    const standardDims = STANDARD_MULTIBOARD_DIMENSIONS;
    const isValStandard = standardDims.includes(val);
    const currentW = parseInt(newProjWidthMm, 10) || 900;
    const validation = validateMultiboardDimensions(currentW, val, 25);

    let warning: { title: string; message: string } | null = null;
    if (!isValStandard) {
      warning = {
        title: `Misura ${val} mm non standard`,
        message: `Adattata a ${validation.effectiveHeightMm} mm (multiplo di tile standard Multiboard).`,
      };
    } else if (validation.effectiveHeightMm !== val) {
      if (validation.warningTitle && validation.warningMessage) {
        warning = { title: validation.warningTitle, message: validation.warningMessage };
      }
    } else {
      warning = null;
    }

    setNewProjHeightMm(String(validation.effectiveHeightMm));
    setNewProjWidthMm(String(validation.effectiveWidthMm));
    setNewWarningInfo(warning);
  };

  const handleDoneSurface = () => {
    const w = parseInt(inputWidthMm, 10);
    const h = parseInt(inputHeightMm, 10);
    if (!isNaN(w) && !isNaN(h) && w >= 100 && h >= 100) {
      if (isOpenGrid) {
        const holesX = Math.max(4, Math.round(w / 28));
        const holesY = Math.max(4, Math.round(h / 28));
        const effectiveW = holesX * 28;
        const effectiveH = holesY * 28;
        applyMmDimensions(String(effectiveW), String(effectiveH));
        setInputWidthMm(String(effectiveW));
        setInputHeightMm(String(effectiveH));
      } else {
        const validation = validateMultiboardDimensions(w, h, boardConfig.holePitchMm);
        applyMmDimensions(String(validation.effectiveWidthMm), String(validation.effectiveHeightMm));
        setInputWidthMm(String(validation.effectiveWidthMm));
        setInputHeightMm(String(validation.effectiveHeightMm));
      }
    }
    if (tempTitle.trim() && tempTitle !== projectTitle) {
      onUpdateTitle?.(tempTitle.trim());
    }
    setWarningInfo(null);
    setIsProjectMenuOpen(false);
    setProjectTab('list');
  };

  const handleCreateNewProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProjName.trim() || `Setup ${(projects?.length || 0) + 1}`;
    const rawW = parseInt(newProjWidthMm, 10) || (newProjPlatform === 'opengrid' ? 1008 : 900);
    const rawH = parseInt(newProjHeightMm, 10) || (newProjPlatform === 'opengrid' ? 504 : 300);
    const isOG = newProjPlatform === 'opengrid';

    if (isOG) {
      const holesX = Math.max(4, Math.round(rawW / 28));
      const holesY = Math.max(4, Math.round(rawH / 28));
      const effectiveW = holesX * 28;
      const effectiveH = holesY * 28;
      const maxTile = newProjMaxTile || 8;
      const customTiles = optimizeOpenGridTiles(holesX, holesY, maxTile);
      const initialConfig: BoardConfig = {
        ...DEFAULT_OPENGRID_CONFIG,
        platform: 'opengrid',
        holePitchMm: 28,
        customTiles,
        maxTileHoles: maxTile,
        cols: Math.ceil(holesX / maxTile),
        rows: Math.ceil(holesY / maxTile),
        tileWidthHoles: maxTile,
        tileHeightHoles: maxTile,
        customDeskWidthMm: effectiveW,
        customDeskHeightMm: effectiveH,
      };
      onCreateProject?.(trimmed, initialConfig);
    } else {
      const validation = validateMultiboardDimensions(rawW, rawH, 25);
      const initialConfig: BoardConfig = {
        ...DEFAULT_BOARD_CONFIG,
        platform: 'multiboard',
        holePitchMm: 25,
        cols: validation.cols,
        rows: validation.rows,
        tileWidthHoles: validation.moduleSize,
        tileHeightHoles: validation.moduleSize,
        customDeskWidthMm: validation.effectiveWidthMm,
        customDeskHeightMm: validation.effectiveHeightMm,
      };
      onCreateProject?.(trimmed, initialConfig);
    }
    setNewProjName('');
    setNewWarningInfo(null);
    setProjectTab('list');
    setIsProjectMenuOpen(false);
  };

  const renderTilePreview = (
    cols: number,
    rows: number,
    moduleSize: number,
    totalMmW: number,
    totalMmH: number,
    isOGPlatform: boolean = false,
    customTilesList?: readonly TileDefinition[],
    maxTileOverride?: number
  ) => {
    const maxBoxW = 310;
    const maxBoxH = 100;
    const gap = 3;

    if (isOGPlatform) {
      const currentMax = maxTileOverride ?? (boardConfig.maxTileHoles || 8);
      const hX = Math.max(4, Math.round(totalMmW / 28));
      const hY = Math.max(4, Math.round(totalMmH / 28));
      const activeTiles = customTilesList && customTilesList.length > 0 && Math.round(totalMmW / 28) === Math.max(4, Math.round((boardConfig.customDeskWidthMm || totalMmW) / 28))
        ? customTilesList
        : optimizeOpenGridTiles(hX, hY, currentMax);

      const totalHolesW = hX;
      const totalHolesH = hY;

      const scaleX = (maxBoxW - 12) / (totalHolesW * 28);
      const scaleY = (maxBoxH - 12) / (totalHolesH * 28);
      const scale = Math.min(scaleX, scaleY);

      const svgW = totalHolesW * 28 * scale;
      const svgH = totalHolesH * 28 * scale;

      const tileGroupsMap = new Map<string, { count: number; w: number; h: number; mmW: number; mmH: number }>();
      for (const t of activeTiles) {
        const key = `${t.widthHoles}×${t.heightHoles}`;
        const existing = tileGroupsMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          tileGroupsMap.set(key, {
            count: 1,
            w: t.widthHoles,
            h: t.heightHoles,
            mmW: t.widthHoles * 28,
            mmH: t.heightHoles * 28,
          });
        }
      }
      const tileGroups = Array.from(tileGroupsMap.values()).sort((a, b) => (b.w * b.h) - (a.w * a.h));

      return (
        <div className="flex flex-col gap-2.5 p-3 rounded-[14px] bg-[#0E1015] border border-[#232632] shadow-inner">
          {/* Hero Blueprint Box: prominent and high contrast */}
          <div className="flex items-center justify-center w-full min-h-[96px] py-1 bg-[#090A0D]/80 rounded-[10px] border border-[#1C1F28] overflow-hidden">
            <svg width={Math.max(40, svgW)} height={Math.max(30, svgH)} className="overflow-visible">
              {activeTiles.map((t) => {
                const x = t.originHoleX * 28 * scale;
                const y = t.originHoleY * 28 * scale;
                const w = t.widthHoles * 28 * scale;
                const h = t.heightHoles * 28 * scale;
                const showBadge = w >= 20 && h >= 13;
                const fontSize = Math.min(10.5, Math.max(7.5, Math.min(w * 0.28, h * 0.42)));

                return (
                  <g key={t.id}>
                    <rect
                      x={x + 0.5}
                      y={y + 0.5}
                      width={Math.max(2, w - 1)}
                      height={Math.max(2, h - 1)}
                      rx={Math.max(1.5, Math.min(3.5, w * 0.06))}
                      fill="#161922"
                      stroke="#38BDF8"
                      strokeOpacity={0.7}
                      strokeWidth={1.4}
                    />
                    {showBadge && (
                      <text
                        x={x + w / 2}
                        y={y + h / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#F1F5F9"
                        fontSize={fontSize}
                        fontFamily="'Figtree', sans-serif"
                        fontWeight="800"
                        letterSpacing={0.2}
                      >
                        {t.widthHoles}×{t.heightHoles}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Clean Orderly Breakdown Table */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-[#1F222A]">
            <div className="text-[11px] font-['Figtree'] font-bold uppercase tracking-wider text-white/50 px-0.5">
              {activeTiles.length} Piastre Totali
            </div>
            <div className="flex flex-col divide-y divide-[#1F222A]/60 max-h-[130px] overflow-y-auto pr-0.5">
              {tileGroups.map((grp) => (
                <div
                  key={`${grp.w}x${grp.h}`}
                  className="flex items-center justify-between py-1.5 px-0.5 text-xs font-['Figtree']"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white/90">
                      {grp.count}×
                    </span>
                    <span className="font-medium text-slate-300">
                      Tiles {grp.w}×{grp.h} OU
                    </span>
                  </div>
                  <span className="text-white/50 font-medium text-[11px]">
                    {grp.mmW}×{grp.mmH} mm
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const tileByW = (maxBoxW - (cols - 1) * gap) / cols;
    const tileByH = (maxBoxH - (rows - 1) * gap) / rows;
    const tileSize = Math.max(6, Math.min(24, Math.min(tileByW, tileByH)));

    const svgW = cols * tileSize + (cols - 1) * gap;
    const svgH = rows * tileSize + (rows - 1) * gap;

    const tiles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (tileSize + gap);
        const y = r * (tileSize + gap);
        tiles.push(
          <g key={`${c}-${r}`}>
            <rect
              x={x}
              y={y}
              width={tileSize}
              height={tileSize}
              rx={Math.max(1.5, tileSize * 0.16)}
              fill="#181A20"
              stroke="#383C48"
              strokeWidth={1}
            />
            <circle
              cx={x + tileSize / 2}
              cy={y + tileSize / 2}
              r={Math.max(1, tileSize * 0.12)}
              fill="#4B5563"
            />
          </g>
        );
      }
    }

    return (
      <div className="flex flex-col items-center justify-center p-3 rounded-[14px] bg-[#0E1015] border border-[#232632]">
        <div className="flex items-center justify-center w-full min-h-[96px] py-1 bg-[#090A0D]/80 rounded-[10px] border border-[#1C1F28]">
          <svg width={svgW} height={svgH} className="overflow-visible">
            {tiles}
          </svg>
        </div>
        <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-[#1F222A] text-xs font-['Figtree']">
          <span className="font-black text-white">
            {cols * rows} tiles <span className="text-[#929394] font-medium">({cols}×{rows} • {moduleSize}×{moduleSize} MU)</span>
          </span>
          <span className="font-bold text-[#38BDF8]">
            {totalMmW}×{totalMmH} mm
          </span>
        </div>
      </div>
    );
  };

  const displayProjects: ProjectItem[] =
    projects && projects.length > 0
      ? projects
      : [
          {
            id: activeProjectId,
            name: projectTitle,
            boardConfig,
            channels: [],
            updatedAt: Date.now(),
          },
        ];

  const currentCategory = categories.find((c) => c.id === activeCategory) || categories[0];

  const surfaceW = parseInt(inputWidthMm, 10) || dims.totalWidthMm;
  const surfaceH = parseInt(inputHeightMm, 10) || dims.totalHeightMm;
  const surfaceTiling = isOpenGrid
    ? findBestOpenGridModule(surfaceW, surfaceH, 'auto', boardConfig.holePitchMm)
    : findBestMultiboardModule(surfaceW, surfaceH, 'auto', boardConfig.holePitchMm);

  const newW = parseInt(newProjWidthMm, 10) || (newProjPlatform === 'opengrid' ? 1008 : 900);
  const newH = parseInt(newProjHeightMm, 10) || (newProjPlatform === 'opengrid' ? 504 : 300);
  const newTiling = newProjPlatform === 'opengrid'
    ? findBestOpenGridModule(newW, newH, 'auto', 28)
    : findBestMultiboardModule(newW, newH, 'auto', 25);

  return (
    <>
      <header className="fixed top-8 inset-x-8 z-40 pointer-events-none flex items-start justify-between">
        {/* Top Left: Brand Logo + Setup Pill (Projects Dropdown) + Live Stats + Categories */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-3">
            {/* Exact Figma Logo */}
            <BrandLogo size={57.5} />

            {/* My Setup / Projects Pill Button: w=262px, h=64px, rx=21px */}
            <div className="relative" ref={projectMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsProjectMenuOpen((prev) => !prev);
                  setProjectTab('list');
                  setTempTitle(projectTitle);
                  setInputWidthMm(String(dims.totalWidthMm));
                  setInputHeightMm(String(dims.totalHeightMm));
                }}
                className="flex items-center justify-between w-[262px] h-[64px] px-5 rounded-[21px] bg-[#15161A] hover:bg-[#1C1D23] border-[2.8px] border-[#2A2D36] hover:border-[#383C48] text-white shadow-xl transition-all group select-none text-left"
                title="Manage Setups & Projects"
              >
                <div className="flex flex-col justify-center overflow-hidden pr-2">
                  <span className="font-['Figtree'] font-black text-base tracking-tight text-white truncate">
                    {projectTitle}
                  </span>
                  <span className="font-['Figtree'] font-bold text-[11px] text-white/50 tracking-wide truncate mt-0.5">
                    {dims.totalWidthMm}×{dims.totalHeightMm} mm • {isOpenGrid ? 'Opengrid' : 'Multiboard'}
                  </span>
                </div>
                {/* Solid white triangle pointing down, noticeably larger */}
                <svg
                  width="14"
                  height="11"
                  viewBox="0 0 14 11"
                  fill="none"
                  className="shrink-0 ml-2 transition-transform group-hover:translate-y-0.5"
                >
                  <polygon points="1.5,2 12.5,2 7,8.5" fill="white" />
                </svg>
              </button>

              {/* In-Place Projects & Surface Dropdown Popover */}
              {isProjectMenuOpen && (
                <div className="absolute top-full left-0 mt-2.5 w-[365px] rounded-[22px] bg-[#15161A] border-[2px] border-[#2A2D36] shadow-2xl p-4 z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150 select-none">
                  {projectTab === 'list' && (
                    <>
                      {/* Top Row: MY PROJECTS + count + sleek '+' button */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#2A2D36]/60">
                        <div className="flex items-center gap-2">
                          <span className="font-['Figtree'] font-black text-xs text-[#929394] uppercase tracking-wider">
                            My Projects
                          </span>
                          <span className="font-['Figtree'] text-[11px] text-white/70 bg-[#2A2D36] px-2 py-0.5 rounded font-bold">
                            {displayProjects.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewProjName(`Setup ${(projects?.length || 0) + 1}`);
                            setNewProjWidthMm(String(dims.totalWidthMm));
                            setNewProjHeightMm(String(dims.totalHeightMm));
                            setProjectTab('new');
                          }}
                          className="w-[36px] h-[21px] rounded-[6px] bg-[#2A2D36] hover:bg-[#383C48] text-white flex items-center justify-center transition-colors active:scale-95 shadow-sm"
                          title="New Project"
                        >
                          <svg width="36" height="21" viewBox="0 0 40 20" fill="none">
                            <rect width="40" height="20" rx="5" fill="#2A2D36" />
                            <path
                              d="M18.8085 14V6H21.1915V14H18.8085ZM16 11.1915V8.80851H24V11.1915H16Z"
                              fill="white"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Projects List */}
                      <div className="max-h-[230px] overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
                        {displayProjects.map((p) => {
                          const isSelected = p.id === activeProjectId;
                          const pDims = calculateBoardDimensions(p.boardConfig);

                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                onSelectProject?.(p.id);
                                setIsProjectMenuOpen(false);
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-[12px] cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#1C1E26] border border-[#2A2D36] text-white'
                                  : 'border border-transparent hover:bg-[#1C1D23] text-slate-300 hover:text-white'
                              }`}
                            >
                              <div className="flex flex-col justify-center overflow-hidden pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-['Figtree'] font-bold text-sm truncate max-w-[190px] text-white">
                                    {p.name}
                                  </span>
                                  {isSelected && (
                                    <Check size={14} className="text-[#38BDF8] shrink-0" />
                                  )}
                                </div>
                                <span className="font-['Figtree'] text-[11px] text-[#929394] font-semibold mt-0.5">
                                  {pDims.totalWidthMm}×{pDims.totalHeightMm} mm • {p.channels.length}{' '}
                                  {p.channels.length === 1 ? 'channel' : 'channels'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicateProject?.(p.id);
                                  }}
                                  className="p-1.5 rounded-[6px] hover:bg-[#15161A] text-slate-400 hover:text-white transition-colors"
                                  title="Duplicate setup"
                                >
                                  <CopyPlus size={14} />
                                </button>
                                {displayProjects.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteProject?.(p.id);
                                    }}
                                    className="p-1.5 rounded-[6px] hover:bg-[#15161A] text-slate-400 hover:text-[#C80E11] transition-colors"
                                    title="Delete project"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Button: Configure Surface & Dimensions */}
                      <div className="pt-2 border-t border-[#2A2D36]/60">
                        <button
                          type="button"
                          onClick={() => {
                            setTempTitle(projectTitle);
                            setInputWidthMm(String(dims.totalWidthMm));
                            setInputHeightMm(String(dims.totalHeightMm));
                            setProjectTab('surface');
                          }}
                          className="w-full py-2.5 px-3 rounded-[12px] bg-[#1E2028] hover:bg-[#252834] border border-[#2A2D36] text-xs font-['Figtree'] font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                          <Settings2 size={14} className="text-[#38BDF8]" />
                          <span>Configure Surface & Dimensions</span>
                        </button>
                      </div>
                    </>
                  )}

                  {projectTab === 'surface' && (
                    <>
                      {/* Top Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#2A2D36]/60">
                        <button
                          type="button"
                          onClick={() => setProjectTab('list')}
                          className="flex items-center gap-1.5 text-xs font-['Figtree'] font-bold text-slate-400 hover:text-white transition-colors"
                        >
                          <ArrowLeft size={13} />
                          <span>Projects</span>
                        </button>
                        <span className="font-['Figtree'] font-black text-xs text-white uppercase tracking-wider">
                          Surface Setup
                        </span>
                      </div>

                      {/* Setup Name Input */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-['Figtree'] font-bold text-[#929394] uppercase tracking-wider">
                          Setup Name
                        </label>
                        <input
                          type="text"
                          value={tempTitle}
                          onChange={(e) => {
                            setTempTitle(e.target.value);
                            onUpdateTitle?.(e.target.value);
                          }}
                          placeholder="e.g. My Setup"
                          className="w-full px-3 py-2 rounded-[10px] bg-[#0E0F12] border border-[#2A2D36] text-xs font-['Figtree'] font-bold text-white focus:outline-none focus:border-[#4B5563]"
                        />
                      </div>

                      {/* Grid Platform Ecosystem Switcher */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-['Figtree'] font-bold text-[#929394] uppercase tracking-wider">
                          Grid Platform
                        </label>
                        <div className="grid grid-cols-2 p-1 rounded-[12px] bg-[#0E0F12] border border-[#2A2D36]">
                          <button
                            type="button"
                            onClick={() => handleSwitchPlatform('multiboard')}
                            className={`py-1.5 px-3 rounded-[9px] text-xs font-['Figtree'] font-black transition-all ${
                              (boardConfig.platform ?? 'multiboard') === 'multiboard'
                                ? 'bg-[#1E2028] text-white shadow-sm border border-[#383C48]'
                                : 'text-slate-400 hover:text-white border border-transparent'
                            }`}
                          >
                            Multiboard (25mm)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSwitchPlatform('opengrid')}
                            className={`py-1.5 px-3 rounded-[9px] text-xs font-['Figtree'] font-black transition-all ${
                              boardConfig.platform === 'opengrid'
                                ? 'bg-[#1E2028] text-white shadow-sm border border-[#383C48]'
                                : 'text-slate-400 hover:text-white border border-transparent'
                            }`}
                          >
                            openGrid (28mm)
                          </button>
                        </div>
                      </div>

                      {/* openGrid Tile Size Dropdown */}
                      {isOpenGrid && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-['Figtree'] font-bold text-[#929394] uppercase tracking-wider">
                              Tile Size
                            </label>
                            <span className="text-[10px] font-['Figtree'] font-semibold text-white/60">
                              {(boardConfig.maxTileHoles || 8)}×{(boardConfig.maxTileHoles || 8)} OU ({((boardConfig.maxTileHoles || 8) * 28)}×{((boardConfig.maxTileHoles || 8) * 28)} mm)
                            </span>
                          </div>
                          <div className="relative">
                            <select
                              value={boardConfig.maxTileHoles || 8}
                              onChange={(e) => {
                                const newMax = parseInt(e.target.value, 10);
                                applyMmDimensions(inputWidthMm, inputHeightMm, null, newMax);
                              }}
                              className="w-full appearance-none px-3 py-2 pr-8 rounded-[10px] bg-[#0E0F12] border border-[#2A2D36] hover:border-[#383C48] text-white text-xs font-['Figtree'] font-bold focus:outline-none focus:border-[#383C48] cursor-pointer transition-colors"
                            >
                              {OPENGRID_BED_OPTIONS.map((opt) => (
                                <option key={opt.size} value={opt.size} className="bg-[#12141A] text-white">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={14}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* Grid Dimensions: Label outside the dark container */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-['Figtree'] font-bold text-[#929394] uppercase tracking-wider">
                          Grid Dimensions
                        </label>
                        <div className="p-3.5 rounded-[14px] bg-[#0E0F12] border border-[#2A2D36] flex flex-col gap-3">
                          {/* Capsule Steppers for Width and Height (mm) */}
                          <div className="grid grid-cols-2 gap-2.5">
                            {/* Width (mm) */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-['Figtree'] font-bold text-[#929394] uppercase">
                                  Width (mm)
                                </span>
                                <span className="text-[10px] font-['Figtree'] font-bold text-white/60">
                                  {Math.round((parseInt(inputWidthMm, 10) || dims.totalWidthMm) / boardConfig.holePitchMm)} {isOpenGrid ? 'OU' : 'MU'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between h-[34px] px-1.5 rounded-[10px] bg-[#15161A] border border-[#2A2D36]">
                                <button
                                  type="button"
                                  onClick={() => handleStepWidthMm(-1)}
                                  className="w-7 h-7 rounded-md hover:bg-[#2A2D36] text-white font-black text-sm flex items-center justify-center active:scale-95 transition-colors"
                                  title="Tile compatibile precedente"
                                >
                                  -
                                </button>
                                <div className="flex items-center justify-center gap-0.5">
                                  <input
                                    type="text"
                                    value={inputWidthMm}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setInputWidthMm(e.target.value)}
                                    onBlur={handleBlurWidth}
                                    onKeyDown={(e) => {
                                       if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                    }}
                                    className="w-12 text-center bg-transparent font-['Figtree'] font-black text-xs text-white focus:outline-none"
                                  />
                                  <span className="font-['Figtree'] text-[11px] text-[#929394] font-bold">mm</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleStepWidthMm(1)}
                                  className="w-7 h-7 rounded-md hover:bg-[#2A2D36] text-white font-black text-sm flex items-center justify-center active:scale-95 transition-colors"
                                  title="Tile compatibile successiva"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Height (mm) */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-['Figtree'] font-bold text-[#929394] uppercase">
                                  Height (mm)
                                </span>
                                <span className="text-[10px] font-['Figtree'] font-bold text-white/60">
                                  {Math.round((parseInt(inputHeightMm, 10) || dims.totalHeightMm) / boardConfig.holePitchMm)} {isOpenGrid ? 'OU' : 'MU'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between h-[34px] px-1.5 rounded-[10px] bg-[#15161A] border border-[#2A2D36]">
                                <button
                                  type="button"
                                  onClick={() => handleStepHeightMm(-1)}
                                  className="w-7 h-7 rounded-md hover:bg-[#2A2D36] text-white font-black text-sm flex items-center justify-center active:scale-95 transition-colors"
                                  title="Tile compatibile precedente"
                                >
                                  -
                                </button>
                                <div className="flex items-center justify-center gap-0.5">
                                  <input
                                    type="text"
                                    value={inputHeightMm}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setInputHeightMm(e.target.value)}
                                    onBlur={handleBlurHeight}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                    }}
                                    className="w-12 text-center bg-transparent font-['Figtree'] font-black text-xs text-white focus:outline-none"
                                  />
                                  <span className="font-['Figtree'] text-[11px] text-[#929394] font-bold">mm</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleStepHeightMm(1)}
                                  className="w-7 h-7 rounded-md hover:bg-[#2A2D36] text-white font-black text-sm flex items-center justify-center active:scale-95 transition-colors"
                                  title="Tile compatibile successiva"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Warning Box for Incompatible / Adjusted Dimensions */}
                          {warningInfo && (
                            <div className="flex flex-col gap-1.5 p-3 rounded-[12px] bg-[#241A14] border border-[#F59E0B]/40 text-amber-200 animate-fadeIn shadow-inner">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-['Figtree'] font-black text-xs text-[#FBBF24] uppercase tracking-wide">
                                  <AlertTriangle size={14} className="text-[#F59E0B] shrink-0" />
                                  <span>{warningInfo.title}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setWarningInfo(null)}
                                  className="text-[#929394] hover:text-white transition-colors p-0.5"
                                  title="Chiudi avviso"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                              <p className="text-[11px] font-['Figtree'] font-medium text-slate-200 leading-snug">
                                {warningInfo.message}
                              </p>
                            </div>
                          )}

                          {/* Aesthetic 2D Graphic Preview */}
                          {renderTilePreview(
                            surfaceTiling.cols,
                            surfaceTiling.rows,
                            surfaceTiling.moduleSize,
                            surfaceW,
                            surfaceH,
                            isOpenGrid,
                            boardConfig.customTiles,
                            boardConfig.maxTileHoles || 8
                          )}
                        </div>
                      </div>

                      {/* Done Button */}
                      <div className="pt-2 border-t border-[#2A2D36]/60">
                        <button
                          type="button"
                          onClick={handleDoneSurface}
                          className="w-full py-2.5 rounded-[10px] bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-['Figtree'] font-black text-white active:scale-95 transition-all shadow-sm cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </>
                  )}

                  {projectTab === 'new' && (
                    <form onSubmit={handleCreateNewProjectSubmit} className="flex flex-col gap-3">
                      {/* Top Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#2A2D36]/60">
                        <button
                          type="button"
                          onClick={() => setProjectTab('list')}
                          className="flex items-center gap-1.5 text-xs font-['Figtree'] font-bold text-slate-400 hover:text-white transition-colors"
                        >
                          <ArrowLeft size={13} />
                          <span>Projects</span>
                        </button>
                        <span className="font-['Figtree'] font-black text-xs text-white uppercase tracking-wider">
                          New Setup
                        </span>
                      </div>

                      {/* Project Name Input */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-['Figtree'] font-bold text-[#929394] uppercase tracking-wider">
                          Setup Name
                        </label>
                        <input
                          type="text"
                          required
                          autoFocus
                          value={newProjName}
                          onChange={(e) => setNewProjName(e.target.value)}
                          placeholder="e.g. Workbench, Wall Board..."
                          className="w-full px-3 py-2 rounded-[10px] bg-[#0E0F12] border border-[#2A2D36] text-xs font-['Figtree'] font-bold text-white focus:outline-none focus:border-[#4B5563]"
                        />
                      </div>

                      {/* Grid Platform Selection for New Project */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-['Figtree'] font-bold text-[#929394] uppercase tracking-wider">
                          Grid Platform
                        </label>
                        <div className="grid grid-cols-2 p-1 rounded-[12px] bg-[#0E0F12] border border-[#2A2D36]">
                          <button
                            type="button"
                            onClick={() => {
                              setNewProjPlatform('multiboard');
                              setNewProjWidthMm('1200');
                              setNewProjHeightMm('600');
                              setNewWarningInfo(null);
                            }}
                            className={`py-1.5 px-3 rounded-[9px] text-xs font-['Figtree'] font-black transition-all ${
                              newProjPlatform === 'multiboard'
                                ? 'bg-[#1E2028] text-white shadow-sm border border-[#383C48]'
                                : 'text-slate-400 hover:text-white border border-transparent'
                            }`}
                          >
                            Multiboard (25mm)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewProjPlatform('opengrid');
                              setNewProjWidthMm('1008');
                              setNewProjHeightMm('504');
                              setNewWarningInfo(null);
                            }}
                            className={`py-1.5 px-3 rounded-[9px] text-xs font-['Figtree'] font-black transition-all ${
                              newProjPlatform === 'opengrid'
                                ? 'bg-[#1E2028] text-white shadow-sm border border-[#383C48]'
                                : 'text-slate-400 hover:text-white border border-transparent'
                            }`}
                          >
                            openGrid (28mm)
                          </button>
                        </div>
                      </div>

                      {/* openGrid Tile Size Dropdown (New Project) */}
                      {newProjPlatform === 'opengrid' && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-['Figtree'] font-bold text-[#929394] uppercase tracking-wider">
                              Tile Size
                            </label>
                            <span className="text-[10px] font-['Figtree'] font-semibold text-white/60">
                              {newProjMaxTile}×{newProjMaxTile} OU ({newProjMaxTile * 28}×{newProjMaxTile * 28} mm)
                            </span>
                          </div>
                          <div className="relative">
                            <select
                              value={newProjMaxTile}
                              onChange={(e) => {
                                setNewProjMaxTile(parseInt(e.target.value, 10));
                              }}
                              className="w-full appearance-none px-3 py-2 pr-8 rounded-[10px] bg-[#0E0F12] border border-[#2A2D36] hover:border-[#383C48] text-white text-xs font-['Figtree'] font-bold focus:outline-none focus:border-[#383C48] cursor-pointer transition-colors"
                            >
                              {OPENGRID_BED_OPTIONS.map((opt) => (
                                <option key={opt.size} value={opt.size} className="bg-[#12141A] text-white">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={14}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* Grid Dimensions: Label outside the dark container */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-['Figtree'] font-bold text-[#929394] uppercase tracking-wider">
                          Grid Dimensions
                        </label>
                        <div className="p-3.5 rounded-[14px] bg-[#0E0F12] border border-[#2A2D36] flex flex-col gap-3">
                          {/* Capsule Steppers for Width and Height (mm) */}
                          <div className="grid grid-cols-2 gap-2.5">
                            {/* Width (mm) */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-['Figtree'] font-bold text-[#929394] uppercase">
                                  Width (mm)
                                </span>
                                <span className="text-[10px] font-['Figtree'] font-bold text-white/60">
                                  {Math.round((parseInt(newProjWidthMm, 10) || (newProjPlatform === 'opengrid' ? 1008 : 900)) / (newProjPlatform === 'opengrid' ? 28 : 25))} {newProjPlatform === 'opengrid' ? 'OU' : 'MU'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between h-[34px] px-1.5 rounded-[10px] bg-[#15161A] border border-[#2A2D36]">
                                <button
                                  type="button"
                                  onClick={() => handleStepNewProjWidthMm(-1)}
                                  className="w-7 h-7 rounded-md hover:bg-[#2A2D36] text-white font-black text-sm flex items-center justify-center active:scale-95 transition-colors"
                                  title="Tile compatibile precedente"
                                >
                                  -
                                </button>
                                <div className="flex items-center justify-center gap-0.5">
                                  <input
                                    type="text"
                                    value={newProjWidthMm}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setNewProjWidthMm(e.target.value)}
                                    onBlur={handleBlurNewProjWidth}
                                    onKeyDown={(e) => {
                                       if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                    }}
                                    className="w-12 text-center bg-transparent font-['Figtree'] font-black text-xs text-white focus:outline-none"
                                  />
                                  <span className="font-['Figtree'] text-[11px] text-[#929394] font-bold">mm</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleStepNewProjWidthMm(1)}
                                  className="w-7 h-7 rounded-md hover:bg-[#2A2D36] text-white font-black text-sm flex items-center justify-center active:scale-95 transition-colors"
                                  title="Tile compatibile successiva"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Height (mm) */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-['Figtree'] font-bold text-[#929394] uppercase">
                                  Height (mm)
                                </span>
                                <span className="text-[10px] font-['Figtree'] font-bold text-white/60">
                                  {Math.round((parseInt(newProjHeightMm, 10) || (newProjPlatform === 'opengrid' ? 504 : 300)) / (newProjPlatform === 'opengrid' ? 28 : 25))} {newProjPlatform === 'opengrid' ? 'OU' : 'MU'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between h-[34px] px-1.5 rounded-[10px] bg-[#15161A] border border-[#2A2D36]">
                                <button
                                  type="button"
                                  onClick={() => handleStepNewProjHeightMm(-1)}
                                  className="w-7 h-7 rounded-md hover:bg-[#2A2D36] text-white font-black text-sm flex items-center justify-center active:scale-95 transition-colors"
                                  title="Tile compatibile precedente"
                                >
                                  -
                                </button>
                                <div className="flex items-center justify-center gap-0.5">
                                  <input
                                    type="text"
                                    value={newProjHeightMm}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => setNewProjHeightMm(e.target.value)}
                                    onBlur={handleBlurNewProjHeight}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                    }}
                                    className="w-12 text-center bg-transparent font-['Figtree'] font-black text-xs text-white focus:outline-none"
                                  />
                                  <span className="font-['Figtree'] text-[11px] text-[#929394] font-bold">mm</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleStepNewProjHeightMm(1)}
                                  className="w-7 h-7 rounded-md hover:bg-[#2A2D36] text-white font-black text-sm flex items-center justify-center active:scale-95 transition-colors"
                                  title="Tile compatibile successiva"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Warning Box for Incompatible / Adjusted Dimensions */}
                          {newWarningInfo && (
                            <div className="flex flex-col gap-1.5 p-3 rounded-[12px] bg-[#241A14] border border-[#F59E0B]/40 text-amber-200 animate-fadeIn shadow-inner">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-['Figtree'] font-black text-xs text-[#FBBF24] uppercase tracking-wide">
                                  <AlertTriangle size={14} className="text-[#F59E0B] shrink-0" />
                                  <span>{newWarningInfo.title}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setNewWarningInfo(null)}
                                  className="text-[#929394] hover:text-white transition-colors p-0.5"
                                  title="Chiudi avviso"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                              <p className="text-[11px] font-['Figtree'] font-medium text-slate-200 leading-snug">
                                {newWarningInfo.message}
                              </p>
                            </div>
                          )}

                          {/* Aesthetic 2D Graphic Preview */}
                          {renderTilePreview(
                            newTiling.cols,
                            newTiling.rows,
                            newTiling.moduleSize,
                            newW,
                            newH,
                            newProjPlatform === 'opengrid',
                            undefined,
                            newProjMaxTile
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A2D36]/60">
                        <button
                          type="button"
                          onClick={() => setProjectTab('list')}
                          className="px-3 py-1.5 rounded-[8px] text-xs font-['Figtree'] font-semibold text-slate-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-[8px] bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-['Figtree'] font-black text-white active:scale-95 transition-all shadow-sm"
                        >
                          Create Setup
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Categories Area */}
          <div className="flex flex-col gap-1.5 relative items-start mt-3" ref={categoryMenuRef}>
            {/* Header row: "Categories" + "+" button */}
            <div className="flex items-center justify-between w-[204px] px-0.5">
              <span className="font-['Figtree'] font-black text-[13.5px] text-white tracking-tight select-none leading-none">
                Categories
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsMiniNewCategoryOpen((prev) => !prev);
                  setIsCategoryMenuOpen(false);
                  setEditingCatId(null);
                }}
                className="w-[32px] h-[18px] rounded-[4.5px] bg-[#2A2D36] hover:bg-[#383C48] text-white flex items-center justify-center transition-colors active:scale-95 shadow-sm"
                title="Add new category"
              >
                <svg width="32" height="18" viewBox="0 0 40 20" fill="none">
                  <rect width="40" height="20" rx="5" fill="#2A2D36" />
                  <path
                    d="M18.8085 14V6H21.1915V14H18.8085ZM16 11.1915V8.80851H24V11.1915H16Z"
                    fill="white"
                  />
                </svg>
              </button>
            </div>

            {/* Active Category Trigger Pill (matching Desk Setup outside styling) */}
            <button
              type="button"
              onClick={() => {
                setIsCategoryMenuOpen((prev) => !prev);
                setIsMiniNewCategoryOpen(false);
                setEditingCatId(null);
              }}
              className="flex items-center justify-between w-[204px] h-[52px] px-4 rounded-[20px] bg-[#15161A] hover:bg-[#1C1D23] border-[2.8px] border-[#2A2D36] hover:border-[#383C48] text-white shadow-xl transition-all group select-none text-left"
              title={`Select Category (Active: ${currentCategory?.name || 'Category'})`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span
                  className="w-[14px] h-[14px] rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: currentCategory?.color || '#3B82F6' }}
                />
                <span className="font-['Figtree'] font-black text-sm text-white truncate max-w-[130px]">
                  {currentCategory?.name || 'Category'}
                </span>
              </div>
              <svg
                width="12"
                height="9"
                viewBox="0 0 14 11"
                fill="none"
                className="shrink-0 ml-2 transition-transform group-hover:translate-y-0.5"
              >
                <polygon points="1.5,2 12.5,2 7,8.5" fill="white" />
              </svg>
            </button>

            {/* Mini New Category Popover using shared MiniNewPopover */}
            <MiniNewPopover
              isOpen={isMiniNewCategoryOpen}
              onClose={() => setIsMiniNewCategoryOpen(false)}
              title="New Category"
              onSubmit={handleCreateCategory}
              submitLabel="Save"
              direction="down"
              widthClassName="w-[204px]"
            >
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-['Figtree'] font-bold text-[#929394] uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Audio, Desk..."
                  className="w-full px-2.5 py-1.5 rounded-[8px] bg-[#0E0F12] border border-[#2A2D36] text-xs font-['Figtree'] font-bold text-white focus:outline-none focus:border-[#4B5563] placeholder:text-slate-600"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-['Figtree'] font-bold text-[#929394] uppercase tracking-wider">
                  Color
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        newCatColor === c ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-[#15161A]' : 'hover:scale-110 opacity-75 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </MiniNewPopover>

            {/* Categories Dropdown using shared ChannelDropdown */}
            <ChannelDropdown
              isOpen={isCategoryMenuOpen}
              title="Categories"
              items={categories}
              selectedId={activeCategory}
              direction="down"
              widthClassName="w-[204px]"
              onSelect={(cat) => {
                onSelectCategory(cat.id);
                setIsCategoryMenuOpen(false);
              }}
              renderIcon={(cat) => (
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: cat.color }}
                />
              )}
              editingId={editingCatId}
              onStartEdit={(cat) => {
                setEditingCatId(cat.id);
                setEditingCatName(cat.name);
                setEditingCatColor(cat.color);
              }}
              onCancelEdit={() => setEditingCatId(null)}
              onSaveEdit={handleSaveEditCategory}
              renderEditForm={() => (
                <>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] font-['Figtree'] font-bold text-[#929394] uppercase">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      autoFocus
                      className="w-full px-2 py-1 rounded-[6px] bg-[#0E0F12] border border-[#2A2D36] text-xs font-['Figtree'] font-bold text-white focus:outline-none focus:border-[#4B5563]"
                    />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] font-['Figtree'] font-bold text-[#929394] uppercase">
                      Color
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditingCatColor(c)}
                          className={`w-4 h-4 rounded-full transition-transform ${
                            editingCatColor === c ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-[#1C1E26]' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
              onDelete={onDeleteCategory}
              canDelete={(cat) => categories.length > 1 && !['power', 'hdmi'].includes(cat.id)}
            />
          </div>
        </div>

        {/* Top Right: Outer Pill (BOM + Export) + Socials */}
        <div className="flex items-center gap-3.5 pointer-events-auto">
          {/* Outer BOM + Export Pill Container: w=225px, h=44px, rx=10px, fill=#2A2D36 */}
          <div className="flex items-center w-[225px] h-[44px] p-[3.5px] rounded-[10px] bg-[#2A2D36] shadow-xl relative gap-1 select-none">
            {/* BOM button: w=117px, h=37px, rx=8.6px, fill=#3B82F6, stroke=#2A2D36, sw=2.8 */}
            <button
              onClick={onToggleBOMDrawer}
              className="w-[117px] h-[37px] rounded-[8.6px] bg-[#3B82F6] hover:bg-[#2563EB] border-[2.8px] border-[#2A2D36] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center shadow-sm transition-all active:scale-95"
              title="Open Bill of Materials Drawer"
            >
              <span>BOM</span>
            </button>

            {/* Export button: w=98px, h=37px, rx=8.6px, fill=#15161A, stroke=#2A2D36, sw=2.8 */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="w-[98px] h-[37px] rounded-[8.6px] bg-[#15161A] hover:bg-[#1C1D23] border-[2.8px] border-[#2A2D36] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                title="Export Options"
              >
                <span>Export</span>
                <svg width="11" height="9" viewBox="1745 49.5 14.2 10.6" fill="none">
                  <path
                    d="M1748.54 49.5355L1745 53.0711L1752.07 60.1421L1759.14 53.0711L1755.61 49.5355L1752.07 53.0711L1748.54 49.5355Z"
                    fill="#F8FAFC"
                  />
                </svg>
              </button>

              {/* Export Popover */}
              {isExportMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-[#15161A] border-[2px] border-[#2A2D36] shadow-2xl p-1.5 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      onCopyBOM();
                      setIsExportMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-[#1C1D23] transition-colors"
                  >
                    <ClipboardCopy size={14} className="text-[#38BDF8]" />
                    <span>Copy BOM.md</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportCSV();
                      setIsExportMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-[#1C1D23] transition-colors"
                  >
                    <FileSpreadsheet size={14} className="text-[#34D399]" />
                    <span>Export CSV</span>
                  </button>
                  {onExportPNG && (
                    <button
                      onClick={() => {
                        onExportPNG();
                        setIsExportMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-[#1C1D23] transition-colors"
                    >
                      <Download size={14} className="text-[#FBBF24]" />
                      <span>Download PNG</span>
                    </button>
                  )}
                  {onExportSVG && (
                    <button
                      onClick={() => {
                        onExportSVG();
                        setIsExportMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-[#1C1D23] transition-colors"
                    >
                      <Download size={14} className="text-[#A78BFA]" />
                      <span>Download SVG</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Exact GitHub Button: circle cx=1811.59, cy=53.59, r=22.68, fill=#2A2D36 */}
          <a
            href="https://github.com/francycalle/underplan"
            target="_blank"
            rel="noreferrer"
            className="w-[45.4px] h-[45.4px] rounded-full bg-[#2A2D36] hover:bg-[#343842] flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105"
            title="View UnderPlan on GitHub"
          >
            <svg width="45.4" height="45.4" viewBox="1788.91 30.91 45.36 45.36" fill="none">
              <circle cx="1811.59" cy="53.5919" r="22.68" fill="#2A2D36" />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M1811.44 37.888C1802.85 37.888 1795.89 44.8476 1795.89 53.44C1795.89 60.3218 1800.34 66.1344 1806.52 68.195C1807.3 68.3311 1807.59 67.8645 1807.59 67.4563C1807.59 67.0869 1807.57 65.8622 1807.57 64.5597C1803.66 65.279 1802.65 63.6072 1802.34 62.7324C1802.17 62.2852 1801.41 60.905 1800.75 60.5356C1800.2 60.244 1799.43 59.5248 1800.73 59.5053C1801.95 59.4859 1802.83 60.6328 1803.12 61.0994C1804.52 63.4516 1806.75 62.7907 1807.65 62.3824C1807.78 61.3716 1808.19 60.6912 1808.64 60.3024C1805.18 59.9136 1801.56 58.5722 1801.56 52.6236C1801.56 50.9323 1802.17 49.5326 1803.16 48.444C1803 48.0552 1802.46 46.4611 1803.31 44.3227C1803.31 44.3227 1804.62 43.9144 1807.59 45.9168C1808.83 45.5668 1810.16 45.3919 1811.48 45.3919C1812.8 45.3919 1814.12 45.5668 1815.37 45.9168C1818.34 43.895 1819.64 44.3227 1819.64 44.3227C1820.5 46.4611 1819.95 48.0552 1819.8 48.444C1820.79 49.5326 1821.39 50.9128 1821.39 52.6236C1821.39 58.5916 1817.76 59.9136 1814.3 60.3024C1814.86 60.7884 1815.35 61.7215 1815.35 63.1795C1815.35 65.2596 1815.33 66.9314 1815.33 67.4563C1815.33 67.8645 1815.62 68.3505 1816.4 68.195C1819.48 67.1526 1822.17 65.1684 1824.07 62.5216C1825.97 59.8747 1826.99 56.6985 1826.99 53.44C1826.99 44.8476 1820.03 37.888 1811.44 37.888Z"
                fill="white"
              />
            </svg>
          </a>

          {/* Exact Reddit Button: circle cx=1865.38, cy=53.59, r=22.68, fill=#2A2D36 */}
          <a
            href="https://www.reddit.com/user/Francy_Lab/submitted/"
            target="_blank"
            rel="noreferrer"
            className="w-[45.4px] h-[45.4px] rounded-full bg-[#2A2D36] hover:bg-[#343842] flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105"
            title="Reddit Posts by u/Francy_Lab"
          >
            <svg width="45.4" height="45.4" viewBox="1842.7 30.91 45.36 45.36" fill="none">
              <circle cx="1865.38" cy="53.5919" r="22.68" fill="#2A2D36" />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M1881.37 53.3894C1881.37 61.978 1874.41 68.9414 1865.82 68.9414C1857.23 68.9414 1850.27 61.978 1850.27 53.3894C1850.27 44.8008 1857.23 37.8374 1865.82 37.8374C1874.41 37.8374 1881.37 44.8008 1881.37 53.3894ZM1875.78 52.1686C1876.04 52.5276 1876.18 52.9514 1876.19 53.3894C1876.2 53.818 1876.09 54.2398 1875.86 54.6059C1875.64 54.9719 1875.32 55.2673 1874.93 55.4578C1874.95 55.6859 1874.95 55.914 1874.93 56.1421C1874.93 59.6258 1870.88 62.4562 1865.87 62.4562C1860.86 62.4562 1856.8 59.6258 1856.8 56.1421C1856.78 55.9144 1856.78 55.6856 1856.8 55.4578C1856.5 55.319 1856.24 55.1176 1856.03 54.8675C1855.82 54.6174 1855.66 54.3245 1855.58 54.0089C1855.49 53.6933 1855.47 53.3626 1855.52 53.0394C1855.58 52.7162 1855.7 52.4082 1855.88 52.1366C1856.06 51.8651 1856.3 51.6363 1856.58 51.4661C1856.86 51.296 1857.18 51.1884 1857.5 51.1508C1857.83 51.1132 1858.16 51.1464 1858.47 51.2483C1858.78 51.3502 1859.06 51.5182 1859.3 51.7409C1861.1 50.5257 1863.21 49.8608 1865.37 49.828L1866.52 44.4315C1866.53 44.3688 1866.56 44.3093 1866.59 44.2565C1866.63 44.2037 1866.68 44.1585 1866.73 44.1237C1866.78 44.089 1866.84 44.0653 1866.91 44.054C1866.97 44.0428 1867.03 44.0442 1867.1 44.0582L1870.91 44.8203C1871.09 44.5006 1871.39 44.2577 1871.74 44.1352C1872.08 44.0127 1872.47 44.0186 1872.81 44.1518C1873.16 44.2851 1873.44 44.537 1873.62 44.8623C1873.79 45.1876 1873.85 45.565 1873.77 45.9268C1873.69 46.2885 1873.49 46.611 1873.2 46.8362C1872.9 47.0615 1872.54 47.1748 1872.17 47.1558C1871.8 47.1367 1871.45 46.9867 1871.18 46.7325C1870.91 46.4784 1870.74 46.1367 1870.7 45.769L1867.38 45.0691L1866.37 49.9213C1868.5 49.9669 1870.58 50.6314 1872.35 51.8342C1872.59 51.607 1872.87 51.4335 1873.18 51.3259C1873.49 51.2183 1873.82 51.179 1874.15 51.2108C1874.47 51.2426 1874.79 51.3446 1875.07 51.51C1875.35 51.6753 1875.6 51.9 1875.78 52.1686ZM1860.9 54.0802C1860.79 54.2501 1860.71 54.4406 1860.67 54.641C1860.63 54.8413 1860.63 55.0476 1860.67 55.248C1860.75 55.6526 1860.99 56.0088 1861.33 56.238C1861.68 56.4673 1862.1 56.5509 1862.5 56.4705C1862.7 56.4306 1862.89 56.3517 1863.06 56.2382C1863.23 56.1247 1863.38 55.9789 1863.49 55.8091C1863.72 55.466 1863.8 55.046 1863.72 54.6413C1863.64 54.2366 1863.4 53.8805 1863.06 53.6512C1862.72 53.422 1862.3 53.3384 1861.89 53.4188C1861.49 53.4993 1861.13 53.7372 1860.9 54.0802ZM1865.84 60.4189C1867.22 60.476 1868.58 60.1157 1869.68 59.2836C1869.76 59.2032 1869.81 59.0933 1869.81 58.9781C1869.81 58.8629 1869.77 58.7518 1869.69 58.6693C1869.65 58.6285 1869.6 58.5959 1869.55 58.5734C1869.49 58.5509 1869.44 58.5389 1869.38 58.5382C1869.26 58.5368 1869.15 58.5811 1869.07 58.6616C1868.13 59.3383 1866.98 59.6729 1865.82 59.6102C1864.66 59.6624 1863.52 59.3167 1862.59 58.6305C1862.51 58.5643 1862.4 58.5305 1862.3 58.5356C1862.2 58.5408 1862.1 58.5844 1862.02 58.6581C1861.95 58.7318 1861.91 58.8303 1861.9 58.9344C1861.9 59.0386 1861.93 59.1409 1862 59.2214C1863.1 60.0537 1864.46 60.477 1865.84 60.4189ZM1868.53 56.3002C1868.79 56.4713 1869.08 56.6242 1869.38 56.6242C1869.59 56.6265 1869.8 56.5859 1870 56.5048C1870.19 56.4237 1870.37 56.3039 1870.51 56.1526C1870.66 56.0013 1870.78 55.8217 1870.85 55.6248C1870.93 55.4278 1870.96 55.2176 1870.95 55.0068C1870.95 54.7382 1870.88 54.4742 1870.75 54.2405C1870.62 54.0068 1870.43 53.8114 1870.2 53.6733C1869.97 53.5353 1869.7 53.4592 1869.44 53.4527C1869.17 53.4461 1868.9 53.5092 1868.66 53.6359C1868.43 53.7625 1868.23 53.9484 1868.08 54.1753C1867.94 54.4023 1867.86 54.6626 1867.84 54.9309C1867.83 55.1992 1867.89 55.4664 1868.01 55.7063C1868.13 55.9463 1868.31 56.1509 1868.53 56.3002Z"
                fill="#FF4500"
              />
            </svg>
          </a>
        </div>
      </header>
    </>
  );
};
