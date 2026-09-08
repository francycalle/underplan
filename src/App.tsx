import { useState, useMemo, useCallback, useEffect } from 'react';
import { BoardConfig, PlacedChannel, ChannelCategory, Rotation, BoardState, CustomCategory, CustomAccessoryDefinition } from './lib/types';
import { DEFAULT_BOARD_CONFIG, generateTileMatrix } from './lib/geometry';
import { generateBOM, formatBOMAsCSV, formatBOMAsMarkdown } from './lib/bom';

import { Header } from './components/Header';
import { ToolPalette, ToolType } from './components/ToolPalette';
import { Canvas } from './components/Canvas';
import { InspectorPanel } from './components/InspectorPanel';
import { BOMDrawer } from './components/BOMDrawer';
import { Toast } from './components/Toast';

const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'power', name: 'Power', color: '#F59E0B' },
  { id: 'data', name: 'Data / USB', color: '#06B6D4' },
  { id: 'video', name: 'Video / DP', color: '#8B5CF6' },
  { id: 'network', name: 'Network', color: '#10B981' },
];

const STORAGE_KEY_CONFIG = 'underplan_board_config';
const STORAGE_KEY_CHANNELS = 'underplan_channels';
const STORAGE_KEY_CATEGORIES = 'underplan_categories';
const STORAGE_KEY_ACCESSORIES = 'underplan_accessories';

export default function App() {
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

  // Placed channels state - initialized EMPTY by default as requested, with localStorage persistence
  const [channels, setChannels] = useState<PlacedChannel[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHANNELS);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not restore channels from localStorage', e);
    }
    return []; // Empty initial state
  });
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

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
      { id: 'acc-tessan', name: 'Tessan Socket', widthMU: 6, heightMU: 3 },
    ];
  });
  const [activeAccessoryId, setActiveAccessoryId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACCESSORIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      }
    } catch {
      // fallback
    }
    return 'acc-tessan';
  });

  // Interaction tools & placement state
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeCategory, setActiveCategory] = useState<ChannelCategory>('power');
  const [straightLength, setStraightLength] = useState<number>(3);
  const [placementRotation, setPlacementRotation] = useState<Rotation>(0);

  // Parametric state for official Underware 2.0 parts
  const [curvedRadius, setCurvedRadius] = useState<number>(2);
  const [mitreArmA, setMitreArmA] = useState<number>(2);
  const [mitreArmB, setMitreArmB] = useState<number>(2);
  const [offsetUnits, setOffsetUnits] = useState<number>(1);
  const [yTrunkUnits, setYTrunkUnits] = useState<number>(2);
  const [yBranchUnits, setYBranchUnits] = useState<number>(2);

  // BOM Drawer and Toast state
  const [isBOMOpen, setIsBOMOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'warning' | 'info' } | null>(null);

  // Mount editing state (locked channel drag, clickable octagon targets)
  const [isEditingMounts, setIsEditingMounts] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  // Keyboard shortcuts for tools
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
      if (key === 'm') {
        e.preventDefault();
        setActiveTool('measure');
        setSelectedChannelId(null);
        setIsEditingMounts(false);
        showToast('Measure Tool active: click Point A and Point B', 'info');
      } else if (key === 'v') {
        e.preventDefault();
        setActiveTool('select');
      } else if (key === 's') {
        e.preventDefault();
        setActiveTool('straight');
        setSelectedChannelId(null);
      } else if (key === 'l') {
        e.preventDefault();
        setActiveTool('corner');
        setSelectedChannelId(null);
      } else if (key === 'c') {
        e.preventDefault();
        setActiveTool('curved');
        setSelectedChannelId(null);
      } else if (key === 't') {
        e.preventDefault();
        setActiveTool('junction');
        setSelectedChannelId(null);
      } else if (key === 'y') {
        e.preventDefault();
        setActiveTool('y_split');
        setSelectedChannelId(null);
      } else if (key === 'x') {
        e.preventDefault();
        setActiveTool('cross');
        setSelectedChannelId(null);
      } else if (key === 'd') {
        e.preventDefault();
        setActiveTool('diagonal');
        setSelectedChannelId(null);
      } else if (key === 'q') {
        e.preventDefault();
        setActiveTool('mitred');
        setSelectedChannelId(null);
      } else if (key === 'b') {
        e.preventDefault();
        setActiveTool('spool');
        setSelectedChannelId(null);
      } else if (key === 'h') {
        e.preventDefault();
        setActiveTool('socket_holder');
        setSelectedChannelId(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showToast]);

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

  // Auto-save changes to localStorage for continuous browser persistence
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACCESSORIES, JSON.stringify(customAccessories));
    } catch (e) {
      console.error('Failed to save customAccessories to localStorage', e);
    }
  }, [customAccessories]);

  const handleUpdateConfig = (newConfig: Partial<BoardConfig>) => {
    setBoardConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      const totalTiles = updated.cols * updated.rows;
      showToast(`Grid updated: ${totalTiles} modules ${updated.tileWidthHoles}×${updated.tileHeightHoles} (${updated.cols * updated.tileWidthHoles * 25}×${updated.rows * updated.tileHeightHoles * 25}mm)`, 'info');
      return updated;
    });
  };

  const handleClearBoard = () => {
    setChannels([]);
    setSelectedChannelId(null);
    setActiveTool('select');
    showToast('All channels cleared from desk (saved)', 'info');
  };

  const handleExportCSV = () => {
    const csv = formatBOMAsCSV(bom);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Underplan-BOM-${new Date().toISOString().slice(0, 10)}.csv`);
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

  const handleAddCategory = (newCategory: CustomCategory) => {
    setCategories((prev) => [...prev, newCategory]);
    showToast(`Category "${newCategory.name}" created!`, 'success');
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (categories.length <= 1) return;
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    if (activeCategory === categoryId) {
      const fallback = categories.find((c) => c.id !== categoryId);
      if (fallback) setActiveCategory(fallback.id);
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

  return (
    <div className="flex h-screen w-screen flex-col bg-graphite-900 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Navigation / App Header */}
      <Header
        boardConfig={boardConfig}
        onUpdateConfig={handleUpdateConfig}
        onClearBoard={handleClearBoard}
        onExportCSV={handleExportCSV}
        onCopyBOM={handleCopyBOM}
        onToggleBOMDrawer={() => setIsBOMOpen(true)}
        channelCount={channels.length}
      />

      {/* Main CAD Workspace Layout (Left Palette | Central Canvas | Right Inspector) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Tool / Channel Library Palette */}
        <ToolPalette
          activeTool={activeTool}
          onSelectTool={(tool) => {
            setActiveTool(tool);
            setIsEditingMounts(false);
            if (tool !== 'select') {
              setSelectedChannelId(null);
            }
          }}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
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
        />

        {/* Central SVG Top-View Planner Canvas */}
        <Canvas
          boardConfig={boardConfig}
          channels={channels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={(id) => {
            setSelectedChannelId(id);
            if (id) setActiveTool('select');
          }}
          onUpdateChannel={handleUpdateChannel}
          onDeleteChannel={handleDeleteChannel}
          onAddChannel={handleAddChannel}
          activeTool={activeTool}
          onResetTool={() => setActiveTool('select')}
          activeCategory={activeCategory}
          placementRotation={placementRotation}
          onRotatePlacement={handleRotatePlacement}
          straightLength={straightLength}
          categories={categories}
          isEditingMounts={isEditingMounts}
          onToggleMountEdit={() => setIsEditingMounts((prev) => !prev)}
          curvedRadius={curvedRadius}
          mitreArmA={mitreArmA}
          mitreArmB={mitreArmB}
          offsetUnits={offsetUnits}
          yTrunkUnits={yTrunkUnits}
          yBranchUnits={yBranchUnits}
          customAccessories={customAccessories}
          activeAccessoryId={activeAccessoryId}
        />

        {/* Right Inspector Panel */}
        <InspectorPanel
          boardConfig={boardConfig}
          channels={channels}
          selectedChannelId={selectedChannelId}
          categories={categories}
          onUpdateChannel={handleUpdateChannel}
          onDeleteChannel={handleDeleteChannel}
          onDuplicateChannel={handleDuplicateChannel}
          isEditingMounts={isEditingMounts}
          onToggleMountEdit={() => setIsEditingMounts((prev) => !prev)}
        />
      </div>

      {/* Slide-out Full Bill of Materials Drawer / Modal */}
      <BOMDrawer
        isOpen={isBOMOpen}
        onClose={() => setIsBOMOpen(false)}
        bom={bom}
        onShowToast={showToast}
      />

      {/* Tactile Feedback Toast Notifications */}
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
