import React from 'react';
import { Edit2, Trash2, Check, X } from 'lucide-react';

export interface DockSelectorTriggerProps {
  title: string;
  onPlusClick: () => void;
  plusTitle?: string;
  name: string;
  subtitle: string;
  color: string;
  onCardClick?: () => void;
  isCardActive?: boolean;
  activeBorderColor?: string;
  cardTitle?: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  direction?: 'up' | 'down';
  toggleTitle?: string;
}

export const DockSelectorTrigger: React.FC<DockSelectorTriggerProps> = ({
  title,
  onPlusClick,
  plusTitle = 'Add new',
  name,
  subtitle,
  color,
  onCardClick,
  isCardActive = false,
  activeBorderColor,
  cardTitle,
  isOpen,
  onToggleOpen,
  direction = 'down',
  toggleTitle,
}) => {
  return (
    <div className="flex flex-col gap-[7px]">
      {/* Header row: title + "+" button, flush left and right */}
      <div className="flex items-center justify-between w-[205px] h-[18px]">
        <span className="font-['Figtree'] font-black text-[13.5px] text-white tracking-tight select-none leading-none">
          {title}
        </span>

        {/* "+" Button */}
        <button
          type="button"
          onClick={onPlusClick}
          className="w-[32px] h-[18px] rounded-[4.5px] bg-[#2A2D36] hover:bg-[#383C48] text-white flex items-center justify-center transition-colors active:scale-95 shadow-sm"
          title={plusTitle}
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

      {/* Selector Dock: w=205px, h=70px, rx=20px, fill=#2A2D36 */}
      <div className="flex items-center w-[205px] h-[70px] p-[5px] rounded-[20px] bg-[#2A2D36] shadow-2xl gap-[5px]">
        {/* Left Card: 160x60px, rx=15px */}
        <button
          type="button"
          onClick={onCardClick ?? onToggleOpen}
          className={`flex items-center w-[160px] h-[60px] rounded-[15px] bg-[#15161A] pl-[15.75px] pr-[10px] gap-[10px] text-left group border-[2px] focus:outline-none focus:ring-0 outline-none ring-0 ${
            isCardActive
              ? ''
              : 'border-[#15161A] hover:border-[#383C48]'
          }`}
          style={{
            borderColor: isCardActive ? (activeBorderColor || color) : undefined,
          }}
          title={cardTitle ?? name}
        >
          {/* Rounded Square Swatch: 28.5x28.5px, rx=6, 50% opacity fill + stroke */}
          <div className="w-[28.5px] h-[28.5px] shrink-0">
            <svg width="28.5" height="28.5" viewBox="0 0 28.5 28.5" fill="none">
              <rect
                x="0.75"
                y="0.75"
                width="27"
                height="27"
                rx="6"
                fill={color}
                fillOpacity={0.5}
                stroke={color}
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Text: Name (Figtree Black 13px) + Subtitle (Figtree Bold 11px at 60% opacity) */}
          <div className="flex flex-col justify-center overflow-hidden">
            <span className="font-['Figtree'] font-black text-[13px] text-white truncate max-w-[95px] leading-tight">
              {name}
            </span>
            <span className="font-['Figtree'] font-bold text-[11px] text-white/60 tracking-wider leading-tight uppercase mt-0.5 truncate max-w-[95px]">
              {subtitle}
            </span>
          </div>
        </button>

        {/* Right Toggle Button: 30x30px, rx=5px */}
        <button
          type="button"
          onClick={onToggleOpen}
          className={`w-[30px] h-[30px] rounded-[5px] bg-[#15161A] hover:bg-[#1F2128] flex items-center justify-center border focus:outline-none focus:ring-0 outline-none ring-0 ${
            isOpen ? 'border-[#3B82F6]' : 'border-[#15161A] hover:border-[#383C48]'
          }`}
          title={toggleTitle ?? 'Toggle menu'}
        >
          {direction === 'up' ? (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <polygon points="5,1 9,7 1,7" fill="white" />
            </svg>
          ) : (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <polygon points="1,2 9,2 5,7" fill="white" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};


export interface BaseDropdownItem {
  id: string;
  name: string;
  subtitle?: string;
  [key: string]: any;
}

export interface ChannelDropdownProps<T extends BaseDropdownItem> {
  isOpen: boolean;
  title: string;
  items: T[];
  selectedId?: string | null;
  onSelect: (item: T) => void;
  direction?: 'up' | 'down';
  widthClassName?: string;
  renderIcon?: (item: T) => React.ReactNode;
  renderSubtitle?: (item: T) => React.ReactNode;
  // Inline editing
  editingId?: string | null;
  onStartEdit?: (item: T) => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (item: T) => void;
  renderEditForm?: (item: T) => React.ReactNode;
  isSaveDisabled?: boolean;
  // Deleting
  onDelete?: (id: string) => void;
  canDelete?: (item: T) => boolean;
}

export function ChannelDropdown<T extends BaseDropdownItem>({
  isOpen,
  title,
  items,
  selectedId,
  onSelect,
  direction = 'down',
  widthClassName = 'w-[205px]',
  renderIcon,
  renderSubtitle,
  editingId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  renderEditForm,
  isSaveDisabled = false,
  onDelete,
  canDelete,
}: ChannelDropdownProps<T>) {
  if (!isOpen) return null;

  const positionClass =
    direction === 'up'
      ? 'bottom-full right-0 mb-3 animate-in fade-in slide-in-from-bottom-2'
      : 'top-full left-0 mt-2 animate-in fade-in slide-in-from-top-2';

  return (
    <div
      className={`absolute ${positionClass} ${widthClassName} rounded-[18px] bg-[#15161A] border-[2px] border-[#2A2D36] shadow-2xl p-[6px] z-50 flex flex-col gap-1.5 duration-150 select-none`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#2A2D36]">
        <span className="font-['Figtree'] font-black text-[11px] text-[#929394] uppercase tracking-wider">
          {title}
        </span>
        <span className="font-['Figtree'] text-[10px] text-white/60 bg-[#2A2D36] px-1.5 py-0.5 rounded font-bold">
          {items.length}
        </span>
      </div>

      {/* Items List */}
      <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
        {items.map((item) => {
          const isSelected = selectedId === item.id;
          const isEditing = editingId === item.id;

          if (isEditing) {
            return (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-2.5 rounded-[13px] bg-[#1A1C23] border border-[#2A2D36]"
              >
                {renderEditForm?.(item)}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#2A2D36]/60">
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="px-2 py-0.5 rounded-[6px] text-[10px] font-['Figtree'] font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaveDisabled}
                    onClick={() => onSaveEdit?.(item)}
                    className="px-2.5 py-0.5 rounded-[6px] bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-[10px] font-['Figtree'] font-black text-white active:scale-95 transition-all shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          }

          const allowDelete = onDelete && (!canDelete || canDelete(item));

          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className={`flex items-center justify-between p-2 rounded-[12px] cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#2A2D36] border border-[#3B82F6] text-white shadow-sm'
                  : 'bg-[#0E0F12] hover:bg-[#1C1D24] border border-[#2A2D36] text-slate-200'
              }`}
            >
              {/* Icon + Name / Subtitle */}
              <div className="flex items-center gap-2 overflow-hidden">
                {renderIcon?.(item)}
                <div className="flex flex-col overflow-hidden">
                  <span className="font-['Figtree'] font-black text-xs text-white truncate max-w-[95px] leading-tight">
                    {item.name}
                  </span>
                  {renderSubtitle ? (
                    renderSubtitle(item)
                  ) : item.subtitle ? (
                    <span className="font-['Figtree'] font-bold text-[10px] text-white/50 leading-tight uppercase mt-0.5 truncate max-w-[95px]">
                      {item.subtitle}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Actions: Edit & Delete */}
              <div className="flex items-center gap-1 shrink-0">
                {isSelected && <Check size={12} className="text-[#38BDF8] mr-0.5" />}
                {onStartEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEdit(item);
                    }}
                    className="p-1 rounded-[6px] hover:bg-[#15161A] text-slate-400 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
                {allowDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="p-1 rounded-[6px] hover:bg-[#15161A] text-slate-400 hover:text-[#C80E11] transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface MiniNewPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitDisabled?: boolean;
  submitLabel?: string;
  direction?: 'up' | 'down';
  widthClassName?: string;
  children: React.ReactNode;
}

export const MiniNewPopover: React.FC<MiniNewPopoverProps> = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  isSubmitDisabled = false,
  submitLabel = 'Save',
  direction = 'down',
  widthClassName = 'w-[205px]',
  children,
}) => {
  if (!isOpen) return null;

  const positionClass =
    direction === 'up'
      ? 'bottom-full right-0 mb-3 animate-in fade-in slide-in-from-bottom-2'
      : 'top-full left-0 mt-2 animate-in fade-in slide-in-from-top-2';

  return (
    <div
      className={`absolute ${positionClass} ${widthClassName} rounded-[15px] bg-[#1A1C23] border border-[#2A2D36] shadow-2xl p-2.5 z-50 flex flex-col gap-2 duration-150 select-none`}
    >
      <div className="flex items-center justify-between pb-1 border-b border-[#2A2D36]/60">
        <span className="font-['Figtree'] font-black text-[11px] text-white uppercase tracking-wider">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        {children}
        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#2A2D36]/60">
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-0.5 rounded-[6px] text-[10px] font-['Figtree'] font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="px-2.5 py-0.5 rounded-[6px] bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-[10px] font-['Figtree'] font-black text-white active:scale-95 transition-all shadow-sm"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};
