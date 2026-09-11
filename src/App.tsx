import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  BoardConfig,
  PlacedChannel,
  ChannelCategory,
  Rotation,
  BoardState,
  CustomCategory,
  CustomAccessoryDefinition,
} from './lib/types';
import { DEFAULT_BOARD_CONFIG, generateTileMatrix, fitBoardToViewport } from './lib/geometry';
import { generateBOM, formatBOMAsCSV, formatBOMAsMarkdown } from './lib/bom';
import { exportSvgAsPng, exportSvgDirect } from './lib/exportMap';

import { Header } from './components/Header';
import { ToolPalette, ToolType } from './components/ToolPalette';
import { Canvas } from './components/Canvas';
import { InspectorPanel } from './components/InspectorPanel';
import { BOMDrawer } from './components/BOMDrawer';
import { Toast } from './components/Toast';

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
      { id: 'acc-loop-max', name: 'Cable Loop Max', widthMU: 6, heightMU: 3 },
    ];
  });
  const [activeAccessoryId, setActiveAccessoryId] = useState<string | null>('acc-loop');

  // Interaction tools & placement state
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeCategory, setActiveCategory] = useState<ChannelCategory>('hdmi');
  const [straightLength, setStraightLength] = useState<number>(3);
  const [placementRotation, setPlacementRotation] = useState<Rotation>(0);

  // Parametric state for Underware 2.0 parts
  const [curvedRadius, setCurvedRadius] = useState<number>(2);
  const [mitreArmA, setMitreArmA] = useState<number>(2);
  const [mitreArmB, setMitreArmB] = useState<number>(2);
  const [offsetUnits, setOffsetUnits] = useState<number>(1);
  const [yTrunkUnits, setYTrunkUnits] = useState<number>(2);
  const [yBranchUnits, setYBranchUnits] = useState<number>(2);

  // Pan & Zoom state synchronized across Canvas and Dock
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 90, y: 80 });

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

      // Deselect on Escape
      if (e.key === 'Escape') {
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

      // Rotate selected channel or placement
      if (key === 'r') {
        e.preventDefault();
        if (selectedChannelId) {
          setChannels((prev) =>
            prev.map((ch) => {
              if (ch.id === selectedChannelId) {
                const nextRot = (((ch.rotation + 90) % 360) as Rotation);
                return { ...ch, rotation: nextRot };
              }
              return ch;
            })
          );
          showToast('Channel rotated 90°', 'info');
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
          setChannels((prev) => [...prev, cloned]);
          setSelectedChannelId(cloned.id);
          showToast('Channel duplicated', 'success');
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

  const handleUpdateConfig = (newConfig: Partial<BoardConfig>) => {
    setBoardConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      const totalTiles = updated.cols * updated.rows;
      showToast(
        `Surface updated: ${totalTiles} tiles (${updated.cols * (updated.tileWidthHoles || 8) * 25}×${
          updated.rows * (updated.tileHeightHoles || 8) * 25
        }mm)`,
        'info'
      );
      return updated;
    });
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

  const handleFitToScreen = () => {
    const fit = fitBoardToViewport(boardConfig, window.innerWidth, window.innerHeight);
    setZoom(fit.zoom);
    setPan(fit.pan);
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-[#080A10] text-slate-100 overflow-hidden font-sans select-none relative">
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
          snapCount={bom.summary.totalSnapCountWithSpares}
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={(catId) => setActiveCategory(catId as any)}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          projectTitle={projectTitle}
          onUpdateTitle={setProjectTitle}
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
          svgRefProp={svgRef}
          zoom={zoom}
          onZoomChange={setZoom}
          pan={pan}
          onPanChange={setPan}
        />

        {/* Floating Right Inspector Panel (Opens when a channel is selected) */}
        {!isZenMode && (
          <InspectorPanel
            boardConfig={boardConfig}
            channels={channels}
            selectedChannelId={selectedChannelId}
            categories={categories}
            onUpdateChannel={handleUpdateChannel}
            onDeleteChannel={handleDeleteChannel}
            onDuplicateChannel={handleDuplicateChannel}
            onClose={() => setSelectedChannelId(null)}
            isEditingMounts={isEditingMounts}
            onToggleMountEdit={() => setIsEditingMounts((prev) => !prev)}
          />
        )}

        {/* Bottom Tool Dock & Zoom Controls (Hidden in Zen Mode) */}
        {!isZenMode && (
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
            onSelectCategory={(catId) => setActiveCategory(catId as any)}
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
        onShowToast={showToast}
      />

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
