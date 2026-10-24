/* يخفي المودال الأصلي ويُشغّل الإجراء الفرعي ثم يعيد فتحه عند إغلاق الفرعي | Hides the parent modal, runs the child action, then reopens the parent when the child closes */
export function chainModals(target, parentSelector, childOpenAction) {
  const parentEl = target.closest(parentSelector);
  if (!parentEl || !window.bootstrap) return false;

  const parentModal = bootstrap.Modal.getInstance(parentEl);
  if (!parentModal) return false;

  parentEl.addEventListener('hidden.bs.modal', () => {
    window.__onNextModalHidden = () => parentModal.show();
    childOpenAction();
  }, { once: true });

  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  parentModal.hide();
  return true;
}