type OptionalViteImportMeta = ImportMeta & {
  env?: {
    VITE_SWITCHPP_DISTRIBUTION?: string;
  };
};

export const appDistribution =
  (import.meta as OptionalViteImportMeta).env?.VITE_SWITCHPP_DISTRIBUTION ?? "direct";

export const isAppStoreDistribution = appDistribution === "app-store";
