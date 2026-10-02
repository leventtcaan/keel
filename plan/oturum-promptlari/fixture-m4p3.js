// Temporary fixture server for simulator looks at the Food tab (K-407). Not part of the repo.
const http = require('http');
const pad = (n) => String(n).padStart(2, '0');
const dayOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const now = new Date();
const today = dayOf(now);
const yesterday = dayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
let n = 0;
const uuid = () => '00000000-0000-4000-8000-' + String(100000000000 + ++n);
const R = (low, high) => ({ low, high });
const FOODS = {
  oats: { id: 'fdc-1', name: 'Oats, rolled', per100g: { kcal: R(360, 395), proteinG: R(12, 14), carbsG: R(60, 68), fatG: R(6, 8) }, servings: [{ name: '1 cup', grams: 81 }] },
  milk: { id: 'fdc-2', name: 'Milk, whole', per100g: { kcal: R(58, 66), proteinG: R(3, 4), carbsG: R(4, 5), fatG: R(3, 4) }, servings: [{ name: '1 cup', grams: 244 }] },
  rice: { id: 'fdc-3', name: 'Rice, white, cooked', per100g: { kcal: R(120, 140), proteinG: R(2, 3), carbsG: R(26, 30), fatG: R(0, 1) }, servings: [{ name: '1 cup', grams: 158 }] },
  chicken: { id: 'fdc-4', name: 'Chicken breast, roasted', per100g: { kcal: R(150, 175), proteinG: R(29, 33), carbsG: R(0, 0), fatG: R(3, 5) } },
  yogurt: { id: 'fdc-5', name: 'Greek yogurt, plain', brand: 'Fage', per100g: { kcal: R(90, 105), proteinG: R(9, 11), carbsG: R(3, 5), fatG: R(4, 6) }, servings: [{ name: '1 container', grams: 170 }] },
};
const byId = Object.fromEntries(Object.values(FOODS).map((f) => [f.id, f]));
const item = (food, quantity, unit) => {
  const g = unit === 'g' ? quantity : (food.servings.find((s) => s.name === unit)?.grams ?? 100) * quantity;
  const s = (r) => R(Math.round((r.low * g) / 100 * 0.9), Math.round((r.high * g) / 100 * 1.1));
  return { foodId: food.id, name: food.name, amount: { quantity, unit }, kcal: s(food.per100g.kcal), proteinG: s(food.per100g.proteinG) };
};
const sum = (items, k) => R(items.reduce((a, i) => a + i[k].low, 0), items.reduce((a, i) => a + i[k].high, 0));
const meal = (eatenAt, slot, items, id = uuid()) => ({ id, clientId: uuid(), eatenAt, slot, items, kcal: sum(items, 'kcal'), proteinG: sum(items, 'proteinG') });
const at = (day, h) => new Date(`${day}T${pad(h)}:00:00`).toISOString();
const meals = [
  meal(at(yesterday, 8), 'BREAKFAST', [item(FOODS.oats, 80, 'g'), item(FOODS.milk, 1, '1 cup')]),
  meal(at(yesterday, 13), 'LUNCH', [item(FOODS.rice, 1, '1 cup'), item(FOODS.chicken, 150, 'g')]),
  meal(at(yesterday, 19), 'DINNER', [item(FOODS.chicken, 200, 'g'), item(FOODS.rice, 200, 'g')]),
  meal(at(today, 8), 'BREAKFAST', [item(FOODS.oats, 80, 'g'), item(FOODS.milk, 1, '1 cup')]),
];
const log = [];
const move = (id, unilateral = false, equipment = 'BARBELL') => ({ id, nameKey: 'exercises.' + id + '.name', kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment, unilateral, setupFields: [] });
const EXERCISES = [move('bench_press'), move('barbell_row'), move('bulgarian_split_squat', true, 'DUMBBELL'), move('lat_pulldown', false, 'CABLE'), move('lateral_raise', false, 'DUMBBELL'), move('t_bar_row', false, 'PLATE_LOADED')];
const own = [];
const wset = (exerciseId, setType, loadKg, reps, rir, side) => ({ id: uuid(), clientId: uuid(), exerciseId, setType, loadKg, reps, ...(rir === undefined ? {} : { rir }), ...(side ? { side } : {}) });
const workouts = [
  { id: uuid(), clientId: uuid(), startedAt: at(yesterday, 17), endedAt: at(yesterday, 18), sets: [wset('bench_press', 'WARM_UP', 40, 8), wset('bench_press', 'WORKING', 80, 8, 1), wset('bench_press', 'WORKING', 80, 7, 1), wset('barbell_row', 'WORKING', 70, 10, 2)] },
];
const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    const body = raw ? JSON.parse(raw) : null;
    log.push(`${req.method} ${p} ${raw}`);
    console.log(req.method, p, raw);
    if (p === '/v1/meals' && req.method === 'GET') return send(res, 200, meals.filter((m) => dayOf(new Date(m.eatenAt)) === url.searchParams.get('day')));
    if (p === '/v1/meals' && req.method === 'POST') {
      const known = meals.find((m) => m.clientId === body.clientId);
      if (known) return send(res, 200, known);
      const items = body.repeatOf ? meals.find((m) => m.id === body.repeatOf).items : body.items.map((i) => item(byId[i.foodId], i.amount.quantity, i.amount.unit));
      const stored = { ...meal(body.eatenAt, body.slot, items), clientId: body.clientId };
      meals.push(stored);
      return send(res, 201, stored);
    }
    if (p.startsWith('/v1/meals/') && req.method === 'DELETE') {
      const i = meals.findIndex((m) => m.id === p.split('/').pop());
      if (i < 0) return send(res, 404, { code: 'NOT_FOUND', message: 'x' });
      meals.splice(i, 1);
      return send(res, 204);
    }
    if (p === '/v1/exercises') return send(res, 200, EXERCISES);
    if (p === '/v1/custom-exercises' && req.method === 'GET') return send(res, 200, own);
    if (p === '/v1/custom-exercises' && req.method === 'POST') {
      const kept = own.find((m) => m.clientId === body.clientId);
      if (kept) return send(res, 200, kept);
      const stored = { ...body, id: 'custom:' + uuid() };
      own.push(stored);
      return send(res, 201, stored);
    }
    if (p === '/v1/program') {
      const weekday = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][new Date().getDay()];
      return send(res, 200, { id: 'p1', source: 'GENERATED', days: [{ id: 'day-a', nameKey: 'upper_a', weekday, exercises: [
        { exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 80, nextReps: 8 },
        { exerciseId: 'barbell_row', baseSets: 3, sets: 3, reps: { min: 8, max: 12 }, targetRir: 1 }] }] });
    }
    if (p === '/v1/workouts' && req.method === 'GET') return send(res, 200, workouts);
    if (p === '/v1/workouts' && req.method === 'POST') {
      const known = workouts.find((x) => x.clientId === body.clientId);
      if (known) return send(res, 200, known);
      const w = { id: uuid(), clientId: body.clientId, startedAt: body.startedAt, ...(body.programDayId ? { programDayId: body.programDayId } : {}), sets: [] };
      workouts.push(w);
      return send(res, 201, w);
    }
    const fin = p.match(/^\/v1\/workouts\/([^/]+)\/finish$/);
    if (fin && req.method === 'POST') {
      const w = workouts.find((x) => x.id === fin[1]);
      if (!w) return send(res, 404, { code: 'NOT_FOUND', message: 'x' });
      w.endedAt = body.endedAt;
      return send(res, 200, w);
    }
    const wm = p.match(/^\/v1\/workouts\/([^/]+)(\/sets(\/([^/]+))?)?$/);
    if (wm) {
      const w = workouts.find((x) => x.id === wm[1]);
      if (!w) return send(res, 404, { code: 'NOT_FOUND', message: 'x' });
      if (!wm[2] && req.method === 'GET') return send(res, 200, w);
      if (wm[2] && !wm[4] && req.method === 'POST') { const st = { id: uuid(), ...body }; w.sets.push(st); return send(res, 201, st); }
      if (wm[4] && req.method === 'DELETE') { const i = w.sets.findIndex((x) => x.id === wm[4]); if (i < 0) return send(res, 404, { code: 'NOT_FOUND', message: 'x' }); w.sets.splice(i, 1); return send(res, 204); }
    }
    if (p === '/v1/foods/search') return send(res, 200, Object.values(FOODS).filter((f) => f.name.toLowerCase().includes(body.q.toLowerCase().trim().split(' ')[0])));
    if (p === '/v1/foods/barcode-lookup') return body.gtin.endsWith('5') ? send(res, 200, FOODS.yogurt) : send(res, 404, { code: 'NOT_FOUND', message: 'x' });
    if (p === '/v1/food-estimates') {
      const items = body.items.map((i) => item(byId[i.foodId], i.amount.quantity, i.amount.unit));
      const big = items.reduce((a, b) => (b.kcal.high - b.kcal.low > a.kcal.high - a.kcal.low ? b : a));
      const question = body.items.find((i) => i.foodId === big.foodId).amount.certainty === 'WEIGHED' ? undefined : { foodId: big.foodId, copyKey: 'foodEstimate.question.grams' };
      return send(res, 200, { items, kcal: sum(items, 'kcal'), proteinG: sum(items, 'proteinG'), ...(question ? { question } : {}) });
    }
    if (p === `/v1/days/${today}/budget`) {
      const eaten = sum(meals.filter((m) => dayOf(new Date(m.eatenAt)) === today), 'kcal');
      return send(res, 200, { day: today, targetKcal: 2300, eaten: { kcal: eaten, proteinG: R(60, 80), carbsG: R(100, 130), fatG: R(30, 45) }, left: { kcal: R(2300 - eaten.high, 2300 - eaten.low), proteinG: R(80, 100) } });
    }
    if (p === '/v1/targets') return send(res, 200, { stepsPerDay: 8000, trainingSessionsPerWeek: 3, targetKcal: 2300, proteinG: 160, carbsG: 250, fatG: 70 });
    if (p === '/v1/consents') return send(res, 200, [{ kind: 'HEALTH_DATA', status: 'GRANTED' }]);
    if (p.startsWith('/v1/consents/')) return send(res, 200, { kind: 'HEALTH_DATA', status: 'GRANTED' });
    return send(res, 404, { code: 'NOT_FOUND', message: 'x' });
  });
}).listen(8099, '127.0.0.1', () => console.log('fixture on 8099', today));
