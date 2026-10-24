"use client";
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import AppSelect from "@/components/ui/Select.jsx";

const roots = new WeakMap();

function buildOptionsFromSelect(sel) {
  return Array.from(sel.options || []).map(o => ({ value: o.value, label: o.textContent, dataId: o.dataset?.id || '' }));
}

function findInitialValue(options, sel) {
  const val = sel.value;
  if (val) {
    const match = options.find(o => String(o.value) === String(val));
    if (match) return match;
  }
  const pid = sel.dataset?.preselectedId || sel.dataset?.selectedId || sel.dataset?.id || '';
  if (pid) {
    const match = options.find(o => String(o.dataId) === String(pid));
    if (match) return match;
  }
  return null;
}

function ReactSelectWrapper({ initial, options, placeholder, menuPortalWidth, onSync }) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    onSync(value);
  }, [value, onSync]);

  const handleChange = (val) => {
    setValue(val);
  };

  return React.createElement(AppSelect, {
    initialOptions: options,
    value,
    onChange: handleChange,
    placeholder,
    isClearable: true,
    dir: document.dir || 'rtl',
    menuPortalWidth
  });
}

export function initReactSelects(root = document) {
  const selects = Array.from((root.querySelectorAll && root.querySelectorAll('.form-select')) || []);
  selects.forEach(sel => {
    try {
      if (sel.dataset && sel.dataset.reactized) return; // تم مسبقًا | already done
      const options = buildOptionsFromSelect(sel);
      const initial = findInitialValue(options, sel);
      const placeholder = sel.getAttribute('data-placeholder') || (options[0] ? options[0].label : 'اختر');
      const containerWidth = Math.max(120, Math.min(800, Math.round((sel.getBoundingClientRect && sel.getBoundingClientRect().width) || 200)));
      const container = document.createElement('div');
      container.className = 'reactized-select-container';
      sel.style.display = 'none';
      sel.parentNode.insertBefore(container, sel.nextSibling);

      /* مزامنة React مع العنصر الأصلي تتم داخل إغلاق هنا لا عبر الخاصية sel، ليعدّل المكوّن قيمته لا قيمة ممرَّرة إليه | Syncing React with the original element happens in a closure here, not via sel, so the component edits its own value rather than a passed-in one */
      const onSync = v => {
        if (!v) {
          sel.value = '';
          delete sel.dataset.selectedId;
        } else {
          sel.value = v.value ?? v;
          if (v.dataId) sel.dataset.selectedId = v.dataId;
          else delete sel.dataset.selectedId;
        }
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const rootNode = ReactDOM.createRoot(container);
      rootNode.render(
        React.createElement(ReactSelectWrapper, {
          initial,
          options,
          placeholder,
          menuPortalWidth: containerWidth,
          onSync
        })
      );

      if (initial && initial.dataId) {
        try { sel.dataset.selectedId = initial.dataId; } catch (e) {}
      }
      sel.dataset.reactized = '1';
      roots.set(sel, rootNode);
    } catch (e) { console.warn('initReactSelects error:', e); }
  });
}

export function disposeReactSelect(sel) {
  try {
    const r = roots.get(sel);
    if (r) r.unmount();
    if (sel && sel.parentNode) {
      const nxt = sel.parentNode.querySelector('.reactized-select-container');
      if (nxt) nxt.remove();
      sel.style.display = '';
      delete sel.dataset.reactized;
    }
  } catch (e) { console.warn('disposeReactSelect error:', e); }
}

export default initReactSelects;
