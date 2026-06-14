import ForceGraph2D, {
  type ForceGraphMethods,
  type GraphData,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import { useRequest } from "ahooks";
import { ArrowsClockwise as RefreshCwIcon } from "@phosphor-icons/react";
import {
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CodexMemoryFile, CodexMemoryOverview, CodexMemoryProjectGroup } from "./appTypes.ts";
import { nativeApi } from "./nativeApi.ts";

type MemoryGraphCoreNodeId =
  | "root"
  | "generation"
  | "memory-index"
  | "memory-summary"
  | "memory-raw"
  | "rollout"
  | "projects"
  | "corrections"
  | "extensions"
  | "recall"
  | "status";
type MemoryGraphProjectNodeId = `project-node:${number}`;
type MemoryGraphChildNodeId = `child-node:${string}`;
type MemoryGraphNodeId = MemoryGraphCoreNodeId | MemoryGraphProjectNodeId | MemoryGraphChildNodeId;

type MemoryKnowledgeNodeKind =
  | "root"
  | "system"
  | "memory"
  | "project"
  | "correction"
  | "extension"
  | "recall"
  | "status"
  | "child";

type MemoryKnowledgeNode = {
  id: MemoryGraphNodeId;
  title: string;
  step: string;
  relationLabel: string;
  countLabel: string;
  summary: string;
  nodeType: MemoryKnowledgeNodeKind;
  parentId?: MemoryGraphNodeId;
  expandable?: boolean;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  val: number;
  color: string;
};

type MemoryKnowledgeLink = {
  source: MemoryGraphNodeId;
  target: MemoryGraphNodeId;
  label: string;
  color: string;
};

type MemoryPinnedDetailState = {
  nodeId: MemoryGraphNodeId;
  left: number;
  top: number;
};

type MemoryRefreshPhase = "idle" | "loading" | "success" | "error";

const MAX_TOOLTIP_DETAIL_FILES = 6;

let lastCodexMemoryOverview: CodexMemoryOverview | null = null;

function memoryGraphLinkColor(label: string) {
  if (label.includes("纠偏")) return "rgba(152, 114, 77, 0.74)";
  if (label.includes("扩展")) return "rgba(83, 130, 102, 0.74)";
  if (label.includes("项目") || label.includes("上下文")) return "rgba(109, 124, 63, 0.74)";
  if (label.includes("召回")) return "rgba(77, 106, 134, 0.74)";
  if (label.includes("线索")) return "rgba(82, 118, 143, 0.72)";
  if (label.includes("文件") || label.includes("记录")) return "rgba(110, 116, 125, 0.72)";
  if (label.includes("生成")) return "rgba(122, 112, 92, 0.72)";
  return "rgba(96, 103, 112, 0.58)";
}

function createMemoryGraphLink(
  source: MemoryGraphNodeId,
  target: MemoryGraphNodeId,
  label: string,
): MemoryKnowledgeLink {
  return {
    source,
    target,
    label,
    color: memoryGraphLinkColor(label),
  };
}

function memoryGraphNodeColor(nodeType: MemoryKnowledgeNodeKind) {
  switch (nodeType) {
    case "root":
      return "#3b6c8f";
    case "memory":
      return "#7a705c";
    case "project":
      return "#6d7c3f";
    case "correction":
      return "#98724d";
    case "extension":
      return "#5f7a69";
    case "recall":
      return "#586e83";
    case "status":
      return "#8b6673";
    case "child":
      return "#6d737c";
    default:
      return "#5d6b7a";
  }
}

function nodeRelationEndpoint(value: string | number | NodeObject<MemoryKnowledgeNode> | undefined) {
  if (typeof value === "object" && value?.id) return String(value.id);
  return String(value ?? "");
}

function formatTime(value: number) {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function compactMemoryPreview(value: string, maxLength = 132) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "暂无预览";
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, Math.max(1, maxLength - 3))}...`;
}

function escapeMemoryTooltipHtml(value: string | number | boolean | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function countMemoryFiles(overview: CodexMemoryOverview, predicate: (kind: string) => boolean) {
  return overview.memoryFiles.filter((file) => predicate(file.kind)).length;
}

function memoryKindLabel(kind: string) {
  switch (kind) {
    case "memory_index":
      return "索引";
    case "summary":
      return "摘要";
    case "raw":
      return "原始";
    case "global":
      return "全局";
    case "rollout":
      return "会话摘要";
    case "correction":
      return "纠偏层";
    case "chronicle":
      return "Chronicle";
    case "memory_extension":
      return "记忆扩展";
    default:
      return "生成记忆";
  }
}

function isProjectNodeId(value: MemoryGraphNodeId): value is MemoryGraphProjectNodeId {
  return value.startsWith("project-node:");
}

function isExpandedDescendantNode(expandedNodeId: MemoryGraphNodeId, collapsedNodeId: MemoryGraphNodeId) {
  return collapsedNodeId === "projects" && isProjectNodeId(expandedNodeId);
}

function projectNodeIndex(value: MemoryGraphProjectNodeId) {
  return Number(value.replace("project-node:", ""));
}

function isFileForGraphNode(file: CodexMemoryFile, selectedNodeId: MemoryGraphNodeId) {
  switch (selectedNodeId) {
    case "generation":
      return !["correction", "chronicle", "memory_extension"].includes(file.kind);
    case "memory-index":
      return file.kind === "memory_index";
    case "memory-summary":
      return file.kind === "summary" || file.kind === "global";
    case "memory-raw":
      return file.kind === "raw";
    case "rollout":
      return file.kind === "rollout";
    case "corrections":
      return file.kind === "correction";
    case "extensions":
      return file.kind === "chronicle" || file.kind === "memory_extension";
    case "recall":
      return true;
    default:
      return false;
  }
}

function relatedFilesForGraphNode(overview: CodexMemoryOverview, selectedNodeId: MemoryGraphNodeId) {
  const childFile = childFileForGraphNode(overview, selectedNodeId);
  if (childFile) return [childFile];
  if (selectedNodeId === "root") return overview.memoryFiles;
  if (selectedNodeId === "projects") return overview.projectGroups.flatMap((group) => group.files);
  if (isProjectNodeId(selectedNodeId)) {
    return overview.projectGroups[projectNodeIndex(selectedNodeId)]?.files ?? [];
  }
  return overview.memoryFiles.filter((file) => isFileForGraphNode(file, selectedNodeId));
}

function childFileForGraphNode(overview: CodexMemoryOverview, selectedNodeId: MemoryGraphNodeId) {
  const match = String(selectedNodeId).match(/^child-node:(.*):file:(\d+)$/);
  if (!match) return null;

  const parentNodeId = match[1] as MemoryGraphNodeId;
  const fileIndex = Number(match[2]);
  if (isProjectNodeId(parentNodeId)) {
    return overview.projectGroups[projectNodeIndex(parentNodeId)]?.files[fileIndex] ?? null;
  }
  return overview.memoryFiles.filter((file) => isFileForGraphNode(file, parentNodeId))[fileIndex] ?? null;
}

function formatMemoryFileDetails(file: CodexMemoryFile, index: number) {
  const fileName = escapeMemoryTooltipHtml(file.label);
  const fileType = escapeMemoryTooltipHtml(memoryKindLabel(file.kind));
  const fileSize = escapeMemoryTooltipHtml(formatBytes(file.sizeBytes));
  const fileModifiedAt = escapeMemoryTooltipHtml(formatTime(file.modifiedAt));
  const generatedLabel = file.generated ? "是" : "否";
  const content = escapeMemoryTooltipHtml(file.preview || "暂无内容");

  return `
    <section class="ccr-memory-native-file">
      <div class="ccr-memory-native-file-title">
        <span>文件 ${index + 1}</span>
        <strong>${fileName}</strong>
      </div>
      <div class="ccr-memory-native-file-grid">
        <span>文件名：</span><strong>${fileName}</strong>
        <span>类型：</span><strong>${fileType}</strong>
        <span>大小：</span><strong>${fileSize}</strong>
        <span>最近更新：</span><strong>${fileModifiedAt}</strong>
        <span>生成文件：</span><strong>${generatedLabel}</strong>
      </div>
      <div class="ccr-memory-native-file-label">内容：</div>
      <pre class="ccr-memory-native-file-content">${content}</pre>
    </section>
  `;
}

function createMemoryGraphDetailLabel(
  overview: CodexMemoryOverview,
  node: NodeObject<MemoryKnowledgeNode>,
  selectedNodeId: MemoryGraphNodeId,
) {
  const files = relatedFilesForGraphNode(overview, selectedNodeId);
  const visibleFiles = files.slice(0, MAX_TOOLTIP_DETAIL_FILES);
  const hiddenFileCount = Math.max(0, files.length - visibleFiles.length);
  const fileDetails =
    visibleFiles.length > 0
      ? visibleFiles.map((file, index) => formatMemoryFileDetails(file, index)).join("")
      : '<div class="ccr-memory-native-empty">当前节点暂无文件信息</div>';
  const hiddenSummary =
    hiddenFileCount > 0
      ? `<div class="ccr-memory-native-more">还有 ${hiddenFileCount} 个文件未在弹框中展开，可继续点击对应子节点查看。</div>`
      : "";

  return `
    <div class="ccr-memory-native-tooltip ccr-memory-native-tooltip-detail">
      <div class="ccr-memory-native-head">
        <div>
          <span>${escapeMemoryTooltipHtml(node.step ?? "记忆节点")}</span>
          <strong>${escapeMemoryTooltipHtml(node.title ?? "记忆节点")}</strong>
        </div>
        <em>完整文件信息</em>
      </div>
      <div class="ccr-memory-native-meta">
        <span>${escapeMemoryTooltipHtml(node.relationLabel ?? "")}</span>
        <span>${escapeMemoryTooltipHtml(node.countLabel ?? "")}</span>
      </div>
      <p>${escapeMemoryTooltipHtml(node.summary ?? "")}</p>
      ${fileDetails}
      ${hiddenSummary}
    </div>
  `;
}

function createMemoryGraphPreviewLabel(node: NodeObject<MemoryKnowledgeNode>) {
  return `
    <div class="ccr-memory-native-tooltip">
      <div class="ccr-memory-native-head">
        <div>
          <span>${escapeMemoryTooltipHtml(node.step ?? "记忆节点")}</span>
          <strong>${escapeMemoryTooltipHtml(node.title ?? "记忆节点")}</strong>
        </div>
      </div>
      <div class="ccr-memory-native-meta">
        <span>${escapeMemoryTooltipHtml(node.relationLabel ?? "")}</span>
        <span>${escapeMemoryTooltipHtml(node.countLabel ?? "")}</span>
      </div>
      <p>${escapeMemoryTooltipHtml(compactMemoryPreview(node.summary ?? "", 180))}</p>
    </div>
  `;
}

function createMemoryPinnedDetailHtml(
  overview: CodexMemoryOverview,
  node: NodeObject<MemoryKnowledgeNode>,
  selectedNodeId: MemoryGraphNodeId,
) {
  return createMemoryGraphDetailLabel(overview, node, selectedNodeId);
}

function createMemoryGraphNodeLabel(node: NodeObject<MemoryKnowledgeNode>) {
  return createMemoryGraphPreviewLabel(node);
}

function truncateCanvasText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (ctx.measureText(value).width <= maxWidth) return value;

  const ellipsis = "...";
  let start = 0;
  let end = value.length;
  while (start < end) {
    const middle = Math.ceil((start + end) / 2);
    const candidate = `${value.slice(0, middle)}${ellipsis}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      start = middle;
    } else {
      end = middle - 1;
    }
  }
  return `${value.slice(0, Math.max(1, start))}${ellipsis}`;
}

function measureMemoryGraphNode(node: NodeObject<MemoryKnowledgeNode>, ctx: CanvasRenderingContext2D, globalScale: number) {
  const titleFontSize = 13 / globalScale;
  const metaFontSize = 10.5 / globalScale;
  const paddingX = 12 / globalScale;
  const paddingY = 9 / globalScale;
  const maxWidth = node.nodeType === "root" ? 250 / globalScale : 218 / globalScale;
  const minWidth = node.nodeType === "root" ? 158 / globalScale : 132 / globalScale;

  ctx.font = `650 ${titleFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const titleWidth = ctx.measureText(node.title).width;
  ctx.font = `500 ${metaFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const metaWidth = Math.max(ctx.measureText(node.relationLabel).width, ctx.measureText(node.countLabel).width);
  const width = Math.max(minWidth, Math.min(maxWidth, Math.max(titleWidth, metaWidth) + paddingX * 2));

  return {
    width,
    height: node.nodeType === "root" ? 74 / globalScale : 64 / globalScale,
    radius: 8 / globalScale,
    paddingX,
    paddingY,
    textWidth: width - paddingX * 2,
    titleFontSize,
    metaFontSize,
  };
}

function drawMemoryGraphNodeBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const left = x - width / 2;
  const top = y - height / 2;
  ctx.beginPath();
  ctx.moveTo(left + radius, top);
  ctx.lineTo(left + width - radius, top);
  ctx.quadraticCurveTo(left + width, top, left + width, top + radius);
  ctx.lineTo(left + width, top + height - radius);
  ctx.quadraticCurveTo(left + width, top + height, left + width - radius, top + height);
  ctx.lineTo(left + radius, top + height);
  ctx.quadraticCurveTo(left, top + height, left, top + height - radius);
  ctx.lineTo(left, top + radius);
  ctx.quadraticCurveTo(left, top, left + radius, top);
  ctx.closePath();
}

function createMemoryGraphNode(
  id: MemoryGraphNodeId,
  nodeType: MemoryKnowledgeNodeKind,
  step: string,
  title: string,
  relationLabel: string,
  countLabel: string,
  summary: string,
  expandable = false,
): MemoryKnowledgeNode {
  return {
    id,
    nodeType,
    step,
    title,
    relationLabel,
    countLabel,
    summary,
    expandable,
    val: nodeType === "root" ? 15 : nodeType === "memory" ? 8 : 10,
    color: memoryGraphNodeColor(nodeType),
  };
}

function createChildGraphNode(
  id: MemoryGraphNodeId,
  parentId: MemoryGraphNodeId,
  nodeType: MemoryKnowledgeNodeKind,
  step: string,
  title: string,
  relationLabel: string,
  countLabel: string,
  summary: string,
  expandable = false,
): MemoryKnowledgeNode {
  return {
    ...createMemoryGraphNode(id, nodeType, step, title, relationLabel, countLabel, summary),
    parentId,
    expandable,
    val: expandable ? 8 : 6,
  };
}

function isExpandableGraphNode(node: NodeObject<MemoryKnowledgeNode>) {
  return node.expandable === true;
}

function isDetailGraphNode(value: MemoryGraphNodeId) {
  return value.startsWith("child-node:");
}

function createFileChildNode(file: CodexMemoryFile, selectedNodeId: MemoryGraphNodeId, index: number) {
  return createChildGraphNode(
    `child-node:${selectedNodeId}:file:${index}`,
    selectedNodeId,
    "child",
    memoryKindLabel(file.kind),
    file.label,
    "文件节点",
    formatBytes(file.sizeBytes),
    `最近更新 ${formatTime(file.modifiedAt)}`,
  );
}

function createProjectChildNode(group: CodexMemoryProjectGroup, index: number) {
  return createChildGraphNode(
    `project-node:${index}`,
    "projects",
    "project",
    "项目",
    group.title,
    "项目归属",
    `${group.files.length} 个文件`,
    `${group.entryCount} 条记忆；最近更新 ${formatTime(group.latestModifiedAt)}`,
    true,
  );
}

const coreNodeIdsAroundRoot: MemoryGraphCoreNodeId[] = [
  "generation",
  "memory-index",
  "memory-summary",
  "memory-raw",
  "rollout",
  "projects",
  "corrections",
  "extensions",
  "recall",
];

function assignRadialCorePositions(nodes: MemoryKnowledgeNode[]) {
  const nodeById = new Map<MemoryGraphNodeId, MemoryKnowledgeNode>();
  for (const node of nodes) nodeById.set(node.id, node);

  const rootX = 0;
  const rootY = 0;
  const rootRadius = 315;
  const rootNode = nodeById.get("root");
  const statusNode = nodeById.get("status");

  if (rootNode) {
    rootNode.x = rootX;
    rootNode.y = rootY;
    rootNode.fx = rootNode.x;
    rootNode.fy = rootNode.y;
  }

  if (statusNode) {
    statusNode.x = rootX;
    statusNode.y = rootY;
    statusNode.fx = statusNode.x;
    statusNode.fy = statusNode.y;
  }

  coreNodeIdsAroundRoot.forEach((nodeId, index) => {
    const node = nodeById.get(nodeId);
    if (!node) return;

    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / coreNodeIdsAroundRoot.length;
    node.x = rootX + Math.cos(angle) * rootRadius;
    node.y = rootY + Math.sin(angle) * rootRadius;
    node.fx = node.x;
    node.fy = node.y;
  });
}

function assignRadialChildPositions(nodes: MemoryKnowledgeNode[]) {
  assignRadialCorePositions(nodes);

  const parentNodeById = new Map<MemoryGraphNodeId, MemoryKnowledgeNode>();
  for (const node of nodes) parentNodeById.set(node.id, node);

  const childrenByParent = new Map<MemoryGraphNodeId, MemoryKnowledgeNode[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    childrenByParent.set(node.parentId, [...(childrenByParent.get(node.parentId) ?? []), node]);
  }

  for (const [parentId, children] of childrenByParent.entries()) {
    const parent = parentNodeById.get(parentId);
    if (!parent) continue;

    const parentX = parent.x ?? 0;
    const parentY = parent.y ?? 0;
    const childRadius = Math.max(170, Math.min(430, 120 + children.length * 14));
    children.forEach((child, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, children.length);
      child.x = parentX + Math.cos(angle) * childRadius;
      child.y = parentY + Math.sin(angle) * childRadius;
      child.fx = child.x;
      child.fy = child.y;
    });
  }
}

function createStatusGraphData(
  error: string,
  loading: boolean,
  hasRequestedCodexMemory: boolean,
): GraphData<MemoryKnowledgeNode, MemoryKnowledgeLink> {
  const statusStep = loading ? "加载" : hasRequestedCodexMemory ? "状态" : "等待加载";
  const statusTitle = loading ? "读取 Codex 记忆" : hasRequestedCodexMemory ? "读取失败" : "暂无 Codex 记忆";
  const statusCount = loading ? "读取中" : hasRequestedCodexMemory ? "不可用" : "点击加载";
  const statusSummary =
    error ||
    (hasRequestedCodexMemory
      ? "未能读取 Codex 中的记忆链路。"
      : "点击右上角加载按钮后，后台会从 Codex 中获取记忆数据并刷新图谱。");
  const statusGraphData = {
    nodes: [
      createMemoryGraphNode(
        "status",
        "status",
        statusStep,
        statusTitle,
        "本地状态",
        statusCount,
        statusSummary,
      ),
    ],
    links: [],
  };
  assignRadialChildPositions(statusGraphData.nodes);
  return statusGraphData;
}

function createExpandedGraphData(
  overview: CodexMemoryOverview,
  expandedNodeIds: MemoryGraphNodeId[],
): GraphData<MemoryKnowledgeNode, MemoryKnowledgeLink> {
  const expandedNodes = new Map<MemoryGraphNodeId, MemoryKnowledgeNode>();
  const expandedLinks = new Map<string, MemoryKnowledgeLink>();

  for (const selectedNodeId of expandedNodeIds) {
    const graphData = createExpandedGraphDataForNode(overview, selectedNodeId);
    for (const node of graphData.nodes) expandedNodes.set(node.id, node);
    for (const link of graphData.links) {
      expandedLinks.set(`${link.source}->${link.target}:${link.label}`, link);
    }
  }

  return { nodes: Array.from(expandedNodes.values()), links: Array.from(expandedLinks.values()) };
}

function createExpandedGraphDataForNode(
  overview: CodexMemoryOverview,
  selectedNodeId: MemoryGraphNodeId,
): GraphData<MemoryKnowledgeNode, MemoryKnowledgeLink> {
  if (selectedNodeId === "projects") {
    const expandedNodes = overview.projectGroups.map((group, index) => createProjectChildNode(group, index));
    const expandedLinks = expandedNodes.map((child) => createMemoryGraphLink(selectedNodeId, child.id, child.relationLabel));
    return { nodes: expandedNodes, links: expandedLinks };
  }

  if (isProjectNodeId(selectedNodeId)) {
    const index = projectNodeIndex(selectedNodeId);
    const group = overview.projectGroups[index];
    if (!group) return { nodes: [], links: [] };

    const projectNode = createProjectChildNode(group, index);
    const fileNodes = group.files.map((file, fileIndex) => createFileChildNode(file, selectedNodeId, fileIndex));
    return {
      nodes: [projectNode, ...fileNodes],
      links: [
        createMemoryGraphLink("projects", projectNode.id, projectNode.relationLabel),
        ...fileNodes.map((child) => createMemoryGraphLink(selectedNodeId, child.id, child.relationLabel)),
      ],
    };
  }

  if (selectedNodeId === "corrections" && overview.correctionNotes.length > 0) {
    const expandedNodes = overview.correctionNotes.map((note, index) =>
      createChildGraphNode(
        `child-node:corrections:note:${index}`,
        selectedNodeId,
        "child",
        "纠偏 note",
        note.correctedMemory || note.id,
        "纠偏记录",
        formatTime(note.createdAt),
        note.relatedFile ? `相关对象：${note.relatedFile}` : "Codex ad-hoc correction note",
      ),
    );
    const expandedLinks = expandedNodes.map((child) => createMemoryGraphLink(selectedNodeId, child.id, child.relationLabel));
    return { nodes: expandedNodes, links: expandedLinks };
  }

  const filesForGraphNode = overview.memoryFiles.filter((file) => isFileForGraphNode(file, selectedNodeId));
  const expandedNodes = filesForGraphNode.map((file, index) => createFileChildNode(file, selectedNodeId, index));
  const expandedLinks = expandedNodes.map((child) => createMemoryGraphLink(selectedNodeId, child.id, child.relationLabel));
  return { nodes: expandedNodes, links: expandedLinks };
}

function createOverviewGraphData(
  overview: CodexMemoryOverview,
  expandedGraphNodes: MemoryGraphNodeId[],
): GraphData<MemoryKnowledgeNode, MemoryKnowledgeLink> {
  const indexCount = countMemoryFiles(overview, (kind) => kind === "memory_index");
  const summaryCount = countMemoryFiles(overview, (kind) => kind === "summary" || kind === "global");
  const rawCount = countMemoryFiles(overview, (kind) => kind === "raw");
  const rolloutCount = countMemoryFiles(overview, (kind) => kind === "rollout");
  const correctionCount = countMemoryFiles(overview, (kind) => kind === "correction");
  const extensionCount = countMemoryFiles(overview, (kind) => kind === "chronicle" || kind === "memory_extension");
  const generatedCount = countMemoryFiles(
    overview,
    (kind) => !["correction", "chronicle", "memory_extension"].includes(kind),
  );
  const recallCount = generatedCount + correctionCount + extensionCount;
  const expandedGraphData = createExpandedGraphData(overview, expandedGraphNodes);

  const overviewGraphData = {
    nodes: [
      createMemoryGraphNode(
        "root",
        "root",
        "中心",
        "Codex 记忆",
        "关系总览",
        `${overview.totalFileCount} 个总线索`,
        `${overview.settings.memoriesFeatureEnabled ? "记忆已启用" : "记忆未启用"}；全部可视记忆线索，最近更新 ${formatTime(overview.latestModifiedAt)}`,
      ),
      createMemoryGraphNode(
        "generation",
        "system",
        "生成",
        "生成状态",
        "生成策略",
        `${generatedCount} 个生成线索`,
        "生成线索只统计 Codex 生成的索引、摘要、原始材料和会话摘要，不包含纠偏层与扩展记忆。",
        true,
      ),
      createMemoryGraphNode(
        "memory-index",
        "memory",
        "索引",
        "MEMORY.md",
        "生成索引",
        `${indexCount} 个文件`,
        "索引文件用于汇总可召回的长期记忆主题。",
        true,
      ),
      createMemoryGraphNode(
        "memory-summary",
        "memory",
        "摘要",
        "memory_summary.md",
        "全局摘要",
        `${summaryCount} 个文件`,
        "摘要文件压缩用户偏好、项目主题和跨会话经验。",
        true,
      ),
      createMemoryGraphNode(
        "memory-raw",
        "memory",
        "原始",
        "raw_memories.md",
        "原始材料",
        `${rawCount} 个文件`,
        "原始记忆保留生成前的片段材料，不作为默认手工编辑入口。",
        true,
      ),
      createMemoryGraphNode(
        "rollout",
        "memory",
        "会话",
        "rollout summaries",
        "会话摘要",
        `${rolloutCount} 个文件`,
        "rollout 是 Codex 为历史任务生成的会话级记忆摘要，用来沉淀任务、上下文和结果。",
        true,
      ),
      createMemoryGraphNode(
        "projects",
        "project",
        "项目",
        "项目归属",
        "上下文归类",
        `${overview.totalProjectCount} 个项目`,
        "项目归属由生成记忆中的 cwd/project path 解析而来，图谱默认只展示聚合关系。",
        true,
      ),
      createMemoryGraphNode(
        "corrections",
        "correction",
        "纠偏",
        "纠偏层",
        "纠偏覆盖",
        correctionCount > 0 ? `${correctionCount} 条纠偏` : "暂无纠偏",
        "Codex 自身的 ad-hoc notes 纠偏层会覆盖或修正长期记忆偏差，不直接改写生成记忆。",
        true,
      ),
      createMemoryGraphNode(
        "extensions",
        "extension",
        "扩展",
        "扩展记忆",
        "扩展补充",
        extensionCount > 0 ? `${extensionCount} 个扩展文件` : "暂无扩展",
        "Chronicle 等扩展记忆在启用并授权后生成额外本地记忆，未启用时计数为 0 是正常状态。",
        true,
      ),
      createMemoryGraphNode(
        "recall",
        "recall",
        "召回",
        "召回使用",
        "参与召回",
        `${recallCount} 个可召回文件`,
        "use_memories 开启时，相关本地记忆可被注入未来任务；generate_memories 控制新任务是否成为未来记忆输入。",
        true,
      ),
      ...expandedGraphData.nodes,
    ],
    links: [
      createMemoryGraphLink("root", "generation", "生成策略"),
      createMemoryGraphLink("root", "memory-index", "索引线索"),
      createMemoryGraphLink("root", "memory-summary", "摘要线索"),
      createMemoryGraphLink("root", "memory-raw", "原始线索"),
      createMemoryGraphLink("root", "rollout", "会话线索"),
      createMemoryGraphLink("root", "projects", "项目归属"),
      createMemoryGraphLink("root", "corrections", "纠偏覆盖"),
      createMemoryGraphLink("root", "extensions", "扩展补充"),
      createMemoryGraphLink("root", "recall", "召回路径"),
      createMemoryGraphLink("generation", "memory-index", "生成索引"),
      createMemoryGraphLink("generation", "memory-summary", "生成摘要"),
      createMemoryGraphLink("generation", "memory-raw", "生成原始材料"),
      createMemoryGraphLink("generation", "rollout", "生成会话摘要"),
      createMemoryGraphLink("memory-index", "recall", "参与召回"),
      createMemoryGraphLink("memory-summary", "recall", "参与召回"),
      createMemoryGraphLink("memory-raw", "recall", "参与召回"),
      createMemoryGraphLink("rollout", "recall", "参与召回"),
      createMemoryGraphLink("projects", "recall", "上下文匹配"),
      createMemoryGraphLink("corrections", "recall", "纠偏参与召回"),
      createMemoryGraphLink("extensions", "recall", "扩展参与召回"),
      ...expandedGraphData.links,
    ],
  };
  assignRadialChildPositions(overviewGraphData.nodes);
  return overviewGraphData;
}

export default function CodexMemoryView() {
  const graphStageRef = useRef<HTMLDivElement | null>(null);
  const pinnedDetailRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraphMethods<MemoryKnowledgeNode, MemoryKnowledgeLink> | undefined>(undefined);
  const memoryRefreshCompletionFrameRef = useRef<number | null>(null);
  const [overview, setOverview] = useState<CodexMemoryOverview | null>(() => lastCodexMemoryOverview);
  const [selectedGraphNode, setSelectedGraphNode] = useState<MemoryGraphNodeId>("root");
  const [selectedDetailGraphNode, setSelectedDetailGraphNode] = useState<MemoryGraphNodeId | null>(null);
  const [memoryPinnedDetail, setMemoryPinnedDetail] = useState<MemoryPinnedDetailState | null>(null);
  const [memoryRefreshPhase, setMemoryRefreshPhase] = useState<MemoryRefreshPhase>("idle");
  const [memoryRefreshPressed, setMemoryRefreshPressed] = useState(false);
  const [hasRequestedCodexMemory, setHasRequestedCodexMemory] = useState(() => lastCodexMemoryOverview !== null);
  const [expandedGraphNodes, setExpandedGraphNodes] = useState<MemoryGraphNodeId[]>([]);
  const [graphSize, setGraphSize] = useState({ width: 900, height: 600 });

  const {
    loading,
    error: overviewError,
    run: loadCodexMemoryOverview,
  } = useRequest(nativeApi.codexMemoryOverview, {
    manual: true,
    onBefore: () => {
      if (memoryRefreshCompletionFrameRef.current !== null) {
        window.clearTimeout(memoryRefreshCompletionFrameRef.current);
      }
      setHasRequestedCodexMemory(true);
      setMemoryRefreshPhase("loading");
    },
    onSuccess: (nextOverview) => {
      lastCodexMemoryOverview = nextOverview;
      setOverview(nextOverview);
      setMemoryRefreshPhase("success");
      memoryRefreshCompletionFrameRef.current = window.setTimeout(() => setMemoryRefreshPhase("idle"), 1200);
    },
    onError: () => {
      setMemoryRefreshPhase("error");
    },
  });
  const error = overviewError ? `读取 Codex 记忆失败：${String(overviewError)}` : "";

  const memoryGraphData = useMemo<GraphData<MemoryKnowledgeNode, MemoryKnowledgeLink>>(
    () =>
      overview
        ? createOverviewGraphData(overview, expandedGraphNodes)
        : createStatusGraphData(error, loading, hasRequestedCodexMemory),
    [error, expandedGraphNodes, hasRequestedCodexMemory, loading, overview],
  );

  const positionMemoryPinnedDetail = useCallback(
    (event?: MouseEvent) => {
      const bounds = graphStageRef.current?.getBoundingClientRect();
      const stageWidth = bounds?.width ?? graphSize.width;
      const stageHeight = bounds?.height ?? graphSize.height;
      const rawLeft = event && bounds ? event.clientX - bounds.left + 14 : 18;
      const rawTop = event && bounds ? event.clientY - bounds.top + 14 : 18;
      const maxLeft = Math.max(18, stageWidth - 620);
      const maxTop = Math.max(18, stageHeight - 520);

      return {
        left: Math.min(Math.max(18, rawLeft), maxLeft),
        top: Math.min(Math.max(18, rawTop), maxTop),
      };
    },
    [graphSize.height, graphSize.width],
  );

  const pinnedDetailContent = useMemo(() => {
    if (!overview || !memoryPinnedDetail) return null;
    const node = memoryGraphData.nodes.find((candidate) => candidate.id === memoryPinnedDetail.nodeId);
    if (!node) return null;
    return createMemoryPinnedDetailHtml(overview, node, memoryPinnedDetail.nodeId);
  }, [memoryGraphData.nodes, memoryPinnedDetail, overview]);

  useEffect(() => {
    if (!memoryPinnedDetail) return;
    if (memoryGraphData.nodes.some((node) => node.id === memoryPinnedDetail.nodeId)) return;
    setMemoryPinnedDetail(null);
    setSelectedDetailGraphNode(null);
  }, [memoryGraphData.nodes, memoryPinnedDetail]);

  const closeMemoryPinnedDetail = useCallback(() => {
    setSelectedDetailGraphNode(null);
    setMemoryPinnedDetail(null);
  }, []);

  const handleMemoryPinnedDetailLeave = useCallback(() => {
    closeMemoryPinnedDetail();
  }, [closeMemoryPinnedDetail]);

  const isPointerInsidePinnedDetailSafeZone = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".ccr-memory-pinned-tooltip")) return true;

    const bounds = pinnedDetailRef.current?.getBoundingClientRect();
    if (!bounds) return false;

    const safePadding = 28;
    return (
      event.clientX >= bounds.left - safePadding &&
      event.clientX <= bounds.right + safePadding &&
      event.clientY >= bounds.top - safePadding &&
      event.clientY <= bounds.bottom + safePadding
    );
  }, []);

  const handleMemoryGraphCanvasPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!memoryPinnedDetail) return;
      if (isPointerInsidePinnedDetailSafeZone(event)) return;
      closeMemoryPinnedDetail();
    },
    [closeMemoryPinnedDetail, isPointerInsidePinnedDetailSafeZone, memoryPinnedDetail],
  );

  const stopMemoryPinnedDetailEvent = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const handleCodexMemoryRefresh = useCallback(() => {
    closeMemoryPinnedDetail();
    setMemoryRefreshPressed(false);
    loadCodexMemoryOverview();
  }, [closeMemoryPinnedDetail, loadCodexMemoryOverview]);

  const handleCodexMemoryRefreshPointerDown = useCallback(() => {
    if (loading) return;
    setMemoryRefreshPressed(true);
  }, [loading]);

  const handleCodexMemoryRefreshPointerUp = useCallback(() => {
    setMemoryRefreshPressed(false);
  }, []);

  const handleMemoryGraphNodeClick = useCallback(
    (node: NodeObject<MemoryKnowledgeNode>, event?: MouseEvent) => {
      if (!node.id) return;
      const nextNodeId = String(node.id) as MemoryGraphNodeId;

      setSelectedGraphNode(nextNodeId);
      if (isExpandableGraphNode(node)) {
        closeMemoryPinnedDetail();
        setExpandedGraphNodes((current) => {
          if (current.includes(nextNodeId)) {
            return current.filter((id) => id !== nextNodeId && !isExpandedDescendantNode(id, nextNodeId));
          }
          return [...current, nextNodeId];
        });
        return;
      }

      if (!isDetailGraphNode(nextNodeId)) {
        closeMemoryPinnedDetail();
        return;
      }

      const position = positionMemoryPinnedDetail(event);
      if (memoryPinnedDetail?.nodeId === nextNodeId) {
        closeMemoryPinnedDetail();
      } else {
        setSelectedDetailGraphNode(nextNodeId);
        setMemoryPinnedDetail({ nodeId: nextNodeId, ...position });
      }
    },
    [closeMemoryPinnedDetail, memoryPinnedDetail?.nodeId, positionMemoryPinnedDetail],
  );

  useEffect(() => {
    const element = graphStageRef.current;
    if (!element) return;

    const updateGraphSize = () => {
      setGraphSize({
        width: Math.max(320, element.clientWidth),
        height: Math.max(320, element.clientHeight),
      });
    };

    updateGraphSize();
    const observer = new ResizeObserver(updateGraphSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (memoryGraphData.nodes.length === 0) return;
    const timeout = window.setTimeout(() => {
      graphRef.current?.zoomToFit(360, 76);
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [memoryGraphData]);

  useEffect(() => {
    return () => {
      if (memoryRefreshCompletionFrameRef.current !== null) {
        window.clearTimeout(memoryRefreshCompletionFrameRef.current);
      }
    };
  }, []);

  const paintMemoryGraphNode = useCallback(
    (node: NodeObject<MemoryKnowledgeNode>, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const box = measureMemoryGraphNode(node, ctx, globalScale);
      const isActive = selectedGraphNode === node.id || selectedGraphNode === node.parentId;

      drawMemoryGraphNodeBox(ctx, x, y, box.width, box.height, box.radius);
      ctx.fillStyle = isActive ? "#f6fbff" : "#ffffff";
      ctx.fill();
      ctx.lineWidth = (isActive ? 2 : 1) / globalScale;
      ctx.strokeStyle = isActive ? "#3f7ea8" : "rgba(118, 125, 136, 0.46)";
      ctx.stroke();

      const markerRadius = 4.5 / globalScale;
      ctx.beginPath();
      ctx.arc(
        x - box.width / 2 + box.paddingX,
        y - box.height / 2 + box.paddingY + markerRadius,
        markerRadius,
        0,
        2 * Math.PI,
      );
      ctx.fillStyle = node.color;
      ctx.fill();

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = `600 ${box.metaFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillStyle = "#6a7079";
      ctx.fillText(
        truncateCanvasText(ctx, node.step ?? "", box.textWidth - 12 / globalScale),
        x - box.width / 2 + box.paddingX + 12 / globalScale,
        y - box.height / 2 + box.paddingY,
      );

      ctx.font = `650 ${box.titleFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillStyle = "#202225";
      ctx.fillText(
        truncateCanvasText(ctx, node.title ?? "", box.textWidth),
        x - box.width / 2 + box.paddingX,
        y - box.height / 2 + box.paddingY + 18 / globalScale,
      );

      ctx.font = `500 ${box.metaFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillStyle = "#747982";
      ctx.fillText(
        truncateCanvasText(ctx, `${node.relationLabel} · ${node.countLabel}`, box.textWidth),
        x - box.width / 2 + box.paddingX,
        y - box.height / 2 + box.paddingY + 39 / globalScale,
      );
    },
    [selectedGraphNode],
  );

  const paintMemoryGraphNodePointerArea = useCallback(
    (node: NodeObject<MemoryKnowledgeNode>, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const box = measureMemoryGraphNode(node, ctx, globalScale);
      drawMemoryGraphNodeBox(ctx, x, y, box.width, box.height, box.radius);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [],
  );

  const graphLinkWidth = useCallback(
    (link: LinkObject<MemoryKnowledgeNode, MemoryKnowledgeLink>) => {
      const source = nodeRelationEndpoint(link.source);
      const target = nodeRelationEndpoint(link.target);
      return source === selectedGraphNode || target === selectedGraphNode ? 2.3 : 1.2;
    },
    [selectedGraphNode],
  );

  const memoryRefreshStatusText =
    memoryRefreshPhase === "loading"
      ? "正在从 Codex 获取记忆"
      : memoryRefreshPhase === "success"
        ? "加载完成"
        : memoryRefreshPhase === "error"
          ? "重新加载失败"
          : "";
  const memoryRefreshActionLabel = overview ? "重新加载记忆" : "立即加载";
  const shouldShowCodexMemoryEmptyState = !overview;
  const showMemoryRefreshButton = Boolean(overview);
  const showMemoryRefreshStatus = memoryRefreshPhase !== "idle";
  const refreshButtonClassName = [
    "ccr-memory-refresh-button",
    memoryRefreshPressed ? "ccr-memory-refresh-button--pressed" : "",
    loading ? "ccr-memory-refresh-button--loading" : "",
    memoryRefreshPhase === "success" ? "ccr-memory-refresh-button--success" : "",
    memoryRefreshPhase === "error" ? "ccr-memory-refresh-button--error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (shouldShowCodexMemoryEmptyState) {
    return (
      <div className="ccr-memory-view">
        <div className="ccr-memory-empty-page">
          <div className="ccr-memory-empty-content">
            <h2>暂无 Codex 记忆</h2>
            <p>点击立即加载后，后台会从 Codex 中获取记忆数据并展示知识图谱。</p>
            {showMemoryRefreshStatus ? (
              <div className={`ccr-memory-loading-overlay ${memoryRefreshPhase}`} aria-live="polite">
                <RefreshCwIcon className={loading ? "spinning" : undefined} />
                <span>{memoryRefreshStatusText}</span>
              </div>
            ) : null}
            <button
              className={`ccr-memory-empty-action${memoryRefreshPressed ? " ccr-memory-empty-action--pressed" : ""}`}
              type="button"
              onClick={handleCodexMemoryRefresh}
              onPointerDown={handleCodexMemoryRefreshPointerDown}
              onPointerUp={handleCodexMemoryRefreshPointerUp}
              onPointerCancel={handleCodexMemoryRefreshPointerUp}
              onPointerLeave={handleCodexMemoryRefreshPointerUp}
              disabled={loading}
            >
              <RefreshCwIcon className={loading ? "spinning" : undefined} />
              <span>{loading ? "刷新中" : memoryRefreshActionLabel}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ccr-memory-view">
      <div className="ccr-memory-graph-page">
        <div ref={graphStageRef} className="ccr-memory-graph-stage">
          <div
            className={`ccr-memory-graph-canvas${memoryPinnedDetail ? " ccr-memory-graph-canvas--detail-open" : ""}`}
            onPointerMoveCapture={handleMemoryGraphCanvasPointerMove}
          >
            <ForceGraph2D
              ref={graphRef}
              width={graphSize.width}
              height={graphSize.height}
              graphData={memoryGraphData}
              nodeId="id"
              nodeVal="val"
              nodeLabel={(node) => createMemoryGraphNodeLabel(node)}
              nodeColor={(node) => node.color}
              nodeCanvasObject={paintMemoryGraphNode}
              nodePointerAreaPaint={paintMemoryGraphNodePointerArea}
              linkLabel={(link) => link.label}
              linkColor={(link) => link.color}
              linkWidth={graphLinkWidth}
              linkDirectionalArrowLength={5}
              linkDirectionalArrowRelPos={1}
              cooldownTicks={80}
              d3VelocityDecay={0.34}
              onNodeClick={handleMemoryGraphNodeClick}
              enableNodeDrag={true}
              enablePointerInteraction={!memoryPinnedDetail}
              enablePanInteraction={true}
              enableZoomInteraction={true}
              minZoom={0.25}
              maxZoom={3}
              backgroundColor="rgba(0,0,0,0)"
            />
            {showMemoryRefreshStatus ? (
              <div className={`ccr-memory-loading-overlay ${memoryRefreshPhase}`} aria-live="polite">
                <RefreshCwIcon className={loading ? "spinning" : undefined} />
                <span>{memoryRefreshStatusText}</span>
              </div>
            ) : null}
            {showMemoryRefreshButton ? (
              <button
                className={refreshButtonClassName}
                type="button"
                onClick={handleCodexMemoryRefresh}
                onPointerDown={handleCodexMemoryRefreshPointerDown}
                onPointerUp={handleCodexMemoryRefreshPointerUp}
                onPointerCancel={handleCodexMemoryRefreshPointerUp}
                onPointerLeave={handleCodexMemoryRefreshPointerUp}
                disabled={loading}
                title={loading ? "刷新中" : memoryRefreshActionLabel}
                aria-label={loading ? "刷新中" : memoryRefreshActionLabel}
              >
                <RefreshCwIcon className={loading ? "spinning" : undefined} />
              </button>
            ) : null}
            {selectedDetailGraphNode && memoryPinnedDetail && pinnedDetailContent ? (
              <div
                className="ccr-memory-pinned-tooltip float-tooltip-kap"
                ref={pinnedDetailRef}
                style={{ left: memoryPinnedDetail.left, top: memoryPinnedDetail.top }}
                onMouseLeave={handleMemoryPinnedDetailLeave}
                onPointerMoveCapture={stopMemoryPinnedDetailEvent}
                onMouseMoveCapture={stopMemoryPinnedDetailEvent}
                onMouseOverCapture={stopMemoryPinnedDetailEvent}
                onWheelCapture={stopMemoryPinnedDetailEvent}
                dangerouslySetInnerHTML={{ __html: pinnedDetailContent }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
