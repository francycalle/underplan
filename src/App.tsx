import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  BoardConfig,
  PlacedChannel,
  ChannelCategory,
  Rotation,
  BoardState,
  CustomCategory,
  CustomAccessoryDefinition,
  MountingType,
  ProjectItem,
} from './lib/types';
import { DEFAULT_BOARD_CONFIG, generateTileMatrix, fitBoardToViewport, rotatePlacedChannel, mirrorPlacedChannel, isChannelOutOfBounds } from './lib/geometry';
import { generateBOM, formatBOMAsCSV, formatBOMAsMarkdown } from './lib/bom';
import { exportSvgAsPng, exportSvgDirect } from './lib/exportMap';

import { Header } from './components/Header';
import { ToolPalette, ToolType } from './components/ToolPalette';
import { Canvas } from './components/Canvas';
import { InspectorPanel } from './components/InspectorPanel';
import { BOMDrawer } from './components/BOMDrawer';
import { Toast } from './components/Toast';
import { MobileFallback } from './components/MobileFallback';

import { DEMO_CHANNELS } from './data/demoLayout';

const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'power', name: 'Power', color: '#F59E0B' },
  { id: 'hdmi', name: 'HDMI', color: '#38BDF8' },
  { id: 'data', name: 'Data / USB', color: '#06B6D4' },
  { id: 'video', name: 'Video / DP', color: '#8B5CF6' },
  { id: 'network', name: 'Network', color: '#10B981' },
];

const STORAGE_KEY_CONFIG = 'underplan_board_config';
const STORAGE_KEY_CHANNELS = 'underplan_channels';
const STORAGE_KEY_CATEGORIES = 'underplan_categories';
const STORAGE_KEY_ACCESSORIES = 'underplan_accessories';
const STORAGE_KEY_TITLE = 'underplan_project_title';
const STORAGE_KEY_PROJECTS = 'underplan_saved_projects';
const STORAGE_KEY_ACTIVE_PROJECT_ID = 'underplan_active_project_id';
const STORAGE_KEY_ACTIVE_CATEGORY = 'underplan_active_category';

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null);

  // Project title state
  const [projectTitle, setProjectTitle] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TITLE) || 'My Setup';
    } catch {
      return 'My Setup';
    }
  });

  // Board configuration state (persisted)
  const [boardConfig, setBoardConfig] = useState<BoardConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not restore boardConfig from localStorage', e);
    }
    return DEFAULT_BOARD_CONFIG;
  });

  // Placed channels state - initialized with persistence
  const [channels, setChannels] = useState<PlacedChannel[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHANNELS);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not restore channels from localStorage', e);
    }
    return DEMO_CHANNELS;
  });
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Projects state (persisted)
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not restore projects from localStorage', e);
    }
    const initialTitle = localStorage.getItem(STORAGE_KEY_TITLE) || 'Pasticcio';
    let initialConfig = DEFAULT_BOARD_CONFIG;
    try {
      const savedCfg = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (savedCfg) initialConfig = JSON.parse(savedCfg);
    } catch {}
    let initialChannels = DEMO_CHANNELS;
    try {
      const savedCh = localStorage.getItem(STORAGE_KEY_CHANNELS);
      if (savedCh) initialChannels = JSON.parse(savedCh);
    } catch {}

    return [
      {
        id: 'proj_default',
        name: initialTitle,
        boardConfig: initialConfig,
        channels: initialChannels,
        updatedAt: Date.now(),
      },
    ];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT_ID) || 'proj_default';
    } catch {
      return 'proj_default';
    }
  });

  // Custom Categories state (persisted)
  const [categories, setCategories] = useState<CustomCategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not restore categories from localStorage', e);
    }
    return DEFAULT_CATEGORIES;
  });

  // Custom Modular Accessories state (persisted)
  const [customAccessories, setCustomAccessories] = useState<CustomAccessoryDefinition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACCESSORIES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not restore customAccessories from localStorage', e);
    }
    return [
      { id: 'acc-loop', name: 'Cable Loop', widthMU: 3, heightMU: 3 },
      { id: 'acc-socket', name: 'Multi-socket', widthMU: 6, heightMU: 3 },
      { id: 'acc-loop-max', name: 'Cable Loop', widthMU: 3, heightMU: 3 },
    ];
  });
  const [activeAccessoryId, setActiveAccessoryId] = useState<string | null>('acc-loop');

  // Interaction tools & placement state
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeCategory, setActiveCategory] = useState<ChannelCategory>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_CATEGORY);
      if (saved) return saved as ChannelCategory;
    } catch {}
    return 'power';
  });
  const [placementCategory, setPlacementCategory] = useState<ChannelCategory | null>(null);
  const [straightLength, setStraightLength] = useState<number>(10);
  const [channelWidthUnits, setChannelWidthUnits] = useState<number>(1);
  const [placementMountingType, setPlacementMountingType] = useState<MountingType>('threaded_snap');
  const [placementRotation, setPlacementRotation] = useState<Rotation>(0);
  const [placementMirrored, setPlacementMirrored] = useState<boolean>(false);

  // Parametric state for Underware 2.0 parts
  const [curvedRadius, setCurvedRadius] = useState<number>(2);
  const [armSpanUnits, setArmSpanUnits] = useState<number>(2);
  const [trunkSpanUnits, setTrunkSpanUnits] = useState<number>(3);
  const [branchSpanUnits, setBranchSpanUnits] = useState<number>(2);
  const [mitreArmA, setMitreArmA] = useState<number>(2);
  const [mitreArmB, setMitreArmB] = useState<number>(2);
  const [offsetUnits, setOffsetUnits] = useState<number>(1);
  const [yTrunkUnits, setYTrunkUnits] = useState<number>(1);
  const [yBranchUnits, setYBranchUnits] = useState<number>(1);

  // Pan & Zoom state: initialized fitted to screen
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const fit = fitBoardToViewport(boardConfig, window.innerWidth, window.innerHeight);
        return fit.zoom;
      } catch {}
    }
    return 1.0;
  });
  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const fit = fitBoardToViewport(boardConfig, window.innerWidth, window.innerHeight);
        return fit.pan;
      } catch {}
    }
    return { x: 260, y: 160 };
  });

  // Auto-fit to screen on initial mount once viewport size is stable
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fit = fitBoardToViewport(boardConfig, window.innerWidth, window.innerHeight);
      setZoom(fit.zoom);
      setPan(fit.pan);
    }
  }, []);

  // BOM Drawer and Toast state
  const [isBOMOpen, setIsBOMOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'warning' | 'info' } | null>(null);

  // Mount editing state (locked channel drag, clickable octagon targets)
  const [isEditingMounts, setIsEditingMounts] = useState(false);

  // Zen Mode toggle (full immersion)
  const [isZenMode, setIsZenMode] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  // Keyboard shortcuts for CAD workflow
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Deselect on Escape and clean DOM focus
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement)?.blur();
        setSelectedChannelId(null);
        setActiveTool('select');
        setIsEditingMounts(false);
        return;
      }

      // Zen Mode toggle
      if (key === 'z') {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
        showToast(isZenMode ? 'Zen Mode disabled' : 'Zen Mode enabled (Press Z to exit)', 'info');
        return;
      }

      // Rotate selected channel or placement (every 90°)
      if (key === 'r') {
        e.preventDefault();
        if (selectedChannelId) {
          const selected = channels.find((c) => c.id === selectedChannelId);
          if (selected) {
            const rotated = rotatePlacedChannel(selected, 90, boardConfig);
            setChannels((prev) =>
              prev.map((ch) => (ch.id === selectedChannelId ? rotated : ch))
            );
          }
        } else {
          setPlacementRotation((prev) => (((prev + 90) % 360) as Rotation));
        }
        return;
      }

      // Duplicate selected channel
      if (key === 'd' && selectedChannelId) {
        e.preventDefault();
        const selected = channels.find((c) => c.id === selectedChannelId);
        if (selected) {
          const cloned: PlacedChannel = {
            ...selected,
            id: `chan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            position: {
              x: selected.position.x + 1,
              y: selected.position.y + 1,
            },
          };
          if (!isChannelOutOfBounds(cloned, boardConfig)) {
            setChannels((prev) => [...prev, cloned]);
            setSelectedChannelId(cloned.id);
            showToast('Channel duplicated', 'success');
          } else {
            showToast('Cannot duplicate: outside board boundaries', 'warning');
          }
        }
        return;
      }

      // Delete selected channel
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedChannelId) {
        e.preventDefault();
        setChannels((prev) => prev.filter((ch) => ch.id !== selectedChannelId));
        setSelectedChannelId(null);
        showToast('Channel deleted', 'info');
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedChannelId, channels, isZenMode, showToast]);

  // Ensure mount edit mode is cleared if selected channel changes to null
  useEffect(() => {
    if (!selectedChannelId) {
      setIsEditingMounts(false);
    }
  }, [selectedChannelId]);

  // Compute BoardState
  const boardState = useMemo<BoardState>(() => {
    return {
      config: boardConfig,
      tiles: generateTileMatrix(boardConfig),
      channels,
      selectedChannelId,
    };
  }, [boardConfig, channels, selectedChannelId]);

  // Compute Bill of Materials
  const bom = useMemo(() => {
    return generateBOM(boardState, 10);
  }, [boardState]);

  // Auto-save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CHANNELS, JSON.stringify(channels));
    } catch (e) {
      console.error('Failed to save channels to localStorage', e);
    }
  }, [channels]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(boardConfig));
    } catch (e) {
      console.error('Failed to save boardConfig to localStorage', e);
    }
  }, [boardConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories to localStorage', e);
    }
  }, [categories]);

  // Ensure activeCategory always points to a valid category in categories
  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === activeCategory)) {
      setActiveCategory(categories[0].id as any);
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_CATEGORY, activeCategory);
    } catch (e) {
      console.error('Failed to save activeCategory to localStorage', e);
    }
  }, [activeCategory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACCESSORIES, JSON.stringify(customAccessories));
    } catch (e) {
      console.error('Failed to save customAccessories to localStorage', e);
    }
  }, [customAccessories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TITLE, projectTitle);
    } catch (e) {
      console.error('Failed to save projectTitle to localStorage', e);
    }
  }, [projectTitle]);

  // Sync active project with current channels, boardConfig, and projectTitle
  useEffect(() => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === activeProjectId);
      if (!exists) {
        return [
          ...prev,
          {
            id: activeProjectId,
            name: projectTitle,
            boardConfig,
            channels,
            updatedAt: Date.now(),
          },
        ];
      }
      return prev.map((p) =>
        p.id === activeProjectId
          ? {
              ...p,
              name: projectTitle,
              boardConfig,
              channels,
              updatedAt: Date.now(),
            }
          : p
      );
    });
  }, [channels, boardConfig, projectTitle, activeProjectId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage', e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT_ID, activeProjectId);
    } catch (e) {
      console.error('Failed to save activeProjectId to localStorage', e);
    }
  }, [activeProjectId]);

  const handleSelectProject = (projectId: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    setActiveProjectId(target.id);
    setProjectTitle(target.name);
    setBoardConfig(target.boardConfig);
    if (target.boardConfig.platform === 'opengrid') {
      setPlacementMountingType('opengrid_snap');
    } else {
      setPlacementMountingType('threaded_snap');
    }
    setChannels(target.channels);
    setSelectedChannelId(null);
    setActiveTool('select');
    setIsEditingMounts(false);
    setPlacementCategory(null);
    if (typeof window !== 'undefined') {
      const fit = fitBoardToViewport(target.boardConfig, window.innerWidth, window.innerHeight);
      setZoom(fit.zoom);
      setPan(fit.pan);
    }
    showToast(`Switched to "${target.name}"`, 'success');
  };

  const handleCreateProject = (name?: string, config?: BoardConfig) => {
    const trimmed = name?.trim() || `Setup ${projects.length + 1}`;
    const newId = `proj_${Date.now()}`;
    const newConfig = config || DEFAULT_BOARD_CONFIG;
    const newProj: ProjectItem = {
      id: newId,
      name: trimmed,
      boardConfig: newConfig,
      channels: [],
      updatedAt: Date.now(),
    };
    setProjects((prev) => [...prev, newProj]);
    setActiveProjectId(newId);
    setProjectTitle(trimmed);
    setBoardConfig(newConfig);
    if (newConfig.platform === 'opengrid') {
      setPlacementMountingType('opengrid_snap');
    } else {
      setPlacementMountingType('threaded_snap');
    }
    setChannels([]);
    setSelectedChannelId(null);
    setActiveTool('select');
    setIsEditingMounts(false);
    setPlacementCategory(null);
    if (typeof window !== 'undefined') {
      const fit = fitBoardToViewport(newConfig, window.innerWidth, window.innerHeight);
      setZoom(fit.zoom);
      setPan(fit.pan);
    }
    showToast(`Created "${trimmed}"`, 'success');
  };

  const handleDeleteProject = (projectId: string) => {
    if (projects.length <= 1) {
      showToast('Cannot delete the only project', 'warning');
      return;
    }
    const remaining = projects.filter((p) => p.id !== projectId);
    setProjects(remaining);
    if (activeProjectId === projectId) {
      const next = remaining[0];
      setActiveProjectId(next.id);
      setProjectTitle(next.name);
      setBoardConfig(next.boardConfig);
      setChannels(next.channels);
      setSelectedChannelId(null);
      setActiveTool('select');
      setIsEditingMounts(false);
      setPlacementCategory(null);
      if (typeof window !== 'undefined') {
        const fit = fitBoardToViewport(next.boardConfig, window.innerWidth, window.innerHeight);
        setZoom(fit.zoom);
        setPan(fit.pan);
      }
    }
    showToast('Project deleted', 'info');
  };

  const handleDuplicateProject = (projectId: string) => {
    const source = projects.find((p) => p.id === projectId);
    if (!source) return;
    const copyName = `${source.name} (Copy)`;
    const newId = `proj_${Date.now()}`;
    const copyProj: ProjectItem = {
      id: newId,
      name: copyName,
      boardConfig: { ...source.boardConfig },
      channels: JSON.parse(JSON.stringify(source.channels)),
      updatedAt: Date.now(),
    };
    setProjects((prev) => [...prev, copyProj]);
    setActiveProjectId(newId);
    setProjectTitle(copyName);
    setBoardConfig(copyProj.boardConfig);
    setChannels(copyProj.channels);
    setSelectedChannelId(null);
    setActiveTool('select');
    setIsEditingMounts(false);
    setPlacementCategory(null);
    if (typeof window !== 'undefined') {
      const fit = fitBoardToViewport(copyProj.boardConfig, window.innerWidth, window.innerHeight);
      setZoom(fit.zoom);
      setPan(fit.pan);
    }
    showToast(`Duplicated "${source.name}"`, 'success');
  };

  const handleUpdateConfig = (newConfig: Partial<BoardConfig>) => {
    setBoardConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      const pitch = updated.holePitchMm || (updated.platform === 'opengrid' ? 28 : 25);
      const totalTiles = updated.cols * updated.rows;
      if (typeof window !== 'undefined') {
        const fit = fitBoardToViewport(updated, window.innerWidth, window.innerHeight);
        setZoom(fit.zoom);
        setPan(fit.pan);
      }
      showToast(
        `Surface updated: ${totalTiles} tiles (${updated.cols * (updated.tileWidthHoles || 8) * pitch}×${
          updated.rows * (updated.tileHeightHoles || 8) * pitch
        }mm)`,
        'info'
      );
      return updated;
    });
    if (newConfig.platform) {
      if (newConfig.platform === 'opengrid') {
        setPlacementMountingType((prev) => (prev === 'threaded_snap' || prev === 'direct_snap' || prev === 'direct_screw' || prev === 'multiconnect' ? 'opengrid_base_snap' : prev));
      } else if (newConfig.platform === 'multiboard') {
        setPlacementMountingType((prev) => (prev === 'opengrid_base_snap' || prev === 'opengrid_grip_snap' || prev === 'opengrid_snap' ? 'threaded_snap' : prev));
      }
    }
  };

  const handleClearBoard = () => {
    setChannels([]);
    setSelectedChannelId(null);
    setActiveTool('select');
    showToast('Canvas cleared', 'info');
  };

  const handleExportCSV = () => {
    const csv = formatBOMAsCSV(bom);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-bom.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('BOM CSV exported successfully!', 'success');
  };

  const handleCopyBOM = async () => {
    const md = formatBOMAsMarkdown(bom);
    await navigator.clipboard.writeText(md);
    showToast('BOM copied to clipboard as Markdown!', 'success');
  };

  const handleExportPNG = async () => {
    if (!svgRef.current) return;
    try {
      await exportSvgAsPng(
        svgRef.current,
        `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-layout.png`,
        2
      );
      showToast('PNG map exported successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export PNG', 'warning');
    }
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    try {
      exportSvgDirect(
        svgRef.current,
        `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-layout.svg`
      );
      showToast('SVG map exported successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export SVG', 'warning');
    }
  };

  const handleAddChannel = (channel: PlacedChannel) => {
    setChannels((prev) => [...prev, channel]);
  };

  const handleUpdateChannel = (updated: PlacedChannel) => {
    setChannels((prev) => prev.map((ch) => (ch.id === updated.id ? updated : ch)));
  };

  const handleDeleteChannel = (id: string) => {
    setChannels((prev) => prev.filter((ch) => ch.id !== id));
    if (selectedChannelId === id) {
      setSelectedChannelId(null);
    }
    showToast('Channel removed', 'info');
  };

  const handleDuplicateChannel = (channel: PlacedChannel) => {
    const cloned: PlacedChannel = {
      ...channel,
      id: `chan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      position: {
        x: channel.position.x + 1,
        y: channel.position.y + 1,
      },
    };
    setChannels((prev) => [...prev, cloned]);
    setSelectedChannelId(cloned.id);
    showToast('Channel duplicated', 'success');
  };

  const handleRotatePlacement = () => {
    setPlacementRotation((prev) => (((prev + 90) % 360) as Rotation));
  };

  const handleMirrorPlacement = () => {
    setPlacementRotation((prev) => (((360 - prev) % 360) as Rotation));
    setPlacementMirrored((prev) => !prev);
  };

  const handleMirrorChannel = (channel: PlacedChannel) => {
    const mirrored = mirrorPlacedChannel(channel, boardConfig);
    setChannels((prev) =>
      prev.map((ch) => (ch.id === channel.id ? mirrored : ch))
    );
    showToast('T-Channel mirrored (DX ↔ SX)', 'info');
  };

  const handleAddCategory = (newCategory: CustomCategory) => {
    setCategories((prev) => [...prev, newCategory]);
    setActiveCategory(newCategory.id as any);
    showToast(`Category "${newCategory.name}" created!`, 'success');
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (categories.length <= 1) return;
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    if (activeCategory === categoryId) {
      const fallback = categories.find((c) => c.id !== categoryId);
      if (fallback) setActiveCategory(fallback.id as any);
    }
    if (placementCategory === categoryId) {
      setPlacementCategory(null);
    }
    showToast('Category removed', 'info');
  };

  const handleUpdateCategory = (updated: CustomCategory) => {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    showToast(`Category "${updated.name}" updated!`, 'success');
  };

  const handleAddAccessory = (newAcc: CustomAccessoryDefinition) => {
    setCustomAccessories((prev) => [...prev, newAcc]);
    setActiveAccessoryId(newAcc.id);
    setActiveTool('accessory');
    showToast(`Accessory "${newAcc.name}" created (${newAcc.widthMU}×${newAcc.heightMU} MU)!`, 'success');
  };

  const handleDeleteAccessory = (accId: string) => {
    setCustomAccessories((prev) => prev.filter((a) => a.id !== accId));
    if (activeAccessoryId === accId) {
      const remaining = customAccessories.filter((a) => a.id !== accId);
      setActiveAccessoryId(remaining.length > 0 ? remaining[0].id : null);
      if (remaining.length === 0 && activeTool === 'accessory') {
        setActiveTool('select');
      }
    }
    showToast('Accessory removed', 'info');
  };

  const handleUpdateAccessory = (updated: CustomAccessoryDefinition) => {
    setCustomAccessories((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    showToast(`Accessory "${updated.name}" updated`, 'success');
  };

  const handleFitToScreen = () => {
    const fit = fitBoardToViewport(boardConfig, window.innerWidth, window.innerHeight);
    setZoom(fit.zoom);
    setPan(fit.pan);
  };


  return (
    <div className="relative w-screen h-screen h-[100dvh] overflow-hidden bg-[#0E0F12] font-sans">
      {/* Smartphone Breakpoint Fallback View (< 768px) */}
      <div className="underplan-mobile-screen w-full h-full overflow-hidden">
        <MobileFallback />
      </div>

      {/* Main Full-Screen CAD Desktop Workspace (>= 768px) */}
      <div className="underplan-desktop-workspace flex h-full w-full flex-col bg-[#0E0F12] text-slate-100 overflow-hidden select-none relative">
        {/* Top Navigation Bar (Hidden in Zen Mode) */}
      {!isZenMode && (
        <Header
          boardConfig={boardConfig}
          onUpdateConfig={handleUpdateConfig}
          onClearBoard={handleClearBoard}
          onExportCSV={handleExportCSV}
          onCopyBOM={handleCopyBOM}
          onExportPNG={handleExportPNG}
          onExportSVG={handleExportSVG}
          onToggleBOMDrawer={() => setIsBOMOpen(true)}
          channelCount={channels.length}
          snapCount={bom.summary.totalMounts}
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={(catId) => {
            setActiveCategory(catId as any);
            setPlacementCategory(catId as any);
          }}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onUpdateCategory={handleUpdateCategory}
          projectTitle={projectTitle}
          onUpdateTitle={setProjectTitle}
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          onDuplicateProject={handleDuplicateProject}
        />
      )}

      {/* Main Full-Screen CAD Canvas */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <Canvas
          boardConfig={boardConfig}
          channels={channels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={(id) => {
            setSelectedChannelId(id);
            if (id) {
              setActiveTool('select');
              setPlacementCategory(null);
            }
          }}
          onUpdateChannel={handleUpdateChannel}
          onDeleteChannel={handleDeleteChannel}
          onAddChannel={handleAddChannel}
          activeTool={activeTool}
          onResetTool={() => {
            setActiveTool('select');
            setPlacementCategory(null);
          }}
          activeCategory={activeCategory}
          placementCategory={placementCategory}
          placementRotation={placementRotation}
          placementMirrored={placementMirrored}
          onRotatePlacement={handleRotatePlacement}
          straightLength={straightLength}
          channelWidthUnits={channelWidthUnits}
          placementMountingType={placementMountingType}
          categories={categories}
          isEditingMounts={isEditingMounts}
          onToggleMountEdit={() => setIsEditingMounts((prev) => !prev)}
          curvedRadius={curvedRadius}
          armSpanUnits={armSpanUnits}
          trunkSpanUnits={trunkSpanUnits}
          branchSpanUnits={branchSpanUnits}
          mitreArmA={mitreArmA}
          mitreArmB={mitreArmB}
          offsetUnits={offsetUnits}
          yTrunkUnits={yTrunkUnits}
          yBranchUnits={yBranchUnits}
          customAccessories={customAccessories}
          activeAccessoryId={activeAccessoryId}
          svgRefProp={svgRef}
          zoom={zoom}
          onZoomChange={setZoom}
          pan={pan}
          onPanChange={setPan}
        />

        {/* Floating Right Inspector Panel (Opens when a channel is selected or when a channel tool is clicked) */}
        {!isZenMode && (
          <InspectorPanel
            boardConfig={boardConfig}
            channels={channels}
            selectedChannelId={selectedChannelId}
            categories={categories}
            onUpdateChannel={handleUpdateChannel}
            onDeleteChannel={handleDeleteChannel}
            onDuplicateChannel={handleDuplicateChannel}
            onClose={() => {
              setSelectedChannelId(null);
              if (activeTool !== 'measure') setActiveTool('select');
            }}
            isEditingMounts={isEditingMounts}
            onToggleMountEdit={() => setIsEditingMounts((prev) => !prev)}
            activeTool={activeTool}
            straightLength={straightLength}
            onSetStraightLength={setStraightLength}
            channelWidthUnits={channelWidthUnits}
            onSetChannelWidthUnits={setChannelWidthUnits}
            activeCategory={activeCategory}
            placementCategory={placementCategory}
            onSetPlacementCategory={(catId) => setPlacementCategory(catId as any)}
            placementMountingType={placementMountingType}
            onSetPlacementMountingType={setPlacementMountingType}
            armSpanUnits={armSpanUnits}
            onSetArmSpanUnits={setArmSpanUnits}
            curvedRadius={curvedRadius}
            onSetCurvedRadius={setCurvedRadius}
            trunkSpanUnits={trunkSpanUnits}
            onSetTrunkSpanUnits={setTrunkSpanUnits}
            branchSpanUnits={branchSpanUnits}
            onSetBranchSpanUnits={setBranchSpanUnits}
            yTrunkUnits={yTrunkUnits}
            onSetYTrunkUnits={setYTrunkUnits}
            yBranchUnits={yBranchUnits}
            onSetYBranchUnits={setYBranchUnits}
            onMirrorChannel={handleMirrorChannel}
            onMirrorPlacement={handleMirrorPlacement}
          />
        )}

        {/* Bottom Tool Dock & Zoom Controls (Hidden in Zen Mode) */}
        {!isZenMode && (
          <ToolPalette
            platform={boardConfig.platform}
            activeTool={activeTool}
            onSelectTool={(tool) => {
              setActiveTool(tool);
              setIsEditingMounts(false);
              setPlacementCategory(null);
              setPlacementMirrored(false);
              if (tool !== 'select') {
                setSelectedChannelId(null);
              }
            }}
            activeCategory={activeCategory}
            onSelectCategory={(catId) => {
              setActiveCategory(catId as any);
              setPlacementCategory(catId as any);
            }}
            categories={categories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onUpdateCategory={handleUpdateCategory}
            straightLength={straightLength}
            onSetStraightLength={setStraightLength}
            placementRotation={placementRotation}
            onRotatePlacement={handleRotatePlacement}
            curvedRadius={curvedRadius}
            onSetCurvedRadius={setCurvedRadius}
            mitreArmA={mitreArmA}
            onSetMitreArmA={setMitreArmA}
            mitreArmB={mitreArmB}
            onSetMitreArmB={setMitreArmB}
            offsetUnits={offsetUnits}
            onSetOffsetUnits={setOffsetUnits}
            yTrunkUnits={yTrunkUnits}
            onSetYTrunkUnits={setYTrunkUnits}
            yBranchUnits={yBranchUnits}
            onSetYBranchUnits={setYBranchUnits}
            customAccessories={customAccessories}
            activeAccessoryId={activeAccessoryId}
            onSelectAccessory={setActiveAccessoryId}
            onAddAccessory={handleAddAccessory}
            onDeleteAccessory={handleDeleteAccessory}
            onUpdateAccessory={handleUpdateAccessory}
            channelCount={channels.length}
            onClearBoard={handleClearBoard}
            zoom={zoom}
            onZoomIn={() => setZoom((z) => Math.min(3.0, z * 1.15))}
            onZoomOut={() => setZoom((z) => Math.max(0.2, z / 1.15))}
            onResetZoom={() => setZoom(1.0)}
            onFitToScreen={handleFitToScreen}
          />
        )}
      </div>

      {/* Slide-out Full Bill of Materials Drawer */}
      <BOMDrawer
        isOpen={isBOMOpen}
        onClose={() => setIsBOMOpen(false)}
        bom={bom}
        categories={categories}
        projectTitle={projectTitle}
        onShowToast={showToast}
      />
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
