"""Datos demo de MiniOS para la presentación (base LOCAL).

Uso:  python scripts/demo/seed_demo.py [--days 56] [--seed 7]

Simula, con semilla fija (mismo resultado cada vez), N días de operación del
«Minisúper Demo» sobre el catálogo existente y deja la app lista para mostrar:
  · tiquetes con estacionalidad (viernes/sábado y quincena altos), popularidad tipo
    Pareto, pares que se compran juntos y quiebres de stock reales;
  · compras recibidas en cada visita de proveedor (con su movimiento de inventario);
  · turnos diarios con cuadre (uno con faltante), gastos, pagos, retiros y abonos;
  · clientes de fiado; ajustes de merma/vencimiento/robo;
  · tres productos que dejan de reponerse para que Mini los marque en riesgo;
  · documentos en la Bitácora: facturas ya aplicadas y PENDIENTES para probar la IA
    (foto nítida, foto torcida, PDF), tiquetes de registradora, cierre Z y nota manuscrita.
Al final genera el plan de Mini del día (mini-daily). Los datos son visibles para todos
los usuarios (superadmin y dueños). Para borrarlos: scripts/demo/purge_demo.py.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
import time
import uuid
from datetime import datetime, timedelta

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')  # la consola de Windows no imprime ₡
import demo_docs as docs  # noqa: E402
from demo_common import connect, cr_dt, local_env, now_cr, purge, upload  # noqa: E402

BUSINESS = 'Minisúper Demo'
DOW_FACTOR = [0.8, 0.85, 0.9, 0.95, 1.0, 1.3, 1.35]  # lunes=0 … domingo=6 (datetime.weekday)
HOUR_W = {6: 2, 7: 6, 8: 6, 9: 4, 10: 4, 11: 5, 12: 8, 13: 6, 14: 3, 15: 3, 16: 4, 17: 7, 18: 10, 19: 9, 20: 5}
PAY = [('efectivo', 0.58), ('sinpe', 0.28), ('tarjeta', 0.10), ('fiado', 0.04)]
POPULAR = {
    'Agua Embotellada 600ml': 9, 'Gaseosa Lata 350ml': 8, 'Chicles': 7, 'Pan Baguette': 8, 'Leche Entera 1L': 8,
    'Arroz Blanco 1kg': 7, 'Huevos 30u': 5, 'Cerveza Imperial 350ml': 8, 'Galletas Dulces 120g': 5, 'Papas Fritas 150g': 6,
    'Gaseosa Cola 2.5L': 5, 'Frijol Negro 900g': 5, 'Natilla 400g': 4, 'Café Molido 500g': 3, 'Aceite Vegetal 1L': 4,
    'Tortillas de Maíz 500g': 5, 'Pan Cuadrado': 4, 'Maní Salado 100g': 4, 'Leche Semidescremada 1L': 4,
}
PAIRS = [('Pan Baguette', 'Natilla 400g'), ('Café Molido 500g', 'Leche Entera 1L'), ('Cerveza Imperial 350ml', 'Maní Salado 100g'), ('Arroz Blanco 1kg', 'Frijol Negro 900g')]
AT_RISK = {'Aceite Vegetal 1L', 'Huevos 30u', 'Leche Semidescremada 1L'}  # dejan de reponerse al final
CUSTOMERS = ['Doña Marta Rojas', 'Don Rigoberto Mora', 'Cindy Vargas', 'Carlos Jiménez']
SUP_CEDULA = {'Dos Pinos': '3-004-045002', 'Distribuidora CR': '3-101-512345', 'FEMSA': '3-101-111111', 'La Económica': '3-101-222333'}
DAY_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']  # weekday()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--days', type=int, default=56)
    ap.add_argument('--seed', type=int, default=7)
    args = ap.parse_args()
    rnd = random.Random(args.seed)
    rng = np.random.default_rng(args.seed)
    env = local_env()
    conn = connect()
    t0 = time.time()

    print('Limpiando datos operativos…', purge(conn, env))
    cur = conn.cursor()

    cur.execute("select u.email, p.id from public.profiles p join auth.users u on u.id = p.id")
    users = dict(cur.fetchall())
    cashiers = [users[e] for e in ('duena.demo@minios.test', 'dueno.demo@minios.test', 'staff.demo@minios.test') if e in users]
    owner = users.get('duena.demo@minios.test') or next(iter(users.values()))

    cur.execute("select p.id, p.name, p.cost_price, p.sale_price, p.min_qty, s.name, s.visit_days from public.products p left join public.suppliers s on s.id = p.supplier_id where p.is_active")
    prods = [dict(id=r[0], name=r[1], cost=float(r[2]), price=float(r[3]), min=float(r[4]), sup=r[5], visit=r[6] or []) for r in cur.fetchall()]
    by_name = {p['name']: p for p in prods}
    cur.execute('select id, name, visit_days from public.suppliers where is_active')
    sups = {r[1]: dict(id=r[0], name=r[1], days=[DAY_KEYS.index(d) for d in r[2] if d in DAY_KEYS]) for r in cur.fetchall()}

    # Popularidad (pesos) y demanda diaria esperada por producto
    for p in prods:
        p['w'] = POPULAR.get(p['name'], float(rng.lognormal(0.3, 0.5)))
    wsum = sum(p['w'] for p in prods)
    base_tickets, items_per_ticket = 30, 2.4
    for p in prods:
        p['rate'] = base_tickets * items_per_ticket * p['w'] / wsum  # unidades/día aprox.
        p['stock'] = int(math.ceil(p['min'] + p['rate'] * 6 + 6))
    cur.executemany('update public.products set stock_qty = %s where id = %s', [(p['stock'], p['id']) for p in prods])

    customers = []
    for n in CUSTOMERS:
        cid = str(uuid.uuid4())
        cur.execute('insert into public.customers (id, name, phone, balance_debt) values (%s, %s, %s, 0)', (cid, n, f'8{rnd.randint(1000000, 9999999)}'))
        customers.append({'id': cid, 'name': n, 'debt': 0.0})

    today = now_cr().date()
    start = today - timedelta(days=args.days)
    sale_rows, item_rows, move_rows, cash_rows, shift_rows, po_rows, poi_rows = [], [], [], [], [], [], []
    applied_pos: list[dict] = []
    po_n = 1200
    shortage_days = {start + timedelta(days=args.days - 9), start + timedelta(days=args.days - 23)}

    def next_visit_gap(sup: dict, dow: int) -> int:
        offs = sorted(((d - dow) % 7) for d in sup['days'] if (d - dow) % 7 > 0)
        return offs[0] if offs else 7

    for di in range(args.days + 1):
        day = start + timedelta(days=di)
        is_today = day == today
        dow = day.weekday()
        limit = now_cr() if is_today else None
        if is_today and now_cr().hour < 7:
            break  # antes de abrir: hoy todavía sin operación

        # Turno del día
        shift_id = str(uuid.uuid4())
        cashier = cashiers[di % len(cashiers)]
        opened = cr_dt(day, 6, 30)
        shift = dict(id=shift_id, staff=cashier, opened=opened, cash_sales=0.0, total=0.0, cash_in=0.0, cash_out=0.0)

        # Visitas de proveedor: compra recibida a las 9:00
        for s in sups.values():
            if dow not in s['days'] or (limit and limit < cr_dt(day, 9)):
                continue
            gap = next_visit_gap(s, dow)
            lines = []
            for p in prods:
                if p['sup'] != s['name']:
                    continue
                if p['name'] in AT_RISK and di > args.days - 12:
                    continue
                target = math.ceil(p['rate'] * (gap + 3) + p['min'])
                if p['stock'] < target * 0.85:
                    qty = int(target - p['stock'] + rnd.randint(0, 3))
                    lines.append((p, qty))
            if not lines:
                continue
            po_id, po_n = str(uuid.uuid4()), po_n + 1
            at = cr_dt(day, 9, rnd.randint(0, 40))
            total = sum(q * p['cost'] for p, q in lines)
            po_rows.append((po_id, s['id'], 'recibida', total, at, at))
            for p, q in lines:
                poi_rows.append((po_id, p['id'], q, q, p['cost']))
                move_rows.append((p['id'], q, 'purchase', po_id, owner, at))
                p['stock'] += q
            applied_pos.append(dict(id=po_id, sup=s['name'], at=at, lines=[(p['name'], q, p['cost']) for p, q in lines], total=total, n=po_n))
            # Se paga en efectivo si es poco; si no, por transferencia
            if total * 1.13 <= 40000:  # alcanza con el fondo de la gaveta
                cash_rows.append(('pago_proveedor', round(total * 1.13), f'{s["name"]} · factura {po_n}', s['id'], shift_id, owner, at + timedelta(minutes=5)))
                shift['cash_out'] += round(total * 1.13)

        # Tiquetes del día
        lam = base_tickets * DOW_FACTOR[dow] * (1.25 if day.day in (15, 16, 30, 31, 1) else 1.0) * (1.5 if day == today - timedelta(days=1) else 1.0)
        n = int(rng.poisson(lam))
        hours = list(HOUR_W)
        hw = np.array([HOUR_W[h] for h in hours], dtype=float)
        stamps = sorted(cr_dt(day, int(rng.choice(hours, p=hw / hw.sum())), rnd.randint(0, 59), rnd.randint(0, 59)) for _ in range(n))
        weights = np.array([p['w'] for p in prods])
        for at in stamps:
            if limit and at > limit:
                break
            k = 1 + min(5, int(rng.poisson(1.4)))
            picks = list(rng.choice(len(prods), size=min(k, len(prods)), replace=False, p=weights / weights.sum()))
            names = {prods[i]['name'] for i in picks}
            for a, b in PAIRS:
                for x, y in ((a, b), (b, a)):
                    if x in names and y not in names and y in by_name and rnd.random() < 0.45:
                        picks.append(prods.index(by_name[y]))
                        names.add(y)
            lines = []
            for i in picks:
                p = prods[i]
                q = 2 if p['price'] < 1000 and rnd.random() < 0.25 else 1
                if p['stock'] >= q:
                    p['stock'] -= q
                    lines.append((p, q))
            if not lines:
                continue
            total = sum(q * p['price'] for p, q in lines)
            r = rnd.random()
            method = next((m for m, c in zip([m for m, _ in PAY], np.cumsum([w for _, w in PAY])) if r <= c), 'efectivo')
            sid = str(uuid.uuid4())
            cust = None
            if method == 'fiado':
                c = rnd.choice(customers)
                cust = c['id']
                c['debt'] += total
            tax = round(total * 13 / 113, 2)
            sale_rows.append((sid, rnd.choice(cashiers), cust, shift_id, method, total - tax, tax, total, at))
            for p, q in lines:
                item_rows.append((sid, p['id'], q, p['price']))
            shift['total'] += total
            if method == 'efectivo':
                shift['cash_sales'] += total

        # Gastos, retiros y abonos de fiado
        if rnd.random() < 0.45 and not (limit and limit < cr_dt(day, 11)):
            amt = rnd.choice([2500, 3500, 4000, 6000, 8000])
            cash_rows.append(('gasto', amt, rnd.choice(['Hielo', 'Bolsas plásticas', 'Productos de limpieza', 'Transporte', 'Recarga de gas']), None, shift_id, cashier, cr_dt(day, 11, rnd.randint(0, 59))))
            shift['cash_out'] += amt
        if dow == 5 and not is_today and 50000 + shift['cash_sales'] + shift['cash_in'] - shift['cash_out'] > 60000:
            cash_rows.append(('retiro', 40000, 'Retiro semanal del dueño', None, shift_id, owner, cr_dt(day, 20, 30)))
            shift['cash_out'] += 40000
        if rnd.random() < 0.18 and not (limit and limit < cr_dt(day, 16)):
            c = rnd.choice([c for c in customers if c['debt'] > 2000] or customers)
            if c['debt'] > 2000:
                amt = round(min(c['debt'], rnd.choice([2000, 5000, 10000])))
                c['debt'] -= amt
                cash_rows.append(('ingreso', amt, f'Abono de fiado · {c["name"]}', None, shift_id, cashier, cr_dt(day, 16, rnd.randint(0, 59))))
                shift['cash_in'] += amt

        # Cierre del turno (hoy queda abierto)
        expected = 50000 + shift['cash_sales'] + shift['cash_in'] - shift['cash_out']
        if is_today:
            shift_rows.append((shift_id, cashier, opened, None, 50000, None, 0))
        else:
            diff = -2000 if day in shortage_days else 0
            shift_rows.append((shift_id, cashier, opened, cr_dt(day, 21), 50000, round(expected + diff), round(shift['total'], 2)))

        # Ajustes de inventario esporádicos
        if di % 9 == 4 and not is_today:
            for name, delta, reason in (('Pan Baguette', -2, 'merma'), ('Yogurt 1L', -1, 'vencimiento'), ('Chicles', -3, 'robo')):
                p = by_name.get(name)
                if p and p['stock'] >= -delta:
                    p['stock'] += delta
                    move_rows.append((p['id'], delta, reason, None, owner, cr_dt(day, 20, 45)))

    # ---------- Inserciones (los triggers aplican stock) ----------
    cur.executemany('insert into public.shifts (id, staff_id, opened_at, closed_at, opening_cash, closing_cash, total_sales) values (%s,%s,%s,%s,%s,%s,%s)', shift_rows)
    cur.executemany('insert into public.purchase_orders (id, supplier_id, status, total, created_at, received_at) values (%s,%s,%s,%s,%s,%s)', po_rows)
    cur.executemany('insert into public.purchase_items (po_id, product_id, qty_ordered, qty_received, unit_cost) values (%s,%s,%s,%s,%s)', poi_rows)
    cur.executemany('insert into public.stock_movements (product_id, delta, reason, reference_id, created_by, created_at) values (%s,%s,%s,%s,%s,%s)', move_rows)
    cur.executemany('insert into public.sales (id, staff_id, customer_id, shift_id, payment_method, subtotal, tax, total, created_at) values (%s,%s,%s,%s,%s,%s,%s,%s,%s)', sale_rows)
    cur.executemany('insert into public.sale_items (sale_id, product_id, qty, unit_price) values (%s,%s,%s,%s)', item_rows)
    # El trigger de ventas fecha sus movimientos con now(): se les pone la hora de la venta.
    cur.execute("update public.stock_movements m set created_at = s.created_at from public.sales s where m.reason = 'sale' and m.reference_id = s.id")
    cur.executemany('insert into public.cash_movements (kind, amount, note, supplier_id, shift_id, created_by, created_at) values (%s,%s,%s,%s,%s,%s,%s)', cash_rows)
    cur.executemany('update public.customers set balance_debt = %s where id = %s', [(round(c['debt']), c['id']) for c in customers])

    # Órdenes abiertas (para ver el flujo de compras)
    for sname, status, items in (('FEMSA', 'borrador', [('Cerveza Imperial 350ml', 24), ('Agua Embotellada 600ml', 24)]), ('La Económica', 'enviada', [('Papel Higiénico 4u', 12), ('Cloro 1L', 10)])):
        po = str(uuid.uuid4())
        tot = sum(q * by_name[n]['cost'] for n, q in items)
        cur.execute('insert into public.purchase_orders (id, supplier_id, status, total, created_at) values (%s,%s,%s,%s,%s)', (po, sups[sname]['id'], status, tot, now_cr() - timedelta(hours=20)))
        for n_, q in items:
            cur.execute('insert into public.purchase_items (po_id, product_id, qty_ordered, qty_received, unit_cost) values (%s,%s,%s,0,%s)', (po, by_name[n_]['id'], q, by_name[n_]['cost']))
    conn.commit()

    # ---------- Bitácora: documentos ----------
    yday = today - timedelta(days=1)
    caps = []

    def add_file(name: str, data: bytes, mime: str, category: str, created: datetime, raw: str | None = None, status='borrador', parsed=None, extracted=None, by=None):
        path = f'{created:%Y-%m}/demo-{uuid.uuid4().hex[:8]}-{name}'
        upload(env, path, data, mime)
        caps.append(dict(type='file', category=category, raw=raw, status=status, by=by or owner, created=created, path=path, name=name, mime=mime, size=len(data), parsed=parsed, extracted=extracted, ai='listo' if parsed else 'sin_procesar'))

    # Facturas ya aplicadas (las 3 últimas compras recibidas)
    for po in sorted(applied_pos, key=lambda x: x['at'])[-3:]:
        num = f'00100001010000{po["n"]:06d}'
        img = docs.invoice(po['sup'], SUP_CEDULA.get(po['sup'], '3-101-000000'), num, po['at'].strftime('%d/%m/%Y'), po['lines'], BUSINESS)
        sub = po['total']
        ai = {'categoria': 'inventario', 'tipo': 'factura_proveedor', 'proveedor': po['sup'], 'fecha': po['at'].strftime('%Y-%m-%d'), 'numero': num, 'moneda': 'CRC',
              'subtotal': round(sub, 2), 'iva': round(sub * 0.13, 2), 'total': round(sub * 1.13, 2),
              'lineas': [{'d': d, 'c': q, 'p': c, 't': round(q * c, 2)} for d, q, c in po['lines']],
              'resumen': f'Factura de {po["sup"]} con {len(po["lines"])} productos.', 'texto': None, 'confianza': 0.95, 'revisar': []}
        add_file('factura.jpg', docs.jpeg(img), 'image/jpeg', 'inventario', po['at'], status='procesado', parsed={'ai': ai, 'applied': {'po_id': po['id'], 'at': po['at'].isoformat()}},
                 extracted=f'{ai["resumen"]}\nfactura proveedor · {po["sup"]} · N° {num}')

    # Pendientes para probar la lectura con IA
    dp = [('Leche Entera 1L', 24, 700), ('Natilla 400g', 12, 900), ('Huevos 30u', 6, 2800), ('Yogurt 1L', 6, 1200)]
    add_file('factura-dos-pinos.jpg', docs.jpeg(docs.invoice('Dos Pinos', SUP_CEDULA['Dos Pinos'], '00100001010000098765', today.strftime('%d/%m/%Y'), dp, BUSINESS)), 'image/jpeg', 'inventario', now_cr() - timedelta(minutes=50))
    dc = [('Aceite Vegetal 1L', 12, 1650), ('Arroz Blanco 1kg', 24, 700), ('Frijol Negro 900g', 12, 1050), ('Azúcar Blanca 2kg', 10, 1400), ('Café Molido 500g', 6, 2500)]
    photo = docs.as_photo(docs.invoice('Distribuidora CR', SUP_CEDULA['Distribuidora CR'], '00100001010000054321', yday.strftime('%d/%m/%Y'), dc, BUSINESS), seed=args.seed)
    add_file('factura-distribuidora-foto.jpg', docs.jpeg(photo, 80), 'image/jpeg', 'inventario', now_cr() - timedelta(hours=3))
    le = [('Papel Higiénico 4u', 12, 1800), ('Detergente 1kg', 6, 1600), ('Cloro 1L', 12, 700), ('Jabón de Baño', 12, 600)]
    add_file('factura-la-economica.pdf', docs.pdf(docs.invoice('La Económica', SUP_CEDULA['La Económica'], '00100001010000011223', yday.strftime('%d/%m/%Y'), le, BUSINESS)), 'application/pdf', 'inventario', now_cr() - timedelta(hours=5))

    t1 = [('ARROZ BLANCO 1KG', 2, 900), ('FRIJOL NEGRO 900G', 1, 1350), ('NATILLA 400G', 1, 1250), ('PAN BAGUETTE', 2, 800)]
    add_file('tiquete-1.jpg', docs.jpeg(docs.as_photo(docs.ticket(BUSINESS, '004871', today.strftime('%d/%m/%Y'), '08:12', t1, 10000), seed=11, angle=-2)), 'image/jpeg', 'caja', now_cr() - timedelta(minutes=30), raw='Tiquete de caja')
    t2 = [('LECHE ENT 1L DP', 2, 950), ('GALL MARIA 200', 1, 850), ('CERV IMP 350', 6, 1100), ('MANI SAL 100G', 2, 850)]
    add_file('tiquete-2.jpg', docs.jpeg(docs.as_photo(docs.ticket(BUSINESS, '004872', today.strftime('%d/%m/%Y'), '08:40', t2, 12000), seed=12, angle=1.5)), 'image/jpeg', 'caja', now_cr() - timedelta(minutes=20), raw='Tiquete de caja')

    ys = [r for r in sale_rows if r[8].date() == yday]
    bym = {m: sum(float(r[7]) for r in ys if r[4] == m) for m in ('efectivo', 'sinpe', 'tarjeta', 'fiado')}
    add_file('cierre-z.jpg', docs.jpeg(docs.as_photo(docs.z_report(BUSINESS, yday.strftime('%d/%m/%Y'), 312, bym, len(ys)), seed=13, angle=-1)), 'image/jpeg', 'caja', cr_dt(yday, 21, 5))
    add_file('nota-manuscrita.jpg', docs.jpeg(docs.handwritten(['Llamar a Dos Pinos:', 'faltó 1 caja de leche', 'en la entrega del martes.', 'Pedir 2 sacos de arroz', 'para la quincena.'])), 'image/jpeg', 'notas', now_cr() - timedelta(hours=8))

    for c in caps:
        cur.execute(
            """insert into public.captures (type, category, raw_input, status, created_by, created_at, file_path, file_name, file_mime, file_size, parsed_json, extracted_text, ai_status, ai_confidence, ai_model, confirmed_at)
               values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,%s,%s,%s)""",
            (c['type'], c['category'], c['raw'], c['status'], c['by'], c['created'], c['path'], c['name'], c['mime'], c['size'],
             None if c['parsed'] is None else json.dumps(c['parsed'], ensure_ascii=False), c['extracted'], c['ai'],
             0.95 if c['parsed'] else None, 'claude-haiku-5-5' if c['parsed'] else None, c['created'] if c['status'] == 'procesado' else None),
        )
    for text_, typ, cat, hrs in (('Llegó el de FEMSA, dejó 2 cajas de Imperial y se llevó los envases.', 'text', 'inventario', 26), ('Nota de voz: mañana viene el técnico de la refri a las 10.', 'voice', 'notas', 4)):
        cur.execute('insert into public.captures (type, category, raw_input, status, created_by, created_at) values (%s,%s,%s,%s,%s,%s)', (typ, cat, text_, 'borrador', owner, now_cr() - timedelta(hours=hrs)))
    conn.commit()

    # ---------- Plan de Mini del día ----------
    cur.execute('select public.mini_daily_kick(%s)', ('now',))
    conn.commit()
    for _ in range(30):
        time.sleep(2)
        cur.execute("select status, tokens, cost_usd from public.mini_playbook where day = (now() at time zone 'America/Costa_Rica')::date")
        row = cur.fetchone()
        if row:
            break

    cur.execute('select count(*), coalesce(sum(total),0) from public.sales')
    ns, tot = cur.fetchone()
    cur.execute('select name, stock_qty from public.products where name = any(%s)', (list(AT_RISK),))
    print(f'Listo en {time.time() - t0:.0f}s: {ns} tiquetes (₡{float(tot):,.0f}), {len(po_rows)} compras, {len(cash_rows)} movimientos de efectivo, {len(caps)} documentos.')
    print('En riesgo:', dict(cur.fetchall()))
    print('Plan de Mini:', row)
    conn.close()


if __name__ == '__main__':
    main()
