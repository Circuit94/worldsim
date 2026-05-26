"""
生成 WorldSim 像素风格地形瓦片 (48x48 PNG)
每种地形有独特的颜色、纹理和细节，确保在小格子上辨识度高。
使用 Pillow 库绘制。
"""
import random
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow", "-q"])
    from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path(__file__).parent / "public" / "tiles"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SIZE = 48
random.seed(42)  # 确保可复现


def make_tile(name: str, draw_func):
    """创建一个 48x48 RGBA 图像并执行绘制函数"""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_func(img, draw)
    img.save(OUT_DIR / f"{name}.png")
    print(f"  ✓ {name}.png")


# ============================================================
# 各地形绘制函数
# ============================================================

def draw_forest(img, draw):
    """深绿底 + 像素树"""
    draw.rectangle([0, 0, 47, 47], fill=(20, 90, 40))
    # 树干和树冠
    for cx, cy in [(12, 36), (28, 32), (38, 38), (8, 24), (34, 20)]:
        # 树干
        draw.rectangle([cx-1, cy, cx+1, cy+6], fill=(80, 50, 20))
        # 树冠（三角形/圆形）
        draw.ellipse([cx-5, cy-8, cx+5, cy+2], fill=(30, 130, 50))
    # 额外的小树冠增加密度
    for cx, cy in [(20, 18), (42, 12), (6, 40)]:
        draw.ellipse([cx-4, cy-6, cx+4, cy+1], fill=(25, 110, 45))
    # 地面点缀
    for _ in range(8):
        x, y = random.randint(0, 47), random.randint(38, 47)
        draw.point((x, y), fill=(15, 70, 30))


def draw_grass(img, draw):
    """浅绿底 + 草丛纹理"""
    draw.rectangle([0, 0, 47, 47], fill=(60, 140, 40))
    # 草丛线条
    for _ in range(15):
        x = random.randint(2, 45)
        y = random.randint(10, 45)
        draw.line([(x, y), (x + random.randint(-2, 2), y - random.randint(4, 8))], fill=(80, 170, 55), width=1)
    # 花朵点缀
    for _ in range(3):
        x, y = random.randint(5, 42), random.randint(5, 42)
        draw.ellipse([x-1, y-1, x+1, y+1], fill=(240, 220, 60))


def draw_water(img, draw):
    """蓝色底 + 波纹"""
    draw.rectangle([0, 0, 47, 47], fill=(25, 90, 170))
    # 波纹线条
    for y_base in range(8, 44, 10):
        points = []
        for x in range(0, 48, 4):
            offset = random.randint(-1, 1)
            points.append((x, y_base + offset))
        if len(points) >= 2:
            draw.line(points, fill=(60, 140, 220), width=1)
    # 高光点
    for _ in range(5):
        x, y = random.randint(5, 42), random.randint(5, 42)
        draw.point((x, y), fill=(150, 200, 255))


def draw_mountain(img, draw):
    """灰色底 + 三角山峰"""
    draw.rectangle([0, 0, 47, 47], fill=(80, 80, 100))
    # 主山峰
    draw.polygon([(24, 4), (8, 40), (40, 40)], fill=(100, 100, 120))
    draw.polygon([(24, 4), (24, 20), (36, 40)], fill=(120, 120, 140))  # 亮面
    # 雪顶
    draw.polygon([(24, 4), (20, 14), (28, 14)], fill=(220, 230, 240))
    # 小山峰
    draw.polygon([(38, 18), (30, 44), (46, 44)], fill=(90, 90, 110))
    draw.polygon([(10, 22), (2, 46), (18, 46)], fill=(85, 85, 105))


def draw_desert(img, draw):
    """沙黄底 + 沙丘"""
    draw.rectangle([0, 0, 47, 47], fill=(200, 160, 60))
    # 沙丘曲线
    draw.arc([(-10, 20), (30, 50)], 200, 340, fill=(180, 140, 45), width=2)
    draw.arc([(15, 25), (55, 52)], 200, 340, fill=(170, 130, 40), width=2)
    # 沙粒点缀
    for _ in range(20):
        x, y = random.randint(0, 47), random.randint(0, 47)
        draw.point((x, y), fill=(220, 180, 80))
    # 仙人掌
    draw.rectangle([36, 16, 38, 30], fill=(60, 120, 40))
    draw.rectangle([34, 20, 36, 22], fill=(60, 120, 40))
    draw.rectangle([38, 18, 40, 20], fill=(60, 120, 40))


def draw_lava(img, draw):
    """暗红底 + 岩浆流"""
    draw.rectangle([0, 0, 47, 47], fill=(60, 15, 10))
    # 岩浆裂缝发光
    for _ in range(6):
        x1, y1 = random.randint(0, 40), random.randint(0, 40)
        x2, y2 = x1 + random.randint(5, 15), y1 + random.randint(5, 15)
        draw.line([(x1, y1), (x2, y2)], fill=(255, 80, 0), width=2)
    # 热点
    for _ in range(4):
        x, y = random.randint(8, 40), random.randint(8, 40)
        draw.ellipse([x-3, y-3, x+3, y+3], fill=(255, 140, 0))
        draw.ellipse([x-1, y-1, x+1, y+1], fill=(255, 220, 50))


def draw_ice(img, draw):
    """浅蓝白底 + 冰裂纹"""
    draw.rectangle([0, 0, 47, 47], fill=(180, 220, 240))
    # 冰裂纹
    for _ in range(5):
        x, y = random.randint(10, 38), random.randint(10, 38)
        for _ in range(3):
            dx, dy = random.randint(-8, 8), random.randint(-8, 8)
            draw.line([(x, y), (x+dx, y+dy)], fill=(130, 180, 210), width=1)
    # 雪花高光
    for _ in range(6):
        x, y = random.randint(3, 44), random.randint(3, 44)
        draw.ellipse([x-1, y-1, x+1, y+1], fill=(240, 250, 255))


def draw_swamp(img, draw):
    """暗绿底 + 水洼"""
    draw.rectangle([0, 0, 47, 47], fill=(40, 70, 25))
    # 水洼
    for _ in range(4):
        cx, cy = random.randint(8, 40), random.randint(8, 40)
        rx, ry = random.randint(4, 8), random.randint(3, 6)
        draw.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=(30, 60, 40))
    # 枯枝
    for _ in range(3):
        x, y = random.randint(5, 40), random.randint(5, 40)
        draw.line([(x, y), (x+random.randint(3, 8), y-random.randint(2, 6))], fill=(70, 55, 30), width=1)


def draw_cave(img, draw):
    """深灰底 + 洞口"""
    draw.rectangle([0, 0, 47, 47], fill=(30, 30, 45))
    # 洞口（深色椭圆）
    draw.ellipse([10, 12, 38, 40], fill=(10, 10, 18))
    # 洞口边缘高光
    draw.arc([(10, 12), (38, 40)], 180, 360, fill=(60, 60, 80), width=2)
    # 石头点缀
    for _ in range(5):
        x, y = random.randint(2, 45), random.randint(35, 46)
        draw.ellipse([x-2, y-1, x+2, y+1], fill=(50, 50, 65))
    # 蝙蝠小点
    draw.polygon([(20, 8), (18, 6), (22, 6)], fill=(50, 50, 70))
    draw.polygon([(32, 10), (30, 8), (34, 8)], fill=(50, 50, 70))


def draw_building(img, draw):
    """棕色底 + 建筑轮廓"""
    draw.rectangle([0, 0, 47, 47], fill=(90, 65, 45))
    # 主建筑
    draw.rectangle([10, 14, 36, 44], fill=(110, 80, 55))
    # 屋顶
    draw.polygon([(8, 14), (23, 4), (38, 14)], fill=(140, 90, 50))
    # 门
    draw.rectangle([18, 30, 28, 44], fill=(60, 40, 25))
    # 窗户
    draw.rectangle([13, 18, 19, 24], fill=(200, 200, 140))
    draw.rectangle([27, 18, 33, 24], fill=(200, 200, 140))
    # 窗框
    draw.line([(16, 18), (16, 24)], fill=(70, 50, 30))
    draw.line([(13, 21), (19, 21)], fill=(70, 50, 30))
    draw.line([(30, 18), (30, 24)], fill=(70, 50, 30))
    draw.line([(27, 21), (33, 21)], fill=(70, 50, 30))


def draw_village(img, draw):
    """暖土色底 + 小屋群"""
    draw.rectangle([0, 0, 47, 47], fill=(140, 110, 60))
    # 小屋1
    draw.rectangle([5, 20, 20, 34], fill=(120, 85, 50))
    draw.polygon([(4, 20), (12, 12), (21, 20)], fill=(150, 100, 55))
    draw.rectangle([10, 26, 15, 34], fill=(70, 45, 20))
    # 小屋2
    draw.rectangle([28, 24, 42, 36], fill=(115, 80, 48))
    draw.polygon([(27, 24), (35, 16), (43, 24)], fill=(145, 95, 50))
    draw.rectangle([32, 28, 36, 36], fill=(65, 42, 18))
    # 路径
    draw.rectangle([20, 36, 28, 40], fill=(160, 130, 80))
    # 烟囱烟
    draw.line([(14, 12), (14, 6)], fill=(180, 180, 180))
    draw.line([(15, 5), (16, 3)], fill=(200, 200, 200))


def draw_road(img, draw):
    """土黄路面 + 车辙"""
    draw.rectangle([0, 0, 47, 47], fill=(50, 70, 35))  # 草地边
    # 路面
    draw.rectangle([12, 0, 36, 47], fill=(130, 110, 75))
    # 车辙线
    draw.line([(18, 0), (18, 47)], fill=(110, 90, 60), width=1)
    draw.line([(30, 0), (30, 47)], fill=(110, 90, 60), width=1)
    # 碎石
    for _ in range(8):
        x, y = random.randint(14, 34), random.randint(2, 45)
        draw.ellipse([x-1, y-1, x+1, y+1], fill=(100, 85, 55))


def draw_corridor(img, draw):
    """室内走廊"""
    draw.rectangle([0, 0, 47, 47], fill=(55, 55, 70))
    # 地板
    draw.rectangle([6, 6, 42, 42], fill=(70, 70, 85))
    # 地板纹理 - 方格
    for i in range(6, 42, 9):
        draw.line([(i, 6), (i, 42)], fill=(60, 60, 75), width=1)
        draw.line([(6, i), (42, i)], fill=(60, 60, 75), width=1)
    # 墙壁阴影
    draw.rectangle([0, 0, 5, 47], fill=(40, 40, 55))
    draw.rectangle([42, 0, 47, 47], fill=(40, 40, 55))


def draw_ruin(img, draw):
    """紫灰底 + 碎石残柱"""
    draw.rectangle([0, 0, 47, 47], fill=(70, 60, 80))
    # 残柱
    draw.rectangle([8, 10, 14, 42], fill=(90, 80, 100))
    draw.rectangle([34, 14, 40, 42], fill=(85, 75, 95))
    # 柱顶
    draw.rectangle([6, 8, 16, 12], fill=(100, 90, 110))
    # 碎石
    for _ in range(6):
        x, y = random.randint(15, 33), random.randint(30, 46)
        r = random.randint(2, 4)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(80, 70, 90))
    # 裂缝
    draw.line([(20, 5), (25, 15), (22, 25)], fill=(50, 40, 60), width=1)


def draw_tech(img, draw):
    """深蓝底 + 电路纹理"""
    draw.rectangle([0, 0, 47, 47], fill=(15, 35, 60))
    # 电路板线条
    draw.line([(4, 12), (20, 12), (20, 24), (36, 24)], fill=(0, 180, 220), width=1)
    draw.line([(10, 36), (30, 36), (30, 20)], fill=(0, 160, 200), width=1)
    draw.line([(38, 8), (38, 30), (44, 30)], fill=(0, 140, 180), width=1)
    # 节点（发光点）
    for x, y in [(20, 12), (36, 24), (30, 36), (38, 30), (20, 24)]:
        draw.ellipse([x-2, y-2, x+2, y+2], fill=(0, 220, 255))
    # 屏幕/面板
    draw.rectangle([6, 28, 18, 44], fill=(10, 50, 80))
    draw.rectangle([8, 30, 16, 42], fill=(0, 100, 140))
    # 小LED
    for _ in range(3):
        x, y = random.randint(8, 15), random.randint(30, 41)
        draw.point((x, y), fill=(0, 255, 150))


def draw_default(img, draw):
    """默认/未知地块"""
    draw.rectangle([0, 0, 47, 47], fill=(50, 50, 60))
    # 问号
    draw.ellipse([16, 10, 32, 26], fill=(70, 70, 85))
    draw.rectangle([22, 26, 26, 34], fill=(70, 70, 85))
    draw.ellipse([22, 36, 26, 40], fill=(70, 70, 85))
    # 内部镂空
    draw.ellipse([19, 13, 29, 23], fill=(50, 50, 60))
    draw.rectangle([24, 20, 29, 23], fill=(70, 70, 85))


def draw_unwalkable(img, draw):
    """不可行走区域 - 深色虚空"""
    draw.rectangle([0, 0, 47, 47], fill=(12, 12, 18))
    # 稀疏星点
    for _ in range(4):
        x, y = random.randint(5, 42), random.randint(5, 42)
        draw.point((x, y), fill=(30, 30, 45))


# ============================================================
# 生成所有瓦片
# ============================================================

print("🎨 Generating WorldSim pixel tile set...")
print(f"   Output: {OUT_DIR}/")
print()

tiles = [
    ("forest", draw_forest),
    ("grass", draw_grass),
    ("water", draw_water),
    ("mountain", draw_mountain),
    ("desert", draw_desert),
    ("lava", draw_lava),
    ("ice", draw_ice),
    ("swamp", draw_swamp),
    ("cave", draw_cave),
    ("building", draw_building),
    ("village", draw_village),
    ("road", draw_road),
    ("corridor", draw_corridor),
    ("ruin", draw_ruin),
    ("tech", draw_tech),
    ("default", draw_default),
    ("unwalkable", draw_unwalkable),
]

for name, func in tiles:
    make_tile(name, func)

print(f"\n✅ Done! {len(tiles)} tiles generated in {OUT_DIR}/")
