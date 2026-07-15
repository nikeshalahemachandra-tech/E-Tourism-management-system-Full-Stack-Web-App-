<?php
// food_db.php
// ══════════════════════════════════════════════════════════════════
// Admin Panel — Traditional Foods JS Module
// Include this file inside admin.html before </body>
// Or paste the JS block into the main <script> tag
// API endpoint: food_api.php (project root)
// ══════════════════════════════════════════════════════════════════
?>
<script>
// ── Config ─────────────────────────────────────────────────────────────────────
const FOOD_API = "food_api.php"; // adjust path if admin is in a subfolder

let currentFoodFilter = "all";

// DB schema match: category enum = rice | snack | sweet | seafood
const foodCatBadges = {
  rice:    "badge-gold",
  snack:   "badge-orange",
  sweet:   "badge-purple",
  seafood: "badge-blue"
};
const foodCatEmoji = {
  rice:    "🍛",
  snack:   "🌮",
  sweet:   "🍮",
  seafood: "🦐"
};

// DB schema: spice_level is a free-text varchar — map common values
const spiceBadges = {
  "mild":        "badge-green",
  "medium":      "badge-gold",
  "hot":         "badge-orange",
  "very spicy":  "badge-red",
  "mild – spicy":"badge-gold",
  "dessert":     "badge-purple"
};
const spiceLabel = {
  "mild":        "🟢 Mild",
  "medium":      "🟡 Medium",
  "hot":         "🔴 Hot",
  "very spicy":  "🌶️ Very Spicy",
  "mild – spicy":"🟡 Mild–Spicy",
  "dessert":     "🍮 Dessert"
};

// DB schema: status is varchar — real values from DB
const statusLabels = {
  "must try":        "⭐ Must Try",
  "street food":     "🛺 Street Food",
  "breakfast":       "🌅 Breakfast",
  "regional":        "📍 Regional",
  "festive":         "🎉 Festive",
  "new year special":"🎊 New Year",
  "heritage":        "🏛️ Heritage"
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function _fcap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

function _spiceBadge(val) {
  const k = (val || "").toLowerCase();
  return spiceBadges[k] || "badge-gray";
}
function _spiceLabel(val) {
  const k = (val || "").toLowerCase();
  return spiceLabel[k] || _fcap(val);
}
function _statusLabel(val) {
  const k = (val || "").toLowerCase();
  return statusLabels[k] || _fcap(val);
}

// FIX: _foodApiFetch now checks Content-Type before parsing JSON
// to avoid "Unexpected token '<'" crash when PHP returns an error page
async function _foodApiFetch(url, options = {}) {
  const res = await fetch(url, options);
  const ct  = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const raw = await res.text();
    const msg = raw.replace(/<[^>]+>/g, "").trim().substring(0, 200);
    throw new Error("PHP Error: " + (msg || "Non-JSON response from " + url));
  }
  return res.json();
}

// ── LOAD & RENDER TABLE ────────────────────────────────────────────────────────
async function loadAndRenderFood(filter = "all", search = "") {
  const tbody = document.getElementById("food-tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--text-dim)">
    <i class="fa-solid fa-spinner fa-spin"></i> Loading...
  </td></tr>`;

  try {
    const foods = await _foodApiFetch(FOOD_API);

    if (!Array.isArray(foods)) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--red)">
        API error: ${foods.error || "Invalid response"}</td></tr>`;
      return;
    }

    let data = foods.filter(f => {
      const matchCat    = filter === "all" || f.category === filter;
      const q           = (search || "").toLowerCase();
      const matchSearch = !q ||
        (f.name     || "").toLowerCase().includes(q) ||
        (f.location || "").toLowerCase().includes(q) ||
        (f.status   || "").toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

    const infoEl = document.getElementById("food-pag-info");
    if (infoEl) infoEl.textContent = `Showing ${data.length} of ${foods.length} food items`;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:36px;color:var(--text-dim)">
        <i class="fa-solid fa-bowl-food" style="font-size:1.8rem;display:block;margin-bottom:8px;opacity:.3"></i>
        No food items found</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((f, i) => {
      const catBadge = foodCatBadges[f.category] || "badge-gray";
      const catEmoji = foodCatEmoji[f.category]  || "🍽️";
      const spBadge  = _spiceBadge(f.spice_level);
      const spLabel  = _spiceLabel(f.spice_level);
      const stLabel  = _statusLabel(f.status);
      const desc     = (f.description || "").substring(0, 55);

      return `<tr style="border-bottom:1px solid var(--border);transition:background .15s"
               onmouseover="this.style.background='var(--dark4)'"
               onmouseout="this.style.background=''">
        <td style="padding:12px 14px;color:var(--text-dim)">${i + 1}</td>
        <td style="padding:12px 14px">
          <div class="td-name">${f.name}</div>
          <div class="td-sub" style="font-size:.78rem;color:var(--text-dim)">${desc}${desc.length >= 55 ? "…" : ""}</div>
        </td>
        <td style="padding:12px 14px">
          <span class="badge ${catBadge}">${catEmoji} ${_fcap(f.category)}</span>
        </td>
        <td style="padding:12px 14px;font-size:.82rem;color:var(--text-dim)">
          <i class="fa-solid fa-location-dot" style="color:var(--gold);margin-right:4px"></i>
          ${_fcap(f.location) || "Island-Wide"}
        </td>
        <td style="padding:12px 14px">
          <span class="badge ${spBadge}">${spLabel}</span>
        </td>
        <td style="padding:12px 14px;font-size:.82rem">${stLabel}</td>
        <td style="padding:12px 14px">
          <span class="badge badge-green" style="font-size:.72rem">
            <i class="fa-solid fa-image" style="margin-right:3px"></i>
            ${f.image ? "Set" : "Default"}
          </span>
        </td>
        <td style="padding:12px 14px">
          <div class="act-btns">
            <button class="act-btn edit"  title="Edit"   onclick="openEditFood(${f.id})">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="act-btn del"   title="Delete" onclick="deleteFood(${f.id})">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join("");

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--red)">
      Failed to load: ${err.message}</td></tr>`;
    console.error("Food load error:", err);
  }
}

function filterFoodTable(el, cat) {
  currentFoodFilter = cat;
  document.querySelectorAll("#food-filter-tabs .ftab").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  loadAndRenderFood(cat, document.getElementById("food-search")?.value || "");
}

function searchFood(val) {
  loadAndRenderFood(currentFoodFilter, val);
}

// ── ADD MODAL ──────────────────────────────────────────────────────────────────
function openAddFood() {
  editMode = { type: "food", id: null };
  document.getElementById("food-modal-title").textContent = "Add New Food Item";
  ["f-name","f-desc","f-image","f-alt","f-location","f-price"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const spiceEl = document.getElementById("f-spice");
  if (spiceEl) spiceEl.value = "mild";            // FIX: lowercase to match DB enum
  const catEl = document.getElementById("f-category");
  if (catEl) catEl.value = "";
  const statEl = document.getElementById("f-status");
  if (statEl) statEl.value = "must try";          // FIX: lowercase to match DB enum
  openModal("food-modal");
}

// ── EDIT MODAL ─────────────────────────────────────────────────────────────────
async function openEditFood(id) {
  try {
    const f = await _foodApiFetch(`${FOOD_API}?id=${id}`);
    if (f.error) { showToast("Food item not found", "error"); return; }

    editMode = { type: "food", id };
    document.getElementById("food-modal-title").textContent = "Edit Food Item";
    document.getElementById("f-name").value     = f.name        || "";
    document.getElementById("f-category").value = f.category    || "";
    document.getElementById("f-desc").value     = f.description || "";
    document.getElementById("f-spice").value    = f.spice_level || "mild";
    document.getElementById("f-status").value   = f.status      || "must try";
    document.getElementById("f-location").value = f.location    || "";
    document.getElementById("f-image").value    = f.image       || "";
    // FIX: price field populate on edit
    const priceEl = document.getElementById("f-price");
    if (priceEl) priceEl.value = f.price || 0;
    const altEl = document.getElementById("f-alt");
    if (altEl) altEl.value = f.alt_text || "";
    openModal("food-modal");
  } catch (err) {
    showToast("Error loading food: " + err.message, "error");
  }
}

// ── SAVE (add or update) ───────────────────────────────────────────────────────
async function saveFood() {
  const name     = document.getElementById("f-name").value.trim();
  const category = document.getElementById("f-category").value;
  if (!name || !category) {
    showToast("Name සහ Category අනිවාර්ය!", "error");
    return;
  }

  // FIX: include price in payload (was missing before)
  const payload = {
    name,
    category,
    description: document.getElementById("f-desc").value.trim(),
    spice_level: document.getElementById("f-spice").value,
    status:      document.getElementById("f-status").value,
    location:    document.getElementById("f-location").value.trim() || "Island-Wide",
    image:       document.getElementById("f-image").value.trim()    || "images/default.jpg",
    alt_text:    document.getElementById("f-alt")?.value.trim()     || name,
    price:       parseInt(document.getElementById("f-price")?.value) || 0,
  };

  try {
    let res;
    if (editMode.id) {
      // FIX: use POST + ?_method=PUT override (XAMPP blocks native PUT)
      res = await _foodApiFetch(`${FOOD_API}?id=${editMode.id}&_method=PUT`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.success) showToast("Food item updated successfully!", "success");
      else throw new Error(res.error || "Update failed");
    } else {
      res = await _foodApiFetch(FOOD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.success) showToast("Food item added successfully!", "success");
      else throw new Error(res.error || "Insert failed");
    }
    closeModal("food-modal");
    loadAndRenderFood(currentFoodFilter, document.getElementById("food-search")?.value || "");
  } catch (err) {
    showToast("Error: " + err.message, "error");
    console.error(err);
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
function deleteFood(id) {
  showConfirm(
    "Delete Food Item?",
    "This will permanently remove this food listing from the website.",
    async () => {
      try {
        // FIX: use POST + ?_method=DELETE override (XAMPP blocks native DELETE)
        const res = await _foodApiFetch(`${FOOD_API}?id=${id}&_method=DELETE`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (res.success) {
          showToast("Food item deleted", "success");   // FIX: was "error" toast type
          loadAndRenderFood(currentFoodFilter, document.getElementById("food-search")?.value || "");
        } else throw new Error(res.error);
      } catch (err) {
        showToast("Delete failed: " + err.message, "error");
      }
    }
  );
}

// ── Auto-load when Food page is opened ───────────────────────────────────────
(function patchShowPageForFood() {
  const origShow = window.showPage;
  if (typeof origShow !== "function") {
    document.addEventListener("DOMContentLoaded", () => patchShowPageForFood());
    return;
  }
  window.showPage = function(name, el) {
    origShow(name, el);
    if (name === "food") loadAndRenderFood();
  };
})();
</script>