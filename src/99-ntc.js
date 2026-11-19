// งานวันนี้: clear / bring back notifications (19/11). Only ACTIONS here.
Object.assign(ACTIONS, {
  'ntc-clear'(el) { ntcMap()[el.dataset.id] = Date.now(); ntcSave(); render(); },
  'ntc-back'(el) { delete ntcMap()[el.dataset.id]; ntcSave(); S.ntcShowDone = true; render(); },
  'ntc-clear-all'() { const D = derive(), m = ntcMap(); myAlerts(D).filter(a => !ntcKeep(a)).forEach(a => { m[a.id] = Date.now(); }); ntcSave(); toast('ล้างการแจ้งเตือนแล้ว'); render(); }
});
