// งานวันนี้: clear / bring back notifications (19/11). Only ACTIONS here.
Object.assign(ACTIONS, {
  'ntc-clear'(el) { ntcMap()[el.dataset.id] = Date.now(); ntcSave(); render(); },
  'ntc-back'(el) { delete ntcMap()[el.dataset.id]; ntcSave(); S.ntcShowDone = true; render(); },
  'ntc-clear-all'() { const D = derive(), m = ntcMap(); myAlerts(D).filter(a => !ntcKeep(a)).forEach(a => { m[a.id] = Date.now(); }); ntcSave(); toast('ล้างการแจ้งเตือนแล้ว'); render(); }
});
// 19/11: a notice about a lock opens that lock, not the whole lock page: the car's lock window when the car is in stock,
// otherwise the lock list scrolled to its row and highlighted
Object.assign(ACTIONS, {
  'lock-goto'(el) {
    const D = derive(), id = el.dataset.id, l = D.locks.find(x => x.id === id); if (!l) { toast('ไม่พบล็อกนี้แล้ว', 'bad'); return; }
    const liveish = ['pending', 'approved', 'allocated'].includes(l.status);
    if (liveish && l.vin && D.cars.get(l.vin) && el.dataset.q !== 'list') { navPush(); S.modal = { kind: 'carlock', vin: l.vin }; render(); return; }
    navPush(); S.modal = null; S.view = 'lock'; S.sub.lock = l.status === 'pending' ? 'approve' : liveish ? 'active' : 'history'; if (S.br && l.car_br && S.br !== l.car_br) S.br = null; setHash(); render();
    focusRow(`[data-id="${CSS.escape(id)}"]`, '.code, td, span, b', l.vin || l.ref);
  }
});
function focusRow(sel, codeSel, text) {
  let n = 0; const go = () => {
    let el = document.querySelector('main ' + sel) || document.querySelector(sel);
    if (!el && text) el = [...document.querySelectorAll(codeSel)].find(x => x.textContent.includes(text));
    const row = el && (el.closest('.lk-row, tr, .p-3, .py-2, li') || el.parentElement);
    if (!row) { if (++n < 10) setTimeout(go, 150); return; }
    row.scrollIntoView({ block: 'center', behavior: 'smooth' }); row.classList.add('bko-hl'); setTimeout(() => row.classList.remove('bko-hl'), 4000);
  }; setTimeout(go, 80);
}
