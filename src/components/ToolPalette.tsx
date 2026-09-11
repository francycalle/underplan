import React, { useState } from 'react';
import {
  ChannelCategory,
  CustomCategory,
  Rotation,
  CustomAccessoryDefinition,
} from '../lib/types';
import { NewAccessoryModal } from './NewAccessoryModal';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

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
  // Zoom & Pan props
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onFitToScreen?: () => void;
}

export const ToolPalette: React.FC<ToolPaletteProps> = ({
  activeTool,
  onSelectTool,
  customAccessories = [],
  activeAccessoryId,
  onSelectAccessory,
  onAddAccessory,
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
}) => {
  const [isNewAccessoryOpen, setIsNewAccessoryOpen] = useState(false);

  // Channels definitions for the bottom dock
  const REGULAR_CHANNELS: { type: ToolType; label: string; icon: React.ReactNode }[] = [
    {
      type: 'straight',
      label: 'Straight Channel',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="4" y1="12" x2="20" y2="12" />
        </svg>
      ),
    },
    {
      type: 'corner',
      label: '90° Corner (Elbow)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 4 6 18 20 18" />
        </svg>
      ),
    },
    {
      type: 'curved',
      label: 'Curved Radial (R2)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 4 C6 14 10 18 20 18" />
        </svg>
      ),
    },
    {
      type: 'cross',
      label: '4-Way Cross',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="4" x2="12" y2="20" />
          <line x1="4" y1="12" x2="20" y2="12" />
        </svg>
      ),
    },
    {
      type: 'junction',
      label: 'T-Junction',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="4" y1="8" x2="20" y2="8" />
          <line x1="12" y1="8" x2="12" y2="20" />
        </svg>
      ),
    },
    {
      type: 'y_split',
      label: 'Y-Split',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="13" />
          <line x1="12" y1="13" x2="6" y2="6" />
          <line x1="12" y1="13" x2="18" y2="6" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Bottom Center Tool Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-end gap-3.5">
        {/* Regular Channels Island */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-white pl-1 select-none">Regular Channels</span>
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#15161A] border border-[#2A2D36] shadow-2xl backdrop-blur-xl">
            {REGULAR_CHANNELS.map((ch) => {
              const isActive = activeTool === ch.type;
              return (
                <button
                  key={ch.type}
                  type="button"
                  onClick={() => onSelectTool(isActive ? 'select' : ch.type)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-[#1D1E22] text-[#3B82F6] border-2 border-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.35)] scale-105'
                      : 'text-[#3B82F6] hover:bg-[#1D1E22] border border-transparent'
                  }`}
                  title={ch.label}
                >
                  {ch.icon}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Channels Island */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 pl-1 pr-1">
            <span className="text-xs font-semibold text-white select-none">Custom Channels</span>
            <button
              type="button"
              onClick={() => setIsNewAccessoryOpen(true)}
              className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#15161A] hover:bg-[#1D1E22] text-white border border-[#2A2D36] transition-colors"
            >
              + New
            </button>
          </div>
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#15161A] border border-[#2A2D36] shadow-2xl backdrop-blur-xl">
            {customAccessories.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 italic">No custom accessories</div>
            ) : (
              customAccessories.map((acc) => {
                const isActive = activeTool === 'accessory' && activeAccessoryId === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      onSelectAccessory?.(acc.id);
                      onSelectTool('accessory');
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-[#1D1E22] border-2 border-[#3B82F6] text-white shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                        : 'bg-[#1D1E22]/60 border border-[#2A2D36] text-slate-300 hover:bg-[#1D1E22] hover:text-white'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-md bg-[#3B82F6] flex items-center justify-center shrink-0 shadow-sm" />
                    <div>
                      <div className="text-xs font-semibold text-white leading-tight">{acc.name}</div>
                      <div className="text-[10px] font-mono text-[#929394] mt-0.5">
                        ({acc.widthMU}×{acc.heightMU} MU)
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Right Zoom & View Controls */}
      <div className="fixed bottom-6 right-6 z-40 pointer-events-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#15161A] border border-[#2A2D36] shadow-2xl backdrop-blur-xl text-slate-300 text-xs font-mono">
          <button
            type="button"
            onClick={onZoomOut}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#1D1E22] text-slate-400 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            className="px-2 py-1 rounded-md hover:bg-[#1D1E22] text-white font-semibold transition-colors"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#1D1E22] text-slate-400 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <div className="w-[1px] h-4 bg-[#2A2D36] mx-0.5" />
          <button
            type="button"
            onClick={onFitToScreen}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#1D1E22] text-slate-300 hover:text-white text-xs font-medium transition-colors"
            title="Fit Board to Screen"
          >
            <Maximize2 size={13} />
            <span>Fit</span>
          </button>
        </div>
      </div>

      {/* New Custom Accessory Modal */}
      {onAddAccessory && (
        <NewAccessoryModal
          isOpen={isNewAccessoryOpen}
          onClose={() => setIsNewAccessoryOpen(false)}
          onAddAccessory={(acc) => {
            onAddAccessory(acc);
            onSelectAccessory?.(acc.id);
            onSelectTool('accessory');
          }}
        />
      )}
    </>
  );
};
