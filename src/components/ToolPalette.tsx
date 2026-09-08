import React, { useState } from 'react';
import {
  MousePointer,
  Ruler,
  RotateCw,
  Plus,
  Trash2,
  Check,
  Edit2,
  X
} from 'lucide-react';
import { ChannelCategory, ChannelKind, CustomCategory, Rotation, CustomAccessoryDefinition } from '../lib/types';

export type ToolType =
  | 'select'
  | 'measure'
  | 'straight'
  | 'corner'
  | 'junction'
  | 'cross'
  | 'curved'
  | 'y_split'
  | 'diagonal'
  | 'mitred'
  | 'spool'
  | 'socket_holder'
  | 'accessory';

interface ToolPaletteProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  activeCategory: ChannelCategory;
  onSelectCategory: (categoryId: ChannelCategory) => void;
  categories: CustomCategory[];
  onAddCategory: (category: CustomCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
  onUpdateCategory?: (category: CustomCategory) => void;
  straightLength: number;
  onSetStraightLength: (length: number) => void;
  placementRotation: Rotation;
  onRotatePlacement: () => void;
  // Parametric props for official Underware 2.0 parts
  curvedRadius?: number;
  onSetCurvedRadius?: (r: number) => void;
  mitreArmA?: number;
  onSetMitreArmA?: (a: number) => void;
  mitreArmB?: number;
  onSetMitreArmB?: (b: number) => void;
  offsetUnits?: number;
  onSetOffsetUnits?: (o: number) => void;
  yTrunkUnits?: number;
  onSetYTrunkUnits?: (t: number) => void;
  yBranchUnits?: number;
  onSetYBranchUnits?: (b: number) => void;
  // Custom Modular Accessories
  customAccessories?: CustomAccessoryDefinition[];
  activeAccessoryId?: string | null;
  onSelectAccessory?: (id: string) => void;
  onAddAccessory?: (acc: CustomAccessoryDefinition) => void;
  onDeleteAccessory?: (id: string) => void;
}

const PRESET_COLORS = [
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#EAB308', // Yellow
  '#94A3B8', // Slate
];

export const ToolPalette: React.FC<ToolPaletteProps> = ({
  activeTool,
  onSelectTool,
  activeCategory,
  onSelectCategory,
  categories,
  onAddCategory,
  onDeleteCategory,
  onUpdateCategory,
  straightLength,
  onSetStraightLength,
  placementRotation,
  onRotatePlacement,
  curvedRadius = 2,
  onSetCurvedRadius,
  mitreArmA = 2,
  onSetMitreArmA,
  mitreArmB = 2,
  onSetMitreArmB,
  offsetUnits = 1,
  onSetOffsetUnits,
  yTrunkUnits = 2,
  onSetYTrunkUnits,
  yBranchUnits = 2,
  onSetYBranchUnits,
  customAccessories = [],
  activeAccessoryId,
  onSelectAccessory,
  onAddAccessory,
  onDeleteAccessory,
}) => {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);

  // Category Editing State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatColor, setEditingCatColor] = useState(PRESET_COLORS[0]);

  const handleStartEditCat = (cat: CustomCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatColor(cat.color);
  };

  const handleSaveEditCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCatId || !editingCatName.trim()) return;
    if (onUpdateCategory) {
      onUpdateCategory({
        id: editingCatId,
        name: editingCatName.trim(),
        color: editingCatColor,
      });
    }
    setEditingCatId(null);
  };

  // Modular Custom Accessory Creation State
  const [isAddingAccessory, setIsAddingAccessory] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccWidth, setNewAccWidth] = useState(6);
  const [newAccHeight, setNewAccHeight] = useState(3);

  const activeCategoryObj = categories.find((c) => c.id === activeCategory) || categories[0] || {
    id: 'default',
    name: 'Standard',
    color: '#F59E0B',
  };

  const handleCreateAccessory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAccName.trim();
    if (!trimmed) return;
    const newAcc: CustomAccessoryDefinition = {
      id: `acc-${Date.now()}`,
      name: trimmed,
      widthMU: Math.max(1, Math.min(16, Number(newAccWidth) || 1)),
      heightMU: Math.max(1, Math.min(16, Number(newAccHeight) || 1)),
    };
    if (onAddAccessory) {
      onAddAccessory(newAcc);
    }
    setNewAccName('');
    setIsAddingAccessory(false);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    const id = `cat-${Date.now()}`;
    onAddCategory({
      id,
      name: trimmed,
      color: newCategoryColor,
    });
    onSelectCategory(id);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const libraryItems: {
    tool: ToolType;
    kind: ChannelKind;
    title: string;
    sizeLabel: string;
    hotkey: string;
  }[] = [
    {
      tool: 'straight',
      kind: 'straight',
      title: 'Straight Channel',
      sizeLabel: `${straightLength} MU (${straightLength * 25} mm)`,
      hotkey: 'S',
    },
    {
      tool: 'corner',
      kind: 'corner',
      title: '90° Corner (Elbow)',
      sizeLabel: '2×2 MU (50×50 mm)',
      hotkey: 'L',
    },
    {
      tool: 'curved',
      kind: 'curved',
      title: 'Radial Curved (R)',
      sizeLabel: `R${curvedRadius} MU (${curvedRadius * 25} mm)`,
      hotkey: 'C',
    },
    {
      tool: 'junction',
      kind: 'junction',
      title: 'T-Junction (3-Way)',
      sizeLabel: '3×2 MU (75×50 mm)',
      hotkey: 'T',
    },
    {
      tool: 'y_split',
      kind: 'y_split',
      title: 'Y-Split (Fork)',
      sizeLabel: `${yTrunkUnits}×${yBranchUnits} MU`,
      hotkey: 'Y',
    },
    {
      tool: 'cross',
      kind: 'cross',
      title: '4-Way Cross',
      sizeLabel: '3×3 MU (75×75 mm)',
      hotkey: 'X',
    },
    {
      tool: 'diagonal',
      kind: 'diagonal',
      title: 'Diagonal Channel (Jog)',
      sizeLabel: `3×${offsetUnits} MU (${3 * 25} mm)`,
      hotkey: 'D',
    },
    {
      tool: 'mitred',
      kind: 'mitred',
      title: 'Mitered Corner (Square)',
      sizeLabel: `${mitreArmA}×${mitreArmB} MU (${mitreArmA * 25}×${mitreArmB * 25} mm)`,
      hotkey: 'Q',
    },
  ];


  return (
    <aside className="w-64 border-r border-graphite-600 bg-graphite-850 flex flex-col shrink-0 select-none overflow-y-auto">
      {/* 1. Tool Selection */}
      <div className="p-3 border-b border-graphite-600 space-y-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Tools
          </span>
          <span className="text-[10px] font-mono text-slate-500">[V / M]</span>
        </div>

        <button
          onClick={() => onSelectTool('select')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-xs font-medium transition-all ${
            activeTool === 'select'
              ? 'bg-brand-primary/15 border-brand-primary text-brand-accent shadow-sm'
              : 'bg-graphite-900 border-graphite-700 text-slate-300 hover:bg-graphite-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <MousePointer className="h-4 w-4" />
            <span>Select & Move</span>
          </div>
          <span className="text-[10px] font-mono bg-graphite-800 px-1.5 py-0.5 rounded border border-graphite-700 text-slate-400">
            V
          </span>
        </button>

        <button
          onClick={() => onSelectTool('measure')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-xs font-medium transition-all ${
            activeTool === 'measure'
              ? 'bg-brand-primary/15 border-brand-primary text-brand-accent shadow-sm'
              : 'bg-graphite-900 border-graphite-700 text-slate-300 hover:bg-graphite-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-brand-accent" />
            <span>Measure & Route Channel</span>
          </div>
          <span className="text-[10px] font-mono bg-graphite-800 px-1.5 py-0.5 rounded border border-graphite-700 text-slate-400">
            M
          </span>
        </button>
      </div>

      {/* 2. Channel Library */}
      <div className="p-3 border-b border-graphite-600">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Underware Channels
          </span>
        </div>

        <div className="space-y-1.5">
          {libraryItems.map((item) => {
            const isSelected = activeTool === item.tool;
            const currentCatColor = activeCategoryObj.color;

            return (
              <div key={item.tool}>
                <button
                  onClick={() => onSelectTool(item.tool)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/10 text-white shadow-sm ring-1 ring-brand-primary/30'
                      : 'border-graphite-700 bg-graphite-900/90 text-slate-300 hover:border-graphite-600 hover:bg-graphite-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center border shrink-0"
                        style={{
                          borderColor: isSelected ? currentCatColor : '#3E4250',
                          color: currentCatColor,
                        }}
                      >
                        {item.kind === 'straight' && (
                          <div className="w-3.5 h-1.5 rounded-sm border" style={{ borderColor: currentCatColor }} />
                        )}
                        {item.kind === 'corner' && <span className="text-xs font-bold leading-none">⌞</span>}
                        {item.kind === 'curved' && <span className="text-xs font-bold leading-none">◜</span>}
                        {item.kind === 'junction' && <span className="text-xs font-bold leading-none">⊤</span>}
                        {item.kind === 'y_split' && <span className="text-xs font-bold leading-none">⑂</span>}
                        {item.kind === 'cross' && <span className="text-xs font-bold leading-none">+</span>}
                        {item.kind === 'diagonal' && <span className="text-xs font-bold leading-none">⟋</span>}
                        {item.kind === 'mitred' && <span className="text-xs font-bold leading-none">◺</span>}
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-100">
                          {item.title}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {item.sizeLabel}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono bg-graphite-800 px-1 py-0.5 rounded border border-graphite-700 text-slate-400">
                      {item.hotkey}
                    </span>
                  </div>
                </button>

                {/* Pre-placement Length Customization for Straight Channel */}
                {item.tool === 'straight' && isSelected && (
                  <div className="mt-1.5 p-2 bg-graphite-900 border border-brand-primary/40 rounded-md space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                      <span>Channel Length:</span>
                      <span className="font-mono text-brand-accent font-bold">
                        {straightLength} MU ({straightLength * 25} mm)
                      </span>
                    </div>

                    {/* Stepper + Presets */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSetStraightLength(Math.max(1, straightLength - 1))}
                        disabled={straightLength <= 1}
                        className="h-6 w-6 rounded bg-graphite-800 text-slate-200 hover:bg-graphite-700 disabled:opacity-30 font-bold text-xs"
                      >
                        -
                      </button>
                      <div className="flex-1 grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((len) => (
                          <button
                            key={len}
                            onClick={() => onSetStraightLength(len)}
                            className={`py-0.5 text-center font-mono text-[10px] rounded transition-all ${
                              straightLength === len
                                ? 'bg-brand-primary text-white font-bold shadow'
                                : 'bg-graphite-800 text-slate-400 hover:text-white hover:bg-graphite-700'
                            }`}
                          >
                            {len}U
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => onSetStraightLength(Math.min(16, straightLength + 1))}
                        disabled={straightLength >= 16}
                        className="h-6 w-6 rounded bg-graphite-800 text-slate-200 hover:bg-graphite-700 disabled:opacity-30 font-bold text-xs"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-400 flex justify-between pt-0.5">
                      <span>Snaps: {straightLength <= 2 ? 2 : straightLength <= 3 ? 2 : Math.min(straightLength, 2 + Math.floor((straightLength - 2) / 2))}</span>
                      <span>1 MU = 25 mm</span>
                    </div>
                  </div>
                )}

                {/* Pre-placement Radius Customization for Curved Channel */}
                {item.tool === 'curved' && isSelected && (
                  <div className="mt-1.5 p-2 bg-graphite-900 border border-brand-primary/40 rounded-md space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                      <span>Bending Radius:</span>
                      <span className="font-mono text-brand-accent font-bold">
                        R{curvedRadius} MU ({curvedRadius * 25} mm)
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          onClick={() => onSetCurvedRadius && onSetCurvedRadius(r)}
                          className={`py-1 text-center font-mono text-xs rounded transition-all ${
                            curvedRadius === r
                              ? 'bg-brand-primary text-white font-bold shadow'
                              : 'bg-graphite-800 text-slate-400 hover:text-white hover:bg-graphite-700'
                          }`}
                        >
                          R{r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pre-placement Customization for Y-Split */}
                {item.tool === 'y_split' && isSelected && (
                  <div className="mt-1.5 p-2 bg-graphite-900 border border-brand-primary/40 rounded-md space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                      <span>Trunk: {yTrunkUnits} MU · Branch: {yBranchUnits} MU</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { t: 2, b: 2, label: '2×2 MU' },
                        { t: 3, b: 2, label: '3×2 MU' },
                        { t: 4, b: 2, label: '4×2 MU' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            if (onSetYTrunkUnits) onSetYTrunkUnits(preset.t);
                            if (onSetYBranchUnits) onSetYBranchUnits(preset.b);
                          }}
                          className={`py-1 text-center font-mono text-[10px] rounded transition-all ${
                            yTrunkUnits === preset.t && yBranchUnits === preset.b
                              ? 'bg-brand-primary text-white font-bold shadow'
                              : 'bg-graphite-800 text-slate-400 hover:text-white hover:bg-graphite-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pre-placement Offset Customization for Diagonal Jog */}
                {item.tool === 'diagonal' && isSelected && (
                  <div className="mt-1.5 p-2 bg-graphite-900 border border-brand-primary/40 rounded-md space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                      <span>Lateral Offset (Jog):</span>
                      <span className="font-mono text-brand-accent font-bold">
                        +{offsetUnits} MU ({offsetUnits * 25} mm)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[1, 2, 3].map((o) => (
                        <button
                          key={o}
                          onClick={() => onSetOffsetUnits && onSetOffsetUnits(o)}
                          className={`py-1 text-center font-mono text-xs rounded transition-all ${
                            offsetUnits === o
                              ? 'bg-brand-primary text-white font-bold shadow'
                              : 'bg-graphite-800 text-slate-400 hover:text-white hover:bg-graphite-700'
                          }`}
                        >
                          +{o} MU
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pre-placement Arm Customization for Mitred Corner */}
                {item.tool === 'mitred' && isSelected && (
                  <div className="mt-1.5 p-2 bg-graphite-900 border border-brand-primary/40 rounded-md space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                      <span>Mitered Arms:</span>
                      <span className="font-mono text-brand-accent font-bold">
                        {mitreArmA}×{mitreArmB} MU
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[2, 3, 4, 6].map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            if (onSetMitreArmA) onSetMitreArmA(s);
                            if (onSetMitreArmB) onSetMitreArmB(s);
                          }}
                          className={`py-1 text-center font-mono text-xs rounded transition-all ${
                            mitreArmA === s && mitreArmB === s
                              ? 'bg-brand-primary text-white font-bold shadow'
                              : 'bg-graphite-800 text-slate-400 hover:text-white hover:bg-graphite-700'
                          }`}
                        >
                          {s}×{s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Accessori & Supporti Modulari */}
      <div className="p-3 border-b border-graphite-600">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Custom Accessories
          </span>
          <button
            onClick={() => setIsAddingAccessory(!isAddingAccessory)}
            className="flex items-center gap-1 text-[11px] text-brand-accent hover:text-white bg-graphite-800 hover:bg-graphite-700 px-2 py-0.5 rounded border border-graphite-600 transition-colors"
            title="Add custom accessory (e.g. Tessan Socket 6x3)"
          >
            <Plus className="h-3 w-3" />
            <span>New</span>
          </button>
        </div>

        {/* Modal / Inline form for creating new accessory */}
        {isAddingAccessory && (
          <form onSubmit={handleCreateAccessory} className="mb-2.5 p-2.5 bg-graphite-900 border border-brand-primary/50 rounded-lg space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-white">New Accessory (MU)</div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Name / Label</label>
              <input
                type="text"
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                placeholder="e.g. Tessan Socket"
                className="w-full px-2 py-1 bg-graphite-800 border border-graphite-700 rounded text-xs text-white focus:outline-none focus:border-brand-primary"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Width (W)</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={newAccWidth}
                    onChange={(e) => setNewAccWidth(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 bg-graphite-800 border border-graphite-700 rounded text-xs text-white focus:outline-none focus:border-brand-primary font-mono"
                  />
                  <span className="text-[10px] text-slate-500 ml-1">MU</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Height (H)</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={newAccHeight}
                    onChange={(e) => setNewAccHeight(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 bg-graphite-800 border border-graphite-700 rounded text-xs text-white focus:outline-none focus:border-brand-primary font-mono"
                  />
                  <span className="text-[10px] text-slate-500 ml-1">MU</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-brand-accent">
              Dimensions: {newAccWidth}×{newAccHeight} MU (4 corner snaps)
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="submit"
                disabled={!newAccName.trim()}
                className="flex-1 py-1 rounded bg-brand-primary text-white font-semibold hover:bg-brand-hover disabled:opacity-40 transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsAddingAccessory(false)}
                className="px-2 py-1 rounded bg-graphite-800 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* List of Custom Accessories */}
        <div className="space-y-1.5">
          {customAccessories.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic p-2 text-center bg-graphite-900/50 rounded border border-graphite-800">
              No accessories. Click <strong>+ New</strong> to create one (e.g. Tessan Socket 6×3).
            </div>
          ) : (
            customAccessories.map((acc) => {
              const isSelected = activeTool === 'accessory' && activeAccessoryId === acc.id;
              const currentCatColor = activeCategoryObj.color;

              return (
                <div key={acc.id} className="group relative flex items-center">
                  <button
                    onClick={() => {
                      onSelectTool('accessory');
                      if (onSelectAccessory) onSelectAccessory(acc.id);
                    }}
                    className={`flex-1 text-left p-2.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary/10 text-white shadow-sm ring-1 ring-brand-primary/30'
                        : 'border-graphite-700 bg-graphite-900/90 text-slate-300 hover:border-graphite-600 hover:bg-graphite-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center border shrink-0 font-mono text-[10px] font-bold"
                          style={{
                            borderColor: isSelected ? currentCatColor : '#3E4250',
                            color: currentCatColor,
                          }}
                        >
                          ⚏
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-100">
                            {acc.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {acc.widthMU}×{acc.heightMU} MU
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Delete custom accessory button */}
                  {onDeleteAccessory && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAccessory(acc.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 ml-1 text-slate-500 hover:text-red-400 hover:bg-graphite-800 rounded transition-all"
                      title="Delete accessory"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Placement Angle Control */}
      {activeTool !== 'select' && (
        <div className="px-3 py-2 border-b border-graphite-600 bg-brand-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-brand-accent font-medium">
            <RotateCw className="h-3.5 w-3.5" />
            <span>Rotation:</span>
            <span className="font-mono font-bold text-white ml-0.5">
              {placementRotation}°
            </span>
          </div>

          <button
            onClick={onRotatePlacement}
            className="flex items-center gap-1 px-2 py-1 rounded bg-graphite-800 text-[11px] font-medium text-slate-200 border border-graphite-600 hover:bg-graphite-700 transition-colors"
            title="Rotate 90° clockwise (Key: R)"
          >
            <span>Rotate</span>
            <span className="font-mono text-[9px] text-slate-400 bg-graphite-900 px-1 rounded">
              R
            </span>
          </button>
        </div>
      )}

      {/* 4. Customizable Categories */}
      <div className="p-3 flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Categories
          </span>

          <button
            onClick={() => setIsAddingCategory(!isAddingCategory)}
            className="flex items-center gap-1 text-[10px] font-medium text-brand-accent hover:underline"
          >
            <Plus className="h-3 w-3" />
            <span>New</span>
          </button>
        </div>

        {/* Add Category Mini Form */}
        {isAddingCategory && (
          <form onSubmit={handleCreateCategory} className="mb-2.5 p-2 rounded bg-graphite-900 border border-graphite-700 space-y-2">
            <input
              type="text"
              placeholder="Category name (e.g. Power)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              autoFocus
              className="w-full h-6 rounded bg-graphite-950 border border-graphite-700 px-2 text-xs text-white outline-none focus:border-brand-primary"
            />

            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setNewCategoryColor(c)}
                    className={`w-4 h-4 rounded-full transition-transform ${newCategoryColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-4 h-4 rounded cursor-pointer bg-transparent border-0"
                  title="Custom color"
                />
              </div>

              <button
                type="submit"
                disabled={!newCategoryName.trim()}
                className="px-2 py-0.5 text-xs font-semibold rounded bg-brand-primary text-white disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Categories List */}
        <div className="space-y-1">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id;
            const isEditing = editingCatId === cat.id;

            if (isEditing) {
              return (
                <form
                  key={`edit-${cat.id}`}
                  onSubmit={handleSaveEditCat}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded bg-graphite-900 border border-brand-primary/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-300 uppercase">
                      Edit Category
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingCatId(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={editingCatName}
                    onChange={(e) => setEditingCatName(e.target.value)}
                    autoFocus
                    className="w-full h-6 rounded bg-graphite-950 border border-graphite-700 px-2 text-xs text-white outline-none focus:border-brand-primary"
                  />

                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setEditingCatColor(c)}
                          className={`w-4 h-4 rounded-full transition-transform ${editingCatColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={editingCatColor}
                        onChange={(e) => setEditingCatColor(e.target.value)}
                        className="w-4 h-4 rounded cursor-pointer bg-transparent border-0"
                        title="Custom color"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        className="px-2 py-0.5 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!editingCatName.trim()}
                        className="px-2 py-0.5 text-xs font-semibold rounded bg-brand-primary text-white disabled:opacity-40"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer border text-xs transition-all ${
                  isSelected
                    ? 'border-opacity-60 text-white font-medium shadow-sm'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-graphite-800'
                }`}
                style={{
                  backgroundColor: isSelected ? `${cat.color}15` : 'transparent',
                  borderColor: isSelected ? cat.color : 'transparent',
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-1">
                  {isSelected && <Check className="h-3 w-3 text-slate-200" />}
                  <button
                    type="button"
                    onClick={(e) => handleStartEditCat(cat, e)}
                    className="p-0.5 text-slate-500 hover:text-brand-accent transition-colors"
                    title="Edit category name and color"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  {categories.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCategory(cat.id);
                      }}
                      className="p-0.5 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
