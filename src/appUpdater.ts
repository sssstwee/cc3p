import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { APP_RELEASES_URL } from "./appConstants.ts";
import type { AppUpdateCheckResult } from "./appTypes.ts";

export type AppUpdateInstallPhase = "idle" | "downloading" | "installing" | "restarting" | "error";

export type AppUpdateInstallState = {
  phase: AppUpdateInstallPhase;
  downloadedBytes: number;
  contentLength: number | null;
  progress: number | null;
  message: string;
};

export type OfficialAppUpdateCheckResult = {
  result: AppUpdateCheckResult;
  update: Update | null;
};

export const idleAppUpdateInstallState: AppUpdateInstallState = {
  phase: "idle",
  downloadedBytes: 0,
  contentLength: null,
  progress: null,
  message: "",
};

export function appUpdateInstallButtonLabel(state: AppUpdateInstallState): string {
  if (state.phase === "downloading") {
    return typeof state.progress === "number" ? `${state.progress}%` : "下载中";
  }
  if (state.phase === "installing") return "安装中";
  if (state.phase === "restarting") return "重启中";
  if (state.phase === "error") return "重试";
  return "更新";
}

export function isAppUpdateInstallBusy(state: AppUpdateInstallState): boolean {
  return state.phase === "downloading" || state.phase === "installing" || state.phase === "restarting";
}

export async function checkOfficialAppUpdate(now = Date.now): Promise<OfficialAppUpdateCheckResult> {
  const update = await check();
  const fallbackCurrentVersion = await getVersion().catch(() => "");
  if (!update) {
    return {
      update: null,
      result: {
        current_version: fallbackCurrentVersion,
        latest_version: fallbackCurrentVersion,
        has_update: false,
        release_url: "",
        checked_at: now(),
        message: "已是最新版本",
        error: "",
      },
    };
  }

  return {
    update,
    result: {
      current_version: update.currentVersion || fallbackCurrentVersion,
      latest_version: update.version,
      has_update: true,
      release_url: APP_RELEASES_URL,
      checked_at: now(),
      message: `发现新版本 ${update.version}`,
      error: "",
    },
  };
}

export async function installOfficialAppUpdate(
  update: Update,
  onState: (state: AppUpdateInstallState) => void,
): Promise<void> {
  let downloadedBytes = 0;
  let contentLength: number | null = null;

  onState({
    phase: "downloading",
    downloadedBytes,
    contentLength,
    progress: null,
    message: "正在下载更新",
  });

  await update.downloadAndInstall((event: DownloadEvent) => {
    if (event.event === "Started") {
      downloadedBytes = 0;
      contentLength = typeof event.data.contentLength === "number" ? event.data.contentLength : null;
      onState({
        phase: "downloading",
        downloadedBytes,
        contentLength,
        progress: null,
        message: "正在下载更新",
      });
      return;
    }

    if (event.event === "Progress") {
      downloadedBytes += event.data.chunkLength;
      const progress = contentLength ? Math.min(99, Math.round((downloadedBytes / contentLength) * 100)) : null;
      onState({
        phase: "downloading",
        downloadedBytes,
        contentLength,
        progress,
        message: progress === null ? "正在下载更新" : `正在下载更新 ${progress}%`,
      });
      return;
    }

    onState({
      phase: "installing",
      downloadedBytes,
      contentLength,
      progress: 100,
      message: "正在安装更新",
    });
  });

  onState({
    phase: "restarting",
    downloadedBytes,
    contentLength,
    progress: 100,
    message: "更新已安装，正在重启",
  });
  await new Promise((resolve) => window.setTimeout(resolve, 1200));
  await relaunch();
}
