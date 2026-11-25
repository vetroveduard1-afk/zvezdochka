const YOOMONEY_WALLET = '4100119553747413';

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

const fmt = n => (Number(n) || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
const num = s => s ? (parseFloat(String(s).replace(/\s+/g, '').replace(',', '.')) || 0) : 0;

function showTab(id, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  if (btn) btn.classList.add('active');
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  const b = document.getElementById('themeBtn');
  if (b) b.innerText = document.body.classList.contains('dark') ? 'Светлая тема' : 'Тёмная тема';
}

function openDonateModal() {
  const m = document.getElementById('donateModal');
  if (m) m.classList.add('open');
}

function closeDonateModal() {
  const m = document.getElementById('donateModal');
  if (m) m.classList.remove('open');
}

function setDonateAmt(val, btn) {
  document.querySelectorAll('.amt-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const inp = document.getElementById('don_sum');
  if (inp) inp.value = val;
}

function goYooMoney() {
  const sum = Math.max(10, parseFloat(document.getElementById('don_sum').value) || 100);
  const host = 'https://yoomoney.ru';
  const path = '/to/' + YOOMONEY_WALLET + '?sum=' + sum.toFixed(0);
  window.open(host + path, '_blank', 'noopener,noreferrer');
  closeDonateModal();
}
async function refreshLiveStats() {
  try {
    const r = await fetch('/api/stats/summary');
    const data = await r.json();
    const c = document.getElementById('st-cases'), f = document.getElementById('st-fees');
    if (c) c.innerText = data.total_cases || 0;
    if (f) f.innerText = fmt(data.total_hidden_fees || 0);
  } catch (e) {}
}

async function reportAnonymousCase(bank, prod, paid, fees, fingerprint) {
  if (fees <= 0) return;
  try {
    await fetch('/api/stats/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_fingerprint: fingerprint, bank_name: bank, product_type: prod, total_paid: paid, total_fees: fees })
    });
    refreshLiveStats();
  } catch (e) {}
}

async function loadFeedback() {
  const box = document.getElementById('fb_list');
  if (!box) return;
  try {
    const r = await fetch('/api/feedback');
    const list = await r.json();
    if (!list.length) {
      box.innerHTML = '<div style="font-size:13px;color:var(--muted);">Пока отзывов нет — станьте первым, кто поделится опытом проверки выписки!</div>';
      return;
    }
    box.innerHTML = list.map(item => `
      <div class="fb-item">
        <div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-bottom:5px;">
          <b>${item.author.replace(/</g, '&lt;')}</b>
          <span style="color:var(--green);font-weight:600;">${item.type.replace(/</g, '&lt;')} • ${item.bank.replace(/</g, '&lt;')}</span>
        </div>
        <div style="font-size:13px;line-height:1.45;">${item.text.replace(/</g, '&lt;')}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:5px;">${item.date}</div>
      </div>
    `).join('');
  } catch (e) {}
}

async function sendFeedback() {
  const author = document.getElementById('fb_name').value.trim();
  const type = document.getElementById('fb_type').value;
  const bank = document.getElementById('fb_bank').value.trim() || 'Не указан';
  const text = document.getElementById('fb_msg').value.trim();
  const st = document.getElementById('fb_status');
  if (author.length < 2 || text.length < 5) {
    st.style.color = 'var(--red)';
    st.innerText = 'Пожалуйста, укажите ваше имя (от 2 символов) и текст сообщения (от 5 символов).';
    return;
  }
  try {
    const r = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name: author, msg_type: type, bank_name: bank, message_text: text })
    });
    if (r.ok) {
      st.style.color = 'var(--green)';
      st.innerText = 'Спасибо! Ваше сообщение сохранено и добавлено в ленту.';
      document.getElementById('fb_msg').value = '';
      loadFeedback();
    }
  } catch (e) {
    st.style.color = 'var(--red)';
    st.innerText = 'Ошибка отправки. Проверьте, запущен ли сервер.';
  }
}
function renderBanks(cat, btn) {
  if (btn) {
    document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const box = document.getElementById('banks-list');
  const list = window.ZVEZDOCHKA_BANKS || [];
  if (!box) return;
  const filtered = cat === 'all' ? list : list.filter(x => x.category === cat);
  box.innerHTML = filtered.map(b => `
    <div class="bank-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
        <div><span style="font-size:12px;color:var(--green);font-weight:700;">${b.categoryLabel} • ${b.bank}</span><h3 style="font-size:17px;margin-top:2px;">${b.title}</h3></div>
        <div style="background:var(--red-bg);color:var(--red);padding:6px 12px;border-radius:10px;font-weight:700;font-size:13px;">ИФТ: ${b.ift} / 100</div>
      </div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">${b.subtitle}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px;">
        ${b.metrics.map(m => `<div style="background:var(--input);padding:10px 12px;border-radius:10px;"><div style="font-weight:700;color:${m.danger ? 'var(--red)' : 'var(--text)'};">${m.val}</div><div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${m.name}</div></div>`).join('')}
      </div>
      <div style="font-size:13px;line-height:1.55;margin-bottom:10px;"><b>Обещание:</b> ${b.promise}<br><b>Реальность мелким шрифтом:</b> ${b.reality}</div>
      <div style="background:var(--green-bg);padding:12px;border-radius:10px;font-size:12.5px;line-height:1.5;"><b>Как отключить и вернуть деньги:</b><ol style="padding-left:18px;margin-top:4px;">${b.steps.map(s => `<li>${s}</li>`).join('')}</ol></div>
    </div>
  `).join('');
}

function simDebt(debt, pay, rate, sub) {
  if (debt <= 0 || pay <= 0) return { m: 0, over: 0 };
  let d = debt, m = 0, over = 0;
  while (d > 0.5 && m < 240) {
    const fee = d * rate + sub;
    if (pay <= fee) return { m: 999, over: 999999 };
    d -= Math.min(d, pay - fee); over += fee; m++;
  }
  return { m, over };
}

function updateQuickCalc() {
  const debt = parseFloat(document.getElementById('q_debt').value) || 0;
  const pay = parseFloat(document.getElementById('q_pay').value) || 0;
  const fees = parseFloat(document.getElementById('q_fees').value) || 0;
  const bar = document.getElementById('q_bar'), verd = document.getElementById('q_verdict');
  if (debt <= 0 && pay <= 0 && fees <= 0) {
    bar.style.width = '50%'; bar.innerText = 'Ожидание данных';
    verd.innerHTML = 'Загрузите PDF-выписку слева или введите свои суммы выше для расчёта.';
    return;
  }
  const body = Math.max(0, pay - fees);
  const pct = pay > 0 ? Math.min(100, Math.round((fees / pay) * 100)) : (fees > 0 ? 100 : 0);
  bar.style.width = Math.max(pct, 12) + '%'; bar.innerText = pct + '% банку';
  verd.innerHTML = pay > 0
    ? `Из суммы <b>${fmt(pay)}</b> в комиссии ушло <b>${fmt(fees)} (${pct}%)</b>, на погашение долга — <b>${fmt(body)} (${100 - pct}%)</b>.`
    : `Удержано комиссий: <b>${fmt(fees)}</b>. Укажите сумму платежа для расчёта пропорции.`;
}

function updateDetailCalc() {
  const debt = parseFloat(document.getElementById('c_debt').value) || 0;
  const pay = parseFloat(document.getElementById('c_pay').value) || 0;
  const f1 = parseFloat(document.getElementById('c_f1').value) || 0;
  const f2 = parseFloat(document.getElementById('c_f2').value) || 0;
  const bar = document.getElementById('c_bar'), verd = document.getElementById('c_verdict');
  if (debt <= 0 && pay <= 0 && f1 <= 0 && f2 <= 0) {
    bar.style.width = '50%'; bar.innerText = 'Ожидание данных';
    verd.innerHTML = 'Введите суммы из вашего договора или загрузите PDF-выписку для автоматического заполнения.';
    return;
  }
  const fees = f1 + f2, body = Math.max(0, pay - fees);
  const pct = pay > 0 ? Math.min(100, Math.round((fees / pay) * 100)) : 0;
  bar.style.width = Math.max(pct, 12) + '%'; bar.innerText = pct + '% банку';
  if (pay <= 0) { verd.innerHTML = 'Укажите сумму ежемесячного платежа для расчёта срока закрытия.'; return; }
  if (body <= 0) { verd.innerHTML = `В комиссии сгорает <b>${fmt(fees)} (100%)</b>. Основной долг <b>не уменьшается</b>.`; return; }
  const sim = simDebt(debt, pay, debt > 0 ? f1 / debt : 0, f2);
  verd.innerHTML = `В этом месяце в комиссии сгорает <b>${fmt(fees)} (${pct}%)</b>, в долг идёт <b>${fmt(body)} (${100 - pct}%)</b>.<br>С учётом уменьшения долга выплата займёт <b>${sim.m} мес. (${(sim.m / 12).toFixed(1)} лет)</b>, переплата комиссиями составит <b>${fmt(sim.over)}</b>.`;
}
function buildClaim() {
  const bank = document.getElementById('cl_bank').value.trim() || 'ПАО «Совкомбанк»';
  const fio = document.getElementById('cl_fio').value.trim() || '[ФИО держателя карты]';
  const paid = parseFloat(document.getElementById('cl_paid').value) || 0;
  const fees = parseFloat(document.getElementById('cl_fees').value) || 0;
  const desc = document.getElementById('cl_desc').value.trim() || 'комиссии за навязанные услуги и подписки';
  document.getElementById('cl_out').value = `В ${bank}\nОт: ${fio}\n\nПРЕТЕНЗИЯ\nо возврате удержанных комиссий и платы за навязанные услуги\n\nЗа период обслуживания по договору мной было внесено ${paid.toFixed(2)} руб., из которых банком удержано ${fees.toFixed(2)} руб. (${desc}).\n\nУказанные платные опции и подписки были подключены без получения моего явного информированного согласия и продолжали списываться даже после истечения льготного периода рассрочки (нарушение ст. 10 и ст. 16 Закона РФ «О защите прав потребителей», а также ст. 7 ФЗ-353).\n\nТРЕБУЮ:\n1. Отключить все платные подписки и дополнительные опции по счёту.\n2. Вернуть на мой счёт излишне удержанные комиссии в размере ${fees.toFixed(2)} руб.\n\nВ случае отказа или отсутствия ответа в течение 10 рабочих дней обращение будет направлено Финансовому уполномоченному (finombudsman.ru) и в Интернет-приёмную Банка России.`;
}

function parseTransactionsFromCells(txList) {
  let paidSum = 0, paidCnt = 0, minSum = 0, minCnt = 0, subSum = 0;
  const subPeriods = new Set();
  let trSum = 0, trCnt = 0, fineSum = 0, fineCnt = 0, retSum = 0, retCnt = 0;

  for (const tx of txList) {
    const plusVal = tx.amounts.filter(a => a.sign === '+').reduce((s, a) => s + a.val, 0);
    const minusVal = tx.amounts.filter(a => a.sign === '-').reduce((s, a) => s + a.val, 0);
    const d = tx.desc;

    if (/Поступление перевода СБП|Пополнение/i.test(d) && plusVal > 0) { paidSum += plusVal; paidCnt++; }
    else if (/Возврат в результате претензионной|Возврат излишне оплаченной комиссии/i.test(d) && plusVal > 0) { retSum += plusVal; retCnt++; }
    else if (/Минимальный платеж/i.test(d) && minusVal > 0) { minSum += minusVal; minCnt++; }
    else if (/ежемесячную[\s\S]{0,25}Подписку/i.test(d) && minusVal > 0) {
      subSum += minusVal;
      const pMatch = d.match(/(\d{2}\.\d{2}\.\d{4}\s*-\s*\d{2}\.\d{2}\.\d{4})/);
      subPeriods.add(pMatch ? pMatch.at(1).replace(/\s+/g, '') : tx.date);
    }
    else if (/Комиссия за перевод[\s\S]{0,30}заемных средств/i.test(d) && minusVal > 0) { trSum += minusVal; trCnt++; }
    else if (/Уплата неустойки/i.test(d) && minusVal > 0) { fineSum += minusVal; fineCnt++; }
  }
  const subCnt = subPeriods.size || Math.round(subSum / 299);
  const exactSubSum = subPeriods.size > 0 ? +(subPeriods.size * 299).toFixed(2) : +subSum.toFixed(2);
  return {
    paid: { sum: +paidSum.toFixed(2), cnt: paidCnt },
    min: { sum: +minSum.toFixed(2), cnt: minCnt },
    sub: { sum: exactSubSum, cnt: subCnt },
    tr: { sum: +trSum.toFixed(2), cnt: trCnt },
    fine: { sum: +fineSum.toFixed(2), cnt: fineCnt },
    ret: { sum: +retSum.toFixed(2), cnt: retCnt }
  };
}
function analyzePdfData(text, txList) {
  const isCert = /Справка[\s\S]{0,120}Заемщиком|Сумма полной задолженности/i.test(text);
  const bank = /Совкомбанк|Халва/i.test(text) ? 'ПАО «Совкомбанк»' : /Т-Банк|Тинькофф/i.test(text) ? 'АО «Т-Банк»' : /Альфа-Банк/i.test(text) ? 'АО «Альфа-Банк»' : /ВТБ/i.test(text) ? 'Банк ВТБ (ПАО)' : /Сбербанк/i.test(text) ? 'ПАО Сбербанк' : 'Банк по выписке';
  const dm = text.match(/Использованный[\s\S]{0,60}?Лимит[\s\S]{0,60}?(\d[\d\s]*[.,]\d{2})/i) || text.match(/полной задолженности[\s\S]{0,80}?составляет:\s*(\d[\d\s]*[.,]\d{2})/i);
  const debt = dm ? num(dm.at(1)) : 0;

  const fioMatch = text.match(/(?:Клиент:|Дана\s+ФИО)\s+([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/);
  if (fioMatch && document.getElementById('cl_fio')) {
    document.getElementById('cl_fio').value = fioMatch.at(1).trim();
  }

  document.getElementById('scan-result').style.display = 'block';
  const itemsBox = document.getElementById('scan-items');
  const sA = document.getElementById('scen-a'), sB = document.getElementById('scen-b');

  if (!isCert) {
    const res = parseTransactionsFromCells(txList);
    const totalFees = +(res.min.sum + res.sub.sum + res.tr.sum + res.fine.sum).toFixed(2);
    const toClaim = +Math.max(0, totalFees - res.ret.sum).toFixed(2);
    const simA = simDebt(debt, Math.max(debt / 20, debt * 0.039 + 450), 0.039, 299);

    document.getElementById('scan-header').innerText = `${bank} — Аудит выписки по счёту`;
    document.getElementById('scan-summary').innerHTML = `Внесено клиентом: <b>${fmt(res.paid.sum)}</b> • Удержано банком: <b>${fmt(totalFees)}</b> • Уже возвращено: <b>${fmt(res.ret.sum)}</b> • Остаток долга: <b>${fmt(debt)}</b>`;
    itemsBox.innerHTML = [
      `• Услуга «Минимальный платёж» (${res.min.cnt} списаний): <b>${fmt(res.min.sum)}</b>`,
      `• Подписка «Халва.Десятка» (${res.sub.cnt} списаний): <b>${fmt(res.sub.sum)}</b>`,
      `• Комиссии за переводы заёмных средств (${res.tr.cnt} списаний): <b>${fmt(res.tr.sum)}</b>`,
      `• Неустойки и штрафы (${res.fine.cnt} списаний): <b>${fmt(res.fine.sum)}</b>`,
      `• Возвращено по претензиям (${res.ret.cnt} операций): <b style="color:var(--green);">+${fmt(res.ret.sum)}</b>`
    ].map(r => `<div style="background:var(--input);padding:9px 12px;border-radius:10px;font-size:13px;">${r}</div>`).join('');

    sA.innerHTML = `<b>Сценарий А: Платить минимальными платежами</b><ul style="padding-left:16px;margin-top:6px;line-height:1.5;"><li>Комиссия составит <b>3,9%/мес. (${fmt(debt * 0.039)})</b> + подписка <b>299,00 ₽</b>.</li><li>В тело долга уходит меньше <b>15–20%</b> от платежа.</li><li>Закрытие <b>${fmt(debt)}</b> займёт <b>~${simA.m} мес. (${(simA.m / 12).toFixed(1)} лет)</b>, переплата составит <b>~${fmt(simA.over)}</b>.</li></ul>`;
    sB.innerHTML = `<b>Сценарий Б: Выход из ловушки и возврат денег</b><ul style="padding-left:16px;margin-top:6px;line-height:1.5;"><li>Всего выявлено удержаний: <b>${fmt(totalFees)}</b>, из них уже возвращено <b>${fmt(res.ret.sum)}</b>.</li><li>Осталось требовать через претензию / омбудсмена: <b>${fmt(toClaim)}</b>.</li><li>При оплате строго по графику переплата составит <b>0,00 ₽</b>.</li></ul>`;

    const estPay = Math.max(1500, Math.round(debt / 18)), estF1 = +(debt * 0.039).toFixed(2), estF2 = res.sub.cnt > 0 ? 299 : 0;
    document.getElementById('q_debt').value = debt.toFixed(2); document.getElementById('q_pay').value = estPay.toFixed(2); document.getElementById('q_fees').value = (estF1 + estF2).toFixed(2);
    document.getElementById('c_debt').value = debt.toFixed(2); document.getElementById('c_pay').value = estPay.toFixed(2); document.getElementById('c_f1').value = estF1.toFixed(2); document.getElementById('c_f2').value = estF2.toFixed(2);
    document.getElementById('cl_bank').value = bank; document.getElementById('cl_paid').value = res.paid.sum.toFixed(2); document.getElementById('cl_fees').value = toClaim.toFixed(2);
    document.getElementById('cl_desc').value = `комиссия за «Минимальный платёж» (${fmt(res.min.sum)}), подписка (${fmt(res.sub.sum)}), переводы (${fmt(res.tr.sum)}), неустойка (${fmt(res.fine.sum)}), за вычетом возвращённых ${fmt(res.ret.sum)}`;
    updateQuickCalc(); updateDetailCalc(); buildClaim();
    reportAnonymousCase(bank, 'Карта рассрочки', res.paid.sum, totalFees, `${bank}_${debt}_${totalFees}_${res.paid.sum}`);
  } else {
    const nm = text.match(/ближайшую дату[\s\S]{0,80}?составляет:\s*(\d[\d\s]*[.,]\d{2})/i);
    const nextP = nm ? num(nm.at(1)) : 0;
    const om = text.match(/Остаток денежных средств[\s\S]{0,60}?:\s*(\d[\d\s]*[.,]\d{2})/i);
    const ownF = om ? num(om.at(1)) : 0;
    const simA = simDebt(debt, Math.max(debt / 20, debt * 0.039 + 450), 0.039, 299);
    const mB = nextP > 0 ? Math.ceil(debt / nextP) : 0;

    document.getElementById('scan-header').innerText = `${bank} — Аудит справки о задолженности`;
    document.getElementById('scan-summary').innerHTML = `Полный долг: <b>${fmt(debt)}</b> • Ставка: <b>0,00%</b> • Ближайший платёж: <b>${fmt(nextP)}</b> • Собственные средства: <b>${fmt(ownF)}</b>`;
    itemsBox.innerHTML = `<div style="background:var(--input);padding:10px 12px;border-radius:10px;font-size:13px;">Текущая просроченная задолженность: <b>0,00 ₽</b>. Собственных средств на счёте (<b>${fmt(ownF)}</b>) ${ownF >= nextP ? 'достаточно для автоматического списания ближайшего платежа без комиссий.' : 'недостаточно — нужно пополнить разницу до даты платежа.'}</div>`;

    sA.innerHTML = `<b>Сценарий А: Включить «Минимальный платёж»</b><ul style="padding-left:16px;margin-top:6px;line-height:1.5;"><li>Комиссия составит <b>3,9%/мес. (${fmt(debt * 0.039)})</b> + подписка <b>299,00 ₽</b>.</li><li>Срок выплаты вырастет с ${mB} мес. до <b>${simA.m} мес. (${(simA.m / 12).toFixed(1)} лет)</b>.</li><li>Лишняя переплата комиссиями составит <b>${fmt(simA.over)}</b>.</li></ul>`;
    sB.innerHTML = `<b>Сценарий Б: Платить строго по графику из справки</b><ul style="padding-left:16px;margin-top:6px;line-height:1.5;"><li>Ставка по договору: <b>0,00% годовых</b>, просрочка: <b>0,00 ₽</b>.</li><li>Платёж <b>${fmt(nextP)}</b> ${ownF >= nextP ? 'уже перекрыт собственными средствами (' + fmt(ownF) + ')' : 'требует пополнения'}.</li><li>Весь долг закроется за <b>${mB} мес.</b> с переплатой <b>0,00 ₽</b> (экономия <b>${fmt(simA.over)}</b>).</li></ul>`;

    document.getElementById('q_debt').value = debt.toFixed(2); document.getElementById('q_pay').value = nextP.toFixed(2); document.getElementById('q_fees').value = '0.00';
    document.getElementById('c_debt').value = debt.toFixed(2); document.getElementById('c_pay').value = nextP.toFixed(2); document.getElementById('c_f1').value = '0.00'; document.getElementById('c_f2').value = '0.00';
    updateQuickCalc(); updateDetailCalc();
  }
}

async function handlePdfFile(file) {
  const hdr = document.getElementById('scan-header');
  const resBox = document.getElementById('scan-result');
  if (!file) return;
  if (resBox && hdr) { resBox.style.display = 'block'; hdr.innerText = 'Чтение и расшифровка PDF: ' + file.name + '...'; }
  try {
    if (typeof pdfjsLib === 'undefined') throw new Error('Библиотека PDF.js не загрузилась.');
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let fullText = '', txList = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const items = content.items.map(i => ({ x: i.transform.at(4), y: i.transform.at(5), str: i.str.trim() })).filter(i => i.str);
      fullText += items.map(i => i.str).join(' ') + '\n';

      const anchors = items.filter(i => i.x < 68 && /^\d{2}\.\d{2}\.\d{4}$/.test(i.str)).sort((a, b) => b.y - a.y);
      for (let idx = 0; idx < anchors.length; idx++) {
        const yTop = anchors.at(idx).y + 8;
        const yBot = idx + 1 < anchors.length ? anchors.at(idx + 1).y + 8 : 40;
        const cellItems = items.filter(i => i.y <= yTop && i.y > yBot);
        const amtText = cellItems.filter(i => i.x >= 68 && i.x < 210).sort((a, b) => a.x - b.x).map(i => i.str).join(' ');
        const amounts = Array.from(amtText.matchAll(/([+-])\s*(\d[\d\s]*[.,]\d{2})/g)).map(m => ({ sign: m.at(1), val: num(m.at(2)) }));
        const desc = cellItems.filter(i => i.x >= 380).sort((a, b) => b.y - a.y || a.x - b.x).map(i => i.str).join(' ');
        txList.push({ date: anchors.at(idx).str, amounts, desc });
      }
    }
    analyzePdfData(fullText, txList);
  } catch (err) {
    if (hdr) hdr.innerText = 'Ошибка чтения PDF: ' + err.message;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  renderBanks('all');
  refreshLiveStats();
  loadFeedback();
  ['q_debt', 'q_pay', 'q_fees'].forEach(id => document.getElementById(id)?.addEventListener('input', updateQuickCalc));
  ['c_debt', 'c_pay', 'c_f1', 'c_f2'].forEach(id => document.getElementById(id)?.addEventListener('input', updateDetailCalc));
  const inp = document.getElementById('pdf-input');
  if (inp) inp.addEventListener('change', e => { if (e.target.files && e.target.files.length) handlePdfFile(e.target.files.item(0)); });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) handlePdfFile(e.dataTransfer.files.item(0)); });
});
