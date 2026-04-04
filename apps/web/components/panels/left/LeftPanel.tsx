'use client'

import { useState, useMemo, useRef } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import { useCanvasStore } from '@/store/useCanvasStore'
import { usePagesStore } from '@/store/usePagesStore'
import type { CanvasObject, ImageObject } from '@/types/canvas'
import {
  Layers,
  FileText,
  Package,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Square,
  Circle,
  Type,
  Image as ImageIcon,
  Minus,
  ArrowUpRight,
  LayoutTemplate,
  Pentagon,
  Star,
  Plus,
  Palette,
  Component,
  Search,
  Trash2,
  Check,
} from 'lucide-react'

// ── Shape icon per type ────────────────────────────────────────

function ShapeIcon({ type }: { type: string }) {
  switch (type) {
    case 'frame':
      return <LayoutTemplate size={12} className="shrink-0 text-blue-400" />
    case 'rect':
      return <Square size={12} className="shrink-0 text-muted-foreground" />
    case 'ellipse':
      return <Circle size={12} className="shrink-0 text-muted-foreground" />
    case 'text':
      return <Type size={12} className="shrink-0 text-orange-400" />
    case 'image':
      return <ImageIcon size={12} className="shrink-0 text-green-400" />
    case 'line':
      return <Minus size={12} className="shrink-0 text-muted-foreground" />
    case 'arrow':
      return <ArrowUpRight size={12} className="shrink-0 text-muted-foreground" />
    case 'polygon':
      return <Pentagon size={12} className="shrink-0 text-muted-foreground" />
    case 'star':
      return <Star size={12} className="shrink-0 text-yellow-400" />
    default:
      return <Square size={12} className="shrink-0 text-muted-foreground" />
  }
}

// ── Tree builder ───────────────────────────────────────────────

interface TreeNode {
  obj: CanvasObject
  children: TreeNode[]
}

function buildTree(objects: Map<string, CanvasObject>): TreeNode[] {
  const all = Array.from(objects.values())
  const byParent = new Map<string | null, CanvasObject[]>()

  for (const obj of all) {
    const key = obj.parentId ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(obj)
  }

  function build(parentId: string | null): TreeNode[] {
    return (byParent.get(parentId) ?? [])
      .slice()
      .reverse() // newest on top, matches canvas z-order
      .map((obj) => ({ obj, children: build(obj.id) }))
  }

  return build(null)
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  for (const node of nodes) {
    result.push(node)
    result.push(...flattenTree(node.children))
  }
  return result
}

// ── Layer node (recursive) ─────────────────────────────────────

interface LayerNodeProps {
  node: TreeNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  selectedIds: string[]
  onSelect: (id: string, multi: boolean) => void
  upsertObject: (obj: CanvasObject) => void
}

function LayerNode({
  node,
  depth,
  expanded,
  onToggle,
  selectedIds,
  onSelect,
  upsertObject,
}: LayerNodeProps) {
  const { obj, children } = node
  const isSelected = selectedIds.includes(obj.id)
  const isExpanded = expanded.has(obj.id)
  const hasChildren = children.length > 0

  return (
    <>
      <div
        onClick={(e) => onSelect(obj.id, e.shiftKey || e.metaKey || e.ctrlKey)}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={`flex items-center gap-1.5 h-7 pr-2 cursor-pointer group transition-colors select-none ${
          isSelected
            ? 'bg-primary/25 text-foreground'
            : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
        }`}
      >
        {/* Chevron (expand/collapse) */}
        <div className="w-3.5 shrink-0 flex items-center justify-center">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggle(obj.id)
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={10} />
              ) : (
                <ChevronRight size={10} />
              )}
            </button>
          ) : null}
        </div>

        {/* Type icon */}
        <ShapeIcon type={obj.type} />

        {/* Name */}
        <span
          className={`flex-1 text-xs truncate ${!obj.visible ? 'opacity-30' : ''}`}
        >
          {obj.name}
        </span>

        {/* Visibility + lock actions */}
        <div
          className={`flex gap-0.5 transition-opacity ${
            isSelected || !obj.visible || obj.locked
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              upsertObject({ ...obj, visible: !obj.visible })
            }}
            title={obj.visible ? 'Hide layer' : 'Show layer'}
            className={`p-0.5 rounded hover:bg-foreground/10 transition-colors ${
              obj.visible ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/40'
            }`}
          >
            {obj.visible ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              upsertObject({ ...obj, locked: !obj.locked })
            }}
            title={obj.locked ? 'Unlock layer' : 'Lock layer'}
            className={`p-0.5 rounded hover:bg-foreground/10 transition-colors ${
              obj.locked ? 'text-orange-400' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {obj.locked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
        </div>
      </div>

      {/* Recursive children */}
      {hasChildren &&
        isExpanded &&
        children.map((child) => (
          <LayerNode
            key={child.obj.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            selectedIds={selectedIds}
            onSelect={onSelect}
            upsertObject={upsertObject}
          />
        ))}
    </>
  )
}

// ── Layers tab ─────────────────────────────────────────────────

function LayersTab() {
  const { selectedIds, setSelectedIds } = useEditorStore()
  const { objects, upsertObject } = useCanvasStore()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const tree = useMemo(() => buildTree(objects), [objects])

  // Initialise expanded for frames that have children
  useMemo(() => {
    const ids = new Set<string>()
    for (const obj of objects.values()) {
      if (obj.type === 'frame') ids.add(obj.id)
    }
    setExpanded((prev) => {
      // Only add new frames that haven't been toggled yet
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelect = (id: string, multi: boolean) => {
    if (multi) {
      setSelectedIds(
        selectedIds.includes(id)
          ? selectedIds.filter((s) => s !== id)
          : [...selectedIds, id],
      )
    } else {
      setSelectedIds([id])
    }
  }

  // Filtered search: flatten tree, filter by name, rebuild selection highlight
  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree
    const q = search.toLowerCase()
    function filterNodes(nodes: TreeNode[]): TreeNode[] {
      return nodes.flatMap((n) => {
        const matchSelf = n.obj.name.toLowerCase().includes(q)
        const filteredChildren = filterNodes(n.children)
        if (matchSelf) return [{ ...n, children: filteredChildren }]
        if (filteredChildren.length > 0)
          return [{ ...n, children: filteredChildren }]
        return []
      })
    }
    return filterNodes(tree)
  }, [tree, search])

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5 bg-background rounded px-2 py-1">
          <Search size={11} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search layers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-foreground placeholder-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Layer tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {filteredTree.length === 0 ? (
          <p className="text-muted-foreground text-xs px-4 py-6 text-center">
            {search ? 'No layers match your search' : 'No layers yet'}
          </p>
        ) : (
          filteredTree.map((node) => (
            <LayerNode
              key={node.obj.id}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggleExpanded}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              upsertObject={upsertObject}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Pages tab ──────────────────────────────────────────────────

function PagesTab() {
  const { pages, currentPageId, addPage, renamePage, deletePage, setCurrentPage } =
    usePagesStore()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const startRename = (page: { id: string; name: string }) => {
    setRenamingId(page.id)
    setRenameValue(page.name)
    setTimeout(() => renameInputRef.current?.select(), 0)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renamePage(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Pages
        </span>
        <button
          onClick={addPage}
          title="Add page"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Page list */}
      <div className="flex-1 overflow-y-auto py-1">
        {pages.map((page) => (
          <div
            key={page.id}
            onClick={() => setCurrentPage(page.id)}
            onDoubleClick={() => startRename(page)}
            className={`flex items-center gap-2 px-3 h-8 cursor-pointer group transition-colors ${
              page.id === currentPageId
                ? 'bg-primary/20 text-foreground'
                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText size={12} className="shrink-0 text-muted-foreground" />

            {renamingId === page.id ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-background border border-ring text-xs text-foreground px-1 py-0.5 rounded outline-none"
              />
            ) : (
              <span className="flex-1 text-xs truncate">{page.name}</span>
            )}

            {page.id === currentPageId && renamingId !== page.id && (
              <Check size={11} className="text-violet-400 shrink-0" />
            )}

            {pages.length > 1 && renamingId !== page.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deletePage(page.id)
                }}
                title="Delete page"
                className="text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Double-click a page to rename
        </p>
      </div>
    </div>
  )
}

// ── Assets tab ─────────────────────────────────────────────────

function AssetsTab() {
  const { objects } = useCanvasStore()
  const [search, setSearch] = useState('')
  const [openSection, setOpenSection] = useState<Set<string>>(
    () => new Set(['colors', 'components', 'images']),
  )

  const toggleSection = (key: string) => {
    setOpenSection((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Extract document colors from objects
  const documentColors = useMemo(() => {
    const colorSet = new Set<string>()
    for (const obj of objects.values()) {
      if ('fill' in obj && typeof obj.fill === 'string') {
        const c = obj.fill.trim()
        if (c && c !== 'transparent' && c !== 'none') colorSet.add(c)
      }
      if ('stroke' in obj && typeof obj.stroke === 'string') {
        const c = (obj.stroke as string).trim()
        if (c && c !== 'transparent' && c !== 'none') colorSet.add(c)
      }
    }
    return Array.from(colorSet)
  }, [objects])

  // Image objects in the canvas
  const imageObjects = useMemo(
    () =>
      Array.from(objects.values()).filter(
        (o): o is ImageObject => o.type === 'image',
      ),
    [objects],
  )

  const q = search.toLowerCase()

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-border">
        <div className="flex items-center gap-1.5 bg-background rounded px-2 py-1">
          <Search size={11} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search assets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-foreground placeholder-muted-foreground outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Colors ── */}
        <AssetSection
          icon={<Palette size={12} />}
          label="Document Colors"
          sectionKey="colors"
          open={openSection.has('colors')}
          onToggle={toggleSection}
          count={documentColors.length}
        >
          {documentColors.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-2">
              Colors from your design will appear here
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              {documentColors
                .filter((c) => !q || c.toLowerCase().includes(q))
                .map((color) => (
                  <div
                    key={color}
                    title={color}
                    className="group relative"
                  >
                    <div
                      className="w-6 h-6 rounded border border-foreground/10 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                ))}
            </div>
          )}
        </AssetSection>

        {/* ── Local Components ── */}
        <AssetSection
          icon={<Component size={12} />}
          label="Local Components"
          sectionKey="components"
          open={openSection.has('components')}
          onToggle={toggleSection}
          count={0}
        >
          <div className="px-3 py-3 text-center">
            <Component size={20} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-1">No components yet</p>
            <p className="text-xs text-muted-foreground/70">
              Select objects and group them to create reusable components
            </p>
          </div>
        </AssetSection>

        {/* ── Images ── */}
        <AssetSection
          icon={<ImageIcon size={12} />}
          label="Images"
          sectionKey="images"
          open={openSection.has('images')}
          onToggle={toggleSection}
          count={imageObjects.length}
        >
          {imageObjects.length === 0 ? (
            <div className="px-3 py-3 text-center">
              <ImageIcon size={20} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">No images yet</p>
              <p className="text-xs text-muted-foreground/70">
                Images added to the canvas will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 px-3 pb-2">
              {imageObjects
                .filter((o) => !q || o.name.toLowerCase().includes(q))
                .map((img) => (
                  <div
                    key={img.id}
                    title={img.name}
                    className="aspect-square rounded overflow-hidden border border-border hover:border-primary transition-colors cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
            </div>
          )}
        </AssetSection>
      </div>
    </div>
  )
}

// ── Collapsible section ────────────────────────────────────────

interface AssetSectionProps {
  icon: React.ReactNode
  label: string
  sectionKey: string
  open: boolean
  onToggle: (key: string) => void
  count: number
  children: React.ReactNode
}

function AssetSection({
  icon,
  label,
  sectionKey,
  open,
  onToggle,
  count,
  children,
}: AssetSectionProps) {
  return (
    <div className="border-b border-border">
      <button
        onClick={() => onToggle(sectionKey)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-secondary transition-colors"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 text-xs text-foreground font-medium">{label}</span>
        {count > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
        )}
        <span className="text-muted-foreground">
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
      </button>
      {open && children}
    </div>
  )
}

// ── Main LeftPanel ─────────────────────────────────────────────

export function LeftPanel() {
  const { leftPanelTab, setLeftPanelTab } = useEditorStore()

  const tabs = [
    { id: 'layers' as const, icon: <Layers size={14} />, label: 'Layers' },
    { id: 'pages' as const, icon: <FileText size={14} />, label: 'Pages' },
    { id: 'assets' as const, icon: <Package size={14} />, label: 'Assets' },
  ]

  return (
    <div className="w-56 flex flex-col bg-panel border-r border-border text-foreground text-sm">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setLeftPanelTab(tab.id)}
            title={tab.label}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors ${
              leftPanelTab === tab.id
                ? 'text-foreground border-b-2 border-violet-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {leftPanelTab === 'layers' && <LayersTab />}
        {leftPanelTab === 'pages' && <PagesTab />}
        {leftPanelTab === 'assets' && <AssetsTab />}
      </div>
    </div>
  )
}
