# Prompt cho Gemini: Kết nối luồng Scan → Results → Swap

## Context
Hairapy là web-app AI gợi ý kiểu tóc. Tech stack: React 19 + Vite (FE), Spring Boot 3.5 + Java 21 + PostgreSQL (BE).

**Vấn đề hiện tại**: 3 trang Scan → Results → Swap hoạt động **rời rạc**, không kết nối với nhau:
1. **ResultsPage**: Đề xuất kiểu tóc **100% hardcoded** (object `HAIRSTYLE_RECS`), dùng ảnh SVG placeholder. Biometrics "Chất tóc: Wavy", "Tông da: Warm" luôn giống nhau cho mọi người. Match % là số bịa.
2. **SwapPage**: Nhấn "Thử ngay" trên ResultsPage → navigate `/swap` **không truyền kiểu tóc nào**. SwapPage có danh sách kiểu tóc riêng (`TRENDS.slice(0,6)`) với mapping `HAIR_TYPES` tùy ý.
3. **Backend `hairstyle_catalog`** tồn tại (có API, có seed data) nhưng chỉ CatalogPage dùng. ResultsPage và SwapPage hoàn toàn bỏ qua.

**Mục tiêu**: Kết nối 3 trang lại thành luồng mượt: Scan → Results (đề xuất từ catalog thật) → Swap (thử đúng kiểu tóc đã chọn).

---

## Kiến trúc hiện tại cần hiểu

### MediaPipe Scan (faceAnalysis.js) — KHÔNG SỬA
```js
// Trả về:
{
  faceShape: "Oval" | "Round" | "Square" | "Heart" | "Oblong" | "Diamond",
  landmarks: [...468 points...],
  metrics: {
    foreheadWidth, cheekboneWidth, jawWidth, faceLength,
    widthToLength, foreheadToJaw, jawToCheek
  }
}
```

### useScanStore (Zustand) — hiện có:
```js
{
  imageFile: File | null,     // file gốc user upload
  previewUrl: string | null,  // blob URL preview
  analysisResult: { faceShape, landmarks, metrics } | null,
  analyzing: boolean,
  error: string | null,
}
```

### Backend hairstyle_catalog table (V3):
```sql
hairstyle_catalog (
  id BIGSERIAL PK,
  name VARCHAR(150),
  tag VARCHAR(50),         -- "Thịnh hành", "Mới", "Kinh điển"...
  face_shape VARCHAR(30),  -- "Trái xoan", "Vuông", "Tròn", "Dài"
  hair_length VARCHAR(20), -- "Ngắn", "Vừa", "Dài"
  description TEXT,
  image_url VARCHAR(500),
  premium_only BOOLEAN DEFAULT false,
  created_at TIMESTAMP
)
```

**LƯU Ý**: face_shape trong DB dùng tiếng Việt ("Trái xoan", "Vuông"...), còn MediaPipe trả về tiếng Anh ("Oval", "Square"...).

### Backend API đã có:
- `GET /api/hairstyles?faceShape=...&hairLength=...&tag=...&search=...` — trả List<HairstyleCatalog>, lọc premiumOnly theo subscription
- `POST /api/swap/try` — nhận `image` (MultipartFile) + `hairType` (int, mã AILab) → trả `{ image: base64 }`

### AILab hair_type codes (API hairstyle-editor):
```
0  = Bangs (Mái bằng)
1  = Long hair (Tóc dài)
2  = Bangs + Long hair
3  = Increase hair volume (Phồng)
4  = Short bangs
201 = Large back (Búi sau to)
301 = Bob-cut
401 = Long curly hair (Tóc xoăn dài)
402 = Short curly hair (Tóc xoăn ngắn)
502 = Straight bangs
503 = Middle-part long
603 = Short hair (Tóc ngắn)
801 = Wispy bangs
901 = Straight hair (Tóc thẳng dài)
```

### Seed data hiện tại (V6__seed_hairstyles.sql) — chỉ có 6 kiểu:
```
Wolf Cut Pastel  | Trái xoan | Vừa  | premiumOnly=false
Modern Fade      | Vuông     | Ngắn | false
Sunset Curls     | Tròn      | Dài  | false
French Chic Bob  | Dài       | Ngắn | false
Surf Shag        | Tròn      | Vừa  | true
Sleek Quiff      | Trái xoan | Ngắn | true
```

### Flyway migrations hiện có: V1 → V7. File mới bắt đầu từ V8.

---

## Cần implement (theo thứ tự)

### 1. [NEW] V8__add_ailab_code_and_seed.sql — `db/migration`

Thêm cột `ailab_hair_type` vào `hairstyle_catalog` và bổ sung seed data:

```sql
-- Thêm cột mã kiểu tóc tương ứng AILab API
ALTER TABLE hairstyle_catalog ADD COLUMN IF NOT EXISTS ailab_hair_type INTEGER;

-- Cập nhật mã AILab cho 6 kiểu tóc đã có
UPDATE hairstyle_catalog SET ailab_hair_type = 801 WHERE name = 'Wolf Cut Pastel';   -- Wispy bangs
UPDATE hairstyle_catalog SET ailab_hair_type = 603 WHERE name = 'Modern Fade';       -- Short hair
UPDATE hairstyle_catalog SET ailab_hair_type = 401 WHERE name = 'Sunset Curls';      -- Long curly
UPDATE hairstyle_catalog SET ailab_hair_type = 301 WHERE name = 'French Chic Bob';   -- Bob-cut
UPDATE hairstyle_catalog SET ailab_hair_type = 3   WHERE name = 'Surf Shag';         -- Volume
UPDATE hairstyle_catalog SET ailab_hair_type = 901 WHERE name = 'Sleek Quiff';       -- Straight

-- Thêm seed data mới để mỗi face_shape có ít nhất 4 kiểu tóc
-- Sử dụng ảnh Unsplash miễn phí, sẽ thay bằng ảnh thật sau
INSERT INTO hairstyle_catalog (name, tag, face_shape, hair_length, description, image_url, premium_only, ailab_hair_type)
VALUES
  -- Thêm cho Vuông (hiện chỉ có 1)
  ('Soft Beach Waves', 'Thịnh hành', 'Vuông', 'Dài',  'Sóng biển mềm mại làm dịu các góc cạnh gương mặt vuông.', 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600', false, 401),
  ('Layered Curtain Bangs', 'Mới', 'Vuông', 'Vừa', 'Mái bay rủ nhẹ hai bên, layer mềm mại che góc hàm.', 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600', false, 2),
  ('Textured Crop', 'Kinh điển', 'Vuông', 'Ngắn', 'Kiểu crop ngắn tạo texture phần đỉnh, phù hợp mặt vuông nam.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600', true, 603),

  -- Thêm cho Tròn (hiện có 2)
  ('Layered Bob', 'Mới', 'Tròn', 'Ngắn', 'Bob tỉa tầng kéo dài tỷ lệ gương mặt tròn.', 'https://images.unsplash.com/photo-1554519934-e32b1629d9ee?w=600', false, 301),
  ('Long Straight Layers', 'Kinh điển', 'Tròn', 'Dài', 'Tóc thẳng tầng dài tạo cảm giác gương mặt thon thả.', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600', true, 901),

  -- Thêm cho Trái tim (Heart) — hiện có 0
  ('Side-Swept Bangs', 'Thịnh hành', 'Trái tim', 'Vừa', 'Mái lệch che bớt trán rộng, cân bằng cằm nhọn.', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600', false, 801),
  ('Chin-Length Bob', 'Mới', 'Trái tim', 'Ngắn', 'Bob ngang cằm tạo độ đầy đặn phần cằm hẹp.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600', false, 301),
  ('Wavy Lob', 'Bán chạy', 'Trái tim', 'Vừa', 'Long bob xoăn nhẹ ôm gương mặt hình trái tim hoàn hảo.', 'https://images.unsplash.com/photo-1499557354967-2b2d8910bcca?w=600', false, 402),
  ('Textured Pixie', 'Viral', 'Trái tim', 'Ngắn', 'Pixie phá cách, tạo texture phần đỉnh nổi bật.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600', true, 4),

  -- Thêm cho Kim cương (Diamond) — hiện có 0
  ('Layered Waves', 'Thịnh hành', 'Kim cương', 'Vừa', 'Sóng tầng ôm nhẹ gò má, cân bằng dáng mặt kim cương.', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600', false, 2),
  ('Fringe Bob', 'Mới', 'Kim cương', 'Ngắn', 'Bob có mái che trán hẹp, làm dịu gò má cao.', 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600', false, 0),
  ('Voluminous Curls', 'Bán chạy', 'Kim cương', 'Dài', 'Xoăn bồng bềnh tạo độ phồng vùng thái dương.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600', false, 401),
  ('Sleek Middle Part', 'Kinh điển', 'Kim cương', 'Dài', 'Ngôi giữa thẳng mượt, tóc ôm sát gò má.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600', true, 503),

  -- Thêm cho Dài/Thuôn (Oblong) — hiện có 1
  ('Curtain Bangs Medium', 'Thịnh hành', 'Dài', 'Vừa', 'Mái bay rủ nhẹ rút ngắn chiều dài thị giác gương mặt thuôn.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600', false, 801),
  ('Full Bangs Straight', 'Mới', 'Dài', 'Dài', 'Mái bằng dày che trán cao, giảm chiều dài gương mặt.', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600', false, 0),
  ('Bouncy Bob', 'Bán chạy', 'Dài', 'Ngắn', 'Bob xoăn nhẹ tạo chiều rộng cho gương mặt thuôn dài.', 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=600', false, 402),

  -- Thêm cho Trái xoan (hiện có 2)
  ('Classic Long Waves', 'Kinh điển', 'Trái xoan', 'Dài', 'Sóng dài cổ điển tôn vinh sự cân đối tự nhiên.', 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=600', false, 1),
  ('Messy Pixie', 'Viral', 'Trái xoan', 'Ngắn', 'Pixie rối phóng khoáng, hoàn hảo cho mặt trái xoan.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600', false, 603)
ON CONFLICT DO NOTHING;
```

### 2. [MODIFY] HairstyleCatalog.java — thêm field `ailabHairType`

Thêm field mới:
```java
@Column(name = "ailab_hair_type")
private Integer ailabHairType;
```

### 3. [NEW] Mapping face shape English ↔ Vietnamese

Tạo constant map phía backend hoặc dùng phía FE. **Recommend: dùng ở FE** vì MediaPipe chạy client-side.

Mapping:
```
Oval     → "Trái xoan"
Round    → "Tròn"
Square   → "Vuông"
Heart    → "Trái tim"
Oblong   → "Dài"
Diamond  → "Kim cương"
```

**LƯU Ý QUAN TRỌNG**: DB hiện tại dùng tiếng Việt cho `face_shape`. API backend filter theo `faceShape` param → so sánh `equalsIgnoreCase(h.getFaceShape())`. Nên FE khi gọi API phải gửi tiếng Việt: `/api/hairstyles?faceShape=Trái xoan`.

### 4. [MODIFY] useScanStore.js — thêm `selectedHairstyle`

Thêm state để truyền kiểu tóc đã chọn từ ResultsPage sang SwapPage:

```js
// Thêm vào store:
selectedHairstyle: null, // { id, name, imageUrl, ailabHairType }

setSelectedHairstyle: (hairstyle) => set({ selectedHairstyle: hairstyle }),

// Trong reset(): thêm selectedHairstyle: null
```

### 5. [MODIFY] ResultsPage.jsx — gọi API thay vì hardcode

**Thay đổi lớn — viết lại phần data:**

**Xóa hoàn toàn**: `HAIRSTYLE_RECS`, `REASONS_MAP`, import `TRENDS` từ figmaAssets.

**Thêm**:
```jsx
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
```

**Mapping face shape cho API call:**
```jsx
const FACE_SHAPE_MAP = {
  Oval: "Trái xoan",
  Round: "Tròn",
  Square: "Vuông",
  Heart: "Trái tim",
  Oblong: "Dài",
  Diamond: "Kim cương",
};
```

**Fetch hairstyles từ API:**
```jsx
const faceShapeVi = FACE_SHAPE_MAP[faceShape] || "Trái xoan";

const { data: recommendations = [], isLoading: recsLoading } = useQuery({
  queryKey: ["hairstyles", faceShapeVi],
  queryFn: async () => {
    const { data } = await api.get("/hairstyles", { params: { faceShape: faceShapeVi } });
    return data;
  },
  enabled: !!faceShape,
});
```

**Render recommendations từ API data:**
Mỗi card hiển thị:
- `rec.imageUrl` thay cho `TRENDS[x].img`
- `rec.name` thay cho hardcoded name
- Match %: tính đơn giản dựa trên thứ tự (item đầu = 98%, giảm 3% mỗi item, tối thiểu 80%). Hoặc nếu muốn fancy hơn: random trong khoảng 85-98%.
- Nút "Thử ngay" → lưu hairstyle vào store rồi navigate:
```jsx
const handleTryStyle = (hairstyle) => {
  setSelectedHairstyle({
    id: hairstyle.id,
    name: hairstyle.name,
    imageUrl: hairstyle.imageUrl,
    ailabHairType: hairstyle.ailabHairType,
  });
  navigate("/swap");
};
```

**Biometrics section**: Sửa để không hiển thị giá trị fake nữa.
- Giữ: "Hình dáng khuôn mặt" (giá trị thật từ MediaPipe)
- Thay hardcode: hiển thị metrics thật từ `analysisResult.metrics`:
  - "Tỷ lệ rộng/dài" → `(widthToLength * 100).toFixed(0)%`
  - "Tỷ lệ trán/hàm" → `foreheadToJaw.toFixed(2)`
  - "Tỷ lệ hàm/gò má" → `jawToCheek.toFixed(2)`
- Hoặc nếu muốn đơn giản hơn: chỉ hiển thị "Hình dáng khuôn mặt" + "Số điểm phân tích: 478" + "Độ tin cậy: Cao"

**REASONS_MAP**: Giữ nguyên object `REASONS_MAP` hiện tại — nội dung lý do theo face shape viết tốt rồi, không liên quan đến data. Chỉ cần giữ nguyên.

**Loading state**: Khi `recsLoading === true`, hiển thị skeleton cards (4 ô placeholder animate-pulse).

**Xử lý empty**: Nếu API trả về mảng rỗng (ví dụ face shape "Kim cương" chưa có data), hiển thị message friendly + link sang `/catalog`.

### 6. [MODIFY] SwapPage.jsx — nhận kiểu tóc từ store + fetch danh sách từ API

**Thay đổi lớn — kết nối với catalog:**

**Xóa hoàn toàn**: `STYLES`, `HAIR_TYPES` constants, import `TRENDS` từ figmaAssets.

**Thêm**:
```jsx
import { useQuery } from "@tanstack/react-query";
```

**Đọc selectedHairstyle từ store:**
```jsx
const { imageFile, previewUrl, selectedHairstyle } = useScanStore();
```

**Fetch danh sách kiểu tóc để user chọn thêm:**
```jsx
const { data: styles = [] } = useQuery({
  queryKey: ["hairstyles-swap"],
  queryFn: async () => {
    const { data } = await api.get("/hairstyles");
    return data;
  },
});
```

**Active style state — ưu tiên từ ResultsPage:**
```jsx
const [activeStyle, setActiveStyle] = useState(null);

// Set initial style từ selectedHairstyle khi mount
useEffect(() => {
  if (selectedHairstyle) {
    setActiveStyle(selectedHairstyle);
  } else if (styles.length > 0) {
    // Fallback: chọn kiểu đầu tiên nếu user vào trực tiếp /swap
    const first = styles[0];
    setActiveStyle({
      id: first.id,
      name: first.name,
      imageUrl: first.imageUrl,
      ailabHairType: first.ailabHairType,
    });
  }
}, [selectedHairstyle, styles]);
```

**handleApply — dùng ailabHairType từ catalog:**
```jsx
const handleApply = async () => {
  if (!imageFile || !activeStyle?.ailabHairType) return;

  setLoading(true);
  setError(null);

  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("hairType", activeStyle.ailabHairType); // <-- mã AILab thật

  try {
    const response = await api.post("/swap/try", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    // ... xử lý giống hiện tại
  }
};
```

**Grid chọn kiểu tóc — render từ API:**
```jsx
<div className="grid grid-cols-2 gap-4">
  {styles.map((s) => (
    <button key={s.id} onClick={() => setActiveStyle({
      id: s.id, name: s.name, imageUrl: s.imageUrl, ailabHairType: s.ailabHairType
    })}
      className={`relative overflow-hidden rounded-xl border-2 transition ${
        activeStyle?.id === s.id ? "border-primary" : "border-transparent"}`}>
      <img src={s.imageUrl} alt={s.name} className="aspect-square w-full object-cover"
           onError={(e) => { e.target.src = `https://placehold.co/300x300?text=${encodeURIComponent(s.name)}`; }} />
      {activeStyle?.id === s.id && (
        <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-white">
          <CheckIcon size={12} />
        </span>
      )}
      <span className="absolute bottom-0 inset-x-0 bg-ink/60 text-white text-xs px-2 py-1 truncate">
        {s.name}
      </span>
      {s.premiumOnly && (
        <span className="absolute left-1 top-1 rounded bg-magenta/90 px-1.5 py-0.5 text-[10px] font-bold text-white">PRO</span>
      )}
    </button>
  ))}
</div>
```

**Thanh hành động bên dưới ảnh**: Hiển thị `activeStyle.name` thay vì `STYLES[styleIdx].name`.

**Giữ nguyên**: Phần chọn màu sắc (PALETTES), shade slider, lớp phủ màu mô phỏng — chức năng này decorative, OK giữ.

### 7. [MODIFY] Nút "Thử ngay" trên ResultsPage

Hiện tại:
```jsx
const tryStyle = () => navigate("/swap");
```

Sau:
```jsx
// Mỗi card recommendation có nút riêng:
<Button onClick={() => handleTryStyle(rec)} size="sm" className="px-4 py-2 text-xs">Thử ngay</Button>
```

`handleTryStyle` lưu kiểu tóc vào `useScanStore.selectedHairstyle` rồi navigate `/swap`.

---

## Files tổng kết

| File | Action | Mô tả |
|---|---|---|
| `V8__add_ailab_code_and_seed.sql` | NEW | Thêm cột + seed data |
| `HairstyleCatalog.java` | MODIFY | Thêm field `ailabHairType` |
| `useScanStore.js` | MODIFY | Thêm `selectedHairstyle` state |
| `ResultsPage.jsx` | MODIFY | Gọi API, bỏ hardcode, nối sang swap |
| `SwapPage.jsx` | MODIFY | Nhận style từ store, gọi API catalog, dùng ailabHairType |

---

## Lưu ý quan trọng

1. **Comment code bằng tiếng Việt**
2. **KHÔNG sửa**: `faceAnalysis.js`, `ScanPage.jsx`, `HairSwapService.java`, `HairSwapController.java`, `HairstyleCatalogController.java` — chúng hoạt động đúng rồi
3. **Face shape mapping**: FE phải gửi tiếng Việt khi gọi `/api/hairstyles?faceShape=Tròn` vì DB lưu tiếng Việt
4. **Import**: Dùng `api` instance từ `lib/api.js` (auto-attach JWT), dùng `useQuery` từ `@tanstack/react-query` (đã cài)
5. **Image fallback**: Luôn có `onError` handler cho `<img>` vì ảnh Unsplash có thể thay đổi URL
6. **Không xóa** phần chọn màu/shade trên SwapPage — giữ nguyên feature mô phỏng này
7. **`REASONS_MAP`** trên ResultsPage: GIỮ NGUYÊN nội dung, chỉ cần lấy đúng key theo faceShape
8. **Guard**: Nếu `styles` (API response) rỗng, SwapPage hiển thị message + link `/catalog` thay vì grid trống
9. **`FACE_SHAPE_TRANSLATION`** trên ResultsPage: GIỮ NGUYÊN object này cho phần hiển thị heading tiếng Việt
10. **`ailabHairType` có thể null** (kiểu tóc cũ chưa update) — nếu null, disable nút "Áp dụng kiểu tóc AI" và hiển thị tooltip "Kiểu tóc này chưa hỗ trợ thử nghiệm AI"

## Test checklist
1. Scan ảnh → ResultsPage hiển thị kiểu tóc từ API (không phải SVG placeholder) phù hợp face shape
2. Nhấn "Thử ngay" trên 1 kiểu → SwapPage mở với kiểu tóc đó được chọn sẵn (viền highlight)
3. Nhấn "Áp dụng kiểu tóc AI" → gọi API `/swap/try` với đúng `ailabHairType` từ catalog
4. Vào `/swap` trực tiếp (không qua Results) → hiển thị toàn bộ catalog, chọn kiểu đầu tiên
5. Free user chỉ thấy kiểu tóc `premiumOnly=false` trên cả ResultsPage lẫn SwapPage
6. Kiểu tóc `premiumOnly=true` hiển thị badge "PRO" trên card
7. `mvn clean compile` → BUILD SUCCESS
8. Face shape "Kim cương" / "Trái tim" có ≥ 3 kiểu tóc hiển thị (từ seed data mới)
