import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Trash2,
  FileSpreadsheet,
  ClipboardCopy,
  Download,
  Check,
} from 'lucide-react';
import { BoardConfig, CustomCategory } from '../lib/types';
import { BrandLogo } from './BrandLogo';
import { SetupModal } from './SetupModal';
import { NewCategoryModal } from './NewCategoryModal';
import { ConfirmClearModal } from './ConfirmClearModal';

interface HeaderProps {
  boardConfig: BoardConfig;
  onUpdateConfig: (newConfig: Partial<BoardConfig>) => void;
  onClearBoard: () => void;
  onExportCSV: () => void;
  onCopyBOM: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onToggleBOMDrawer: () => void;
  channelCount: number;
  snapCount: number;
  categories: CustomCategory[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  onAddCategory: (cat: CustomCategory) => void;
  onDeleteCategory?: (id: string) => void;
  projectTitle?: string;
  onUpdateTitle?: (title: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  boardConfig,
  onUpdateConfig,
  onClearBoard,
  onExportCSV,
  onCopyBOM,
  onExportPNG,
  onExportSVG,
  onToggleBOMDrawer,
  channelCount,
  snapCount,
  categories,
  activeCategory,
  onSelectCategory,
  onAddCategory,
  onDeleteCategory,
  projectTitle = 'My Setup',
  onUpdateTitle,
}) => {
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentCategory = categories.find((c) => c.id === activeCategory) || categories[0];

  return (
    <>
      <header className="fixed top-5 inset-x-6 z-40 pointer-events-none flex items-start justify-between">
        {/* Top Left: Brand Logo + Setup Pill + Live Stats + Category Dropdown */}
        <div className="flex flex-col gap-2.5 pointer-events-auto">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <BrandLogo size={46} />

            {/* My Setup Pill Button */}
            <button
              onClick={() => setIsSetupOpen(true)}
              className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#15161A] hover:bg-[#1D1E22] border border-[#2A2D36] shadow-lg text-white font-semibold text-sm transition-all group"
              title="Click to configure surface dimensions and presets"
            >
              <span className="tracking-tight">{projectTitle}</span>
              <ChevronDown
                size={16}
                className="text-slate-400 group-hover:text-white transition-transform group-hover:translate-y-0.5"
              />
            </button>

            {/* Live Stats Badge */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#15161A] border border-[#2A2D36] shadow-lg text-xs font-mono text-[#4ADE80] select-none">
              <span>{channelCount} channels + {snapCount} snaps</span>
            </div>
          </div>

          {/* Categories bar with + New and dropdown */}
          <div className="flex flex-col gap-1.5 relative items-start" ref={categoryMenuRef}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#929394]">Categories</span>
              <button
                type="button"
                onClick={() => setIsNewCategoryOpen(true)}
                className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#15161A] hover:bg-[#1D1E22] text-white border border-[#2A2D36] transition-colors"
              >
                + New
              </button>
            </div>

            {/* Active Category Trigger Pill */}
            <button
              type="button"
              onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
              className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl bg-[#15161A] hover:bg-[#1D1E22] border-2 border-[#3B82F6] text-xs text-white font-medium shadow-md transition-all"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: currentCategory?.color || '#3B82F6' }}
                />
                <span className="font-semibold text-xs tracking-wide">{currentCategory?.name || 'Category'}</span>
              </div>
              <ChevronDown size={14} className="text-slate-300 ml-1" />
            </button>

            {/* Categories Dropdown Popover */}
            {isCategoryMenuOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-52 rounded-2xl bg-[#15161A] border border-[#2A2D36] shadow-2xl p-1.5 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                {categories.map((cat) => {
                  const isSelected = cat.id === activeCategory;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        onSelectCategory(cat.id);
                        setIsCategoryMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-[#3B82F6]/20 text-white border border-[#3B82F6]/50'
                          : 'text-slate-300 hover:bg-[#1D1E22] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isSelected && <Check size={14} className="text-[#3B82F6]" />}
                        {onDeleteCategory && categories.length > 1 && !['power', 'hdmi'].includes(cat.id) && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCategory(cat.id);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                            title="Delete category"
                          >
                            <Trash2 size={12} />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Right: Clear Canvas + BOM + Export ▾ + Socials */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          {/* Clear Canvas */}
          <button
            onClick={() => setIsConfirmClearOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#C80E11] hover:bg-[#B50C0F] text-white text-xs font-semibold shadow-lg transition-all active:scale-95"
            title="Clear all placed channels"
          >
            <Trash2 size={15} />
            <span>Clear Canvas</span>
          </button>

          {/* BOM Button */}
          <button
            onClick={onToggleBOMDrawer}
            className="flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold tracking-wide shadow-lg shadow-blue-500/30 transition-all active:scale-95"
            title="Open Bill of Materials Drawer"
          >
            <span>BOM</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#15161A] hover:bg-[#1D1E22] border border-[#2A2D36] text-white text-xs font-medium shadow-lg transition-all"
            >
              <span>Export</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-[#15161A] border border-[#2A2D36] shadow-2xl p-1.5 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    onCopyBOM();
                    setIsExportMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-[#1D1E22] transition-colors"
                >
                  <ClipboardCopy size={14} className="text-[#38BDF8]" />
                  <span>Copy BOM.md</span>
                </button>
                <button
                  onClick={() => {
                    onExportCSV();
                    setIsExportMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-[#1D1E22] transition-colors"
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
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-[#1D1E22] transition-colors"
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
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-[#1D1E22] transition-colors"
                  >
                    <Download size={14} className="text-[#A78BFA]" />
                    <span>Download SVG</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* GitHub Icon Link */}
          <a
            href="https://github.com/francycalle/underplan"
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 rounded-full bg-[#2A2D36] hover:bg-[#343842] border border-[#2A2D36] shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105"
            title="View UnderPlan on GitHub"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>

          {/* Reddit Icon Link */}
          <a
            href="https://www.reddit.com/r/multiboard"
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 rounded-full bg-[#2A2D36] hover:bg-[#343842] border border-[#2A2D36] shadow-lg flex items-center justify-center text-[#FF4500] hover:brightness-110 transition-transform hover:scale-105"
            title="Multiboard Community on Reddit"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.703zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
          </a>
        </div>
      </header>

      {/* Modals */}
      <SetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        projectTitle={projectTitle}
        onUpdateTitle={(t) => onUpdateTitle?.(t)}
        boardConfig={boardConfig}
        onUpdateConfig={onUpdateConfig}
      />

      <NewCategoryModal
        isOpen={isNewCategoryOpen}
        onClose={() => setIsNewCategoryOpen(false)}
        onAddCategory={onAddCategory}
      />

      <ConfirmClearModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={onClearBoard}
        channelCount={channelCount}
      />
    </>
  );
};
