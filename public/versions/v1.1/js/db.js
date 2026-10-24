let pendingConfirm = null;

function ensureConfirmDialog() {
  let modal = document.getElementById("confirmDeleteModal");
  if (modal) return modal;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="modal fade" id="confirmDeleteModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header bg-danger text-white">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill fs-5"></i>
              <span class="fw-semibold" id="confirmDeleteTitle">تأكيد الحذف</span>
            </div>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="fs-6 mb-2" id="confirmDeleteMessage">هل تريد تأكيد الحذف؟</p>
            <div class="text-muted small" id="confirmDeleteDetail">لا يمكن التراجع عن هذه العملية بعد تنفيذها.</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">إلغاء</button>
            <button type="button" class="btn btn-danger" id="confirmDeleteAction">
              <i class="bi bi-trash me-1"></i>
              حذف
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper.firstElementChild);
  modal = document.getElementById("confirmDeleteModal");

  modal.addEventListener("hidden.bs.modal", () => {
    if (pendingConfirm) {
      pendingConfirm(false);
      pendingConfirm = null;
    }
  });

  document.getElementById("confirmDeleteAction")?.addEventListener("click", () => {
    const resolve = pendingConfirm;
    pendingConfirm = null;
    window.bootstrap?.Modal.getOrCreateInstance(modal)?.hide();
    resolve?.(true);
  });

  return modal;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function confirmDelete(options = {}) {
  const modal = ensureConfirmDialog();

  setText("confirmDeleteTitle", options.title || "تأكيد الحذف");
  setText("confirmDeleteMessage", options.message || "هل تريد تأكيد الحذف؟");
  setText("confirmDeleteDetail", options.detail || "لا يمكن التراجع عن هذه العملية بعد تنفيذها.");
  setText("confirmDeleteAction", options.confirmText || "حذف");

  return new Promise(resolve => {
    pendingConfirm = resolve;
    window.bootstrap?.Modal.getOrCreateInstance(modal)?.show();
  });
}

window.confirmDelete = confirmDelete;

export { confirmDelete };
