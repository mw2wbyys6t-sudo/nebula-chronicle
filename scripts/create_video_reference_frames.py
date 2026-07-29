#!/usr/bin/env python3
"""Create reference composite frames for video generation."""
import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont

BASE_DIR = "/workspace"
CHARACTERS = [
    ("violet-evergarden.png", "Violet", "#b892ff"),
    ("akiyama-mio.jpg", "Mio", "#ff9ec8"),
    ("tachibana-kanade.jpg", "Kanade", "#c7f0ff"),
    ("shana.jpg", "Shana", "#ff4d4d"),
    ("kato-megumi.jpg", "Megumi", "#ffb7c5"),
    ("rem.jpg", "Rem", "#7fd3ff"),
    ("elaina.jpg", "Elaina", "#e8e8ff"),
    ("misaka-mikoto.jpg", "Mikoto", "#00bfff"),
]
IMAGE_BASE = os.path.join(BASE_DIR, "images", "login")
BG_PATH = os.path.join(BASE_DIR, "images", "generated", "nebula-bg.jpg")
OUT_DIR = os.path.join(BASE_DIR, "images", "generated", "video-refs")

def load_character(path):
    img = Image.open(path).convert("RGBA")
    # Crop to center square if very different aspect ratio
    w, h = img.size
    if w / h > 1.3:
        # too wide, crop center
        new_w = int(h * 0.85)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    elif h / w > 1.3:
        new_h = int(w * 0.85)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))
    return img

def fit_size(img, size):
    return img.copy().resize(size, Image.Resampling.LANCZOS)

def circular_mask(size):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size[0]-1, size[1]-1), fill=255)
    return mask

def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0]-1, size[1]-1), radius=radius, fill=255)
    return mask

def create_canvas():
    bg = Image.open(BG_PATH).convert("RGBA")
    bg = bg.resize((1920, 1080), Image.Resampling.LANCZOS)
    # Darken and boost saturation for cinematic look
    bg = ImageEnhance.Brightness(bg).enhance(0.55)
    bg = ImageEnhance.Contrast(bg).enhance(1.15)
    bg = ImageEnhance.Color(bg).enhance(1.25)
    return bg

def composite_a_ring():
    """8 character portraits arranged in a circle around title."""
    canvas = create_canvas()
    draw = ImageDraw.Draw(canvas)
    W, H = canvas.size

    # Add soft radial glow behind center
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for r in range(400, 0, -10):
        alpha = int(18 * (r / 400))
        gdraw.ellipse((W//2 - r, H//2 - r, W//2 + r, H//2 + r), fill=(0, 243, 255, alpha))
    canvas = Image.alpha_composite(canvas, glow)

    # Title in center
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = font_title

    title = "NEBULA CHRONICLE"
    bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, H // 2 - 40), title, fill=(255, 255, 255, 255), font=font_title)
    sub = "星云编年史"
    bbox = draw.textbbox((0, 0), sub, font=font_sub)
    sw = bbox[2] - bbox[0]
    draw.text(((W - sw) // 2, H // 2 + 45), sub, fill=(200, 240, 255, 220), font=font_sub)

    # Character heads in circle
    radius = min(W, H) * 0.32
    center = (W // 2, H // 2 + 20)
    head_size = 170
    for i, (fname, name, color) in enumerate(CHARACTERS):
        angle = (i / 8) * math.pi * 2 - math.pi / 2
        x = center[0] + radius * math.cos(angle) - head_size // 2
        y = center[1] + radius * math.sin(angle) - head_size // 2

        img = load_character(os.path.join(IMAGE_BASE, fname))
        # Crop to face area approx center
        iw, ih = img.size
        crop_size = min(iw, ih)
        left = (iw - crop_size) // 2
        top = int((ih - crop_size) * 0.05)
        img = img.crop((left, top, left + crop_size, top + crop_size))
        img = img.resize((head_size, head_size), Image.Resampling.LANCZOS)

        # Circular crop
        mask = circular_mask((head_size, head_size))
        # Add colored ring
        ring = Image.new("RGBA", (head_size + 16, head_size + 16), (0, 0, 0, 0))
        rdraw = ImageDraw.Draw(ring)
        ring_color = tuple(int(color.lstrip('#')[j:j+2], 16) for j in (0, 2, 4)) + (200,)
        rdraw.ellipse((0, 0, head_size+15, head_size+15), fill=ring_color)
        ring.paste(img, (8, 8), mask)
        # Add outer glow
        glow_ring = ring.filter(ImageFilter.GaussianBlur(8))
        canvas.paste(glow_ring, (int(x) - 8, int(y) - 8), glow_ring)
        canvas.paste(ring, (int(x), int(y)), ring)

    return canvas.convert("RGB")

def composite_b_group():
    """Group portrait of 8 characters like anime OP."""
    canvas = create_canvas()
    W, H = canvas.size

    # Add bottom gradient vignette
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for y in range(H):
        alpha = int(120 * (y / H) ** 2)
        ImageDraw.Draw(overlay).line([(0, y), (W, y)], fill=(3, 3, 10, alpha))
    canvas = Image.alpha_composite(canvas, overlay)

    # Place characters in two rows, overlapping
    positions = [
        (180, 260, 340), (520, 220, 360), (860, 210, 380), (1200, 220, 360),
        (340, 560, 360), (660, 540, 400), (1000, 560, 360), (1420, 580, 340)
    ]

    for (fname, name, color), (x, y, h) in zip(CHARACTERS, positions):
        img = load_character(os.path.join(IMAGE_BASE, fname))
        iw, ih = img.size
        w = int(h * iw / ih)
        img = img.resize((w, h), Image.Resampling.LANCZOS)

        # Soft bottom fade
        mask = Image.new("L", (w, h), 255)
        for row in range(int(h * 0.75), h):
            alpha = int(255 * (1 - (row - h * 0.75) / (h * 0.25)))
            ImageDraw.Draw(mask).line([(0, row), (w, row)], fill=max(0, alpha))

        # Colored rim glow
        glow = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
        glow_color = tuple(int(color.lstrip('#')[j:j+2], 16) for j in (0, 2, 4)) + (80,)
        ImageDraw.Draw(glow).rectangle((0, 0, w+39, h+39), fill=glow_color)
        glow = glow.filter(ImageFilter.GaussianBlur(20))
        canvas.paste(glow, (x - 20, y - 20), glow)
        canvas.paste(img, (x, y), mask)

    # Title at top
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 54)
    except Exception:
        font = ImageFont.load_default()
    title = "NEBULA CHRONICLE"
    bbox = draw.textbbox((0, 0), title, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 60), title, fill=(255, 255, 255, 230), font=font)

    return canvas.convert("RGB")

def composite_c_silhouette_cards():
    """8 silhouettes inside rotating glass cards."""
    canvas = Image.new("RGBA", (1920, 1080), (5, 5, 15, 255))
    W, H = canvas.size

    # Aurora background
    for y in range(H):
        t = y / H
        r = int(20 + 40 * math.sin(t * math.pi))
        g = int(10 + 50 * math.sin(t * math.pi * 0.8))
        b = int(40 + 80 * math.sin(t * math.pi))
        ImageDraw.Draw(canvas).line([(0, y), (W, y)], fill=(r, g, b, 255))

    # Central glow
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for r in range(500, 0, -15):
        alpha = int(22 * (r / 500))
        gdraw.ellipse((W//2 - r, H//2 - r, W//2 + r, H//2 + r), fill=(0, 243, 255, alpha))
    canvas = Image.alpha_composite(canvas, glow)

    # Cards in circle
    radius = min(W, H) * 0.30
    center = (W // 2, H // 2 + 20)
    card_w, card_h = 160, 240
    for i, (fname, name, color) in enumerate(CHARACTERS):
        angle = (i / 8) * math.pi * 2 - math.pi / 2
        x = center[0] + radius * math.cos(angle) - card_w // 2
        y = center[1] + radius * math.sin(angle) - card_h // 2

        img = load_character(os.path.join(IMAGE_BASE, fname))
        iw, ih = img.size
        scale = max(card_w / iw, card_h / ih)
        new_size = (int(iw * scale), int(ih * scale))
        img = img.resize(new_size, Image.Resampling.LANCZOS)
        # Crop center to card size
        left = (new_size[0] - card_w) // 2
        top = (new_size[1] - card_h) // 2
        img = img.crop((left, top, left + card_w, top + card_h))

        # Convert to silhouette: darken and tint with character color
        r, g, b = tuple(int(color.lstrip('#')[j:j+2], 16) for j in (0, 2, 4))
        silhouette = Image.new("RGBA", (card_w, card_h), (r // 3, g // 3, b // 3, 255))
        gray = img.convert("L")
        # Use character's lightness as alpha mask, inverted for silhouette
        mask = gray.point(lambda p: 255 - p)
        silhouette.putalpha(mask)

        # Glass card
        card = Image.new("RGBA", (card_w + 20, card_h + 20), (0, 0, 0, 0))
        cdraw = ImageDraw.Draw(card)
        # Glass background
        cdraw.rounded_rectangle((0, 0, card_w+19, card_h+19), radius=18, fill=(255, 255, 255, 35))
        # Border
        border_color = (r, g, b, 180)
        cdraw.rounded_rectangle((0, 0, card_w+19, card_h+19), radius=18, outline=border_color, width=3)
        # Place silhouette
        card.paste(silhouette, (10, 10), silhouette)
        # Glass sheen
        sheen = Image.new("RGBA", (card_w+20, card_h+20), (0, 0, 0, 0))
        sdraw = ImageDraw.Draw(sheen)
        sdraw.polygon([(0, 0), (card_w+20, 0), (card_w//2, card_h//2)], fill=(255, 255, 255, 25))
        card = Image.alpha_composite(card, sheen)

        # Glow
        glow_card = card.filter(ImageFilter.GaussianBlur(12))
        canvas.paste(glow_card, (int(x) - 10, int(y) - 10), glow_card)
        canvas.paste(card, (int(x), int(y)), card)

    return canvas.convert("RGB")

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print("Creating composite A...")
    create_canvas().convert("RGB").save(os.path.join(OUT_DIR, "bg-base.jpg"), quality=95)
    composite_a_ring().save(os.path.join(OUT_DIR, "composite-a.jpg"), quality=95)
    print("Saved composite-a.jpg")
    composite_b_group().save(os.path.join(OUT_DIR, "composite-b.jpg"), quality=95)
    print("Saved composite-b.jpg")
    composite_c_silhouette_cards().save(os.path.join(OUT_DIR, "composite-c.jpg"), quality=95)
    print("Saved composite-c.jpg")

if __name__ == "__main__":
    main()
