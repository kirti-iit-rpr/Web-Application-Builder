import sys
import json
import os
import zipfile
import qrcode
from PIL import Image, ImageDraw


def generate_reho_qr(
    url,
    output_path="reho_qr.png",
    size=800,
    # bg_color=(26, 26, 26),
    # module_color=(255, 107, 26),
    bg_color = (15, 14, 12),
    module_color = (244, 122, 42),
    margin_ratio=0.06,
):
    def draw_pill(draw, x0, y0, x1, y1, fill):
        w = x1 - x0
        r = w // 2
        draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
        draw.ellipse([x0, y0, x1, y0 + 2*r], fill=fill)
        draw.ellipse([x0, y1 - 2*r, x1, y1], fill=fill)

    def rounded_rect(draw, xy, radius, fill):
        x0, y0, x1, y1 = xy
        r = int(radius)
        draw.rectangle([x0+r, y0, x1-r, y1], fill=fill)
        draw.rectangle([x0, y0+r, x1, y1-r], fill=fill)
        draw.ellipse([x0, y0, x0+2*r, y0+2*r], fill=fill)
        draw.ellipse([x1-2*r, y0, x1, y0+2*r], fill=fill)
        draw.ellipse([x0, y1-2*r, x0+2*r, y1], fill=fill)
        draw.ellipse([x1-2*r, y1-2*r, x1, y1], fill=fill)

    def draw_finder(draw, x, y, ms, color, bg):
        outer = 7 * ms
        border = ms
        ir = (3 * ms) // 2
        ro = int(ms * 1.4)
        rounded_rect(draw, (x, y, x+outer, y+outer), ro, color)
        rounded_rect(draw, (x+border, y+border, x+outer-border, y+outer-border),
                     int(ro * 0.7), bg)
        cx, cy = x + outer//2, y + outer//2
        draw.ellipse((cx-ir, cy-ir, cx+ir, cy+ir), fill=color)

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=1,
        border=0,
    )
    qr.add_data(url)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    n = len(matrix)

    margin = int(size * margin_ratio)
    qr_area = size - 2 * margin
    module_px = qr_area / n

    # img = Image.new("RGB", (size, size), bg_color)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))  # fully transparent
    draw = ImageDraw.Draw(img)

    # rounded_rect(draw, (0, 0, size-1, size-1), int(size * 0.05), bg_color)

    finder_zones = {(0, 0), (0, n-7), (n-7, 0)}

    def in_finder(r, c):
        for fr, fc in finder_zones:
            if fr <= r < fr+7 and fc <= c < fc+7:
                return True
        return False

    visited = [[False]*n for _ in range(n)]

    for col in range(n):
        row = 0
        while row < n:
            if not matrix[row][col] or in_finder(row, col) or visited[row][col]:
                row += 1
                continue
            run_start = row
            while (row < n
                   and matrix[row][col]
                   and not in_finder(row, col)
                   and not visited[row][col]):
                visited[row][col] = True
                row += 1
            run_end = row
            run_len = run_end - run_start
            gap = module_px * 0.15
            px_x0 = int(margin + col * module_px + gap)
            px_x1 = int(margin + (col + 1) * module_px - gap)
            px_y0 = int(margin + run_start * module_px + gap)
            px_y1 = int(margin + run_end * module_px - gap)
            if run_len == 1:
                r = int((px_x1 - px_x0) * 0.4)
                rounded_rect(draw, (px_x0, px_y0, px_x1, px_y1), r, module_color)
            else:
                draw_pill(draw, px_x0, px_y0, px_x1, px_y1, module_color)

    for fr, fc in finder_zones:
        draw_finder(draw,
                    int(margin + fc * module_px),
                    int(margin + fr * module_px),
                    int(module_px), module_color, bg_color)

    img.save(output_path, "PNG", dpi=(300, 300))
    return output_path


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def main():
    config = json.loads(sys.stdin.read())
    tag_ids = config["tag_ids"]
    base_url = config.get("base_url", "https://scan.reho.co.in/tag/")
    output_dir = config.get("output_dir", "/tmp/qr_output")
    zip_path = config.get("zip_path", "/tmp/qr_output.zip")
    size = config.get("size", 800)
    # module_color = hex_to_rgb(config.get("module_color", "#FF6B1A"))
    # bg_color = hex_to_rgb(config.get("bg_color", "#1a1a1a"))
    module_color = hex_to_rgb(config.get("module_color", "#F47A2A"))
    bg_color = hex_to_rgb(config.get("bg_color", "#0F0E0C"))

    os.makedirs(output_dir, exist_ok=True)

    generated = []
    for tag_id in tag_ids:
        url = base_url + tag_id
        filename = f"reho_qr_{tag_id}.png"
        output_path = os.path.join(output_dir, filename)
        generate_reho_qr(
            url=url,
            output_path=output_path,
            size=size,
            bg_color=bg_color,
            module_color=module_color,
        )
        generated.append({"tag_id": tag_id, "path": output_path, "filename": filename})

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in generated:
            zf.write(item["path"], item["filename"])

    result = {"success": True, "zip_path": zip_path, "count": len(generated), "files": [g["filename"] for g in generated]}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
