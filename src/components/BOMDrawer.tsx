import React, { useState } from 'react';
import {
  X,
  Wrench,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { BillOfMaterials, BOMItem, CustomCategory } from '../lib/types';

interface BOMDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bom: BillOfMaterials;
  categories?: CustomCategory[];
  projectTitle?: string;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

/**
 * Renders an SVG channel thumbnail matching the bottom toolbar geometry.
 */
const renderChannelThumbnail = (kind: string, color: string) => {
  switch (kind) {
    case 'straight':
      return (
        <path
          d="M44.25 25.75V34.25H15.75V25.75H44.25Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      );
    case 'corner':
      return (
        <path
          d="M30 20V30H40V40H20V20H30Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      );
    case 'curved':
      return (
        <path
          d="M29.25 20.75V25C29.25 26.525 29.856 27.9871 30.935 29.0654C32.013 30.1438 33.475 30.75 35 30.75H39.25V39.25H35C31.221 39.25 27.596 37.7486 24.924 35.0762C22.251 32.4038 20.75 28.7793 20.75 25V20.75H29.25Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      );
    case 'cross':
      return (
        <path
          d="M34.885 15C35.077 15.0001 35.233 15.1562 35.233 15.3486V24.7676H44.653C44.701 24.7676 44.747 24.7772 44.789 24.7949C44.914 24.848 45.002 24.9721 45.002 25.1162V34.8838C45.002 34.956 44.98 35.0234 44.942 35.0791C44.88 35.1716 44.773 35.2323 44.653 35.2324H35.234V44.6514C35.234 44.8438 35.078 44.9996 34.886 45H25.117C24.925 44.9999 24.769 44.844 24.769 44.6514V35.2324H15.349C15.252 35.2323 15.166 35.193 15.103 35.1299C15.055 35.0826 15.021 35.0221 15.007 34.9541C15.002 34.9314 15 34.9079 15 34.8838V25.1162C15 25.0439 15.022 24.9766 15.06 24.9209C15.085 24.8839 15.117 24.8522 15.154 24.8271C15.21 24.7897 15.277 24.7677 15.349 24.7676H24.768V15.3486C24.768 15.1564 24.924 15.0004 25.116 15H34.885Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      );
    case 'junction':
      return (
        <path
          d="M25.75 39.25L25.75 29.25L15.75 29.25L15.75 20.75L44.25 20.75L44.25 29.25L34.25 29.25L34.25 39.25L25.75 39.25Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      );
    case 'y_split':
      return (
        <path
          d="M25.75 32.1895L15.75 22.1895V15.75H24.25V22.8105L30 28.5605L35.75 22.8105V15.75H44.25V22.1895L34.25 32.1895V44.25H25.75V32.1895Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      );
    case 'diagonal':
      return (
        <path
          d="M17 43L43 17H35L13 39L17 43Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      );
    case 'mitred':
      return (
        <path
          d="M18 18H38L42 22V42H34V26H18V18Z"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      );
    case 'spool':
      return (
        <circle
          cx="30"
          cy="30"
          r="14"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
        />
      );
    case 'accessory':
    default:
      return (
        <rect
          x="15"
          y="15"
          width="30"
          height="30"
          rx="6"
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth="1.5"
        />
      );
  }
};

/**
 * Extracts channel kind from BOMItem specs or partNumber.
 */
const getChannelKindFromItem = (item: BOMItem): string => {
  if (item.specs?.kind) return String(item.specs.kind);
  const pn = item.partNumber.toUpperCase();
  if (pn.includes('-STR-')) return 'straight';
  if (pn.includes('-CNR-')) return 'corner';
  if (pn.includes('-CRV-')) return 'curved';
  if (pn.includes('-CRS-')) return 'cross';
  if (pn.includes('-JNC-')) return 'junction';
  if (pn.includes('-YSPL-')) return 'y_split';
  if (pn.includes('-DIAG-')) return 'diagonal';
  if (pn.includes('-MTR-')) return 'mitred';
  if (pn.includes('SPOOL')) return 'spool';
  if (pn.includes('ACC')) return 'accessory';
  return 'straight';
};

/**
 * Returns human-friendly, clean titles and dimension subtitles (e.g. "X Channel", "3×3 MU - 75×75 mm").
 */
const getChannelDisplayInfo = (item: BOMItem, pitchMm: number = 25): { title: string; dimensions: string } => {
  const kind = getChannelKindFromItem(item);
  const unitName = pitchMm === 28 ? 'OU' : 'MU';

  switch (kind) {
    case 'straight': {
      let len = 2;
      if (item.specs?.length) {
        len = Number(item.specs.length);
      } else {
        const match = item.partNumber.match(/-STR-(\d+)U/i) || item.name.match(/(\d+)\s*(?:MU|OU)/i);
        if (match) len = parseInt(match[1], 10);
      }
      const w = Number(item.specs?.widthUnits || 1);
      const title = 'I Channel';
      const dimensions =
        w > 1
          ? `${len}×${w} ${unitName} - ${len * pitchMm}×${w * pitchMm} mm`
          : `${len} ${unitName} - ${len * pitchMm} mm`;
      return { title, dimensions };
    }

    case 'corner': {
      let span = 2;
      if (item.specs?.armSpanUnits) {
        span = Number(item.specs.armSpanUnits);
      } else {
        const match = item.partNumber.match(/-CNR-(\d+)X/i) || item.name.match(/(\d+)×(\d+)\s*(?:MU|OU)/i);
        if (match) span = parseInt(match[1], 10);
      }
      return {
        title: 'Elbow Channel',
        dimensions: `${span}×${span} ${unitName} - ${span * pitchMm}×${span * pitchMm} mm`,
      };
    }

    case 'curved': {
      let rad = 2;
      if (item.specs?.radiusUnits) {
        rad = Number(item.specs.radiusUnits);
      } else {
        const match = item.partNumber.match(/-CRV-R(\d+)U/i) || item.name.match(/R(\d+)\s*(?:MU|OU)/i);
        if (match) rad = parseInt(match[1], 10);
      }
      return {
        title: 'Round Channel',
        dimensions: `${rad}×${rad} ${unitName} - ${rad * pitchMm}×${rad * pitchMm} mm`,
      };
    }

    case 'cross':
      return {
        title: 'X Channel',
        dimensions: `3×3 ${unitName} - ${3 * pitchMm}×${3 * pitchMm} mm`,
      };

    case 'junction': {
      let trunk = 3;
      let branch = 2;
      if (item.specs?.trunkSpanUnits) trunk = Number(item.specs.trunkSpanUnits);
      if (item.specs?.branchSpanUnits) branch = Number(item.specs.branchSpanUnits);
      const match = item.partNumber.match(/-JNC-(\d+)X(\d+)/i);
      if (match) {
        trunk = parseInt(match[1], 10);
        branch = parseInt(match[2], 10);
      }
      return {
        title: 'T Channel',
        dimensions: `${trunk}×${branch} ${unitName} - ${trunk * pitchMm}×${branch * pitchMm} mm`,
      };
    }

    case 'y_split':
      return {
        title: 'Y Channel',
        dimensions: `3×3 ${unitName} - ${3 * pitchMm}×${3 * pitchMm} mm`,
      };

    case 'spool':
      return {
        title: 'Cable Spool',
        dimensions: `3×6 ${unitName} - ${3 * pitchMm}×${6 * pitchMm} mm`,
      };

    case 'socket_holder':
      return {
        title: 'Tessan Multi-Socket Holder',
        dimensions: `6×6 ${unitName} - ${6 * pitchMm}×${6 * pitchMm} mm`,
      };

    case 'accessory':
    default: {
      const cleanName = item.name
        .replace(/\s*\(\d+×\d+\s*(?:MU|OU).*?\)/i, '')
        .replace(/\s*\d+×\d+\s*(?:MU|OU)/i, '')
        .trim();
      let w = 3;
      let h = 3;
      if (item.specs?.widthUnits) w = Number(item.specs.widthUnits);
      if (item.specs?.length) h = Number(item.specs.length);
      const match = item.partNumber.match(/-ACC-(?:.*?_)?(\d+)X(\d+)U/i);
      if (match) {
        w = parseInt(match[1], 10);
        h = parseInt(match[2], 10);
      }
      return {
        title: cleanName || 'Custom Accessory',
        dimensions: `${w}×${h} ${unitName} - ${w * pitchMm}×${h * pitchMm} mm`,
      };
    }
  }
};

/**
 * Resolves channel category name and color, cleaning any raw internal IDs like cat_1789...
 */
const getCategoryDisplay = (
  item: BOMItem,
  categories: CustomCategory[] = []
): { label: string; color: string } => {
  const raw = item.categoryLabel || (item.specs?.categories ? String(item.specs.categories) : '') || 'neutral';

  const matched = categories.find(
    (c) =>
      c.id.toLowerCase() === raw.toLowerCase() ||
      c.name.toLowerCase() === raw.toLowerCase()
  );
  if (matched) {
    return { label: matched.name, color: matched.color };
  }

  // Strip internal timestamp prefixes like cat_1789234719703_
  const cleaned = raw.replace(/^cat_\d+_/, '');
  return { label: cleaned, color: '#3B82F6' };
};

/**
 * Clean, minimal 2x2 grid icon for tiles (Multiboard or openGrid).
 */
const GridTileIcon: React.FC<{ size?: number; isOpenGrid?: boolean }> = ({ size = 24, isOpenGrid = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
    <rect x="2.5" y="2.5" width="8.5" height="8.5" rx={isOpenGrid ? 2.5 : 1} fill={isOpenGrid ? "#10B981" : "#3B82F6"} fillOpacity="0.2" stroke={isOpenGrid ? "#10B981" : "#3B82F6"} strokeWidth="1.5" />
    <rect x="13" y="2.5" width="8.5" height="8.5" rx={isOpenGrid ? 2.5 : 1} fill={isOpenGrid ? "#10B981" : "#3B82F6"} fillOpacity="0.2" stroke={isOpenGrid ? "#10B981" : "#3B82F6"} strokeWidth="1.5" />
    <rect x="2.5" y="13" width="8.5" height="8.5" rx={isOpenGrid ? 2.5 : 1} fill={isOpenGrid ? "#10B981" : "#3B82F6"} fillOpacity="0.2" stroke={isOpenGrid ? "#10B981" : "#3B82F6"} strokeWidth="1.5" />
    <rect x="13" y="13" width="8.5" height="8.5" rx={isOpenGrid ? 2.5 : 1} fill={isOpenGrid ? "#10B981" : "#3B82F6"} fillOpacity="0.2" stroke={isOpenGrid ? "#10B981" : "#3B82F6"} strokeWidth="1.5" />
  </svg>
);

export const BOMDrawer: React.FC<BOMDrawerProps> = ({
  isOpen,
  onClose,
  bom,
  categories = [],
  projectTitle = 'UnderPlan Project',
}) => {
  const [showChannelMountDetails, setShowChannelMountDetails] = useState(false);

  if (!isOpen) return null;

  const { summary, boardDimensions, items } = bom;

  // Group and sort items by category, then by title
  const channelItems = [...items.filter((item) => item.category === 'channels')].sort((a, b) => {
    const catInfoA = getCategoryDisplay(a, categories);
    const catInfoB = getCategoryDisplay(b, categories);

    const indexA = categories.findIndex(
      (c) =>
        c.name.toLowerCase() === catInfoA.label.toLowerCase() ||
        c.id.toLowerCase() === catInfoA.label.toLowerCase()
    );
    const indexB = categories.findIndex(
      (c) =>
        c.name.toLowerCase() === catInfoB.label.toLowerCase() ||
        c.id.toLowerCase() === catInfoB.label.toLowerCase()
    );

    if (indexA !== -1 && indexB !== -1 && indexA !== indexB) {
      return indexA - indexB;
    }
    if (indexA !== -1 && indexB === -1) return -1;
    if (indexA === -1 && indexB !== -1) return 1;

    const catCompare = catInfoA.label.localeCompare(catInfoB.label);
    if (catCompare !== 0) return catCompare;

    const titleA = getChannelDisplayInfo(a).title;
    const titleB = getChannelDisplayInfo(b).title;
    return titleA.localeCompare(titleB);
  });
  const mountItems = items.filter((item) => item.category === 'mounting');
  const tileItems = items.filter((item) => item.category === 'tiles');

  return (
    <div
      id="bom-modal-container"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 p-4 sm:p-6 select-none font-['Figtree',sans-serif]"
    >
      <div
        id="bom-modal-box"
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#15161A] border-[2.8px] border-[#2A2D36] rounded-[22px] shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================ */}
        {/* Header: Clean Bill of Materials + Surface + Close [X] only   */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#2A2D36] bg-[#15161A] shrink-0 print-header">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight leading-none print-text">
              Bill of Materials
            </h2>
            <p className="text-xs text-[#929394] font-medium mt-1.5 print-text-muted">
              {projectTitle} • Surface {boardDimensions.totalWidthMm}×{boardDimensions.totalHeightMm} mm ({boardDimensions.totalHolesX}×{boardDimensions.totalHolesY} {boardDimensions.platform === 'opengrid' ? 'OU' : 'MU'}) • {summary.totalTiles} {boardDimensions.platform === 'opengrid' ? 'openGrid' : 'Multiboard'} Tiles
            </p>
          </div>

          <div className="flex items-center gap-2.5 no-print">
            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-[8.5px] bg-[#15161A] hover:bg-[#1C1D23] border-[2px] border-[#2A2D36] flex items-center justify-center text-[#929394] hover:text-white transition-colors ml-1 cursor-pointer"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* Scrollable Grouped Content: 3 Spacious Clean Sections        */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-7 space-y-7">
          {/* 1. Channels */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-wider print-text">
                Channels
              </h3>
              <span className="text-xs font-semibold text-[#929394] print-text-muted">
                {summary.totalChannels} {summary.totalChannels === 1 ? 'channel placed' : 'channels placed'}
              </span>
            </div>

            <div className="rounded-[16px] border-[2px] border-[#2A2D36] overflow-hidden bg-[#0E0F12] print-clean">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#2A2D36] bg-[#15161A] text-[11px] font-bold text-[#929394] print-header">
                    <th className="py-3 px-5">Component</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Mounts Needed</th>
                    <th className="py-3 px-5 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2D36]/40">
                  {channelItems.length > 0 ? (
                    channelItems.map((item) => {
                      const kind = getChannelKindFromItem(item);
                      const { label: catLabel, color: catColor } = getCategoryDisplay(item, categories);
                      const { title, dimensions } = getChannelDisplayInfo(item, boardDimensions.holePitchMm);

                      return (
                        <tr key={item.id} className="hover:bg-[#15161A]/60 transition-colors print-clean">
                          {/* Channel Drawing + Name */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3.5">
                              {/* SVG Thumbnail matching toolbar */}
                              <div className="w-10 h-10 rounded-[11px] bg-[#15161A] border-[1.5px] border-[#2A2D36] flex items-center justify-center shrink-0 shadow-sm print-clean">
                                <svg width="34" height="34" viewBox="0 0 60 60" fill="none">
                                  {renderChannelThumbnail(kind, catColor)}
                                </svg>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-white text-[13.5px] leading-snug print-text">
                                  {title}
                                </span>
                                <span className="text-[11px] font-medium text-[#929394] leading-tight mt-0.5 print-text-muted">
                                  {dimensions}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border print-clean"
                              style={{
                                backgroundColor: `${catColor}15`,
                                borderColor: `${catColor}35`,
                                color: catColor,
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                              {catLabel}
                            </span>
                          </td>

                          {/* Mounts Required */}
                          <td className="py-3.5 px-4 text-center">
                            {item.snapsRequired ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-[7px] bg-[#15161A] border border-[#2A2D36] text-[11px] font-bold text-[#4FDA48] print-clean">
                                {item.snapsRequired} pts
                              </span>
                            ) : (
                              <span className="text-[#929394] text-xs print-text-muted">—</span>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="py-3.5 px-5 text-right">
                            <span className="font-black text-white text-sm print-text">
                              {item.quantity}
                            </span>
                            <span className="text-xs text-[#929394] font-medium ml-1.5 print-text-muted">
                              {item.unit}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-7 text-center text-[#929394] text-xs font-medium print-text-muted">
                        No channels placed on canvas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. Mounting Systems */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-wider print-text">
                Mounting Systems
              </h3>
              <button
                onClick={() => setShowChannelMountDetails(!showChannelMountDetails)}
                className="no-print text-xs font-bold text-[#3B82F6] hover:text-[#60A5FA] flex items-center gap-1 transition-colors cursor-pointer"
              >
                {showChannelMountDetails ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span>{showChannelMountDetails ? 'Hide breakdown' : 'Breakdown by channel'}</span>
              </button>
            </div>

            <div className="rounded-[16px] border-[2px] border-[#2A2D36] overflow-hidden bg-[#0E0F12] print-clean">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#2A2D36] bg-[#15161A] text-[11px] font-bold text-[#929394] print-header">
                    <th className="py-3 px-5">Component</th>
                    <th className="py-3 px-4 text-center">Base Required</th>
                    <th className="py-3 px-5 text-right">Total with Spares</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2D36]/40">
                  {mountItems.length > 0 ? (
                    mountItems.map((item) => {
                      const cleanMountName = item.name.replace(/^Underware\s+/i, '');
                      return (
                        <tr key={item.id} className="hover:bg-[#15161A]/60 transition-colors print-clean">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-[10px] bg-[#4FDA48]/10 border border-[#4FDA48]/30 flex items-center justify-center shrink-0 text-[#4FDA48] print-clean">
                                <Wrench className="h-4 w-4" />
                              </div>
                              <div className="font-bold text-white text-[13.5px] print-text">
                                {cleanMountName}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs text-[#929394] font-semibold print-text-muted">
                            {item.specs?.baseRequirement ?? item.quantity} pcs
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <span className="font-black text-[#4FDA48] text-sm print-text">
                              {item.quantity}
                            </span>
                            <span className="text-xs text-[#4FDA48]/80 font-medium ml-1.5">
                              {item.unit}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-7 text-center text-[#929394] text-xs font-medium print-text-muted">
                        No mounting points required
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Expandable Breakdown per Channel */}
            {showChannelMountDetails && summary.mountDetails && (
              <div className="p-4 bg-[#0E0F12] border-[2px] border-[#2A2D36] rounded-[16px] space-y-2.5 animate-in fade-in print-clean">
                <div className="text-[11px] font-bold text-[#929394] uppercase tracking-wider print-text-muted">
                  Mounting Points Breakdown by Channel:
                </div>
                <div className="space-y-1.5 text-xs">
                  {summary.mountDetails.map((detail, idx) => (
                    <div
                      key={`${detail.channelId}-${idx}`}
                      className="flex items-center justify-between py-2 px-3.5 rounded-[10px] bg-[#15161A] border border-[#2A2D36] print-clean"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#4FDA48]" />
                        <span className="font-bold text-white print-text">{detail.channelName}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[11px] text-[#929394] font-medium capitalize print-text-muted">
                          {detail.mountingType.replace('_', ' ')}
                        </span>
                        <span className="font-black text-[#4FDA48]">
                          {detail.mountCount} points
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 3. Grid Tiles (Multiboard / openGrid) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-wider print-text">
                {boardDimensions.platform === 'opengrid' ? 'openGrid Tiles' : 'Multiboard Tiles'}
              </h3>
              <span className="text-xs font-semibold text-[#929394] print-text-muted">
                {summary.totalTiles} {summary.totalTiles === 1 ? 'tile required' : 'tiles required'}
              </span>
            </div>

            <div className="rounded-[16px] border-[2px] border-[#2A2D36] overflow-hidden bg-[#0E0F12] print-clean">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#2A2D36] bg-[#15161A] text-[11px] font-bold text-[#929394] print-header">
                    <th className="py-3 px-5">Tile Module</th>
                    <th className="py-3 px-5 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2D36]/40">
                  {tileItems.map((item) => {
                    const unitName = boardDimensions.platform === 'opengrid' ? 'OU' : 'MU';
                    const pitchMm = boardDimensions.holePitchMm ?? (boardDimensions.platform === 'opengrid' ? 28 : 25);
                    let dimSubtitle = '';
                    if (item.specs?.gridHoles && item.specs?.dimensionsMm) {
                      dimSubtitle = `${item.specs.gridHoles} ${unitName} - ${item.specs.dimensionsMm} mm`;
                    } else {
                      const match = item.partNumber.match(/(?:MB|OG)-TILE-(\d+)X(\d+)/i);
                      if (match) {
                        const w = parseInt(match[1], 10);
                        const h = parseInt(match[2], 10);
                        dimSubtitle = `${w}×${h} ${unitName} - ${w * pitchMm}×${h * pitchMm} mm`;
                      } else {
                        dimSubtitle = `8×8 ${unitName} - ${8 * pitchMm}×${8 * pitchMm} mm`;
                      }
                    }

                    const cleanTileTitle = item.name.replace(/\s*\(\d+x\d+\)/i, '').trim();

                    return (
                      <tr key={item.id} className="hover:bg-[#15161A]/60 transition-colors print-clean">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3.5">
                            {/* Grid Tile SVG Icon */}
                            <div className="w-10 h-10 rounded-[11px] bg-[#15161A] border-[1.5px] border-[#2A2D36] flex items-center justify-center shrink-0 shadow-sm print-clean">
                              <GridTileIcon size={24} isOpenGrid={boardDimensions.platform === 'opengrid'} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-[13.5px] print-text">
                                {cleanTileTitle}
                              </span>
                              <span className="text-[11px] font-medium text-[#929394] leading-tight mt-0.5 print-text-muted">
                                {dimSubtitle}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <span className="font-black text-white text-sm print-text">
                            {item.quantity}
                          </span>
                          <span className="text-xs text-[#929394] font-medium ml-1.5 print-text-muted">
                            {item.unit}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

