import { $ } from "@/services/lib/utils.js";

import { exportData } from "./export";

import { importDataFromFile } from "./import";

export function bindDataTransfer() {

  $("btnExportData")
    ?.addEventListener(
      "click",
      exportData
    );

  $("btnImportData")
    ?.addEventListener(
      "click",
      () => {

        $("importDataFile")?.click();

      }
    );

  $("importDataFile")
    ?.addEventListener(
      "change",
      async (event) => {

        await importDataFromFile(
          event.target.files?.[0]
        );

        event.target.value = "";

      }
    );

}

export {
  exportData,
  importDataFromFile
};