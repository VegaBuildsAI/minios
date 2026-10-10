"""Documentos demo para probar la lectura con IA (facturas, tiquetes, cierre Z, nota).

Se dibujan con Pillow para que la demo no dependa de fotos reales: una factura nítida,
una «foto» torcida con ruido, una factura en PDF, tiquetes de caja registradora (uno con
nombres completos y otro abreviado), un cierre de caja Z y una nota manuscrita.
"""
from __future__ import annotations

import io
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONTS = 'C:/Windows/Fonts/'


def _font(name: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(FONTS + name, size)
    except OSError:
        return ImageFont.load_default()


def crc(n: float) -> str:
    return f'{n:,.2f}'.replace(',', ' ')


def invoice(supplier: str, cedula: str, number: str, date: str, lines: list[tuple[str, int, float]], buyer: str) -> Image.Image:
    """Factura electrónica de proveedor. lines = [(descripción, cantidad, costo unitario)]."""
    w, h = 1100, 520 + 46 * len(lines)
    img = Image.new('RGB', (w, h), 'white')
    d = ImageDraw.Draw(img)
    big, reg, bold, small = _font('arialbd.ttf', 40), _font('arial.ttf', 24), _font('arialbd.ttf', 24), _font('arial.ttf', 20)
    d.text((50, 40), supplier.upper(), font=big, fill='black')
    d.text((50, 95), f'Cédula jurídica {cedula} · Tel. 2222-0000', font=small, fill='#333')
    d.text((50, 140), 'FACTURA ELECTRÓNICA', font=bold, fill='black')
    d.text((50, 175), f'N° {number}', font=reg, fill='black')
    d.text((700, 140), f'Fecha: {date}', font=reg, fill='black')
    d.text((50, 215), f'Cliente: {buyer}', font=reg, fill='black')
    y = 270
    d.line((50, y, w - 50, y), fill='black', width=2)
    for x, t in ((50, 'Cant.'), (160, 'Descripción'), (700, 'Precio'), (900, 'Total')):
        d.text((x, y + 10), t, font=bold, fill='black')
    y += 50
    sub = 0.0
    for desc, qty, cost in lines:
        tot = qty * cost
        sub += tot
        d.text((60, y), str(qty), font=reg, fill='black')
        d.text((160, y), desc, font=reg, fill='black')
        d.text((700, y), crc(cost), font=reg, fill='black')
        d.text((900, y), crc(tot), font=reg, fill='black')
        y += 46
    d.line((50, y + 5, w - 50, y + 5), fill='black', width=2)
    iva = round(sub * 0.13, 2)
    for i, (k, v) in enumerate((('Subtotal', sub), ('IVA 13 %', iva), ('TOTAL', sub + iva))):
        d.text((700, y + 25 + i * 38), k, font=bold if k == 'TOTAL' else reg, fill='black')
        d.text((900, y + 25 + i * 38), crc(v), font=bold if k == 'TOTAL' else reg, fill='black')
    return img


def as_photo(img: Image.Image, seed: int, angle: float = 3.5) -> Image.Image:
    """Simula una foto de celular: rotada, con fondo de mesa, algo borrosa y con ruido."""
    rnd = random.Random(seed)
    bg = Image.new('RGB', (img.width + 220, img.height + 220), (118, 98, 80))
    rot = img.rotate(angle, expand=True, fillcolor=(118, 98, 80), resample=Image.Resampling.BICUBIC)
    bg.paste(rot, (110 - (rot.width - img.width) // 2, 110 - (rot.height - img.height) // 2))
    px = bg.load()
    for _ in range(bg.width * bg.height // 25):
        x, y = rnd.randrange(bg.width), rnd.randrange(bg.height)
        r, g, b = px[x, y]
        n = rnd.randint(-28, 28)
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return bg.filter(ImageFilter.GaussianBlur(0.8))


def ticket(business: str, number: str, date: str, time: str, lines: list[tuple[str, int, float]], paid: float) -> Image.Image:
    """Tiquete de caja registradora (papel térmico angosto)."""
    font = _font('consola.ttf', 26)
    rows = [f'  {business.upper()[:22]}', '  Ced. 3-101-000000', '', f'TIQUETE No. {number}', f'FECHA {date} {time}', '-' * 26]
    total = 0.0
    for desc, qty, price in lines:
        total += qty * price
        rows += [f'{qty} {desc[:22]}', f'{price:>12,.2f}{qty * price:>12,.2f}']
    rows += ['-' * 26, f'TOTAL {total:>18,.2f}', f'EFECTIVO {paid:>15,.2f}', f'VUELTO {paid - total:>17,.2f}', '', ' GRACIAS POR SU COMPRA']
    img = Image.new('RGB', (520, 60 + 38 * len(rows)), (252, 252, 247))
    d = ImageDraw.Draw(img)
    for i, r in enumerate(rows):
        d.text((24, 30 + i * 38), r, font=font, fill=(40, 40, 40))
    return img


def z_report(business: str, date: str, number: int, by_method: dict[str, float], tickets: int) -> Image.Image:
    """Cierre de caja (reporte Z) de la registradora."""
    font = _font('consola.ttf', 26)
    total = sum(by_method.values())
    rows = [f'  {business.upper()[:22]}', '   REPORTE Z - CIERRE', f'Z No. {number:04d}   {date}', '-' * 26, f'TIQUETES {tickets:>17}']
    rows += [f'{k.upper():<10}{v:>16,.2f}' for k, v in by_method.items()]
    rows += ['-' * 26, f'TOTAL {total:>20,.2f}', f'IVA INCL. {total * 13 / 113:>16,.2f}', '', '  ** FIN DE REPORTE **']
    img = Image.new('RGB', (520, 60 + 38 * len(rows)), (252, 252, 247))
    d = ImageDraw.Draw(img)
    for i, r in enumerate(rows):
        d.text((24, 30 + i * 38), r, font=font, fill=(40, 40, 40))
    return img


def handwritten(lines: list[str]) -> Image.Image:
    """Nota manuscrita en papel rayado (fuente Ink Free / Segoe Script)."""
    font = _font('Inkfree.ttf', 42)
    img = Image.new('RGB', (1000, 140 + 80 * len(lines)), (255, 253, 231))
    d = ImageDraw.Draw(img)
    for y in range(90, img.height, 80):
        d.line((40, y + 52, 960, y + 52), fill=(170, 200, 230), width=2)
    for i, t in enumerate(lines):
        d.text((60 + (i % 2) * 6, 90 + i * 80), t, font=font, fill=(30, 50, 120))
    return img.rotate(-1.2, expand=False, fillcolor=(255, 253, 231))


def jpeg(img: Image.Image, quality: int = 85) -> bytes:
    b = io.BytesIO()
    img.save(b, 'JPEG', quality=quality)
    return b.getvalue()


def pdf(img: Image.Image) -> bytes:
    b = io.BytesIO()
    img.save(b, 'PDF', resolution=150)
    return b.getvalue()
