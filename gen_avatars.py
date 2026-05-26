"""
生成 WorldSim 像素动漫风格角色头像 (48x48 PNG)
每种角色类型有独特的发型、服装颜色和配饰。
使用 Pillow 像素绘制。
"""
import random
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow", "-q"])
    from PIL import Image, ImageDraw

OUT_DIR = Path(__file__).parent / "public" / "avatars"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SIZE = 48


def make_avatar(name: str, draw_func):
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_func(img, draw)
    img.save(OUT_DIR / f"{name}.png")
    print(f"  ✓ {name}.png")


# ============================================================
# 基础绘制工具
# ============================================================

def draw_face(draw, skin=(240, 200, 160), x_offset=0, y_offset=0):
    """绘制基础脸型（像素动漫风）"""
    cx, cy = 24 + x_offset, 22 + y_offset
    # 脸部轮廓（椭圆）
    draw.ellipse([cx-10, cy-10, cx+10, cy+10], fill=skin)
    # 下巴
    draw.ellipse([cx-8, cy-2, cx+8, cy+12], fill=skin)


def draw_eyes(draw, color=(40, 40, 60), x_offset=0, y_offset=0, style='normal'):
    """绘制眼睛"""
    cx, cy = 24 + x_offset, 20 + y_offset
    if style == 'normal':
        # 左眼
        draw.ellipse([cx-6, cy-2, cx-2, cy+2], fill=(255, 255, 255))
        draw.ellipse([cx-5, cy-1, cx-3, cy+1], fill=color)
        # 右眼
        draw.ellipse([cx+2, cy-2, cx+6, cy+2], fill=(255, 255, 255))
        draw.ellipse([cx+3, cy-1, cx+5, cy+1], fill=color)
    elif style == 'angry':
        draw.ellipse([cx-6, cy-1, cx-2, cy+2], fill=(255, 255, 255))
        draw.ellipse([cx-5, cy, cx-3, cy+2], fill=color)
        draw.line([(cx-7, cy-3), (cx-2, cy-1)], fill=(60, 40, 40), width=1)
        draw.ellipse([cx+2, cy-1, cx+6, cy+2], fill=(255, 255, 255))
        draw.ellipse([cx+3, cy, cx+5, cy+2], fill=color)
        draw.line([(cx+2, cy-1), (cx+7, cy-3)], fill=(60, 40, 40), width=1)
    elif style == 'kind':
        # 弯弯笑眼
        draw.arc([(cx-6, cy-2), (cx-2, cy+3)], 0, 180, fill=color, width=2)
        draw.arc([(cx+2, cy-2), (cx+6, cy+3)], 0, 180, fill=color, width=2)
    elif style == 'closed':
        draw.line([(cx-6, cy), (cx-2, cy)], fill=color, width=2)
        draw.line([(cx+2, cy), (cx+6, cy)], fill=color, width=2)


def draw_mouth(draw, x_offset=0, y_offset=0, style='smile'):
    cx, cy = 24 + x_offset, 28 + y_offset
    if style == 'smile':
        draw.arc([(cx-4, cy-2), (cx+4, cy+3)], 0, 180, fill=(180, 80, 80), width=1)
    elif style == 'serious':
        draw.line([(cx-3, cy), (cx+3, cy)], fill=(150, 80, 80), width=1)
    elif style == 'open':
        draw.ellipse([cx-3, cy-1, cx+3, cy+3], fill=(180, 60, 60))
        draw.ellipse([cx-2, cy, cx+2, cy+2], fill=(100, 30, 30))


# ============================================================
# 各角色类型
# ============================================================

def draw_warrior(img, draw):
    """战士 — 红色铠甲，短发，坚毅表情"""
    # 背景光环
    draw.ellipse([8, 8, 40, 44], fill=(80, 20, 20, 60))
    # 身体/铠甲
    draw.rectangle([14, 34, 34, 47], fill=(160, 40, 30))
    draw.rectangle([16, 36, 32, 45], fill=(180, 50, 35))
    # 肩甲
    draw.ellipse([10, 32, 18, 40], fill=(140, 35, 25))
    draw.ellipse([30, 32, 38, 40], fill=(140, 35, 25))
    # 脸
    draw_face(draw, skin=(235, 195, 155))
    # 短发
    draw.ellipse([13, 8, 35, 22], fill=(60, 35, 20))
    draw.rectangle([13, 12, 35, 18], fill=(60, 35, 20))
    # 额前碎发
    draw.polygon([(16, 14), (18, 10), (20, 14)], fill=(50, 30, 15))
    draw.polygon([(26, 14), (28, 10), (30, 14)], fill=(50, 30, 15))
    # 眼
    draw_eyes(draw, color=(50, 40, 30), style='angry')
    draw_mouth(draw, style='serious')
    # 疤痕
    draw.line([(28, 18), (30, 24)], fill=(200, 150, 130), width=1)


def draw_mage(img, draw):
    """法师 — 紫色长袍，尖帽，神秘眼神"""
    # 魔法光环
    draw.ellipse([6, 6, 42, 46], fill=(80, 40, 120, 40))
    # 长袍
    draw.polygon([(14, 34), (10, 47), (38, 47), (34, 34)], fill=(80, 40, 130))
    draw.polygon([(16, 36), (12, 47), (36, 47), (32, 36)], fill=(100, 50, 150))
    # 脸
    draw_face(draw, skin=(245, 215, 185))
    # 尖帽
    draw.polygon([(12, 18), (24, 0), (36, 18)], fill=(60, 30, 100))
    draw.polygon([(14, 18), (24, 3), (34, 18)], fill=(80, 40, 130))
    # 帽檐星星
    draw.ellipse([22, 6, 26, 10], fill=(255, 220, 80))
    # 眼（发光）
    draw_eyes(draw, color=(140, 80, 220), style='normal')
    draw_mouth(draw, style='smile')
    # 胡子（长须）
    draw.line([(20, 28), (18, 36)], fill=(200, 200, 210), width=1)
    draw.line([(24, 30), (24, 38)], fill=(200, 200, 210), width=1)
    draw.line([(28, 28), (30, 36)], fill=(200, 200, 210), width=1)


def draw_merchant(img, draw):
    """商人 — 金色衣装，圆脸，带帽"""
    # 身体
    draw.rectangle([12, 34, 36, 47], fill=(180, 140, 40))
    draw.rectangle([14, 36, 34, 46], fill=(200, 160, 50))
    # 围巾
    draw.rectangle([18, 32, 30, 38], fill=(220, 180, 60))
    # 脸（圆润）
    draw_face(draw, skin=(240, 205, 165))
    draw.ellipse([15, 14, 33, 32], fill=(240, 205, 165))
    # 商人帽
    draw.ellipse([10, 8, 38, 18], fill=(140, 100, 30))
    draw.rectangle([14, 6, 34, 12], fill=(160, 120, 40))
    # 眼（精明）
    draw_eyes(draw, color=(50, 40, 20), style='normal')
    draw_mouth(draw, style='smile')
    # 金币耳环
    draw.ellipse([10, 22, 14, 26], fill=(255, 210, 50))


def draw_villager(img, draw):
    """村民 — 朴素装扮，棕色系"""
    # 身体
    draw.rectangle([14, 34, 34, 47], fill=(120, 90, 60))
    draw.rectangle([16, 36, 32, 46], fill=(140, 105, 70))
    # 脸
    draw_face(draw, skin=(235, 195, 150))
    # 头发（简单棕发）
    draw.ellipse([14, 8, 34, 20], fill=(100, 65, 35))
    draw.rectangle([14, 12, 34, 18], fill=(100, 65, 35))
    # 眼
    draw_eyes(draw, color=(60, 45, 30), style='normal')
    draw_mouth(draw, style='smile')
    # 脸颊红晕
    draw.ellipse([14, 23, 18, 26], fill=(255, 180, 160, 100))
    draw.ellipse([30, 23, 34, 26], fill=(255, 180, 160, 100))


def draw_guard(img, draw):
    """守卫 — 银色铠甲，头盔"""
    # 身体/铠甲
    draw.rectangle([12, 34, 36, 47], fill=(140, 140, 160))
    draw.rectangle([14, 36, 34, 46], fill=(160, 160, 180))
    # 肩甲
    draw.ellipse([8, 32, 16, 40], fill=(130, 130, 150))
    draw.ellipse([32, 32, 40, 40], fill=(130, 130, 150))
    # 脸
    draw_face(draw, skin=(230, 190, 150))
    # 头盔
    draw.ellipse([12, 6, 36, 22], fill=(150, 150, 170))
    draw.rectangle([12, 12, 36, 18], fill=(150, 150, 170))
    # 头盔护鼻
    draw.rectangle([22, 14, 26, 24], fill=(130, 130, 150))
    # 眼（从头盔缝隙露出）
    draw.rectangle([16, 18, 22, 22], fill=(20, 20, 30))
    draw.rectangle([26, 18, 32, 22], fill=(20, 20, 30))
    draw.ellipse([17, 19, 20, 21], fill=(200, 200, 220))
    draw.ellipse([28, 19, 31, 21], fill=(200, 200, 220))
    # 头盔羽毛
    draw.polygon([(22, 6), (24, 0), (26, 6)], fill=(200, 50, 50))


def draw_thief(img, draw):
    """盗贼 — 黑色兜帽，只露眼睛"""
    # 身体
    draw.rectangle([14, 34, 34, 47], fill=(30, 30, 40))
    draw.rectangle([16, 36, 32, 46], fill=(40, 40, 50))
    # 兜帽大形
    draw.ellipse([10, 6, 38, 32], fill=(25, 25, 35))
    # 面巾（只露眼睛区域）
    draw.rectangle([14, 24, 34, 32], fill=(20, 20, 28))
    # 露出皮肤区域（窄条）
    draw.rectangle([15, 18, 33, 24], fill=(220, 180, 140))
    # 眼（锐利）
    draw.ellipse([17, 19, 22, 23], fill=(255, 255, 255))
    draw.ellipse([18, 20, 21, 22], fill=(60, 180, 60))  # 绿眼
    draw.ellipse([26, 19, 31, 23], fill=(255, 255, 255))
    draw.ellipse([27, 20, 30, 22], fill=(60, 180, 60))
    # 匕首光芒
    draw.polygon([(36, 38), (38, 34), (40, 38)], fill=(200, 200, 220))
    draw.rectangle([37, 38, 39, 44], fill=(100, 80, 50))


def draw_scholar(img, draw):
    """学者 — 眼镜，蓝色衣服，书卷气"""
    # 身体
    draw.rectangle([14, 34, 34, 47], fill=(40, 60, 120))
    draw.rectangle([16, 36, 32, 46], fill=(50, 75, 140))
    # 领口
    draw.polygon([(20, 34), (24, 38), (28, 34)], fill=(240, 240, 240))
    # 脸
    draw_face(draw, skin=(245, 215, 180))
    # 头发（整齐分头）
    draw.ellipse([14, 8, 34, 18], fill=(40, 30, 20))
    draw.rectangle([14, 10, 24, 16], fill=(40, 30, 20))
    draw.rectangle([24, 10, 34, 14], fill=(35, 25, 18))
    # 眼镜
    draw.ellipse([15, 18, 22, 24], outline=(100, 80, 40), width=1)
    draw.ellipse([26, 18, 33, 24], outline=(100, 80, 40), width=1)
    draw.line([(22, 20), (26, 20)], fill=(100, 80, 40), width=1)
    # 眼睛（在镜片后）
    draw.ellipse([17, 19, 20, 22], fill=(40, 40, 60))
    draw.ellipse([28, 19, 31, 22], fill=(40, 40, 60))
    draw_mouth(draw, style='serious')


def draw_elder(img, draw):
    """老人 — 白发白须，慈祥"""
    # 身体
    draw.rectangle([14, 36, 34, 47], fill=(100, 80, 60))
    draw.rectangle([16, 38, 32, 46], fill=(120, 95, 70))
    # 脸（稍瘦）
    draw_face(draw, skin=(230, 195, 160))
    # 白发
    draw.ellipse([12, 6, 36, 20], fill=(230, 230, 235))
    draw.rectangle([12, 10, 16, 28], fill=(225, 225, 230))  # 左侧长发
    draw.rectangle([32, 10, 36, 28], fill=(225, 225, 230))  # 右侧长发
    # 眼（慈祥眯眼）
    draw_eyes(draw, color=(60, 50, 40), style='kind')
    # 白胡子
    draw.ellipse([16, 26, 32, 38], fill=(240, 240, 245))
    draw.ellipse([18, 28, 30, 36], fill=(235, 235, 240))
    draw_mouth(draw, style='smile', y_offset=-2)


def draw_robot(img, draw):
    """机器人 — 金属外壳，发光眼"""
    # 身体
    draw.rectangle([14, 34, 34, 47], fill=(80, 90, 100))
    draw.rectangle([16, 36, 32, 46], fill=(100, 110, 120))
    # 接缝
    draw.line([(24, 36), (24, 46)], fill=(60, 70, 80), width=1)
    # 头部（方形）
    draw.rectangle([13, 8, 35, 30], fill=(120, 130, 140))
    draw.rectangle([15, 10, 33, 28], fill=(140, 150, 160))
    # 天线
    draw.line([(24, 8), (24, 2)], fill=(100, 110, 120), width=2)
    draw.ellipse([22, 0, 26, 4], fill=(0, 200, 255))
    # 发光眼
    draw.rectangle([16, 16, 22, 22], fill=(0, 220, 255))
    draw.rectangle([26, 16, 32, 22], fill=(0, 220, 255))
    draw.rectangle([17, 17, 21, 21], fill=(150, 240, 255))
    draw.rectangle([27, 17, 31, 21], fill=(150, 240, 255))
    # 嘴（格栅）
    for x in range(18, 31, 3):
        draw.rectangle([x, 24, x+1, 27], fill=(60, 70, 80))


def draw_monster(img, draw):
    """怪物 — 绿色皮肤，尖耳，獠牙"""
    # 身体
    draw.rectangle([12, 34, 36, 47], fill=(50, 80, 30))
    draw.rectangle([14, 36, 34, 46], fill=(60, 95, 35))
    # 脸（绿色）
    draw.ellipse([13, 10, 35, 32], fill=(80, 140, 50))
    draw.ellipse([15, 14, 33, 30], fill=(90, 155, 60))
    # 尖耳
    draw.polygon([(10, 16), (8, 8), (16, 14)], fill=(70, 120, 45))
    draw.polygon([(38, 16), (40, 8), (32, 14)], fill=(70, 120, 45))
    # 眼（红色）
    draw.ellipse([16, 17, 22, 23], fill=(255, 240, 50))
    draw.ellipse([18, 18, 21, 22], fill=(220, 40, 20))
    draw.ellipse([26, 17, 32, 23], fill=(255, 240, 50))
    draw.ellipse([28, 18, 31, 22], fill=(220, 40, 20))
    # 獠牙
    draw.polygon([(19, 26), (21, 32), (23, 26)], fill=(255, 255, 240))
    draw.polygon([(25, 26), (27, 32), (29, 26)], fill=(255, 255, 240))
    # 头上角
    draw.polygon([(18, 10), (20, 2), (22, 10)], fill=(60, 50, 30))
    draw.polygon([(26, 10), (28, 2), (30, 10)], fill=(60, 50, 30))


def draw_princess(img, draw):
    """贵族/公主 — 金冠，华丽装扮"""
    # 身体（华丽长裙）
    draw.polygon([(12, 34), (8, 47), (40, 47), (36, 34)], fill=(180, 50, 100))
    draw.polygon([(14, 36), (10, 47), (38, 47), (34, 36)], fill=(200, 60, 120))
    # 领口装饰
    draw.ellipse([20, 33, 28, 37], fill=(255, 220, 100))
    # 脸
    draw_face(draw, skin=(250, 220, 195))
    # 长发（金色）
    draw.ellipse([12, 8, 36, 22], fill=(230, 190, 80))
    draw.rectangle([12, 14, 16, 34], fill=(220, 180, 70))
    draw.rectangle([32, 14, 36, 34], fill=(220, 180, 70))
    # 额前刘海
    draw.rectangle([14, 12, 34, 16], fill=(240, 200, 90))
    # 皇冠
    draw.rectangle([16, 6, 32, 12], fill=(255, 210, 50))
    draw.polygon([(16, 6), (18, 2), (20, 6)], fill=(255, 210, 50))
    draw.polygon([(22, 6), (24, 1), (26, 6)], fill=(255, 210, 50))
    draw.polygon([(28, 6), (30, 2), (32, 6)], fill=(255, 210, 50))
    # 宝石
    draw.ellipse([22, 7, 26, 11], fill=(220, 50, 50))
    # 眼
    draw_eyes(draw, color=(60, 100, 160), style='normal')
    draw_mouth(draw, style='smile')


def draw_healer(img, draw):
    """牧师/治疗者 — 白色长袍，光环"""
    # 光环
    draw.ellipse([8, 4, 40, 44], fill=(255, 255, 200, 30))
    # 身体（白袍）
    draw.polygon([(14, 34), (10, 47), (38, 47), (34, 34)], fill=(220, 220, 230))
    draw.polygon([(16, 36), (12, 47), (36, 47), (32, 36)], fill=(235, 235, 245))
    # 十字标记
    draw.rectangle([22, 38, 26, 46], fill=(200, 60, 60))
    draw.rectangle([20, 40, 28, 44], fill=(200, 60, 60))
    # 脸
    draw_face(draw, skin=(245, 220, 195))
    # 头发（淡色柔和）
    draw.ellipse([14, 8, 34, 20], fill=(200, 170, 130))
    draw.rectangle([14, 12, 34, 16], fill=(200, 170, 130))
    # 头顶光圈
    draw.ellipse([16, 3, 32, 9], outline=(255, 220, 80), width=2)
    # 眼（温和）
    draw_eyes(draw, color=(80, 120, 80), style='kind')
    draw_mouth(draw, style='smile')


# ============================================================
# 玩家头像
# ============================================================

def draw_player(img, draw):
    """玩家角色 — 紫色冒险者"""
    # 背景光环
    draw.ellipse([6, 6, 42, 44], fill=(120, 60, 200, 40))
    # 身体
    draw.rectangle([14, 34, 34, 47], fill=(100, 50, 160))
    draw.rectangle([16, 36, 32, 46], fill=(120, 60, 180))
    # 披风
    draw.polygon([(12, 34), (8, 47), (14, 47)], fill=(80, 40, 140))
    draw.polygon([(36, 34), (40, 47), (34, 47)], fill=(80, 40, 140))
    # 脸
    draw_face(draw, skin=(240, 210, 175))
    # 头发（深紫）
    draw.ellipse([14, 8, 34, 20], fill=(60, 30, 90))
    draw.rectangle([14, 12, 34, 16], fill=(60, 30, 90))
    # 发丝
    draw.polygon([(16, 14), (14, 8), (18, 12)], fill=(50, 25, 80))
    draw.polygon([(28, 12), (32, 6), (34, 14)], fill=(50, 25, 80))
    # 眼（紫色，有决心）
    draw.ellipse([16, 18, 22, 23], fill=(255, 255, 255))
    draw.ellipse([17, 19, 21, 22], fill=(140, 80, 200))
    draw.ellipse([26, 18, 32, 23], fill=(255, 255, 255))
    draw.ellipse([27, 19, 31, 22], fill=(140, 80, 200))
    draw_mouth(draw, style='serious')


# ============================================================
# 生成
# ============================================================

print("🎨 Generating WorldSim character avatars...")
print(f"   Output: {OUT_DIR}/")
print()

avatars = [
    ("warrior", draw_warrior),
    ("mage", draw_mage),
    ("merchant", draw_merchant),
    ("villager", draw_villager),
    ("guard", draw_guard),
    ("thief", draw_thief),
    ("scholar", draw_scholar),
    ("elder", draw_elder),
    ("robot", draw_robot),
    ("monster", draw_monster),
    ("princess", draw_princess),
    ("healer", draw_healer),
    ("player", draw_player),
]

for name, func in avatars:
    make_avatar(name, func)

print(f"\n✅ Done! {len(avatars)} avatars generated in {OUT_DIR}/")
