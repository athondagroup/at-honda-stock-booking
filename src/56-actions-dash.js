// ------------------------------------------------------------------ executive dashboard actions
Object.assign(ACTIONS, {
  'exec-period'(el) { S.filters.ePeriod = el.dataset.k; if (el.dataset.k === 'custom' && !(S.filters.eFrom && S.filters.eTo)) { S.filters.eFrom = todayISO().slice(0, 8) + '01'; S.filters.eTo = todayISO(); } render(); },
  async 'exec-ai'() {
    const D = derive(), E = execData(D), key = aiKey(E);
    const sample = S.cap.sample;
    if (!sample) { S.ai.exec = { key, state: 'error', msg: 'มุมมองนี้ใช้ AI ไม่ได้ เปิดหน้านี้บน claude.ai' }; render(); return; }
    S.ai.exec = { key, state: 'running' }; render();
    try {
      const res = await sample(EXEC_PROMPT(execSummary(D, E)), { modelTier: 'default', cache: false });
      S.ai.exec = { key, state: 'done', text: String(res && res.text || '').trim() || 'AI ไม่ได้ตอบกลับ ลองอีกครั้ง' };
    } catch (e) { S.ai.exec = { key, state: 'error', msg: aiMsg(e) }; }
    render();
  }
});
