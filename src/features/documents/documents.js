import { bindDocumentEvents } from "./events/bind-events.js";
import { renderDocuments } from "./components/document-list.js";
import { updateDashboardStats } from "./components/dashboard.js";

export async function initDocumentsModule() {
  await renderDocuments();
  await updateDashboardStats();
  bindDocumentEvents();
}