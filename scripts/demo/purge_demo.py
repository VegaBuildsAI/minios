"""Borra los datos demo de la base LOCAL para cargar la operación real.

Uso:  python scripts/demo/purge_demo.py            # ventas, compras, caja, Bitácora…; stock en 0
      python scripts/demo/purge_demo.py --catalog  # además productos, categorías y proveedores

No toca usuarios, perfiles ni la configuración del negocio.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')  # la consola de Windows no imprime ₡
from demo_common import connect, local_env, purge  # noqa: E402

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--catalog', action='store_true', help='borra también el catálogo')
    a = ap.parse_args()
    conn = connect()
    print('Borrado:', purge(conn, local_env(), catalog=a.catalog))
    conn.close()
