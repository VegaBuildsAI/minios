"""Utilidades compartidas de los scripts demo de MiniOS (solo base LOCAL).

Conexión directa a Postgres local y a la API de Storage con la llave de servicio que
imprime `npx supabase status`. Nada de esto se usa en producción.
"""
from __future__ import annotations

import json
import os
import subprocess
import urllib.request
from datetime import datetime, timedelta, timezone

import psycopg

DB_URL = os.environ.get('DEMO_DB_URL', 'postgresql://postgres:postgres@127.0.0.1:54322/postgres')
CR = timezone(timedelta(hours=-6))  # Costa Rica, sin horario de verano
BUCKET = 'bitacora'

# Tablas operativas que se vacían (el catálogo, usuarios y configuración se conservan).
OPERATIONAL = [
    'sale_items', 'sales', 'stock_movements', 'purchase_items', 'purchase_orders',
    'cash_movements', 'shifts', 'captures', 'customers', 'mini_playbook',
]


def local_env() -> dict[str, str]:
    """API URL y llave de servicio del stack local (sin imprimirlas)."""
    if os.environ.get('SUPABASE_URL') and os.environ.get('SERVICE_ROLE_KEY'):
        return {'API_URL': os.environ['SUPABASE_URL'], 'SERVICE_ROLE_KEY': os.environ['SERVICE_ROLE_KEY']}
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    out = subprocess.run('npx supabase status -o env', shell=True, cwd=root, capture_output=True, text=True, check=True).stdout
    env = {}
    for line in out.splitlines():
        if '=' in line and not line.startswith(' '):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"')
    return env


def connect() -> psycopg.Connection:
    return psycopg.connect(DB_URL, autocommit=False)


def _storage(env: dict[str, str], method: str, path: str, body: bytes | None, ctype: str) -> bytes:
    req = urllib.request.Request(
        f"{env['API_URL']}/storage/v1/{path}",
        data=body,
        method=method,
        headers={
            'Authorization': f"Bearer {env['SERVICE_ROLE_KEY']}",
            'apikey': env['SERVICE_ROLE_KEY'],
            'Content-Type': ctype,
            'x-upsert': 'true',
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def upload(env: dict[str, str], path: str, data: bytes, mime: str) -> None:
    _storage(env, 'POST', f'object/{BUCKET}/{path}', data, mime)


def purge(conn: psycopg.Connection, env: dict[str, str], catalog: bool = False) -> dict[str, int]:
    """Borra todo lo operativo (y los archivos de Bitácora). Con catalog=True también
    productos, categorías y proveedores, para cargar el catálogo real desde cero."""
    counts: dict[str, int] = {}
    with conn.cursor() as cur:
        cur.execute("select name from storage.objects where bucket_id = %s", (BUCKET,))
        files = [r[0] for r in cur.fetchall()]
        for i in range(0, len(files), 100):
            _storage(env, 'DELETE', f'object/{BUCKET}', json.dumps({'prefixes': files[i:i + 100]}).encode(), 'application/json')
        counts['archivos'] = len(files)
        for t in OPERATIONAL:
            cur.execute(f'delete from public.{t}')
            counts[t] = cur.rowcount
        if catalog:
            for t in ('products', 'categories', 'suppliers'):
                cur.execute(f'delete from public.{t}')
                counts[t] = cur.rowcount
        else:
            cur.execute('update public.products set stock_qty = 0')
    conn.commit()
    return counts


def cr_dt(day: datetime, hour: int, minute: int = 0, second: int = 0) -> datetime:
    """Fecha y hora de pared en Costa Rica → datetime con zona."""
    return datetime(day.year, day.month, day.day, hour, minute, second, tzinfo=CR)


def now_cr() -> datetime:
    return datetime.now(CR)
