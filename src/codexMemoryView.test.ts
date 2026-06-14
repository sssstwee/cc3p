import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8").replace(/\r\n/g, "\n");
}

test("Codex memory view is wired into the app shell and native API", () => {
  const appUiStore = readSource("./store/useAppUiStore.ts");
  const appSidebar = readSource("./features/app-shell/AppSidebar.tsx");
  const appTsx = readSource("./App.tsx");
  const nativeIpc = readSource("./nativeIpc.ts");
  const nativeApi = readSource("./nativeApi.ts");
  const viewPath = new URL("./CodexMemoryView.tsx", import.meta.url);

  assert.equal(existsSync(viewPath), true);
  assert.equal(appUiStore.includes('"memory"'), true);
  assert.equal(appSidebar.includes("onMemoryView"), true);
  assert.equal(appSidebar.includes("记忆整理"), true);
  assert.equal(appTsx.includes('lazy(() => import("./CodexMemoryView.tsx"))'), true);
  assert.equal(appTsx.includes('view === "memory"'), true);
  assert.equal(nativeIpc.includes('codexMemoryOverview: "codex_memory_overview"'), true);
  assert.equal(nativeIpc.includes('saveCodexMemorySettings: "save_codex_memory_settings"'), true);
  assert.equal(nativeIpc.includes('createCodexMemoryCorrection: "create_codex_memory_correction"'), true);
  assert.equal(nativeApi.includes("codexMemoryOverview:"), true);
  assert.equal(nativeApi.includes("saveCodexMemorySettings:"), true);
  assert.equal(nativeApi.includes("createCodexMemoryCorrection:"), true);
});

test("Codex memory view exposes generated memory and correction graph nodes without config/thread nodes", () => {
  const appTypes = readSource("./appTypes.ts");
  const viewSource = readSource("./CodexMemoryView.tsx");

  for (const typeName of [
    "CodexMemoryOverview",
    "CodexMemoryFile",
    "CodexMemoryProjectGroup",
    "CodexMemoryInstructionSource",
    "CodexMemorySettings",
    "CodexMemoryCorrectionNote",
  ]) {
    assert.equal(appTypes.includes(`export type ${typeName}`), true, `${typeName} should be exported`);
  }

  for (const label of ["Codex 记忆", "生成状态", "纠偏层", "项目归属", "召回使用"]) {
    assert.equal(viewSource.includes(label), true, `view should include ${label}`);
  }

  assert.equal(viewSource.includes("overview.totalProjectCount"), true);
  assert.equal(viewSource.includes("createOverviewGraphData"), true);
  assert.equal(viewSource.includes("createMemoryGraphNode"), true);
  assert.equal(viewSource.includes('"settings"'), false);
  assert.equal(viewSource.includes('"thread"'), false);
  assert.equal(viewSource.includes("启用配置"), false);
  assert.equal(viewSource.includes("线程控制"), false);
  assert.equal(viewSource.includes("配置控制"), false);
  assert.equal(viewSource.includes("线程覆盖"), false);
  assert.equal(viewSource.includes("createCodexMemoryCorrection"), false);
  assert.equal(viewSource.includes("saveCodexMemorySettings"), false);
  assert.equal(viewSource.includes("关联项目"), false);
  assert.equal(viewSource.includes("关联文件"), false);
});

test("Codex memory view presents native memory relationships as a knowledge graph", () => {
  const viewSource = readSource("./CodexMemoryView.tsx");

  for (const label of [
    "Codex 记忆",
    "生成状态",
    "MEMORY.md",
    "memory_summary.md",
    "raw_memories.md",
    "rollout summaries",
    "纠偏层",
    "扩展记忆",
    "召回使用",
    "项目归属",
  ]) {
    assert.equal(viewSource.includes(label), true, `knowledge graph should include ${label}`);
  }

  assert.equal(viewSource.includes("MemoryGraphNodeId"), true);
  assert.equal(viewSource.includes("selectedGraphNode"), true);
  assert.equal(viewSource.includes("createOverviewGraphData"), true);
  assert.equal(viewSource.includes("createMemoryGraphLink"), true);
  assert.equal(viewSource.includes("relationLabel"), true);
  assert.equal(viewSource.includes("countLabel"), true);
  assert.equal(viewSource.includes("线程级开关"), false);
  assert.equal(viewSource.includes("暂无扩展"), true);
  assert.equal(viewSource.includes("Chronicle 等扩展记忆"), true);
  assert.equal(viewSource.includes("{node.fileCount} 个文件"), false);
  assert.equal(viewSource.includes("{activeGraphPanel.fileCount} 个文件"), false);
});

test("Codex memory page only renders the full-page knowledge graph surface", () => {
  const viewSource = readSource("./CodexMemoryView.tsx");
  const appCss = readSource("./App.css");

  assert.equal(viewSource.includes('className="ccr-memory-graph-page"'), true);
  assert.equal(viewSource.includes('className="ccr-memory-graph-stage"'), true);
  assert.equal(viewSource.includes("ccr-memory-graph-canvas"), true);
  assert.equal(viewSource.includes('className="ccr-memory-graph-toolbar"'), false);
  assert.equal(viewSource.includes('className="ccr-memory-graph-stats"'), false);
  assert.equal(viewSource.includes('className="ccr-memory-graph-detail"'), false);
  assert.equal(viewSource.includes('className="ccr-memory-summary-grid"'), false);
  assert.equal(viewSource.includes('className="ccr-memory-section ccr-memory-flow-section"'), false);
  assert.equal(viewSource.includes("ccr-memory-file-thumb"), false);
  assert.equal(viewSource.includes("ccr-memory-project-files"), false);
  assert.equal(viewSource.includes("ccr-memory-file-list"), false);
  assert.equal(viewSource.includes("ccr-memory-file-row"), false);
  assert.equal(appCss.includes(".ccr-memory-graph-page"), true);
  assert.equal(appCss.includes(".ccr-memory-graph-stage"), true);
  assert.equal(appCss.includes(".ccr-memory-graph-canvas"), true);
  assert.equal(appCss.includes(".ccr-main-memory"), true);
  assert.equal(appCss.includes("padding: 0;"), true);
  assert.equal(appCss.includes(".ccr-memory-graph-toolbar"), false);
  assert.equal(appCss.includes(".ccr-memory-graph-stats"), false);
  assert.equal(appCss.includes(".ccr-memory-graph-detail"), false);
  assert.equal(appCss.includes(".ccr-memory-file-thumb"), false);
  assert.equal(appCss.includes(".ccr-memory-project-files"), false);
});

test("Codex memory graph has a top-right refresh action backed by ahooks loading state", () => {
  const viewSource = readSource("./CodexMemoryView.tsx");
  const appCss = readSource("./App.css");
  const packageJson = readSource("../package.json");

  assert.equal(packageJson.includes('"ahooks"'), true);
  assert.equal(viewSource.includes('import { useRequest } from "ahooks"'), true);
  assert.equal(viewSource.includes("ArrowsClockwise as RefreshCwIcon"), true);
  assert.equal(viewSource.includes("useRequest(nativeApi.codexMemoryOverview"), true);
  assert.equal(viewSource.includes("manual: true"), true);
  assert.equal(viewSource.includes("run: loadCodexMemoryOverview"), true);
  assert.equal(viewSource.includes("lastCodexMemoryOverview"), true);
  assert.equal(viewSource.includes("useState<CodexMemoryOverview | null>(() => lastCodexMemoryOverview)"), true);
  assert.equal(viewSource.includes("hasRequestedCodexMemory"), true);
  assert.equal(viewSource.includes("useState(() => lastCodexMemoryOverview !== null)"), true);
  assert.equal(viewSource.includes('setHasRequestedCodexMemory(true)'), true);
  assert.equal(viewSource.includes("lastCodexMemoryOverview = nextOverview"), true);
  assert.equal(viewSource.includes("refresh: refreshCodexMemoryOverview"), false);
  assert.equal(viewSource.includes("shouldShowCodexMemoryEmptyState"), true);
  assert.equal(viewSource.includes("ccr-memory-empty-page"), true);
  assert.equal(viewSource.includes("ccr-memory-empty-action"), true);
  assert.equal(viewSource.includes("ccr-memory-empty-kicker"), false);
  assert.equal(viewSource.includes("立即加载"), true);
  assert.equal(viewSource.includes("重新加载记忆"), true);
  assert.equal(viewSource.includes("MemoryRefreshPhase"), true);
  assert.equal(viewSource.includes("memoryRefreshPhase"), true);
  assert.equal(viewSource.includes("memoryRefreshPressed"), true);
  assert.equal(viewSource.includes("memoryRefreshCompletionFrameRef"), true);
  assert.equal(viewSource.includes("onBefore: () =>"), true);
  assert.equal(viewSource.includes('setMemoryRefreshPhase("loading")'), true);
  assert.equal(viewSource.includes('setMemoryRefreshPhase("success")'), true);
  assert.equal(viewSource.includes('setMemoryRefreshPhase("error")'), true);
  assert.equal(viewSource.includes("handleCodexMemoryRefresh"), true);
  assert.equal(viewSource.includes("handleCodexMemoryRefreshPointerDown"), true);
  assert.equal(viewSource.includes("handleCodexMemoryRefreshPointerUp"), true);
  assert.equal(viewSource.includes("loadCodexMemoryOverview();"), true);
  assert.equal(viewSource.includes('className={refreshButtonClassName}'), true);
  assert.equal(viewSource.includes('"ccr-memory-refresh-button"'), true);
  assert.equal(viewSource.includes("ccr-memory-refresh-button--pressed"), true);
  assert.equal(viewSource.includes("ccr-memory-refresh-button--loading"), true);
  assert.equal(viewSource.includes("onClick={handleCodexMemoryRefresh}"), true);
  assert.equal(viewSource.includes("onPointerDown={handleCodexMemoryRefreshPointerDown}"), true);
  assert.equal(viewSource.includes("onPointerUp={handleCodexMemoryRefreshPointerUp}"), true);
  assert.equal(viewSource.includes("onPointerCancel={handleCodexMemoryRefreshPointerUp}"), true);
  assert.equal(viewSource.includes("disabled={loading}"), true);
  assert.equal(viewSource.includes('const memoryRefreshActionLabel = overview ? "重新加载记忆" : "立即加载";'), true);
  assert.equal(viewSource.includes("loading ? \"刷新中\" : memoryRefreshActionLabel"), true);
  assert.equal(viewSource.includes("loading ? \"spinning\" : undefined"), true);
  assert.equal(viewSource.includes("ccr-memory-loading-overlay"), true);
  assert.equal(viewSource.includes("暂无 Codex 记忆"), true);
  assert.equal(viewSource.includes("点击加载"), true);
  assert.equal(viewSource.includes("Codex Home"), false);
  assert.equal(viewSource.includes("用户 Codex"), false);
  assert.equal(viewSource.includes("Codex 中获取记忆数据"), true);
  assert.equal(viewSource.includes("正在从 Codex 获取记忆"), true);
  assert.equal(viewSource.includes("加载完成"), true);
  assert.equal(viewSource.includes("重新加载失败"), true);
  assert.equal(viewSource.includes("showMemoryRefreshButton"), true);
  assert.equal(viewSource.includes("{showMemoryRefreshButton ? ("), true);
  assert.equal(viewSource.includes("useEffect(() => {\n    let cancelled = false;"), false);
  assert.equal(appCss.includes(".ccr-memory-empty-page"), true);
  assert.equal(appCss.includes(".ccr-memory-empty-action"), true);
  assert.equal(appCss.includes(".ccr-memory-refresh-button"), true);
  assert.equal(appCss.includes(".ccr-memory-refresh-button--pressed"), true);
  assert.equal(appCss.includes(".ccr-memory-refresh-button--loading"), true);
  assert.equal(appCss.includes(".ccr-memory-refresh-button svg"), true);
  assert.equal(appCss.includes(".ccr-memory-loading-overlay"), true);
  assert.equal(appCss.includes(".ccr-memory-loading-overlay.success"), true);
  assert.equal(appCss.includes(".ccr-memory-loading-overlay.error"), true);
});

test("Codex memory graph aggregates projects by default without local project node clutter", () => {
  const viewSource = readSource("./CodexMemoryView.tsx");

  assert.equal(viewSource.includes('"projects"'), true);
  assert.equal(viewSource.includes("overview.totalProjectCount"), true);
  assert.equal(viewSource.includes("图谱默认只展示聚合关系"), true);
  assert.equal(viewSource.includes("projectGraphPanels"), false);
  assert.equal(viewSource.includes("visibleProjectGraphPanels"), false);
  assert.equal(viewSource.includes("hasProjectGraphSearch"), false);
  assert.equal(viewSource.includes("MAX_VISIBLE_PROJECT_GRAPH_NODES"), false);
  assert.equal(viewSource.includes('project:${index}'), false);
  assert.equal(viewSource.includes("...projectGraphPanels"), false);
  assert.equal(viewSource.includes("匹配项目"), false);
});

test("Codex memory graph expands child nodes from the clicked node", () => {
  const viewSource = readSource("./CodexMemoryView.tsx");

  assert.equal(viewSource.includes("createExpandedGraphData"), true);
  assert.equal(viewSource.includes("createChildGraphNode"), true);
  assert.equal(viewSource.includes("expandedNodes"), true);
  assert.equal(viewSource.includes("expandedLinks"), true);
  assert.equal(viewSource.includes("selectedGraphNode"), true);
  assert.equal(viewSource.includes("expandedGraphNodes"), true);
  assert.equal(viewSource.includes("createOverviewGraphData(overview, expandedGraphNodes)"), true);
  assert.equal(viewSource.includes("overview.projectGroups.map((group, index) => createProjectChildNode(group, index))"), true);
  assert.equal(viewSource.includes("overview.correctionNotes.map((note, index) =>"), true);
  assert.equal(viewSource.includes("overview.memoryFiles.filter((file) => isFileForGraphNode(file, selectedNodeId))"), true);
  assert.equal(viewSource.includes("filesForGraphNode.map((file, index) => createFileChildNode(file, selectedNodeId, index))"), true);
  assert.equal(viewSource.includes('createMemoryGraphLink(selectedNodeId, child.id, child.relationLabel)'), true);
  assert.equal(viewSource.includes("MAX_EXPANDED_CHILD_NODES"), false);
  assert.equal(viewSource.includes("slice(0, MAX_EXPANDED_CHILD_NODES)"), false);
});

test("Codex memory graph toggles expanded parent nodes", () => {
  const viewSource = readSource("./CodexMemoryView.tsx");

  assert.equal(viewSource.includes("useState<MemoryGraphNodeId[]>([])"), true);
  assert.equal(viewSource.includes("isExpandableGraphNode"), true);
  assert.equal(viewSource.includes("node.expandable === true"), true);
  assert.equal(viewSource.includes("setExpandedGraphNodes((current) =>"), true);
  assert.equal(viewSource.includes("current.includes(nextNodeId)"), true);
  assert.equal(
    viewSource.includes("current.filter((id) => id !== nextNodeId && !isExpandedDescendantNode(id, nextNodeId))"),
    true,
  );
  assert.equal(viewSource.includes("return [...current, nextNodeId];"), true);
  assert.equal(viewSource.includes("isExpandedDescendantNode"), true);
  assert.equal(viewSource.includes('collapsedNodeId === "projects" && isProjectNodeId(expandedNodeId)'), true);
});

test("Codex memory graph positions expanded children around their parent", () => {
  const viewSource = readSource("./CodexMemoryView.tsx");

  assert.equal(viewSource.includes("assignRadialChildPositions"), true);
  assert.equal(viewSource.includes("parentNodeById"), true);
  assert.equal(viewSource.includes("childRadius"), true);
  assert.equal(viewSource.includes("child.x = parentX + Math.cos(angle) * childRadius"), true);
  assert.equal(viewSource.includes("child.y = parentY + Math.sin(angle) * childRadius"), true);
  assert.equal(viewSource.includes("child.fx = child.x"), true);
  assert.equal(viewSource.includes("child.fy = child.y"), true);
  assert.equal(viewSource.includes("node.fx = node.x"), true);
  assert.equal(viewSource.includes("node.fy = node.y"), true);
  assert.equal(viewSource.includes('dagMode="radialout"'), false);
  assert.equal(viewSource.includes("dagLevelDistance={150}"), false);
});

test("Codex memory graph colors relationship clue lines by relation type", () => {
  const viewSource = readSource("./CodexMemoryView.tsx");

  assert.equal(viewSource.includes("function memoryGraphLinkColor(label: string)"), true);
  assert.equal(viewSource.includes('label.includes("纠偏")'), true);
  assert.equal(viewSource.includes('label.includes("扩展")'), true);
  assert.equal(viewSource.includes('label.includes("项目") || label.includes("上下文")'), true);
  assert.equal(viewSource.includes('label.includes("召回")'), true);
  assert.equal(viewSource.includes('label.includes("文件") || label.includes("记录")'), true);
  assert.equal(viewSource.includes("color: memoryGraphLinkColor(label)"), true);
  assert.equal(viewSource.includes('color: "rgba(112, 119, 128, 0.62)"'), false);
});

test("Codex memory graph makes the Codex memory node the radial center and distinguishes total clues from generated clues", () => {
  const viewSource = readSource("./CodexMemoryView.tsx");

  assert.equal(viewSource.includes("总线索"), true);
  assert.equal(viewSource.includes("生成线索"), true);
  assert.equal(viewSource.includes("assignRadialCorePositions"), true);
  assert.equal(viewSource.includes("coreNodeIdsAroundRoot"), true);
  assert.equal(viewSource.includes("rootRadius"), true);
  assert.equal(viewSource.includes("node.x = rootX + Math.cos(angle) * rootRadius"), true);
  assert.equal(viewSource.includes("node.y = rootY + Math.sin(angle) * rootRadius"), true);
  assert.equal(viewSource.includes('createMemoryGraphLink("root", "memory-index", "索引线索")'), true);
  assert.equal(viewSource.includes('createMemoryGraphLink("root", "memory-summary", "摘要线索")'), true);
  assert.equal(viewSource.includes('createMemoryGraphLink("root", "memory-raw", "原始线索")'), true);
  assert.equal(viewSource.includes('createMemoryGraphLink("root", "rollout", "会话线索")'), true);
  assert.equal(viewSource.includes('createMemoryGraphLink("root", "projects", "项目归属")'), true);
  assert.equal(viewSource.includes('createMemoryGraphLink("root", "corrections", "纠偏覆盖")'), true);
  assert.equal(viewSource.includes('createMemoryGraphLink("root", "extensions", "扩展补充")'), true);
  assert.equal(viewSource.includes('createMemoryGraphLink("root", "recall", "召回路径")'), true);
  assert.equal(viewSource.includes('createMemoryGraphLink("generation", "projects", "项目归属")'), false);
  assert.equal(viewSource.includes('createMemoryGraphLink("generation", "corrections", "纠偏覆盖")'), false);
  assert.equal(viewSource.includes('createMemoryGraphLink("generation", "extensions", "扩展补充")'), false);
});

test("Codex memory graph uses hover preview and a pinned detail panel that closes after inspection", () => {
  const viewSource = readSource("./CodexMemoryView.tsx");
  const appCss = readSource("./App.css");

  assert.equal(viewSource.includes("selectedDetailGraphNode"), true);
  assert.equal(viewSource.includes("MemoryPinnedDetailState"), true);
  assert.equal(viewSource.includes("memoryPinnedDetail"), true);
  assert.equal(viewSource.includes("pinnedDetailRef"), true);
  assert.equal(viewSource.includes("memoryPinnedDetailHovering"), false);
  assert.equal(viewSource.includes("positionMemoryPinnedDetail"), true);
  assert.equal(viewSource.includes("closeMemoryPinnedDetail"), true);
  assert.equal(viewSource.includes("handleMemoryPinnedDetailEnter"), false);
  assert.equal(viewSource.includes("handleMemoryPinnedDetailLeave"), true);
  assert.equal(viewSource.includes("handleMemoryGraphCanvasPointerMove"), true);
  assert.equal(viewSource.includes("isPointerInsidePinnedDetailSafeZone"), true);
  assert.equal(viewSource.includes("stopMemoryPinnedDetailEvent"), true);
  assert.equal(viewSource.includes("createMemoryPinnedDetailHtml"), true);
  assert.equal(viewSource.includes("createMemoryGraphNodeLabel"), true);
  assert.equal(viewSource.includes("formatMemoryFileDetails"), true);
  assert.equal(viewSource.includes("escapeMemoryTooltipHtml"), true);
  assert.equal(viewSource.includes("createMemoryGraphDetailLabel"), true);
  assert.equal(viewSource.includes("createMemoryGraphPreviewLabel"), true);
  assert.equal(viewSource.includes("childFileForGraphNode"), true);
  assert.equal(viewSource.includes("isDetailGraphNode"), true);
  assert.equal(viewSource.includes("return value.startsWith(\"child-node:\");"), true);
  assert.equal(viewSource.includes("if (!isDetailGraphNode(nextNodeId))"), true);
  assert.equal(viewSource.includes("closeMemoryPinnedDetail();\n        return;"), true);
  assert.equal(viewSource.includes("refreshMemoryGraphNativeTooltip"), false);
  assert.equal(viewSource.includes("memoryGraphPointerInteractionEnabled"), false);
  assert.equal(viewSource.includes("enablePointerInteraction={memoryGraphPointerInteractionEnabled}"), false);
  assert.equal(viewSource.includes("完整文件信息"), true);
  assert.equal(viewSource.includes("文件名："), true);
  assert.equal(viewSource.includes("类型："), true);
  assert.equal(viewSource.includes("大小："), true);
  assert.equal(viewSource.includes("最近更新："), true);
  assert.equal(viewSource.includes("内容："), true);
  assert.equal(viewSource.includes('class="ccr-memory-native-tooltip ccr-memory-native-tooltip-detail"'), true);
  assert.equal(viewSource.includes('class="ccr-memory-native-file-content"'), true);
  assert.equal(viewSource.includes('class="ccr-memory-native-file-grid"'), true);
  assert.equal(viewSource.includes("slice(0, MAX_TOOLTIP_DETAIL_FILES)"), true);
  assert.equal(viewSource.includes("setSelectedDetailGraphNode(nextNodeId)"), true);
  assert.equal(viewSource.includes("setSelectedDetailGraphNode(null)"), true);
  assert.equal(viewSource.includes("setMemoryPinnedDetail(null)"), true);
  assert.equal(viewSource.includes("setMemoryPinnedDetailHovering(false)"), false);
  assert.equal(viewSource.includes("enablePointerInteraction={!memoryPinnedDetail}"), true);
  assert.equal(viewSource.includes("ccr-memory-graph-canvas--detail-open"), true);
  assert.equal(viewSource.includes("onMouseEnter={handleMemoryPinnedDetailEnter}"), false);
  assert.equal(viewSource.includes("onMouseLeave={handleMemoryPinnedDetailLeave}"), true);
  assert.equal(viewSource.includes("onPointerMoveCapture={stopMemoryPinnedDetailEvent}"), true);
  assert.equal(viewSource.includes("onMouseMoveCapture={stopMemoryPinnedDetailEvent}"), true);
  assert.equal(viewSource.includes("onMouseOverCapture={stopMemoryPinnedDetailEvent}"), true);
  assert.equal(viewSource.includes("onWheelCapture={stopMemoryPinnedDetailEvent}"), true);
  assert.equal(viewSource.includes("onPointerMoveCapture={handleMemoryGraphCanvasPointerMove}"), true);
  assert.equal(viewSource.includes("pinnedDetailRef.current"), true);
  assert.equal(viewSource.includes('target?.closest(".ccr-memory-pinned-tooltip")'), true);
  assert.equal(viewSource.includes("nodeLabel={(node) => createMemoryGraphNodeLabel(node)}"), true);
  assert.equal(viewSource.includes('className="ccr-memory-pinned-tooltip float-tooltip-kap"'), true);
  assert.equal(viewSource.includes("ref={pinnedDetailRef}"), true);
  assert.equal(viewSource.includes("dangerouslySetInnerHTML"), true);
  assert.equal(viewSource.includes("relatedFilesForGraphNode"), true);
  assert.equal(viewSource.includes("compactMemoryPreview"), true);
  assert.equal(viewSource.includes("memoryKindLabel(file.kind)"), true);
  assert.equal(viewSource.includes("formatBytes(file.sizeBytes)"), true);
  assert.equal(viewSource.includes("formatTime(file.modifiedAt)"), true);
  assert.equal(viewSource.includes("file.preview || \"暂无内容\""), true);
  assert.equal(viewSource.includes(">{file.path}</"), false);
  assert.equal(viewSource.includes("MemoryGraphTooltipState"), false);
  assert.equal(viewSource.includes("createMemoryGraphTooltip"), false);
  assert.equal(viewSource.includes("onNodeHover={handleMemoryGraphNodeHover}"), false);
  assert.equal(viewSource.includes("onMouseMove={handleMemoryGraphPointerMove}"), false);
  assert.equal(viewSource.includes("ccr-memory-graph-tooltip"), false);
  assert.equal(appCss.includes(".ccr-memory-graph-tooltip"), false);
  assert.equal(appCss.includes(".ccr-memory-tooltip-file"), false);
  assert.equal(appCss.includes(".ccr-memory-pinned-tooltip"), true);
  assert.equal(appCss.includes("pointer-events: auto;"), true);
  assert.equal(appCss.includes(".ccr-memory-graph-canvas .ccr-memory-pinned-tooltip.float-tooltip-kap"), true);
  assert.equal(appCss.includes("pointer-events: auto !important;"), true);
  assert.equal(appCss.includes("overscroll-behavior: contain;"), true);
  assert.equal(appCss.includes(".ccr-memory-graph-canvas--detail-open .force-graph-container .float-tooltip-kap"), true);
  assert.equal(appCss.includes("display: none;"), true);
  assert.equal(appCss.includes(".ccr-memory-graph-canvas .float-tooltip-kap"), true);
  assert.equal(appCss.includes(".ccr-memory-native-tooltip-detail"), true);
  assert.equal(appCss.includes(".ccr-memory-native-file-content"), true);
  assert.equal(appCss.includes(".ccr-memory-graph-canvas .float-tooltip-kap {\n  max-width"), true);
  assert.equal(appCss.includes(".ccr-memory-graph-canvas .float-tooltip-kap {\n  max-width: min(620px, calc(100vw - 80px));\n  padding: 0;"), true);
  assert.equal(appCss.includes(".ccr-memory-graph-canvas .float-tooltip-kap {\n  max-width: min(620px, calc(100vw - 80px));\n  max-height"), false);
  assert.equal(appCss.includes(".ccr-memory-native-tooltip-detail {\n  min-width: min(560px, calc(100vw - 96px));\n  max-height: min(68vh, 620px);"), true);
  assert.equal(appCss.includes(".ccr-memory-native-tooltip-detail {\n  min-width: min(560px, calc(100vw - 96px));\n  max-height: min(68vh, 620px);\n  overflow: auto;"), true);
});

test("Codex memory view does not default to local absolute project paths", () => {
  const viewSource = readSource("./CodexMemoryView.tsx");

  assert.equal(viewSource.includes('useState<MemoryGraphNodeId>("root")'), true);
  assert.equal(viewSource.includes("displayCodexHome("), false);
  assert.equal(viewSource.includes("displayMemoryPath("), false);
  assert.equal(viewSource.includes("displayMemoryPath(file.path"), false);
  assert.equal(viewSource.includes("displayMemoryPath(group.projectPath"), false);
  assert.equal(viewSource.includes(">{source.path}</span>"), false);
  assert.equal(viewSource.includes(">{group.projectPath}</span>"), false);
});

test("Codex memory view renders an interactive open-source force graph", () => {
  const viewSource = readSource("./CodexMemoryView.tsx");
  const appCss = readSource("./App.css");
  const packageJson = readSource("../package.json");

  for (const label of ["生成策略", "纠偏覆盖", "扩展补充", "项目归属", "参与召回"]) {
    assert.equal(viewSource.includes(label), true, `knowledge graph should include ${label}`);
  }

  assert.equal(viewSource.includes("配置控制"), false);
  assert.equal(viewSource.includes("线程覆盖"), false);

  assert.equal(packageJson.includes('"react-force-graph-2d"'), true);
  assert.equal(packageJson.includes('"@xyflow/react"'), false);
  assert.equal(viewSource.includes('from "react-force-graph-2d"'), true);
  assert.equal(viewSource.includes('from "@xyflow/react"'), false);
  assert.equal(viewSource.includes('import "@xyflow/react/dist/style.css"'), false);
  assert.equal(viewSource.includes("<ForceGraph2D"), true);
  assert.equal(viewSource.includes("<ReactFlow"), false);
  assert.equal(viewSource.includes("<Background"), false);
  assert.equal(viewSource.includes("<Controls"), false);
  assert.equal(viewSource.includes("onNodeClick"), true);
  assert.equal(viewSource.includes("enableNodeDrag={true}"), true);
  assert.equal(viewSource.includes("enablePanInteraction={true}"), true);
  assert.equal(viewSource.includes("enableZoomInteraction={true}"), true);
  assert.equal(viewSource.includes("graphData={memoryGraphData}"), true);
  assert.equal(viewSource.includes("nodeCanvasObject"), true);
  assert.equal(viewSource.includes("selectedGraphNode"), true);
  assert.equal(viewSource.includes("truncateCanvasText"), true);
  assert.equal(viewSource.includes("workflowNodes"), false);
  assert.equal(viewSource.includes("selectedWorkflowNode"), false);
  assert.equal(viewSource.includes("ccr-memory-node-files"), false);
  assert.equal(appCss.includes(".ccr-memory-graph-canvas"), true);
  assert.equal(appCss.includes(".ccr-memory-graph"), true);
});
