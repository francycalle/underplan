import React, { useState, useRef, useEffect } from 'react';
import {
  ChannelCategory,
  CustomCategory,
  Rotation,
  CustomAccessoryDefinition,
  GridPlatform,
} from '../lib/types';
import { Trash2 } from 'lucide-react';
import { ChannelDropdown, MiniNewPopover, DockSelectorTrigger } from './ChannelDropdown';
import { ConfirmClearModal } from './ConfirmClearModal';

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
  platform?: GridPlatform;
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
  customAccessories?: CustomAccessoryDefinition[];
  activeAccessoryId?: string | null;
  onSelectAccessory?: (id: string) => void;
  onAddAccessory?: (acc: CustomAccessoryDefinition) => void;
  onDeleteAccessory?: (id: string) => void;
  onUpdateAccessory?: (acc: CustomAccessoryDefinition) => void;
  channelCount?: number;
  onClearBoard?: () => void;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onFitToScreen?: () => void;
}

export const ToolPalette: React.FC<ToolPaletteProps> = ({
  platform = 'multiboard',
  activeTool,
  onSelectTool,
  activeCategory,
  categories = [],
  customAccessories = [],
  activeAccessoryId,
  onSelectAccessory,
  onAddAccessory,
  onDeleteAccessory,
  onUpdateAccessory,
  channelCount = 0,
  onClearBoard,
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
}) => {
  // Custom dropdown & mini new accessory window states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMiniNewOpen, setIsMiniNewOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  // New accessory form state
  const [newName, setNewName] = useState('');
  const [newWidthMU, setNewWidthMU] = useState<number>(3);
  const [newHeightMU, setNewHeightMU] = useState<number>(3);
  const [newWidthInput, setNewWidthInput] = useState<string>('3');
  const [newHeightInput, setNewHeightInput] = useState<string>('3');

  // Inline edit accessory state (Name + Dimensions)
  const [editingAccId, setEditingAccId] = useState<string | null>(null);
  const [editingAccName, setEditingAccName] = useState('');
  const [editingAccWidth, setEditingAccWidth] = useState<number>(3);
  const [editingAccHeight, setEditingAccHeight] = useState<number>(3);
  const [editingAccWidthInput, setEditingAccWidthInput] = useState<string>('3');
  const [editingAccHeightInput, setEditingAccHeightInput] = useState<string>('3');

  // Refs for click outside
  const customSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customSectionRef.current && !customSectionRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setIsMiniNewOpen(false);
        setEditingAccId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine active category color dynamically
  const currentCategory = categories.find((c) => c.id === activeCategory) || categories[0];
  const categoryColor = currentCategory?.color || '#3B82F6';
  const unitName = platform === 'opengrid' ? 'OU' : 'MU';

  // Active custom accessory
  const activeAccessory =
    customAccessories.find((a) => a.id === activeAccessoryId) ||
    customAccessories[0] || { id: 'default', name: 'Cable Loop', widthMU: 3, heightMU: 3 };

  // Handle creating new accessory from compact non-invasive popover
  const handleCreateAccessory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    const id = `acc_${Date.now()}_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const newAcc: CustomAccessoryDefinition = {
      id,
      name: trimmed,
      widthMU: Math.max(1, Math.min(16, newWidthMU)),
      heightMU: Math.max(1, Math.min(16, newHeightMU)),
    };

    onAddAccessory?.(newAcc);
    onSelectAccessory?.(newAcc.id);
    onSelectTool('accessory');

    // Reset and close
    setNewName('');
    setNewWidthMU(3);
    setNewHeightMU(3);
    setNewWidthInput('3');
    setNewHeightInput('3');
    setIsMiniNewOpen(false);
  };

  // Handle saving inline edited accessory (name and dimensions)
  const handleSaveEdit = (acc: CustomAccessoryDefinition) => {
    const trimmed = editingAccName.trim();
    onUpdateAccessory?.({
      ...acc,
      name: trimmed || acc.name,
      widthMU: Math.max(1, Math.min(16, editingAccWidth)),
      heightMU: Math.max(1, Math.min(16, editingAccHeight)),
    });
    setEditingAccId(null);
  };

  // Exact 6 channel definitions matching Figma ToolBar.svg
  const REGULAR_CHANNELS: {
    type: ToolType;
    label: string;
    renderPath: (color: string) => React.ReactNode;
  }[] = [
    {
      type: 'straight',
      label: 'Straight Channel',
      renderPath: (color) => (
        <path
          d="M44.25 25.75V34.25H15.75V25.75H44.25Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ),
    },
    {
      type: 'corner',
      label: '90° Corner',
      renderPath: (color) => (
        <path
          d="M30 20V30H40V40H20V20H30Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ),
    },
    {
      type: 'curved',
      label: 'Curved Radial',
      renderPath: (color) => (
        <path
          d="M29.25 20.75V25C29.25 26.525 29.856 27.9871 30.935 29.0654C32.013 30.1438 33.475 30.75 35 30.75H39.25V39.25H35C31.221 39.25 27.596 37.7486 24.924 35.0762C22.251 32.4038 20.75 28.7793 20.75 25V20.75H29.25Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ),
    },
    {
      type: 'cross',
      label: '4-Way Cross',
      renderPath: (color) => (
        <path
          d="M34.885 15C35.077 15.0001 35.233 15.1562 35.233 15.3486V24.7676H44.653C44.701 24.7676 44.747 24.7772 44.789 24.7949C44.914 24.848 45.002 24.9721 45.002 25.1162V34.8838C45.002 34.956 44.98 35.0234 44.942 35.0791C44.88 35.1716 44.773 35.2323 44.653 35.2324H35.234V44.6514C35.234 44.8438 35.078 44.9996 34.886 45H25.117C24.925 44.9999 24.769 44.844 24.769 44.6514V35.2324H15.349C15.252 35.2323 15.166 35.193 15.103 35.1299C15.055 35.0826 15.021 35.0221 15.007 34.9541C15.002 34.9314 15 34.9079 15 34.8838V25.1162C15 25.0439 15.022 24.9766 15.06 24.9209C15.085 24.8839 15.117 24.8522 15.154 24.8271C15.21 24.7897 15.277 24.7677 15.349 24.7676H24.768V15.3486C24.768 15.1564 24.924 15.0004 25.116 15H34.885Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ),
    },
    {
      type: 'junction',
      label: 'T-Junction',
      renderPath: (color) => (
        <path
          d="M25.75 39.25L25.75 29.25L15.75 29.25L15.75 20.75L44.25 20.75L44.25 29.25L34.25 29.25L34.25 39.25L25.75 39.25Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ),
    },
    {
      type: 'y_split',
      label: 'Y-Split',
      renderPath: (color) => (
        <path
          d="M25.75 32.1895L15.75 22.1895V15.75H24.25V22.8105L30 28.5605L35.75 22.8105V15.75H44.25V22.1895L34.25 32.1895V44.25H25.75V32.1895Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ),
    },
  ];

  return (
    <>
      {/* Bottom Center Tool Dock */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-end gap-[20px] select-none">
        {/* ============================================================ */}
        {/* 1. REGULAR CHANNELS: w=395px, h=70px, rx=20px, fill=#2A2D36 */}
        {/* ============================================================ */}
        <div className="flex flex-col gap-[7px]">
          {/* Header text: Figtree Black, flush with toolbar left edge */}
          <div className="flex items-center h-[18px] pl-0">
            <span className="font-['Figtree'] font-black text-[13.5px] text-white tracking-tight select-none leading-none">
              Regular Channels
            </span>
          </div>

          <div className="flex items-center w-[395px] h-[70px] p-[5px] rounded-[20px] bg-[#2A2D36] shadow-2xl gap-[5px]">
            {REGULAR_CHANNELS.map((ch) => {
              const isActive = activeTool === ch.type;
              return (
                <button
                  key={ch.type}
                  type="button"
                  onClick={() => onSelectTool(isActive ? 'select' : ch.type)}
                  className={`w-[60px] h-[60px] rounded-[15px] bg-[#15161A] flex items-center justify-center border-[2px] focus:outline-none focus:ring-0 outline-none ring-0 ${
                    isActive
                      ? ''
                      : 'border-[#15161A] hover:border-[#383C48]'
                  }`}
                  style={{
                    borderColor: isActive ? categoryColor : undefined,
                  }}
                  title={ch.label}
                >
                  <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                    {ch.renderPath(categoryColor)}
                  </svg>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. CUSTOM CHANNELS: DockSelectorTrigger (DRY)               */}
        {/* ============================================================ */}
        <div className="flex flex-col gap-[7px] relative" ref={customSectionRef}>
          <DockSelectorTrigger
            title="Custom Channels"
            plusTitle="Create new custom channel / accessory"
            onPlusClick={() => {
              setIsMiniNewOpen((prev) => {
                if (!prev) {
                  setNewWidthInput(String(newWidthMU));
                  setNewHeightInput(String(newHeightMU));
                }
                return !prev;
              });
              setIsDropdownOpen(false);
            }}
            name={activeAccessory.name}
            subtitle={`(${activeAccessory.widthMU}X${activeAccessory.heightMU} ${unitName})`}
            color={categoryColor}
            onCardClick={() => {
              if (activeTool === 'accessory') {
                onSelectTool('select');
              } else {
                onSelectAccessory?.(activeAccessory.id);
                onSelectTool('accessory');
              }
            }}
            isCardActive={activeTool === 'accessory'}
            activeBorderColor={categoryColor}
            cardTitle={`Place ${activeAccessory.name} (${activeAccessory.widthMU}×${activeAccessory.heightMU} ${unitName})`}
            isOpen={isDropdownOpen}
            direction="up"
            toggleTitle="Open Custom Channels list"
            onToggleOpen={() => {
              setIsDropdownOpen((prev) => !prev);
              setIsMiniNewOpen(false);
            }}
          />

          {/* Custom Channels Dropdown using shared ChannelDropdown */}
          <ChannelDropdown
            isOpen={isDropdownOpen}
            title="Custom Channels"
            items={customAccessories}
            selectedId={activeAccessoryId}
            direction="up"
            widthClassName="w-[205px]"
            onSelect={(acc) => {
              onSelectAccessory?.(acc.id);
              onSelectTool('accessory');
              setIsDropdownOpen(false);
            }}
            renderIcon={() => (
              <div className="w-[24px] h-[24px] shrink-0">
                <svg width="24" height="24" viewBox="0 0 28.5 28.5" fill="none">
                  <rect
                    x="0.75"
                    y="0.75"
                    width="27"
                    height="27"
                    rx="6"
                    fill={categoryColor}
                    fillOpacity={0.5}
                    stroke={categoryColor}
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            )}
            renderSubtitle={(acc) => (
              <span className="font-['Figtree'] font-bold text-[10px] text-white/50 leading-tight uppercase mt-0.5 truncate max-w-[95px]">
                ({acc.widthMU}X{acc.heightMU} {unitName})
              </span>
            )}
            editingId={editingAccId}
            onStartEdit={(acc) => {
              setEditingAccId(acc.id);
              setEditingAccName(acc.name);
              setEditingAccWidth(acc.widthMU);
              setEditingAccHeight(acc.heightMU);
              setEditingAccWidthInput(String(acc.widthMU));
              setEditingAccHeightInput(String(acc.heightMU));
            }}
            onCancelEdit={() => setEditingAccId(null)}
            onSaveEdit={handleSaveEdit}
            renderEditForm={() => (
              <>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-['Figtree'] font-bold text-[#929394] uppercase tracking-wider">
                    Name
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={editingAccName}
                    onChange={(e) => setEditingAccName(e.target.value)}
                    className="w-full px-2 py-1 rounded-[7px] bg-[#0E0F12] border border-[#2A2D36] text-xs font-['Figtree'] font-bold text-white focus:outline-none focus:border-[#4B5563]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {/* Width Stepper */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] font-['Figtree'] font-bold text-[#929394] uppercase">
                      Width ({unitName})
                    </label>
                    <div className="flex items-center justify-between h-[28px] px-1 rounded-[7px] bg-[#0E0F12] border border-[#2A2D36]">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(1, editingAccWidth - 1);
                          setEditingAccWidth(next);
                          setEditingAccWidthInput(String(next));
                        }}
                        className="w-5 h-5 rounded hover:bg-[#2A2D36] text-white font-black text-xs flex items-center justify-center active:scale-95 transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        value={editingAccWidthInput}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          setEditingAccWidthInput(e.target.value);
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setEditingAccWidth(Math.max(1, Math.min(16, val)));
                        }}
                        onBlur={() => {
                          const val = parseInt(editingAccWidthInput, 10);
                          if (isNaN(val) || val < 1) {
                            setEditingAccWidth(1);
                            setEditingAccWidthInput('1');
                          } else if (val > 16) {
                            setEditingAccWidth(16);
                            setEditingAccWidthInput('16');
                          } else {
                            setEditingAccWidth(val);
                            setEditingAccWidthInput(String(val));
                          }
                        }}
                        className="w-8 text-center bg-transparent font-['Figtree'] font-black text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.min(16, editingAccWidth + 1);
                          setEditingAccWidth(next);
                          setEditingAccWidthInput(String(next));
                        }}
                        className="w-5 h-5 rounded hover:bg-[#2A2D36] text-white font-black text-xs flex items-center justify-center active:scale-95 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Height Stepper */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] font-['Figtree'] font-bold text-[#929394] uppercase">
                      Height ({unitName})
                    </label>
                    <div className="flex items-center justify-between h-[28px] px-1 rounded-[7px] bg-[#0E0F12] border border-[#2A2D36]">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(1, editingAccHeight - 1);
                          setEditingAccHeight(next);
                          setEditingAccHeightInput(String(next));
                        }}
                        className="w-5 h-5 rounded hover:bg-[#2A2D36] text-white font-black text-xs flex items-center justify-center active:scale-95 transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        value={editingAccHeightInput}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          setEditingAccHeightInput(e.target.value);
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setEditingAccHeight(Math.max(1, Math.min(16, val)));
                        }}
                        onBlur={() => {
                          const val = parseInt(editingAccHeightInput, 10);
                          if (isNaN(val) || val < 1) {
                            setEditingAccHeight(1);
                            setEditingAccHeightInput('1');
                          } else if (val > 16) {
                            setEditingAccHeight(16);
                            setEditingAccHeightInput('16');
                          } else {
                            setEditingAccHeight(val);
                            setEditingAccHeightInput(String(val));
                          }
                        }}
                        className="w-8 text-center bg-transparent font-['Figtree'] font-black text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.min(16, editingAccHeight + 1);
                          setEditingAccHeight(next);
                          setEditingAccHeightInput(String(next));
                        }}
                        className="w-5 h-5 rounded hover:bg-[#2A2D36] text-white font-black text-xs flex items-center justify-center active:scale-95 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            onDelete={onDeleteAccessory}
          />

          {/* New Channel Popover using shared MiniNewPopover */}
          <MiniNewPopover
            isOpen={isMiniNewOpen}
            onClose={() => setIsMiniNewOpen(false)}
            title="New Channel"
            onSubmit={handleCreateAccessory}
            isSubmitDisabled={!newName.trim()}
            submitLabel="Add Channel"
            direction="up"
            widthClassName="w-[205px]"
          >
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-['Figtree'] font-bold text-[#929394] uppercase tracking-wider">
                Name
              </label>
              <input
                type="text"
                required
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Anker Hub..."
                className="w-full px-2 py-1 rounded-[7px] bg-[#0E0F12] border border-[#2A2D36] text-xs font-['Figtree'] font-bold text-white focus:outline-none focus:border-[#4B5563] placeholder:text-slate-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {/* Width Stepper */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-['Figtree'] font-bold text-[#929394] uppercase">
                  Width ({unitName})
                </label>
                <div className="flex items-center justify-between h-[28px] px-1 rounded-[7px] bg-[#0E0F12] border border-[#2A2D36]">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1, newWidthMU - 1);
                      setNewWidthMU(next);
                      setNewWidthInput(String(next));
                    }}
                    className="w-5 h-5 rounded hover:bg-[#2A2D36] text-white font-black text-xs flex items-center justify-center active:scale-95 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    value={newWidthInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      setNewWidthInput(e.target.value);
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setNewWidthMU(Math.max(1, Math.min(16, val)));
                    }}
                    onBlur={() => {
                      const val = parseInt(newWidthInput, 10);
                      if (isNaN(val) || val < 1) {
                        setNewWidthMU(1);
                        setNewWidthInput('1');
                      } else if (val > 16) {
                        setNewWidthMU(16);
                        setNewWidthInput('16');
                      } else {
                        setNewWidthMU(val);
                        setNewWidthInput(String(val));
                      }
                    }}
                    className="w-8 text-center bg-transparent font-['Figtree'] font-black text-xs text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(16, newWidthMU + 1);
                      setNewWidthMU(next);
                      setNewWidthInput(String(next));
                    }}
                    className="w-5 h-5 rounded hover:bg-[#2A2D36] text-white font-black text-xs flex items-center justify-center active:scale-95 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Height Stepper */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-['Figtree'] font-bold text-[#929394] uppercase">
                  Height ({unitName})
                </label>
                <div className="flex items-center justify-between h-[28px] px-1 rounded-[7px] bg-[#0E0F12] border border-[#2A2D36]">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1, newHeightMU - 1);
                      setNewHeightMU(next);
                      setNewHeightInput(String(next));
                    }}
                    className="w-5 h-5 rounded hover:bg-[#2A2D36] text-white font-black text-xs flex items-center justify-center active:scale-95 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    value={newHeightInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      setNewHeightInput(e.target.value);
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setNewHeightMU(Math.max(1, Math.min(16, val)));
                    }}
                    onBlur={() => {
                      const val = parseInt(newHeightInput, 10);
                      if (isNaN(val) || val < 1) {
                        setNewHeightMU(1);
                        setNewHeightInput('1');
                      } else if (val > 16) {
                        setNewHeightMU(16);
                        setNewHeightInput('16');
                      } else {
                        setNewHeightMU(val);
                        setNewHeightInput(String(val));
                      }
                    }}
                    className="w-8 text-center bg-transparent font-['Figtree'] font-black text-xs text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(16, newHeightMU + 1);
                      setNewHeightMU(next);
                      setNewHeightInput(String(next));
                    }}
                    className="w-5 h-5 rounded hover:bg-[#2A2D36] text-white font-black text-xs flex items-center justify-center active:scale-95 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </MiniNewPopover>
        </div>
      </div>

      {/* Bottom Right: Clear Canvas + Zoom & Fit controls */}
      <div className="fixed bottom-8 right-8 z-40 pointer-events-auto select-none flex items-center gap-2">
        {/* Compact Clear Canvas Pill: Danger Style (Red background, white text) */}
        <div className="h-[30px] p-[2.3px] rounded-[6.8px] bg-[#2A2D36] shadow-xl flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsConfirmClearOpen(true)}
            className="flex items-center gap-1.5 h-[25.4px] px-2.5 rounded-[5.9px] bg-[#C80E11] hover:bg-[#A30B0E] border-[1.9px] border-[#9B0A0D] text-white shadow-sm transition-all group active:scale-95 focus:outline-none focus:ring-0 outline-none ring-0"
            title="Clear all placed channels"
          >
            <Trash2 size={11} className="text-white group-hover:scale-110 transition-transform" />
            <span className="font-['Figtree'] text-[11px] font-black text-white tracking-wide">Clear</span>
          </button>
        </div>

        {/* Outer Pill: w=154px, h=30px, rx=6.8px, fill=#2A2D36 */}
        <div className="w-[154px] h-[30px] p-[2.3px] rounded-[6.8px] bg-[#2A2D36] shadow-xl flex items-center justify-center">
          {/* Inner Pill: w=148.7px, h=25.4px, rx=5.9px, fill=#15161A, border=[1.9px] #2A2D36 */}
          <div className="flex items-center justify-between w-full h-full px-2 rounded-[5.9px] bg-[#15161A] border-[1.9px] border-[#2A2D36]">
            {/* Zoom Out (-) */}
            <button
              type="button"
              onClick={onZoomOut}
              className="p-1 text-white hover:text-[#3B82F6] transition-colors focus:outline-none focus:ring-0 outline-none ring-0"
              title="Zoom Out"
            >
              <svg width="12" height="12" viewBox="1775 1026 12 12" fill="none">
                <path
                  d="M1785.78 1036.78L1783.48 1034.48M1784.76 1031.39C1784.76 1032.55 1784.3 1033.66 1783.48 1034.48C1782.66 1035.3 1781.55 1035.76 1780.39 1035.76C1779.23 1035.76 1778.12 1035.3 1777.31 1034.48C1776.49 1033.66 1776.03 1032.55 1776.03 1031.39C1776.03 1030.23 1776.49 1029.12 1777.31 1028.31C1778.12 1027.49 1779.23 1027.03 1780.39 1027.03C1841.55 1027.03 1782.66 1027.49 1783.48 1028.31C1784.3 1029.12 1784.76 1030.23 1784.76 1031.39ZM1782.19 1031.39H1778.59H1782.19Z"
                  stroke="white"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Zoom Percent */}
            <button
              type="button"
              onClick={onResetZoom}
              className="font-['Figtree'] text-[11px] font-bold text-white hover:text-[#3B82F6] transition-colors px-1 focus:outline-none focus:ring-0 outline-none ring-0"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>

            {/* Zoom In (+) */}
            <button
              type="button"
              onClick={onZoomIn}
              className="p-1 text-white hover:text-[#3B82F6] transition-colors focus:outline-none focus:ring-0 outline-none ring-0"
              title="Zoom In"
            >
              <svg width="12" height="12" viewBox="1804 1026 12 12" fill="none">
                <path
                  d="M1814.78 1036.78L1812.48 1034.48M1809.39 1029.59V1031.39M1809.39 1031.39V1033.19M1809.39 1031.39H1811.19M1809.39 1031.39H1807.59M1813.76 1031.39C1813.76 1032.55 1813.3 1033.66 1812.48 1034.48C1811.66 1035.3 1810.55 1035.76 1809.39 1035.76C1808.23 1035.76 1807.12 1035.3 1806.31 1034.48C1805.49 1033.66 1805.03 1032.55 1805.03 1031.39C1805.03 1030.23 1805.49 1029.12 1806.31 1028.31C1807.12 1027.49 1808.23 1027.03 1809.39 1027.03C1810.55 1027.03 1811.66 1027.49 1812.48 1028.31C1813.3 1029.12 1813.76 1030.23 1813.76 1031.39Z"
                  stroke="white"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Divider */}
            <div className="w-[1px] h-3.5 bg-[#2A2D36]" />

            {/* Fit button */}
            <button
              type="button"
              onClick={onFitToScreen}
              className="flex items-center gap-1 text-[11px] font-['Figtree'] font-semibold text-white hover:text-[#3B82F6] transition-colors focus:outline-none focus:ring-0 outline-none ring-0"
              title="Fit Board to Screen"
            >
              <svg width="10" height="10" viewBox="1837 1026 12 12" fill="none">
                <path
                  d="M1840.22 1033.72C1840.29 1033.65 1840.37 1033.59 1840.46 1033.55C1840.55 1033.51 1840.65 1033.49 1840.75 1033.49C1840.85 1033.49 1840.95 1033.51 1841.04 1033.55C1841.14 1033.58 1841.22 1033.64 1841.29 1033.71C1841.36 1033.78 1841.42 1033.86 1841.45 1033.96C1841.49 1034.05 1841.51 1034.15 1841.51 1034.25C1841.51 1034.35 1841.49 1034.45 1841.45 1034.54C1841.41 1034.63 1841.35 1034.71 1841.28 1034.78L1840.31 1035.75H1840.75C1840.95 1035.75 1841.14 1035.83 1841.28 1035.97C1841.42 1036.11 1841.5 1036.3 1841.5 1036.5C1841.5 1036.7 1841.42 1036.89 1841.28 1037.03C1841.14 1037.17 1840.95 1037.25 1840.75 1037.25H1838.5C1838.3 1037.25 1838.11 1037.17 1837.97 1037.03C1837.83 1036.89 1837.75 1036.7 1837.75 1036.5V1034.25C1837.75 1034.05 1837.83 1033.86 1837.97 1033.72C1838.11 1033.58 1838.3 1033.5 1838.5 1033.5C1838.7 1033.5 1838.89 1033.58 1839.03 1033.72C1839.17 1033.86 1839.25 1034.05 1839.25 1034.25V1034.69L1840.22 1033.72ZM1843 1030.5C1843.4 1030.5 1843.78 1030.66 1844.06 1030.94C1844.34 1031.22 1844.5 1031.6 1844.5 1032C1844.5 1032.4 1844.34 1032.78 1844.06 1033.06C1843.78 1033.34 1843.4 1033.5 1843 1033.5C1842.6 1033.5 1842.22 1033.34 1841.94 1033.06C1841.66 1032.78 1841.5 1032.4 1841.5 1032C1841.5 1031.6 1841.66 1031.22 1841.94 1030.94C1842.22 1030.66 1842.6 1030.5 1843 1030.5ZM1847.5 1026.75C1847.7 1026.75 1847.89 1026.83 1848.03 1026.97C1848.17 1027.11 1848.25 1027.3 1848.25 1027.5V1029.75C1848.25 1029.95 1848.17 1030.14 1848.03 1030.28C1847.89 1030.42 1847.7 1030.5 1847.5 1030.5C1847.3 1030.5 1847.11 1030.42 1846.97 1030.28C1846.83 1030.14 1846.75 1029.95 1846.75 1029.75V1029.31L1845.78 1030.28C1845.71 1030.35 1845.63 1030.41 1845.54 1030.45C1845.45 1030.49 1845.35 1030.51 1845.25 1030.51C1845.15 1030.51 1845.05 1030.49 1844.96 1030.45C1844.86 1030.42 1844.78 1030.36 1844.71 1030.29C1844.64 1030.22 1844.58 1030.14 1844.55 1030.04C1844.51 1029.95 1844.49 1029.85 1844.49 1029.75C1844.49 1029.65 1844.51 1029.55 1844.55 1029.46C1844.59 1029.37 1844.65 1029.29 1844.72 1029.22L1845.69 1028.25H1845.25C1845.05 1028.25 1844.86 1028.17 1844.72 1028.03C1844.58 1027.89 1844.5 1027.7 1844.5 1027.5C1844.5 1027.3 1844.58 1027.11 1844.72 1026.97C1844.86 1026.83 1845.05 1026.75 1845.25 1026.75H1847.5Z"
                  fill="white"
                />
              </svg>
              <span>Fit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Clear Modal */}
      {onClearBoard && (
        <ConfirmClearModal
          isOpen={isConfirmClearOpen}
          onClose={() => setIsConfirmClearOpen(false)}
          onConfirm={() => {
            onClearBoard();
            setIsConfirmClearOpen(false);
          }}
          channelCount={channelCount}
        />
      )}
    </>
  );
};
