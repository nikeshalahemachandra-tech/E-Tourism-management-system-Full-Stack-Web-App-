function loadPage(pageName) {
  document.querySelectorAll(".page").forEach(function (p) {
    p.classList.remove("active");
  });

  var target = document.getElementById("page-" + pageName);
  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.classList.remove("active");
    if (link.getAttribute("data-page") === pageName) {
      link.classList.add("active");
    }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (window.currentAuthState) {
    applyAuthUI(window.currentAuthState);
  }
}

/* Logo click → go home */
var _logoContainer = document.querySelector(".logo-container");
if (_logoContainer) {
  _logoContainer.addEventListener("click", function () {
    loadPage("home");
  });
}

/* ──────────────────────────────────────────
   NAVBAR SCROLL EFFECT
────────────────────────────────────────── */
window.addEventListener("scroll", function () {
  var navbar = document.getElementById("navbar");
  if (!navbar) return;
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

/* ──────────────────────────────────────────
   SEARCH FUNCTION
────────────────────────────────────────── */
function searchDestination() {
  var input = document.getElementById("searchInput").value.toLowerCase().trim();
  var cards = document.querySelectorAll(".card");

  // Filter home page cards
  cards.forEach(function (card) {
    var title = card.querySelector("h3").textContent.toLowerCase();
    card.style.display = input === "" || title.includes(input) ? "" : "none";
  });

  // PHP server-side search
  if (input !== "") {
    fetch("../php/search.php?q=" + encodeURIComponent(input))
      .then(function (res) {
        return res.text();
      })
      .then(function (data) {
        document.getElementById("php-result-content").innerHTML = data;
        document.getElementById("php-results").style.display = "block";
      })
      .catch(function () {
        document.getElementById("php-results").style.display = "none";
      });
  } else {
    document.getElementById("php-results").style.display = "none";
  }
}
function goToEvents() {
  loadPage("home");
  setTimeout(() => {
    document
      .getElementById("cultural-events-section")
      .scrollIntoView({ behavior: "smooth" });
  }, 100);
}
window.scrollToHotels = function () {
  var homePage = document.getElementById("page-home");
  var isHome = homePage && homePage.classList.contains("active");

  if (!isHome) {
    loadPage("home");
  }

  setTimeout(function () {
    var hotelsSection = document.getElementById("hotels-section");
    if (hotelsSection) {
      hotelsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, isHome ? 50 : 350);
};
document.addEventListener("DOMContentLoaded", function () {
  var btn = document.getElementById("bookHotelsBtn");
  if (btn) {
    btn.addEventListener("click", scrollToHotels);
  }
});
// Enter key triggers search
var _searchInput = document.getElementById("searchInput");
if (_searchInput) {
  _searchInput.addEventListener("keyup", function () {
    searchDestination();
  });
}

/* ──────────────────────────────────────────
   STAR RATING
────────────────────────────────────────── */
document.querySelectorAll(".stars").forEach(function (starBox) {
  var stars = starBox.querySelectorAll("i");
  var scoreEl = starBox.nextElementSibling
    ? starBox.nextElementSibling.querySelector(".score")
    : null;

  stars.forEach(function (star, index) {
    // Hover preview
    star.addEventListener("mouseover", function () {
      stars.forEach(function (s, i) {
        s.classList.toggle("active", i <= index);
      });
    });

    // Reset on mouseout (back to saved state)
    star.addEventListener("mouseout", function () {
      var saved = parseInt(starBox.getAttribute("data-rating") || "0");
      stars.forEach(function (s, i) {
        s.classList.toggle("active", i < saved);
      });
    });

    // Click to save rating
    star.addEventListener("click", function () {
      var rating = index + 1;
      starBox.setAttribute("data-rating", rating);

      stars.forEach(function (s, i) {
        s.classList.toggle("active", i < rating);
      });

      if (scoreEl) {
        scoreEl.textContent = rating;
      }

      // Send to server
      var placeName = starBox.closest(".place").querySelector("h3").textContent;
      fetch("save_rating.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "place=" + encodeURIComponent(placeName) + "&rating=" + rating,
      });
    });
  });
});

/* ──────────────────────────────────────────
   COMMENT SYSTEM
────────────────────────────────────────── */
function addComment(btn) {
  var box = btn.parentElement;
  var input = box.querySelector("input");
  var text = input.value.trim();
  if (text === "") return;

  // Send to server
  var placeName = box.closest(".place").querySelector("h3").textContent;
  fetch("save_comment.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "place=" +
      encodeURIComponent(placeName) +
      "&comment=" +
      encodeURIComponent(text),
  });

  // Show on page
  var commentArea = box.nextElementSibling;
  var p = document.createElement("p");
  p.textContent = "💬 " + text;
  p.style.borderBottom = "1px solid #eee";
  p.style.padding = "5px 0";
  commentArea.appendChild(p);
  input.value = "";
}

/* ──────────────────────────────────────────
   CONTACT FORM
────────────────────────────────────────── */
function submitContact(e) {
  e.preventDefault();

  var btn = document.getElementById("contactSubmitBtn");
  var name = document.getElementById("contactName").value.trim();
  var email = document.getElementById("contactEmail").value.trim();
  var subject =
    document.getElementById("contactSubject").value.trim() || "No Subject";
  var message = document.getElementById("contactMessage").value.trim();

  if (!name || !email || !message) {
    alert("Please fill all required fields.");
    return;
  }

  btn.textContent = "Sending...";
  btn.disabled = true;

  var formData = new FormData();
  formData.append("name", name);
  formData.append("email", email);
  formData.append("subject", subject);
  formData.append("message", message);

  fetch("php/messages_api.php?action=send", {
    method: "POST",
    body: formData,
  })
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      if (data.success) {
        btn.textContent = "✅ Message Sent!";
        btn.style.background = "#01951a";
        e.target.reset();
        setTimeout(function () {
          btn.textContent = "Send Message";
          btn.style.background = "";
          btn.disabled = false;
        }, 3000);
      } else {
        alert(" Failed: " + (data.message || "Unknown error"));
        btn.textContent = "Send Message";
        btn.disabled = false;
      }
    })
    .catch(function () {
      alert(" Network error. Please try again.");
      btn.textContent = "Send Message";
      btn.disabled = false;
    });
}
// ══════════════════════════════════════
//  HOTELS — DB Connected
// ══════════════════════════════════════

const HOTEL_API = window.location.pathname.includes("/pages/")
  ? "../php/hotels_api.php"
  : "php/hotels_api.php";
let hotelData = {};
let activeHotelFilter = "all";
let activeHotelPill = "all";

async function loadHotels() {
  const grid = document.getElementById("hotelGrid");
  if (!grid) return;

  // Loading state
  grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;"></i>
            <p style="margin-top:12px;">Loading hotels...</p>
        </div>`;

  try {
    const res = await fetch(HOTEL_API + "?action=fetch&website=1");
    const result = await res.json();

    if (!result.success || !Array.isArray(result.data)) {
      throw new Error(result.message || "Load failed");
    }

    hotelData = {};
    result.data.forEach((h) => {
      hotelData[h.id] = {
        id: h.id,
        name: h.name || "",
        location: (h.location || "").toLowerCase(),
        stars: Number(h.stars) || 3,
        price: h.price || "0",
        description: h.description || "",
        amenities: h.amenities || "",
        badge: h.badge || "",
        status: h.status || "active",
        image:
          h.image_url ||
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
      };
    });

    renderHotelCards(Object.values(hotelData));
  } catch (err) {
    console.error("Hotel API error:", err);
    grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#e74c3c;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;"></i>
                <p>Failed to load hotels.</p>
            </div>`;
  }
  window.setPillFilter = function (btn, loc) {
    const input = document.getElementById("hotelSearchInput");
    const clearBtn = document.getElementById("hotelClearBtn");
    if (input) input.value = "";
    if (clearBtn) clearBtn.classList.remove("visible");

    activeHotelPill = loc;

    document.querySelectorAll(".hotel-location-pills .pill").forEach((p) => {
      p.classList.toggle("active", p.getAttribute("data-loc") === loc);
    });

    applyHotelFilter("", loc);
  };
}

// ── Render Cards ───────────────────────────────────────────────
function renderHotelCards(hotels) {
  const grid = document.getElementById("hotelGrid");
  const noRes = document.getElementById("hotelNoResults");
  const countEl = document.getElementById("hotelResultCount");
  if (!grid) return;

  grid.innerHTML = "";

  if (!hotels.length) {
    if (noRes) noRes.style.display = "block";
    if (countEl) countEl.textContent = "No hotels found";
    return;
  }

  if (noRes) noRes.style.display = "none";
  // if (countEl) countEl.textContent = `Showing all ${hotels.length} hotels`;

  hotels.forEach((h) => {
    const stars = "★".repeat(h.stars) + "☆".repeat(5 - h.stars);
    const amenitiesList = (h.amenities || "")
      .split(",")
      .map(
        (a) =>
          `<span class="amenity-tag"><i class="fa-solid fa-check"></i> ${a.trim()}</span>`,
      )
      .join("");

    const card = document.createElement("div");
    card.className = "hotel-card";
    card.setAttribute("data-location", h.location);

    card.innerHTML = `
            <div class="hotel-img-wrap">
                <img src="${h.image}" 
                     alt="${h.name}"
                     onerror="this.src='https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80'">
                ${h.badge ? `<span class="hotel-badge">${h.badge}</span>` : ""}
            </div>
            <div class="hotel-info">
                <div class="hotel-header">
                    <h3>${h.name}</h3>
                    <span class="hotel-stars">${stars}</span>
                </div>
                <div class="hotel-location">
                    <i class="fa-solid fa-location-dot"></i>
                    ${h.location.charAt(0).toUpperCase() + h.location.slice(1)}, Sri Lanka
                </div>
                <p class="hotel-desc">${(h.description || "").substring(0, 120)}...</p>
                <div class="hotel-amenities">${amenitiesList}</div>
                <div class="hotel-footer">
                    <div class="hotel-price">
                        <span class="price-from">From</span>
                        <span class="price-val">$${h.price}</span>
                        <span class="price-night">/night</span>
                    </div>
                    <button class="hotel-book-btn" onclick="bookHotel('${h.name.replace(/'/g, "\\'")}')">
                        Book Now
                    </button>
                </div>
            </div>`;

    grid.appendChild(card);
  });
}

// ── Apply filter (location pill + search combined) ─────────────
function applyHotelFilter(query = "", locKey = activeHotelPill) {
  const allHotels = Object.values(hotelData);
  const filtered = allHotels.filter((h) => {
    const matchLoc = locKey === "all" || h.location === locKey;
    const matchQ =
      query === "" ||
      h.name.toLowerCase().includes(query) ||
      h.location.toLowerCase().includes(query) ||
      (h.amenities || "").toLowerCase().includes(query);
    return matchLoc && matchQ;
  });

  renderHotelCards(filtered);

  // Update count
  const countEl = document.getElementById("hotelResultCount");
  if (countEl) {
    if (filtered.length === Object.keys(hotelData).length) {
      countEl.textContent = `Showing all ${filtered.length} hotels`;
    } else if (filtered.length === 0) {
      countEl.textContent = "No hotels found";
    } else {
      const locLabel =
        locKey === "all"
          ? ""
          : ` in ${locKey.charAt(0).toUpperCase() + locKey.slice(1)}`;
      countEl.textContent = `Showing ${filtered.length} hotel${filtered.length > 1 ? "s" : ""}${locLabel}`;
    }
  }
}
window.filterHotels = function () {
  const input = document.getElementById("hotelSearchInput");
  const clearBtn = document.getElementById("hotelClearBtn");
  const query = input.value.trim().toLowerCase();

  if (clearBtn) clearBtn.classList.toggle("visible", query.length > 0);

  if (query.length > 0) {
    document
      .querySelectorAll(".hotel-location-pills .pill")
      .forEach((p) => p.classList.remove("active"));
  }

  applyHotelFilter(query, query.length > 0 ? "all" : activeHotelPill);
};
window.clearHotelSearch = function () {
  const input = document.getElementById("hotelSearchInput");
  const clearBtn = document.getElementById("hotelClearBtn");
  if (input) input.value = "";
  if (clearBtn) clearBtn.classList.remove("visible");
  activeHotelPill = "all";

  document.querySelectorAll(".hotel-location-pills .pill").forEach((p) => {
    p.classList.toggle("active", p.getAttribute("data-loc") === "all");
  });

  applyHotelFilter("", "all");
};
window.bookHotel = function (hotelName) {
  // Try hotelAllData (new system) — open detail popup
  if (typeof hotelAllData !== "undefined" && hotelAllData.length) {
    var h = hotelAllData.find(function (x) {
      return x.name === hotelName;
    });
    if (h) {
      openHotelDetail(h.id);
      return;
    }
  }
  // Try old hotelData object — go directly to payment page
  var found = Object.values(hotelData).find(function (h) {
    return h.name === hotelName;
  });
  if (found) {
    goToBooking(
      found.id,
      found.name,
      found.location || "",
      found.price || "0",
      found.image || "",
    );
    return;
  }
  // Last resort fallback modal
  const overlay = document.getElementById("hotelModal");
  const nameEl = document.getElementById("modalHotelName");
  if (!overlay || !nameEl) return;
  nameEl.textContent = "🏨 " + hotelName;
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
};

window.closeHotelModal = function (event) {
  if (event && event.target !== document.getElementById("hotelModal")) return;
  const overlay = document.getElementById("hotelModal");
  if (overlay) overlay.classList.remove("open");
  document.body.style.overflow = "";
};

let culturalEventsData = [];

const EVENT_API = window.location.pathname.includes("/pages/")
  ? "../php/events_api.php"
  : "php/events_api.php";

async function loadEventsFromAPI() {
  try {
    const res = await fetch(EVENT_API + "?action=fetch");
    if (!res.ok) throw new Error(`events_api.php HTTP ${res.status}`);
    const result = await res.json();

    if (result.success && result.data.length > 0) {
      culturalEventsData = result.data.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        categoryLabel: capitalizeFirst(e.category),
        date: { day: String(e.day), month: e.month },
        location: e.location,
        duration: e.duration,
        status: e.status,
        image: e.image || "images/maligawa.jpg",
        shortDesc: (e.desc || "").substring(0, 100),
        fullDesc: e.desc || "",
      }));
    }
  } catch (err) {
    console.error("Events API error:", err);
  }

  renderCulturalEventsFromData();
}

function capitalizeFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

// ── State ────────────────────────────────────────────────────────
let activeEventFilter = "all";

// ── Render Events ────────────────────────────────────────────────
function renderCulturalEventsFromData(filter) {
  filter = filter || activeEventFilter || "all";
  const grid = document.getElementById("eventsGrid");
  const noResults = document.getElementById("eventsNoResults");
  if (!grid) return;

  grid.innerHTML = "";

  let visible = 0;
  const statusColors = {
    upcoming: "badge-gold",
    ongoing: "badge-green",
    past: "badge-gray",
  };

  culturalEventsData.forEach((ev) => {
    const show = filter === "all" || ev.category === filter;
    if (!show) return;
    visible++;

    const card = document.createElement("div");
    card.className = "event-card";
    card.dataset.category = ev.category;
    card.onclick = () => openEventModal(ev.id);

    card.innerHTML = `
            <div class="event-img-wrap">
                <img src="${ev.image}" alt="${ev.name}" 
                     onerror="this.src='images/maligawa.jpg'">
                <span class="event-date-badge">
                    <span class="day">${ev.date.day}</span>
                    <span class="month">${ev.date.month}</span>
                </span>
            </div>
            <div class="event-info">
                <span class="event-cat-tag tag-${ev.category}">${ev.categoryLabel}</span>
                <h3>${ev.name}</h3>
                <div class="event-meta">
                    <span><i class="fa-solid fa-location-dot"></i> ${ev.location}</span>
                    <span><i class="fa-solid fa-clock"></i> ${ev.duration}</span>
                </div>
                <p class="event-desc">${ev.shortDesc}</p>
                <div class="event-footer">
                    <span class="event-status status-${ev.status}">${capitalizeFirst(ev.status)}</span>
                    <button class="event-learn-btn">Learn More →</button>
                </div>
            </div>`;

    grid.appendChild(card);
  });

  if (noResults) noResults.style.display = visible === 0 ? "block" : "none";
}

// ── Tab Filter ───────────────────────────────────────────────────
function setEventFilter(btn, filter) {
  document
    .querySelectorAll(".events-filter-tabs .tab-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  activeEventFilter = filter;
  renderCulturalEventsFromData(filter);
}

// ── Open Event Modal ─────────────────────────────────────────────
function openEventModal(id) {
  const ev = culturalEventsData.find((e) => e.id == id);
  if (!ev) return;

  const overlay = document.getElementById("eventModal");
  const tagClass = `tag-${ev.category}`;

  document.getElementById("modalEventCatTag").className =
    `modal-cat-tag ${tagClass}`;
  document.getElementById("modalEventCatTag").textContent = ev.categoryLabel;
  document.getElementById("modalEventTitle").textContent = ev.name;
  document.getElementById("modalEventDate").textContent =
    `${ev.date.day} ${ev.date.month}`;
  document.getElementById("modalEventLocation").textContent = ev.location;
  document.getElementById("modalEventDuration").textContent = ev.duration;
  document.getElementById("modalEventDesc").textContent = ev.fullDesc;

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

// ── Close Modal ──────────────────────────────────────────────────
function closeEventModal(e) {
  if (e && e.target !== document.getElementById("eventModal")) return;
  document.getElementById("eventModal").classList.remove("open");
  document.body.style.overflow = "";
}

function closeEventModalBtn() {
  document.getElementById("eventModal").classList.remove("open");
  document.body.style.overflow = "";
}

// ── Gallery Page Filter (separate grid) ─────────────────────────
function setEventFilterGallery(btn, filter) {
  // reset only the gallery tab group
  btn
    .closest(".events-filter-tabs")
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  const grid = document.getElementById("eventsGridGallery");
  const noResults = document.getElementById("eventsNoResultsGallery");
  if (!grid) return;

  let visible = 0;
  grid.querySelectorAll(".event-card").forEach((card) => {
    const show = filter === "all" || card.dataset.category === filter;
    card.classList.toggle("hidden", !show);
    if (show) visible++;
  });

  noResults.style.display = visible === 0 ? "block" : "none";
}

function showDetail(place) {
  alert("Showing details for: " + place);
}

const catClassMap = {
  rice: "tag-rice",
  snack: "tag-snack",
  sweet: "tag-sweet",
  seafood: "tag-seafood",
};

const catLabelMap = {
  rice: "Rice & Curry",
  snack: "Snack",
  sweet: "Sweet",
  seafood: "Seafood",
};

const catIconMap = {
  rice: "🍛",
  snack: "🥘",
  sweet: "🍮",
  seafood: "🦞",
};

// ──Fetching data when the page loads ──────────────────────────
let foodsLoaded = false;
let foodData = {}; // food modal data store

document.addEventListener("DOMContentLoaded", () => {
  if (!foodsLoaded) {
    foodsLoaded = true;
    loadFoods();
  }
  loadEventsFromAPI();
  // loadHotels() — disabled: using loadHotelsSection() below (NEW system with payment page support)
});
const FOOD_API = window.location.pathname.includes("/pages/")
  ? "../php/food_api.php"
  : "php/food_api.php"; // dynamic path

async function loadFoods() {
  const grid = document.getElementById("foodsGrid");
  if (!grid) return;

  // Loading state
  grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#888;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;"></i>
            <p style="margin-top:12px;">Loading foods...</p>
        </div>`;

  try {
    const res = await fetch(FOOD_API);

    // Check HTTP status before parsing — prevents "Unexpected end of JSON" on 500 errors
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `food_api.php returned HTTP ${res.status}: ${errText
          .replace(/<[^>]+>/g, "")
          .trim()
          .substring(0, 150)}`,
      );
    }

    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      grid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;">
                    <i class="fa-solid fa-bowl-food" style="font-size:2rem;"></i>
                    <p>No foods found in database.</p>
                </div>`;
      return;
    }

    foodData = {};
    rows.forEach((row) => {
      foodData[row.id] = row;
    });

    // Rendering cards
    renderFoodCards(rows);
  } catch (err) {
    console.error("Food API error:", err);
    grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#e74c3c;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;"></i>
                <p>Failed to load foods. Check food_api.php connection.</p>
            </div>`;
  }
}

// ── Cards render function ──────────────────────────────────────
function renderFoodCards(rows) {
  const grid = document.getElementById("foodsGrid");
  grid.innerHTML = "";

  rows.forEach((row) => {
    const cat = (row.category || "").toLowerCase();
    const tagClass = catClassMap[cat] || "";
    const tagLabel = catLabelMap[cat] || row.category;
    const icon = catIconMap[cat] || "🍽️";

    const card = document.createElement("div");
    card.className = "food-card";
    card.dataset.category = cat;
    card.onclick = () => openFoodModal(row.id);

    card.innerHTML = `
            <div class="food-img-wrap">
                <img src="${row.image || "images/default.jpg"}"
                     alt="${row.alt_text || row.name}"
                     onerror="this.src='images/default.jpg'">
                <span class="food-category-tag ${tagClass}">${icon} ${tagLabel}</span>
            </div>
            <div class="food-info">
                <h3>${row.name}</h3>
                <div class="food-meta">
                    <span><i class="fa-solid fa-location-dot"></i> ${row.location || "Island-Wide"}</span>
                    <span><i class="fa-solid fa-fire"></i> ${row.spice_level || "Mild"}</span>
                </div>
                <p class="food-desc">${(row.description || "").substring(0, 100)}...</p>
                <div class="food-footer">
                    <span class="food-status">${row.status || ""}</span>
                    <button class="food-learn-btn">Learn More →</button>
                </div>
            </div>`;

    grid.appendChild(card);
  });
}

// ── Filter tabs ────────────────────────────────────────────────
function setFoodFilter(btn, cat) {
  document
    .querySelectorAll(".food-tab")
    .forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");

  let visible = 0;
  document.querySelectorAll(".food-card").forEach((card) => {
    const show = cat === "all" || card.dataset.category === cat;
    card.style.display = show ? "" : "none";
    if (show) visible++;
  });

  const noResults = document.getElementById("foodsNoResults");
  if (noResults) noResults.style.display = visible === 0 ? "block" : "none";
}

// ── Modal open ─────────────────────────────────────────────────
function openFoodModal(id) {
  const data = foodData[id];
  if (!data) return;

  document.getElementById("modalFoodTitle").textContent = data.name || "";
  document.getElementById("modalFoodLocation").textContent =
    data.location || "";
  document.getElementById("modalFoodSpice").textContent =
    data.spice_level || "";
  document.getElementById("modalFoodDesc").textContent = data.description || "";

  const catTag = document.getElementById("modalFoodCatTag");
  const cat = (data.category || "").toLowerCase();

  catTag.textContent = catLabelMap[cat] || data.category;
  catTag.className = "modal-food-cat-tag " + (catClassMap[cat] || "");

  document.getElementById("foodModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

// ── Modal close ────────────────────────────────────────────────
function closeFoodModal(e) {
  if (e && e.target !== document.getElementById("foodModal")) return;
  closeFoodModalBtn();
}

function closeFoodModalBtn() {
  document.getElementById("foodModal").classList.remove("active");
  document.body.style.overflow = "";
}

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeFoodModalBtn();
});

/* destination section new updated */
/* ══════════════════════════════════════════════
       HOME PAGE — Popular Destinations (DB-driven)
       Clicking a card filters the Hotels section
    ══════════════════════════════════════════════ */

async function loadHomeDestinations() {
  var grid = document.getElementById("homeDestGrid");
  if (!grid) return;

  var data = [];
  try {
    var res = await fetch("php/destinations_api.php?action=fetch");
    var json = await res.json();
    if (json.success && json.data && json.data.length) {
      // Show only first 8 destinations
      data = json.data.slice(0, 8);
    }
  } catch (e) {
    console.warn("Destinations API unreachable:", e);
  }

  if (!data.length) {
    // Fallback to static cards if DB empty
    grid.innerHTML = `
            <div class="card" onclick="goToHotelsSection('sigiriya')">
              <img src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80" alt="Sigiriya">
              <h3>Sigiriya</h3><p>The legendary Lion Rock fortress, a UNESCO World Heritage Site.</p>
            </div>
            <div class="card" onclick="goToHotelsSection('ella')">
              <img src="images/ella.jpg" alt="Ella">
              <h3>Ella</h3><p>Iconic Nine Arch Bridge, tea plantations and breathtaking mountain views.</p>
            </div>
            <div class="card" onclick="goToHotelsSection('mirissa')">
              <img src="images/mirs.jpg" alt="Mirissa">
              <h3>Mirissa</h3><p>Famous beach for whale watching.</p>
            </div>
            <div class="card" onclick="goToHotelsSection('kandy')">
              <img src="images/maligawa.jpg" alt="Kandy">
              <h3>Sri Dalada Maligawa</h3><p>Historic city famous for the Temple of the Tooth.</p>
            </div>`;
    return;
  }

  grid.innerHTML = data
    .map(function (d) {
      var img = d.image
        ? d.image
        : "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80";
      var loc = (d.location || "").toLowerCase();
      var desc =
        (d.desc || "").substring(0, 80) +
        ((d.desc || "").length > 80 ? "..." : "");
      return `<div class="card" onclick="goToHotelsSection('${loc}')" style="cursor:pointer;" title="Find hotels in ${d.location || d.name}">
            <img src="${img}" alt="${d.name}" onerror="this.src='https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80'">
            <h3>${d.name}</h3>
            <p>${desc || "Discover this amazing destination in Sri Lanka."}</p>
            <span style="display:inline-block;margin-top:8px;font-size:0.8rem;color:#c8973a;font-weight:600;">
              <i class="fa-solid fa-hotel"></i> Find Hotels →
            </span>
          </div>`;
    })
    .join("");
}

/* Scroll to Hotels section and filter by location */
function goToHotelsSection(location) {
  // Make sure we are on home page
  if (typeof loadPage === "function") loadPage("home");

  setTimeout(function () {
    // Set pill filter
    var pills = document.querySelectorAll(".hotel-location-pills .pill");
    var matched = false;
    pills.forEach(function (pill) {
      var pillLoc = (pill.getAttribute("data-loc") || "").toLowerCase();
      if (
        pillLoc !== "all" &&
        (location.includes(pillLoc) || pillLoc.includes(location))
      ) {
        if (typeof setPillFilter === "function") setPillFilter(pill, pillLoc);
        matched = true;
      }
    });
    if (!matched) {
      // fallback: use search input
      var inp = document.getElementById("hotelSearchInput");
      if (inp && typeof filterHotels === "function") {
        inp.value = location;
        filterHotels();
      }
    }
    // Scroll to hotels section
    setTimeout(function () {
      var sec = document.getElementById("hotels-section");
      if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }, 100);
}

document.addEventListener("DOMContentLoaded", loadHomeDestinations);

/* ── State ── */
let destAllData = [];
let destCurrentCat = "all";
let destCurrentSearch = "";

const destCatEmoji = {
  nature: "🌿",
  cultural: "🏛",
  beach: "🌊",
  wildlife: "🐆",
  heritage: "🏰",
  adventure: "🧗",
};

/* ── Load from DB ── */
async function loadDestinationsPage() {
  const loading = document.getElementById("destLoading");
  const grid = document.getElementById("destDbGrid");
  const noRes = document.getElementById("destNoResults");
  if (!grid) return;
  if (loading) loading.style.display = "block";
  grid.innerHTML = "";
  if (noRes) noRes.style.display = "none";

  try {
    const res = await fetch("php/destinations_api.php?action=fetch");
    const result = await res.json();
    if (result.success) {
      destAllData = result.data;
    } else {
      destAllData = [];
      console.warn("Destinations API error:", result.message);
    }
  } catch (e) {
    destAllData = [];
    console.error("destinations_api.php unreachable:", e);
  }

  if (loading) loading.style.display = "none";
  renderDestinationsPage();
}

/* ── Render ── */
function renderDestinationsPage() {
  const grid = document.getElementById("destDbGrid");
  const noRes = document.getElementById("destNoResults");
  const meta = document.getElementById("destResultCount");
  if (!grid) return;

  const s = destCurrentSearch.toLowerCase();
  const filtered = destAllData.filter((d) => {
    const matchCat = destCurrentCat === "all" || d.category === destCurrentCat;
    const matchS =
      !s ||
      (d.name || "").toLowerCase().includes(s) ||
      (d.location || "").toLowerCase().includes(s) ||
      (d.category || "").toLowerCase().includes(s) ||
      (d.desc || "").toLowerCase().includes(s);
    return matchCat && matchS;
  });

  if (meta)
    meta.textContent =
      filtered.length +
      " destination" +
      (filtered.length !== 1 ? "s" : "") +
      " found";

  if (!filtered.length) {
    grid.innerHTML = "";
    if (noRes) noRes.style.display = "block";
    return;
  }
  if (noRes) noRes.style.display = "none";

  grid.innerHTML = filtered
    .map((d) => {
      const imgSrc = d.image ? d.image : "images/sigiriya.jpg";
      const emoji = destCatEmoji[d.category] || "📍";
      const mapQ = encodeURIComponent(
        (d.name || "") + " " + (d.location || "") + " Sri Lanka",
      );
      return `
<div class="dest-db-card" onclick="openDestDetailModal(${d.id})">
  <div class="dest-card-img">
    <img src="${imgSrc}" alt="${d.name}"
      onerror="this.src='images/sigiriya.jpg'">
    <span class="dest-card-cat">${emoji} ${d.category || "—"}</span>
    <span class="dest-card-loc">
      <i class="fa-solid fa-location-dot"></i> ${d.location || "—"}
    </span>
  </div>
  <div class="dest-card-body">
    <h3>${d.name}</h3>
    <p class="dest-card-desc">${d.desc || "No description available."}</p>
    <div class="dest-card-footer">
      <span class="dest-card-loc-text">
        <i class="fa-solid fa-location-dot"></i> ${d.location || "—"}
      </span>
      <button class="dest-explore-btn">Explore →</button>
    </div>
  </div>
</div>`;
    })
    .join("");
}

/* ── Filter / Search ── */
function setDestCat(el, cat) {
  destCurrentCat = cat;
  document
    .querySelectorAll(".dest-pill")
    .forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
  renderDestinationsPage();
}

function filterDestPage() {
  const val = document.getElementById("destSearchInput").value;
  destCurrentSearch = val;
  const btn = document.getElementById("destClearBtn");
  if (btn) btn.classList.toggle("visible", val.length > 0);
  renderDestinationsPage();
}

function clearDestSearch() {
  const inp = document.getElementById("destSearchInput");
  const btn = document.getElementById("destClearBtn");
  if (inp) inp.value = "";
  if (btn) btn.classList.remove("visible");
  destCurrentSearch = "";
  renderDestinationsPage();
}

/* ── Detail Modal — with Hotels & Reviews ── */
var _destCurrentId = null;
var _destSelectedRating = 0;

function openDestDetailModal(id) {
  const d = destAllData.find((x) => x.id == id);
  if (!d) return;
  _destCurrentId = id;
  _destSelectedRating = 0;

  const imgSrc = d.image ? d.image : "images/sigiriya.jpg";
  const emoji = destCatEmoji[d.category] || "📍";
  const mapQ = encodeURIComponent(
    (d.name || "") + " " + (d.location || "") + " Sri Lanka",
  );

  document.getElementById("destModalImg").src = imgSrc;
  document.getElementById("destModalImg").alt = d.name;
  document.getElementById("destModalCatTag").textContent =
    emoji + " " + (d.category || "");
  document.getElementById("destModalName").textContent = d.name;
  document.getElementById("destModalLocation").textContent = d.location || "—";
  document.getElementById("destModalCat").textContent = d.category || "—";
  document.getElementById("destModalDesc").textContent =
    d.desc || "No description available.";
  document.getElementById("destModalMapLink").href =
    "https://maps.google.com/?q=" + mapQ;
  document.getElementById("destModalHotelLocation").textContent = d.name;

  // Reset hotels panel (hidden until button clicked)
  var hotelsWrap = document.getElementById("destModalHotelsWrap");
  if (hotelsWrap) hotelsWrap.style.display = "none";
  document.getElementById("destModalHotelsLoading").style.display = "block";
  document.getElementById("destModalHotelsGrid").innerHTML = "";
  document.getElementById("destModalHotelsNone").style.display = "none";

  // Reset review form
  resetReviewForm();
  renderDestReviews(id);

  // Open modal
  document.getElementById("destDetailModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

// Show hotels inline inside modal (called by Find Hotels button)
function showDestHotelsInline() {
  var d = destAllData.find((x) => x.id == _destCurrentId);
  if (!d) return;
  var wrap = document.getElementById("destModalHotelsWrap");
  if (wrap) wrap.style.display = "block";
  fetchHotelsForDest(d.location, d.name);
  // Scroll to hotels inside modal
  setTimeout(function () {
    if (wrap) wrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 200);
}

async function fetchHotelsForDest(location, destName) {
  try {
    const res = await fetch("php/hotels_api.php?action=fetch");
    const result = await res.json();

    document.getElementById("destModalHotelsLoading").style.display = "none";

    if (!result.success || !result.data || result.data.length === 0) {
      document.getElementById("destModalHotelsNone").style.display = "block";
      return;
    }

    // Match hotels by location — case-insensitive partial match
    const locLower = (location || "").toLowerCase();
    const matched = result.data.filter((h) => {
      const hLoc = (h.location || "").toLowerCase();
      return hLoc.includes(locLower) || locLower.includes(hLoc);
    });

    if (!matched.length) {
      document.getElementById("destModalHotelsNone").style.display = "block";
      return;
    }

    const grid = document.getElementById("destModalHotelsGrid");
    grid.innerHTML = matched
      .map((h) => {
        const imgSrc =
          h.image_url && h.image_url.replace(/\s+/g, "")
            ? h.image_url.replace(/\s+/g, "")
            : "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80";
        const price = h.price ? "$" + h.price : "Contact us";
        const desc = h.description || "A wonderful stay awaits you.";
        const priceNum = h.price || "0";
        const encName = encodeURIComponent(h.name || "");
        const encLoc = encodeURIComponent(h.location || "");
        const encImg = encodeURIComponent(imgSrc);
        return `
<div class="dmh-card">
  <div class="dmh-card-img">
    <img src="${imgSrc}" alt="${h.name}"
      onerror="this.src='https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80'">
  </div>
  <div class="dmh-card-info">
    <h4>${h.name}</h4>
    <div class="dmh-card-meta">
      <span><i class="fa-solid fa-location-dot"></i> ${h.location}</span>
    </div>
    <p class="dmh-card-desc">${desc}</p>
    <div class="dmh-card-footer">
      <div class="dmh-price">${price} <span>/night</span></div>
      <button class="dmh-book-btn" onclick="bookHotelFromDest(${h.id || 0},'${encName}','${encLoc}','${priceNum}','${encImg}')">
        Book Now
      </button>
    </div>
  </div>
</div>`;
      })
      .join("");
  } catch (e) {
    document.getElementById("destModalHotelsLoading").style.display = "none";
    document.getElementById("destModalHotelsNone").style.display = "block";
    console.error("Hotels fetch error:", e);
  }
}

/* Book Hotel from Destination Modal → go directly to Payment page */
function bookHotelFromDest(id, encName, encLoc, price, encImg) {
  var params = new URLSearchParams({
    id: id,
    name: decodeURIComponent(encName),
    location: decodeURIComponent(encLoc),
    price: price,
    img: decodeURIComponent(encImg),
  });
  window.location.href = "pages/paymant_method.html?" + params.toString();
}

/* ── Close dest modal ── */
function closeDestModal(e) {
  if (e && e.target !== e.currentTarget) return;
  closeDestModalBtn();
}
function closeDestModalBtn() {
  document.getElementById("destDetailModal").classList.remove("open");
  document.body.style.overflow = "";
}

/* ══════════════════════════════════════
   DESTINATION REVIEWS  — DB connected
══════════════════════════════════════ */

/* Fetch reviews from DB and render */
async function renderDestReviews(destId) {
  var listEl = document.getElementById("destReviewsList");
  var countEl = document.getElementById("destReviewCount");
  if (!listEl) return;

  listEl.innerHTML =
    '<p style="color:#bbb;font-size:0.85rem;text-align:center;padding:14px 0;"><i class="fa-solid fa-spinner fa-spin" style="color:#c8973a;margin-right:6px;"></i>Loading reviews...</p>';

  var reviews = [];
  try {
    var res = await fetch(
      "php/reviews_api.php?action=fetch&destination_id=" + destId,
    );
    var result = await res.json();
    if (result.success) reviews = result.data;
  } catch (e) {
    console.warn("Reviews API unreachable:", e);
  }

  if (countEl) countEl.textContent = reviews.length;

  if (!reviews.length) {
    listEl.innerHTML =
      '<p style="color:#bbb;font-size:0.85rem;text-align:center;padding:14px 0;">No reviews yet. Be the first to share your experience!</p>';
    return;
  }

  listEl.innerHTML = reviews
    .map(function (r) {
      var starsHtml = "";
      for (var i = 1; i <= 5; i++) {
        starsHtml +=
          i <= r.rating
            ? '<i class="fa-solid fa-star"></i>'
            : '<i class="fa-regular fa-star"></i>';
      }
      // Format date nicely
      var dateStr = "";
      try {
        dateStr = new Date(r.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch (e) {
        dateStr = r.created_at;
      }

      return `<div class="dest-review-card">
  <div class="dest-review-card-header">
    <span class="dest-review-card-name"><i class="fa-solid fa-circle-user" style="color:#c8973a;margin-right:5px;"></i>${escHtml(r.reviewer_name)}</span>
    <span class="dest-review-card-stars">${starsHtml}</span>
  </div>
  <div class="dest-review-card-date" style="font-size:0.74rem;color:#bbb;margin-bottom:6px;">${dateStr}</div>
  <p class="dest-review-card-text">${escHtml(r.review_text)}</p>
</div>`;
    })
    .join("");
}

function resetReviewForm() {
  var nameEl = document.getElementById("destReviewName");
  var textEl = document.getElementById("destReviewText");
  var msgEl = document.getElementById("destReviewMsg");
  if (nameEl) nameEl.value = "";
  if (textEl) textEl.value = "";
  if (msgEl) {
    msgEl.style.display = "none";
    msgEl.textContent = "";
  }
  _destSelectedRating = 0;
  updateStarPickerUI(0);
}

function updateStarPickerUI(rating) {
  document.querySelectorAll(".dsp-star").forEach(function (star) {
    var val = parseInt(star.getAttribute("data-val"));
    if (val <= rating) {
      star.classList.remove("fa-regular");
      star.classList.add("fa-solid", "selected");
    } else {
      star.classList.remove("fa-solid", "selected");
      star.classList.add("fa-regular");
    }
  });
}

// Star picker hover / click events
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".dsp-star").forEach(function (star) {
    star.addEventListener("click", function () {
      _destSelectedRating = parseInt(this.getAttribute("data-val"));
      updateStarPickerUI(_destSelectedRating);
    });
    star.addEventListener("mouseover", function () {
      updateStarPickerUI(parseInt(this.getAttribute("data-val")));
    });
    star.addEventListener("mouseout", function () {
      updateStarPickerUI(_destSelectedRating);
    });
  });
});

async function submitDestReview() {
  var name = (document.getElementById("destReviewName").value || "").trim();
  var text = (document.getElementById("destReviewText").value || "").trim();
  var btn = document.querySelector(".dest-review-submit-btn");

  if (!name) {
    showReviewMsg("Please enter your name.", "#e74c3c");
    return;
  }
  if (!_destSelectedRating) {
    showReviewMsg("Please select a star rating.", "#e74c3c");
    return;
  }
  if (!text) {
    showReviewMsg("Please write your review.", "#e74c3c");
    return;
  }

  // Disable button while saving
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  }

  try {
    var res = await fetch("php/reviews_api.php?action=add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination_id: _destCurrentId,
        reviewer_name: name,
        rating: _destSelectedRating,
        review_text: text,
      }),
    });
    var result = await res.json();

    if (result.success) {
      resetReviewForm();
      await renderDestReviews(_destCurrentId); // reload from DB
      showReviewMsg("Thank you! Your review has been posted.", "#2ecc71");
    } else {
      showReviewMsg(
        "Error: " + (result.message || "Could not save review."),
        "#e74c3c",
      );
    }
  } catch (e) {
    showReviewMsg("Network error. Please try again.", "#e74c3c");
    console.error("Review submit error:", e);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Review';
    }
  }
}

function showReviewMsg(msg, color) {
  var el = document.getElementById("destReviewMsg");
  if (!el) return;
  el.textContent = msg;
  el.style.color = color || "#2ecc71";
  el.style.display = "block";
  setTimeout(function () {
    el.style.display = "none";
  }, 4000);
}

/* ── Auto-load when Destinations page opens ── */
const _origLoadPage = typeof loadPage === "function" ? loadPage : null;
document.addEventListener("DOMContentLoaded", function () {
  // Hook into existing loadPage if available
  const origLoadPage = window.loadPage;
  if (typeof origLoadPage === "function") {
    window.loadPage = function (page) {
      origLoadPage(page);
      if (page === "destinations") {
        setTimeout(loadDestinationsPage, 50);
      }
    };
  }
});

/* ── State ── */
let hotelAllData = []; // all hotels from DB
let hotelFiltered = []; // after filter/search
let hotelCurrentPill = "all";
let hotelCurrentSearch = "";

/* ════════════════════════════════════════════════════════════
   LOAD FROM DB  ▶  START
   (php/hotels_api.php?action=fetch eken hotel data load කරනවා.
    DOMContentLoaded event eken auto call වෙනවා)
════════════════════════════════════════════════════════════ */
async function loadHotelsSection() {
  const loading = document.getElementById("hotelLoading");
  const grid = document.getElementById("hotelGrid");
  const noRes = document.getElementById("hotelNoResults");

  if (!grid) return;
  if (loading) loading.style.display = "block";
  grid.innerHTML = "";
  if (noRes) noRes.style.display = "none";

  // Dynamic path: /pages/ folder ෙල් නම් ../ prefix use කරනවා
  const hotelApiPath = window.location.pathname.includes("/pages/")
    ? "../php/hotels_api.php"
    : "php/hotels_api.php";

  try {
    const res = await fetch(hotelApiPath + "?action=fetch&website=1");
    if (!res.ok) throw new Error(`hotels_api.php HTTP ${res.status}`);
    const result = await res.json();
    if (result.success && result.data) {
      // Only show active hotels (status = 'active' or no status field)
      hotelAllData = result.data.filter(function (h) {
        return !h.status || h.status === "active";
      });
    } else {
      hotelAllData = [];
      console.warn("Hotels API:", result.message);
    }
  } catch (e) {
    hotelAllData = [];
    console.error("hotels_api.php unreachable:", e);
  }

  if (loading) loading.style.display = "none";
  renderHotels();
}
/* LOAD FROM DB  ◀  END ════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════
   RENDER CARDS  ▶  START
   (Hotel cards grid render කරනවා — filter/search apply කරලා.
    Card click / View Details button → openHotelDetail(id))
════════════════════════════════════════════════════════════ */
function renderHotels() {
  const grid = document.getElementById("hotelGrid");
  const noRes = document.getElementById("hotelNoResults");
  const meta = document.getElementById("hotelResultCount");
  if (!grid) return;

  /* ── Filter ── */
  const s = hotelCurrentSearch.toLowerCase();
  hotelFiltered = hotelAllData.filter(function (h) {
    const loc = (h.location || "").toLowerCase();
    const name = (h.name || "").toLowerCase();
    const desc = (h.description || "").toLowerCase();

    const matchPill =
      hotelCurrentPill === "all" ||
      loc.includes(hotelCurrentPill) ||
      hotelCurrentPill.includes(loc);

    const matchSearch =
      !s || name.includes(s) || loc.includes(s) || desc.includes(s);

    return matchPill && matchSearch;
  });

  /* ── Result count ── */
  if (meta) {
    meta.textContent =
      hotelFiltered.length > 0
        ? "Showing " +
        hotelFiltered.length +
        " hotel" +
        (hotelFiltered.length !== 1 ? "s" : "")
        : "No hotels found";
  }

  /* ── No results ── */
  if (!hotelFiltered.length) {
    grid.innerHTML = "";
    if (noRes) noRes.style.display = "block";
    return;
  }
  if (noRes) noRes.style.display = "none";

  /* ── Build cards ── */
  grid.innerHTML = hotelFiltered
    .map(function (h) {
      const imgSrc = sanitizeImgUrl(h.image_url, h.location);
      const price = h.price ? "$" + h.price : "Contact Us";
      const loc = h.location
        ? h.location.charAt(0).toUpperCase() + h.location.slice(1)
        : "—";
      const desc = h.description
        ? h.description.substring(0, 90) +
        (h.description.length > 90 ? "..." : "")
        : "A wonderful stay awaits you in Sri Lanka.";

      return `
<div class="hotel-card" data-location="${(h.location || "").toLowerCase()}" onclick="openHotelDetail(${h.id})" style="cursor:pointer">
  <div class="hotel-img-wrap">
    <img src="${imgSrc}" alt="${h.name}" onerror="this.src='https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80'">
    <span class="hotel-location-tag"><i class="fa-solid fa-location-dot"></i> ${loc}</span>
  </div>
  <div class="hotel-info">
    <h3>${h.name}</h3>
    <div class="hotel-stars">
      <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
      <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
      <i class="fa-regular fa-star"></i>
    </div>
    <p class="hotel-desc">${desc}</p>
    <div class="hotel-footer">
      <div class="hotel-price">
        <span class="price-from">From</span>
        <span class="price-amt">${price}</span>
        <span class="price-night">/night</span>
      </div>
      <button class="hotel-book-btn"
        onclick="event.stopPropagation(); openHotelDetail(${h.id})">
        View Details
      </button>
    </div>
  </div>
</div>`;
    })
    .join("");
}

/* RENDER CARDS  ◀  END ════════════════════════════════════ */

/* ── Image URL sanitizer ──
   Removes all whitespace from path, returns fallback if empty ── */
/* Location → Unsplash image map (used when DB image is a local path) */
var _locImages = {
  sigiriya:
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
  ella: "https://images.unsplash.com/photo-1586418702776-2a2d22ef9d5c?w=800&q=80",
  mirissa:
    "https://images.unsplash.com/photo-1540202404-a2f29016b523?w=800&q=80",
  kandy:
    "https://images.unsplash.com/photo-1529450450910-1de46c9c6d0d?w=800&q=80",
  galle:
    "https://images.unsplash.com/photo-1586339949216-35c2747cc36d?w=800&q=80",
  yala: "https://images.unsplash.com/photo-1549366021-9f761d040a94?w=800&q=80",
  _default:
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
};

/* Returns a working image URL.
   If the DB value is a local path (no http) resolve via location map. */
function sanitizeImgUrl(url, location) {
  if (!url)
    return _locImages[(location || "").toLowerCase()] || _locImages._default;
  var clean = url.replace(/\s+/g, "");
  if (!clean.length)
    return _locImages[(location || "").toLowerCase()] || _locImages._default;
  // Keep the path as-is (local or http).
  // Payment page's _resolveImg() will prefix ../ for local paths automatically.
  return clean;
}

/* ── Escape helper ── */
function escHtml(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

/* ════════════════════════
   FILTER FUNCTIONS
   (called by existing HTML onclick handlers)
════════════════════════ */
function filterHotels() {
  const inp = document.getElementById("hotelSearchInput");
  hotelCurrentSearch = inp ? inp.value : "";
  const clearBtn = document.getElementById("hotelClearBtn");
  if (clearBtn)
    clearBtn.classList.toggle("visible", hotelCurrentSearch.length > 0);
  renderHotels();
}

function setPillFilter(el, loc) {
  hotelCurrentPill = loc;
  document
    .querySelectorAll(".hotel-location-pills .pill")
    .forEach(function (b) {
      b.classList.remove("active");
    });
  if (el) el.classList.add("active");
  renderHotels();
}

function clearHotelSearch() {
  hotelCurrentSearch = "";
  hotelCurrentPill = "all";
  const inp = document.getElementById("hotelSearchInput");
  if (inp) inp.value = "";
  const clearBtn = document.getElementById("hotelClearBtn");
  if (clearBtn) clearBtn.classList.remove("visible");
  document
    .querySelectorAll(".hotel-location-pills .pill")
    .forEach(function (b) {
      b.classList.remove("active");
    });
  const allPill = document.querySelector(
    '.hotel-location-pills .pill[data-loc="all"]',
  );
  if (allPill) allPill.classList.add("active");
  renderHotels();
}

/* ════════════════════════════════════════════════════════════
   BOOK NOW → PAYMENT PAGE  ▶  START
   (Hotel Detail modal eke "Book Now" button → hdBookNow() →
    goToBooking() → pages/paymant_method.html?id=...&name=...
    URL params ekatin payment page ekata hotel data pass කරනවා)
════════════════════════════════════════════════════════════ */
function goToBooking(id, name, location, price, imgSrc) {
  const params = new URLSearchParams({
    id: id,
    name: name,
    location: location,
    price: price,
    img: imgSrc,
  });
  window.location.href = "pages/paymant_method.html?" + params.toString();
}

/* ── Old bookHotel stub (kept for safety) ── */
function bookHotel(name) {
  const h = hotelAllData.find(function (x) {
    return x.name === name;
  });
  if (h) {
    goToBooking(h.id, h.name, h.location, h.price, h.image_url || "");
  } else {
    document.getElementById("modalHotelName").textContent = name;
    document.getElementById("hotelModal").style.display = "flex";
  }
}

function closeHotelModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById("hotelModal").style.display = "none";
}
/* BOOK NOW → PAYMENT PAGE  ◀  END ═════════════════════════ */

/* ════════════════════════
   AUTO LOAD ON PAGE READY
════════════════════════ */
document.addEventListener("DOMContentLoaded", function () {
  loadHotelsSection();
});

/* ════════════════════════════════════════════════════════════
   HOTEL DETAIL POPUP  ▶  START
   (Find Hotels section eke hotel card click / View Details
    button click කරාම openHotelDetail() run වෙනවා.
    Book Now button eken hdBookNow() → goToBooking() →
    pages/paymant_method.html payment page ekata yනවා)
════════════════════════════════════════════════════════════ */
var _hdCurrentHotel = null;

var _hdAmenityIcons = {
  wifi: "fa-wifi",
  pool: "fa-water-ladder",
  restaurant: "fa-utensils",
  spa: "fa-spa",
  gym: "fa-dumbbell",
  parking: "fa-square-parking",
  bar: "fa-martini-glass",
  "beach access": "fa-umbrella-beach",
  "air conditioning": "fa-snowflake",
  "room service": "fa-bell-concierge",
  beach: "fa-umbrella-beach",
  ac: "fa-snowflake",
  tv: "fa-tv",
};

function openHotelDetail(id) {
  var h = hotelAllData.find(function (x) {
    return Number(x.id) === Number(id);
  });
  if (!h) return;
  _hdCurrentHotel = h;

  // ── Image (always use sanitized URL with onerror fallback) ──
  var imgSrc = sanitizeImgUrl(h.image_url, h.location);
  var imgEl = document.getElementById("hd-img");
  imgEl.src = ""; // reset first to force reload
  imgEl.alt = h.name || "";
  // Small timeout so the onerror fires correctly on src change
  setTimeout(function () {
    imgEl.src = imgSrc;
  }, 10);

  // ── Name ──
  document.getElementById("hd-name").textContent = h.name || "";

  // ── Location ──
  var loc = h.location
    ? h.location.charAt(0).toUpperCase() + h.location.slice(1)
    : "—";
  document.getElementById("hd-loc").textContent = loc;

  // ── Badge ──
  var badgeEl = document.getElementById("hd-badge");
  if (h.badge && h.badge.trim()) {
    badgeEl.textContent = h.badge.trim();
    badgeEl.style.display = "inline-block";
  } else {
    badgeEl.style.display = "none";
  }

  // ── Stars ──
  var stars = Math.max(1, Math.min(5, parseInt(h.stars) || 4));
  var starsHtml = "";
  for (var s = 1; s <= 5; s++) {
    starsHtml +=
      s <= stars
        ? '<i class="fa-solid fa-star"></i>'
        : '<i class="fa-regular fa-star"></i>';
  }
  starsHtml += '<span class="star-count">' + stars + ".0 / 5</span>";
  document.getElementById("hd-stars").innerHTML = starsHtml;

  // ── Description ──
  document.getElementById("hd-desc").textContent =
    h.description ||
    "A wonderful stay awaits you in Sri Lanka. Enjoy world-class hospitality surrounded by breathtaking landscapes.";

  // ── Highlights ──
  document.getElementById("hd-hl-stay").textContent = "1 Night";
  document.getElementById("hd-hl-cap").textContent =
    parseInt(h.stars) >= 5 ? "4 Guests" : "2 Guests";
  document.getElementById("hd-hl-rating").textContent = stars + " / 5";

  // ── Amenities ──
  var amenEl = document.getElementById("hd-amenities");
  var amenWrap = document.getElementById("hd-amenities-wrap");
  if (h.amenities && h.amenities.trim()) {
    amenEl.innerHTML = h.amenities
      .split(",")
      .map(function (a) {
        a = a.trim();
        var key = a.toLowerCase();
        var icon = _hdAmenityIcons[key] || "fa-check";
        return '<span><i class="fa-solid ' + icon + '"></i> ' + a + "</span>";
      })
      .join("");
    amenWrap.style.display = "block";
  } else {
    amenWrap.style.display = "none";
  }

  // ── Price ──
  document.getElementById("hd-price").textContent = h.price
    ? "$" + parseFloat(h.price).toFixed(0)
    : "Contact Us";

  // ── Open overlay ──
  document.getElementById("hotelDetailOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function hdBookNow() {
  if (!_hdCurrentHotel) return;
  var h = _hdCurrentHotel;
  var imgSrc = sanitizeImgUrl(h.image_url, h.location);
  closeHotelDetailBtn();
  goToBooking(h.id, h.name, h.location || "", h.price || "0", imgSrc);
}

function closeHotelDetail(e) {
  if (e && e.target !== document.getElementById("hotelDetailOverlay")) return;
  closeHotelDetailBtn();
}

function closeHotelDetailBtn() {
  document.getElementById("hotelDetailOverlay").classList.remove("open");
  document.body.style.overflow = "";
  _hdCurrentHotel = null;
}
/* HOTEL DETAIL POPUP  ◀  END ══════════════════════════════ */

// Check if user is already logged in (PHP session)
(function checkSession() {
  fetch(
    (window.location.pathname.includes("/pages/") ? "../php/" : "php/") +
    "get_user.php",
    { credentials: "include" },
  )
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      var authOut = document.getElementById("auth-out");
      var authIn = document.getElementById("auth-in");
      if (data.loggedin) {
        if (authOut) authOut.style.display = "none";
        if (authIn) authIn.style.display = "flex";
        var nameEl = document.getElementById("nav-user-name");
        if (nameEl) nameEl.textContent = data.username || "User";
      } else {
        if (authOut) authOut.style.display = "flex";
        if (authIn) authIn.style.display = "none";
      }
    })
    .catch(function () {
      // If PHP not available, show logged-out state
      var authOut = document.getElementById("auth-out");
      var authIn = document.getElementById("auth-in");
      if (authOut) authOut.style.display = "flex";
      if (authIn) authIn.style.display = "none";
    });
})();

function logoutUser() {
  fetch(
    (window.location.pathname.includes("/pages/") ? "../php/" : "php/") +
    "logout.php",
    { credentials: "include" },
  )
    .then(function (res) {
      return res.json();
    })
    .then(function () {
      var authOut = document.getElementById("auth-out");
      var authIn = document.getElementById("auth-in");
      if (authOut) authOut.style.display = "flex";
      if (authIn) authIn.style.display = "none";
      var nameEl = document.getElementById("nav-user-name");
      if (nameEl) nameEl.textContent = "";
    })
    .catch(function () {
      var authOut = document.getElementById("auth-out");
      var authIn = document.getElementById("auth-in");
      if (authOut) authOut.style.display = "flex";
      if (authIn) authIn.style.display = "none";
    });
}

/* ═══════════════════════════════════════════════════════════════
   PAYMENTS MODULE  –  Explore Sri Lanka Admin Panel
   Included directly in script.js
═══════════════════════════════════════════════════════════════ */

const PAYMENT_API = window.location.pathname.includes("/pages/")
  ? "../php/payments_api.php"
  : "php/payments_api.php";

let currentCancelBookingId = null;
let currentCancelInvoice = null;
let currentInvoiceData = null;
let payCurrentPage = 1;

/* ─────────────────────────────────────────────
   1.  LOAD & RENDER PAYMENTS TABLE
───────────────────────────────────────────── */
async function loadPayments(page = 1) {
  payCurrentPage = page;

  const tbody = document.getElementById("pay-table-body");
  const pagInfo = document.getElementById("pay-pagination-info");
  const pagBtns = document.getElementById("pay-pagination-btns");

  if (tbody)
    tbody.innerHTML = `
    <tr><td colspan="9" style="padding:40px;text-align:center;color:var(--text-dim)">
      <i class="fa-solid fa-spinner fa-spin"></i> Loading…
    </td></tr>`;

  const search = (document.getElementById("pay-search")?.value || "").trim();
  const status = document.getElementById("pay-filter-status")?.value || "";
  const method = document.getElementById("pay-filter-method")?.value || "";

  const params = new URLSearchParams({ action: "list", page, limit: 15 });
  if (search) params.append("search", search);
  if (status) params.append("status", status);
  if (method) params.append("method", method);

  try {
    const [statsRes, listRes] = await Promise.all([
      fetch(`${PAYMENT_API}?action=stats`),
      fetch(`${PAYMENT_API}?${params}`),
    ]);
    const statsJson = await statsRes.json();
    const listJson = await listRes.json();

    if (statsJson.success) renderPayStats(statsJson.data);

    if (!listJson.success) throw new Error(listJson.message);
    const { items, total, total_pages } = listJson.data;

    if (!items || items.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="9" style="padding:40px;text-align:center;color:var(--text-dim)">
          <i class="fa-solid fa-receipt" style="font-size:1.8rem;display:block;margin-bottom:8px;opacity:.3"></i>
          No payments found
        </td></tr>`;
      if (pagInfo) pagInfo.textContent = "No records";
      if (pagBtns) pagBtns.innerHTML = "";
      return;
    }

    tbody.innerHTML = items.map((p) => renderPayRow(p)).join("");

    if (pagInfo)
      pagInfo.textContent = `Page ${page} of ${total_pages}  (${total} records)`;
    if (pagBtns) {
      pagBtns.innerHTML = "";
      for (let i = 1; i <= total_pages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.style.cssText = `
          padding:5px 11px;border-radius:6px;border:1px solid var(--border);
          background:${i === page ? "var(--gold)" : "var(--dark4)"};
          color:${i === page ? "var(--dark)" : "var(--text)"};
          font-size:.8rem;cursor:pointer;font-family:Outfit,sans-serif;`;
        btn.onclick = () => loadPayments(i);
        pagBtns.appendChild(btn);
      }
    }
  } catch (err) {
    if (tbody)
      tbody.innerHTML = `
      <tr><td colspan="9" style="padding:32px;text-align:center;color:var(--red)">
        ❌ ${err.message}
      </td></tr>`;
    console.error("loadPayments error:", err);
  }
}

/* ─────────────────────────────────────────────
   2.  KPI STAT CARDS
───────────────────────────────────────────── */
function renderPayStats(d) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set(
    "ps-revenue",
    "$" +
    Number(d.total_revenue || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    }),
  );
  set("ps-bookings", d.total_bookings ?? "—");
  set("ps-pending", d.pending_payments ?? "—");
  set("ps-cancelled", d.cancelled_bookings ?? "—");
}

/* ─────────────────────────────────────────────
   3.  TABLE ROW TEMPLATE
───────────────────────────────────────────── */
function renderPayRow(p) {
  const statusColors = {
    completed: "var(--green)",
    pending: "var(--orange)",
    failed: "var(--red)",
    refunded: "var(--blue)",
    cancelled: "var(--text-dim)",
  };
  const bookingColors = {
    confirmed: "var(--green)",
    pending: "var(--orange)",
    cancelled: "var(--red)",
    completed: "var(--blue)",
  };
  const methodIcon = {
    card: "fa-credit-card",
    paypal: "fa-paypal",
    bank_transfer: "fa-building-columns",
    crypto: "fa-bitcoin-sign",
  };

  const pStatus = p.payment_status || "pending";
  const bStatus = p.booking_status || "pending";
  const icon = methodIcon[p.payment_method] || "fa-money-bill";
  const date = p.paid_at
    ? new Date(p.paid_at).toLocaleDateString("en-GB")
    : "—";
  const amount = "$" + Number(p.amount_paid || 0).toFixed(2);
  const guest = `${p.guest_fname || ""} ${p.guest_lname || ""}`.trim();

  return `
  <tr style="border-bottom:1px solid var(--border);transition:background .15s"
      onmouseover="this.style.background='var(--dark4)'"
      onmouseout="this.style.background='transparent'">
    <td style="padding:13px 16px;font-size:.82rem;color:var(--gold);font-weight:600;white-space:nowrap">
      ${p.invoice_number || "—"}
    </td>
    <td style="padding:13px 16px">
      <div style="font-size:.85rem;font-weight:600">${guest}</div>
      <div style="font-size:.76rem;color:var(--text-dim)">${p.guest_email || ""}</div>
    </td>
    <td style="padding:13px 16px">
      <div style="font-size:.85rem">${p.hotel_name || "—"}</div>
      <div style="font-size:.76rem;color:var(--text-dim)">${p.hotel_location || ""}</div>
    </td>
    <td style="padding:13px 16px">
      <span style="display:flex;align-items:center;gap:6px;font-size:.82rem">
        <i class="fa-solid ${icon}" style="color:var(--gold)"></i>
        ${(p.payment_method || "—").replace("_", " ")}
        ${p.card_last4 ? `<span style="color:var(--text-dim)">···${p.card_last4}</span>` : ""}
      </span>
    </td>
    <td style="padding:13px 16px;text-align:right;font-weight:700;font-size:.9rem">${amount}</td>
    <td style="padding:13px 16px;text-align:center">
      <span style="
        background:${statusColors[pStatus]}22;color:${statusColors[pStatus]};
        border:1px solid ${statusColors[pStatus]}55;
        border-radius:20px;padding:3px 10px;font-size:.76rem;font-weight:600">
        ${pStatus.charAt(0).toUpperCase() + pStatus.slice(1)}
      </span>
    </td>
    <td style="padding:13px 16px;text-align:center">
      <span style="
        background:${bookingColors[bStatus]}22;color:${bookingColors[bStatus]};
        border:1px solid ${bookingColors[bStatus]}55;
        border-radius:20px;padding:3px 10px;font-size:.76rem;font-weight:600">
        ${bStatus.charAt(0).toUpperCase() + bStatus.slice(1)}
      </span>
    </td>
    <td style="padding:13px 16px;text-align:center;font-size:.8rem;color:var(--text-dim);white-space:nowrap">
      ${date}
    </td>
    <td style="padding:13px 16px;text-align:center">
      <div style="display:flex;gap:6px;justify-content:center">
        <button title="View Invoice"
          onclick="openInvoiceModal('${p.invoice_number}')"
          style="width:30px;height:30px;border-radius:6px;border:1px solid var(--border);
                 background:var(--dark4);color:var(--gold);cursor:pointer;font-size:.8rem">
          <i class="fa-solid fa-file-invoice"></i>
        </button>
        ${bStatus !== "cancelled"
      ? `
        <button title="Cancel Booking"
          onclick="openCancelPayModal(${p.booking_id},'${p.invoice_number}')"
          style="width:30px;height:30px;border-radius:6px;border:1px solid rgba(224,84,84,.3);
                 background:rgba(224,84,84,.08);color:var(--red);cursor:pointer;font-size:.8rem">
          <i class="fa-solid fa-ban"></i>
        </button>`
      : ""
    }
      </div>
    </td>
  </tr>`;
}

/* ─────────────────────────────────────────────
   4.  INVOICE MODAL
───────────────────────────────────────────── */
async function openInvoiceModal(invoiceNumber) {
  const modal = document.getElementById("invoice-modal");
  const body = document.getElementById("invoice-body");
  const title = document.getElementById("inv-number-title");

  if (!modal || !body) return;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  if (title) title.textContent = invoiceNumber;
  body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-dim)">
    <i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem"></i>
    <p style="margin-top:12px">Loading invoice…</p></div>`;

  try {
    const res = await fetch(
      `${PAYMENT_API}?action=invoice&invoice=${encodeURIComponent(invoiceNumber)}`,
    );
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    currentInvoiceData = json.data;
    body.innerHTML = buildInvoiceHTML(json.data);
  } catch (err) {
    body.innerHTML = `<div style="text-align:center;padding:32px;color:var(--red)">❌ ${err.message}</div>`;
  }
}

function closeInvoiceModal() {
  const modal = document.getElementById("invoice-modal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
}

function buildInvoiceHTML(d) {
  const fmt = (v) => "$" + Number(v || 0).toFixed(2);
  const date = (s) =>
    s
      ? new Date(s).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—";

  const methodDetail =
    d.payment_method === "card"
      ? `Card ending ···${d.card_last4 || "****"} (${d.card_brand || ""})`
      : d.payment_method === "paypal"
        ? `PayPal – ${d.paypal_email || ""}`
        : d.payment_method === "bank_transfer"
          ? `Bank Transfer – Ref: ${d.bank_reference || ""}`
          : d.payment_method === "crypto"
            ? `Crypto – ${d.crypto_coin || ""}`
            : d.payment_method || "—";

  const statusColor = {
    completed: "#4caf7d",
    pending: "#e08c4c",
    cancelled: "#e05454",
    failed: "#e05454",
    refunded: "#4c82c9",
  };
  const pColor = statusColor[d.payment_status] || "#9e9080";
  const bColor = statusColor[d.booking_status] || "#9e9080";

  const iRow = (label, value, color) => `
    <div style="display:flex;justify-content:space-between;font-size:.84rem;padding:4px 0;color:${color || "var(--text)"}">
      <span style="color:var(--text-dim)">${label}</span>
      <span style="font-weight:500">${value}</span>
    </div>`;

  return `
  <div id="invoice-print-area" style="font-family:Outfit,sans-serif;color:#e8e0cf">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;gap:16px;flex-wrap:wrap">
      <div>
        <div style="font-family:Cinzel,serif;font-size:1.4rem;color:#c9a84c;margin-bottom:4px">🌴 Explore Sri Lanka</div>
        <div style="font-size:.8rem;color:#9e9080">Your journey, our passion</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:Cinzel,serif;font-size:1.1rem;color:#c9a84c">${d.invoice_number || "—"}</div>
        <div style="font-size:.78rem;color:#9e9080;margin-top:2px">Transaction: ${d.transaction_id || "—"}</div>
        <div style="font-size:.78rem;color:#9e9080">Issued: ${date(d.paid_at || d.created_at)}</div>
      </div>
    </div>

    <hr style="border:none;border-top:1px solid rgba(201,168,76,.2);margin-bottom:20px">

    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <span style="background:${pColor}22;color:${pColor};border:1px solid ${pColor}55;border-radius:20px;padding:4px 12px;font-size:.78rem;font-weight:600">
        Payment: ${(d.payment_status || "—").toUpperCase()}
      </span>
      <span style="background:${bColor}22;color:${bColor};border:1px solid ${bColor}55;border-radius:20px;padding:4px 12px;font-size:.78rem;font-weight:600">
        Booking: ${(d.booking_status || "—").toUpperCase()}
      </span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div style="background:#1c1c1c;border:1px solid rgba(201,168,76,.15);border-radius:10px;padding:16px">
        <div style="font-size:.72rem;text-transform:uppercase;color:#9e9080;letter-spacing:.08em;margin-bottom:10px">Customer Details</div>
        <div style="font-weight:600;font-size:.95rem;margin-bottom:4px">${d.guest_fname} ${d.guest_lname}</div>
        <div style="font-size:.82rem;color:#9e9080">${d.guest_email || "—"}</div>
        <div style="font-size:.82rem;color:#9e9080">${d.guest_phone || "—"}</div>
      </div>
      <div style="background:#1c1c1c;border:1px solid rgba(201,168,76,.15);border-radius:10px;padding:16px">
        <div style="font-size:.72rem;text-transform:uppercase;color:#9e9080;letter-spacing:.08em;margin-bottom:10px">Stay Details</div>
        <div style="font-weight:600;font-size:.95rem;margin-bottom:4px">${d.hotel_name || "—"}</div>
        <div style="font-size:.82rem;color:#9e9080">${d.hotel_location || ""}</div>
        <div style="font-size:.82rem;color:#9e9080;margin-top:4px">${date(d.checkin_date)} → ${date(d.checkout_date)}</div>
        <div style="font-size:.8rem;color:#9e9080">${d.num_nights} night(s) · ${d.num_rooms} room(s) · ${d.num_guests} guest(s)</div>
      </div>
    </div>

    <div style="background:#1c1c1c;border:1px solid rgba(201,168,76,.15);border-radius:10px;padding:16px;margin-bottom:20px">
      <div style="font-size:.72rem;text-transform:uppercase;color:#9e9080;letter-spacing:.08em;margin-bottom:12px">Price Breakdown</div>
      ${iRow("Room Rate", fmt(d.room_rate) + " × " + d.num_nights + " nights × " + d.num_rooms + " room(s)")}
      ${iRow("Subtotal", fmt(d.subtotal))}
      ${Number(d.discount_amount) > 0 ? iRow("Discount" + (d.discount_code ? ` (${d.discount_code})` : ""), "−" + fmt(d.discount_amount), "#4caf7d") : ""}
      ${iRow("Tax (12%)", fmt(d.tax_amount))}
      <hr style="border:none;border-top:1px solid rgba(201,168,76,.15);margin:10px 0">
      <div style="display:flex;justify-content:space-between;font-size:1rem;font-weight:700;color:#c9a84c">
        <span>Total Paid</span><span>${fmt(d.total_amount)}</span>
      </div>
    </div>

    <div style="background:#1c1c1c;border:1px solid rgba(201,168,76,.15);border-radius:10px;padding:14px 16px">
      <div style="font-size:.72rem;text-transform:uppercase;color:#9e9080;letter-spacing:.08em;margin-bottom:8px">Payment Method</div>
      <div style="font-size:.88rem">${methodDetail}</div>
    </div>

    ${d.cancel_reason
      ? `
    <div style="background:rgba(224,84,84,.07);border:1px solid rgba(224,84,84,.25);border-radius:10px;padding:14px 16px;margin-top:16px">
      <div style="font-size:.72rem;text-transform:uppercase;color:#e05454;letter-spacing:.08em;margin-bottom:6px">Cancellation Reason</div>
      <div style="font-size:.88rem;color:#c08080">${d.cancel_reason}</div>
    </div>`
      : ""
    }
  </div>`;
}

/* ─────────────────────────────────────────────
   5.  PDF DOWNLOAD
───────────────────────────────────────────── */
function downloadInvoicePDF() {
  if (!currentInvoiceData) {
    alert("Invoice data not loaded yet.");
    return;
  }

  const d = currentInvoiceData;
  const inv = d.invoice_number || "invoice";
  const fmt = (v) => "$" + Number(v || 0).toFixed(2);
  const date = (s) =>
    s
      ? new Date(s).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—";

  const methodDetail =
    d.payment_method === "card"
      ? `Card ending ···${d.card_last4 || "****"} (${d.card_brand || ""})`
      : d.payment_method === "paypal"
        ? `PayPal – ${d.paypal_email || ""}`
        : d.payment_method === "bank_transfer"
          ? `Bank Transfer – Ref: ${d.bank_reference || ""}`
          : d.payment_method === "crypto"
            ? `Crypto – ${d.crypto_coin || ""}`
            : d.payment_method || "—";

  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${inv}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Outfit',sans-serif;background:#fff;color:#1a1a1a;padding:40px;max-width:750px;margin:0 auto}
    @media print{body{padding:20px}button{display:none!important}}
  </style>
</head>
<body>
  <div style="border-bottom:3px solid #c9a84c;padding-bottom:20px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="font-family:'Cinzel',serif;font-size:1.6rem;color:#c9a84c">🌴 Explore Sri Lanka</div>
      <div style="font-size:.85rem;color:#888;margin-top:2px">Your journey, our passion</div>
    </div>
    <div style="text-align:right">
      <div style="font-family:'Cinzel',serif;font-size:1.1rem;color:#c9a84c">${inv}</div>
      <div style="font-size:.78rem;color:#888">Issued: ${date(d.paid_at || d.created_at)}</div>
      <div style="font-size:.78rem;color:#888">Txn: ${d.transaction_id || "—"}</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
    <div style="border:1px solid #eee;border-radius:8px;padding:14px">
      <div style="font-size:.7rem;text-transform:uppercase;color:#888;margin-bottom:8px;letter-spacing:.08em">Customer</div>
      <div style="font-weight:700;font-size:.95rem">${d.guest_fname} ${d.guest_lname}</div>
      <div style="font-size:.82rem;color:#555">${d.guest_email}</div>
      <div style="font-size:.82rem;color:#555">${d.guest_phone || "—"}</div>
    </div>
    <div style="border:1px solid #eee;border-radius:8px;padding:14px">
      <div style="font-size:.7rem;text-transform:uppercase;color:#888;margin-bottom:8px;letter-spacing:.08em">Stay</div>
      <div style="font-weight:700;font-size:.95rem">${d.hotel_name}</div>
      <div style="font-size:.82rem;color:#555">${d.hotel_location || ""}</div>
      <div style="font-size:.82rem;color:#555">${date(d.checkin_date)} → ${date(d.checkout_date)}</div>
      <div style="font-size:.8rem;color:#555">${d.num_nights} night(s) · ${d.num_rooms} room(s) · ${d.num_guests} guest(s)</div>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:.88rem">
    <thead>
      <tr style="background:#f9f4e8;border-bottom:2px solid #c9a84c">
        <th style="padding:10px 12px;text-align:left;color:#7a6020">Description</th>
        <th style="padding:10px 12px;text-align:right;color:#7a6020">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom:1px solid #f0e8d4">
        <td style="padding:10px 12px">Room Rate (${fmt(d.room_rate)}/night × ${d.num_nights} nights × ${d.num_rooms} room(s))</td>
        <td style="padding:10px 12px;text-align:right">${fmt(d.subtotal)}</td>
      </tr>
      ${Number(d.discount_amount) > 0
      ? `
      <tr style="border-bottom:1px solid #f0e8d4">
        <td style="padding:10px 12px;color:#2e7d52">Discount${d.discount_code ? " (" + d.discount_code + ")" : ""}</td>
        <td style="padding:10px 12px;text-align:right;color:#2e7d52">−${fmt(d.discount_amount)}</td>
      </tr>`
      : ""
    }
      <tr style="border-bottom:1px solid #f0e8d4">
        <td style="padding:10px 12px">Tax (12%)</td>
        <td style="padding:10px 12px;text-align:right">${fmt(d.tax_amount)}</td>
      </tr>
      <tr style="background:#f9f4e8">
        <td style="padding:12px;font-weight:700;color:#7a6020">TOTAL PAID</td>
        <td style="padding:12px;text-align:right;font-weight:700;font-size:1.05rem;color:#c9a84c">${fmt(d.total_amount)}</td>
      </tr>
    </tbody>
  </table>

  <div style="border:1px solid #eee;border-radius:8px;padding:14px;margin-bottom:16px;font-size:.85rem">
    <div style="font-size:.7rem;text-transform:uppercase;color:#888;margin-bottom:6px;letter-spacing:.08em">Payment Method</div>
    ${methodDetail}
  </div>

  <div style="display:flex;gap:12px;margin-bottom:16px">
    <span style="background:#e8f5ee;color:#2e7d52;border:1px solid #a8d5b8;border-radius:20px;padding:4px 12px;font-size:.78rem;font-weight:600">
      Payment: ${(d.payment_status || "—").toUpperCase()}
    </span>
    <span style="background:#e8f5ee;color:#2e7d52;border:1px solid #a8d5b8;border-radius:20px;padding:4px 12px;font-size:.78rem;font-weight:600">
      Booking: ${(d.booking_status || "—").toUpperCase()}
    </span>
  </div>

  ${d.cancel_reason
      ? `
  <div style="background:#fdf0f0;border:1px solid #f5c6c6;border-radius:8px;padding:12px;font-size:.85rem;margin-bottom:16px">
    <div style="font-size:.7rem;text-transform:uppercase;color:#c0392b;margin-bottom:4px">Cancellation Reason</div>
    <div>${d.cancel_reason}</div>
  </div>`
      : ""
    }

  <div style="margin-top:32px;text-align:center;font-size:.75rem;color:#aaa;border-top:1px solid #eee;padding-top:14px">
    Explore Sri Lanka · finalunip@gmail.com · +94 77 123 4567<br>
    123 Galle Road, Colombo 03, Sri Lanka
  </div>

  <br>
  <button onclick="window.print()" style="margin-top:20px;padding:10px 24px;background:#c9a84c;color:#0d0d0d;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:Outfit,sans-serif">
    🖨 Print / Save as PDF
  </button>
</body></html>`);
  win.document.close();
}

/* ─────────────────────────────────────────────
   6.  CANCEL BOOKING MODAL (Admin)
───────────────────────────────────────────── */
function openCancelPayModal(bookingId, invoiceNumber) {
  currentCancelBookingId = bookingId;
  currentCancelInvoice = invoiceNumber;

  const label = document.getElementById("cancel-pay-invoice-label");
  if (label) label.textContent = invoiceNumber || "—";

  const reason = document.getElementById("cancel-pay-reason");
  if (reason) reason.value = "";

  const modal = document.getElementById("pay-cancel-modal");
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

function closeCancelPayModal() {
  const modal = document.getElementById("pay-cancel-modal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
  currentCancelBookingId = null;
  currentCancelInvoice = null;
}

async function confirmCancelPay() {
  if (!currentCancelBookingId) return;

  const reason =
    (document.getElementById("cancel-pay-reason")?.value || "").trim() ||
    "Cancelled by admin";
  const btn = document.querySelector(
    "#pay-cancel-modal button[onclick='confirmCancelPay()']",
  );
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cancelling…';
  }

  try {
    const res = await fetch(`${PAYMENT_API}?action=cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel",
        booking_id: currentCancelBookingId,
        reason,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    closeCancelPayModal();
    if (typeof showToast === "function")
      showToast("Booking cancelled successfully", "success");
    loadPayments(payCurrentPage);
  } catch (err) {
    if (typeof showToast === "function")
      showToast("Cancel failed: " + err.message, "error");
    console.error("confirmCancelPay:", err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-ban"></i> Yes, Cancel';
    }
  }
}

/* ─────────────────────────────────────────────
   7.  EXPORT CSV
───────────────────────────────────────────── */
async function exportPaymentsCSV() {
  try {
    if (typeof showToast === "function")
      showToast("Preparing CSV export…", "info");

    const res = await fetch(`${PAYMENT_API}?action=list&limit=1000`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const items = json.data.items;
    if (!items.length) {
      if (typeof showToast === "function")
        showToast("No data to export", "error");
      return;
    }

    const cols = [
      "invoice_number",
      "guest_fname",
      "guest_lname",
      "guest_email",
      "guest_phone",
      "hotel_name",
      "hotel_location",
      "checkin_date",
      "checkout_date",
      "num_nights",
      "num_rooms",
      "num_guests",
      "room_rate",
      "subtotal",
      "discount_code",
      "discount_amount",
      "tax_amount",
      "total_amount",
      "payment_method",
      "card_last4",
      "card_brand",
      "paypal_email",
      "bank_reference",
      "crypto_coin",
      "transaction_id",
      "payment_status",
      "booking_status",
      "paid_at",
      "created_at",
    ];

    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [cols.join(",")];
    items.forEach((p) => rows.push(cols.map((c) => esc(p[c])).join(",")));

    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (typeof showToast === "function") showToast("CSV exported!", "success");
  } catch (err) {
    if (typeof showToast === "function")
      showToast("Export failed: " + err.message, "error");
    console.error("exportPaymentsCSV:", err);
  }
}

/* ─────────────────────────────────────────────
   8.  AUTO-LOAD when Payments tab is opened
───────────────────────────────────────────── */
(function patchShowPageForPayments() {
  const _orig = window.showPage;
  window.showPage = function (page, el) {
    if (typeof _orig === "function") _orig(page, el);
    if (page === "payments") loadPayments(1);
  };
})();

/* ══════════════════════════════════════════════════════════════
   GALLERY — DB Connected  (php/gallery_api.php)
   - loadGallery()        : fetch from DB & render cards
   - setGalleryFilter()   : category filter tabs
   - openGalleryModal()   : lightbox / detail view
   - closeGalleryModal()  : close lightbox
══════════════════════════════════════════════════════════════ */

const GALLERY_API = window.location.pathname.includes("/pages/")
  ? "../php/gallery_api.php"
  : "php/gallery_api.php";
let galleryData = []; // full dataset
let galleryFilter = "all"; // active category

/* ── Category config ─────────────────────────────────────────── */
const galleryCatEmoji = {
  general: "🖼️",
  nature: "🌿",
  beach: "🌊",
  heritage: "🏛️",
  wildlife: "🐆",
  food: "🍛",
  festival: "🎉",
};

/* ── Load & render ───────────────────────────────────────────── */
async function loadGallery() {
  const grid = document.getElementById("galleryDbGrid");
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;"></i>
      <p style="margin-top:12px;">Loading gallery...</p>
    </div>`;

  try {
    const res = await fetch(GALLERY_API);
    const rows = await res.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;">
          <i class="fa-solid fa-images" style="font-size:2rem;"></i>
          <p style="margin-top:12px;">No gallery images found.</p>
        </div>`;
      return;
    }

    galleryData = rows;
    renderGalleryCards(rows);
  } catch (err) {
    console.error("Gallery API error:", err);
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#e74c3c;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;"></i>
        <p>Failed to load gallery. Check gallery_api.php.</p>
      </div>`;
  }
}

/* ── Render cards ────────────────────────────────────────────── */
function renderGalleryCards(rows) {
  const grid = document.getElementById("galleryDbGrid");
  const noRes = document.getElementById("galleryNoResults");
  if (!grid) return;

  const filtered =
    galleryFilter === "all"
      ? rows
      : rows.filter((r) => (r.category || "general") === galleryFilter);

  if (noRes) noRes.style.display = filtered.length === 0 ? "block" : "none";

  if (filtered.length === 0) {
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = filtered
    .map((img, i) => {
      const cat = img.category || "general";
      const emoji = galleryCatEmoji[cat] || "🖼️";
      const cap = img.caption || "";
      const loc = img.location || "";
      return `
      <div class="gallery-item db-gallery-item" onclick="openGalleryModal(${img.id})" title="${img.title}">
        <img src="${img.image}" alt="${img.alt_text || img.title}"
             onerror="this.src='https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80'">
        <div class="gallery-item-overlay">
          <span class="gallery-cat-badge">${emoji} ${cap || cat}</span>
          ${loc ? `<div class="gallery-loc"><i class="fa-solid fa-location-dot"></i> ${loc}</div>` : ""}
        </div>
        <span>${img.title}</span>
      </div>`;
    })
    .join("");
}

/* ── Filter tabs ─────────────────────────────────────────────── */
function setGalleryFilter(btn, cat) {
  document
    .querySelectorAll(".gallery-filter-tabs .gal-tab")
    .forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  galleryFilter = cat;
  renderGalleryCards(galleryData);
}

/* ── Lightbox modal ──────────────────────────────────────────── */
function openGalleryModal(id) {
  const img = galleryData.find((r) => r.id == id);
  if (!img) return;

  document.getElementById("galModalImg").src = img.image;
  document.getElementById("galModalImg").alt = img.alt_text || img.title;
  document.getElementById("galModalTitle").textContent = img.title;
  document.getElementById("galModalCaption").textContent = img.caption || "";
  document.getElementById("galModalLocation").textContent = img.location || "";
  document.getElementById("galModalCat").textContent =
    (galleryCatEmoji[img.category] || "🖼️") + " " + (img.category || "general");

  const overlay = document.getElementById("galleryModal");
  if (overlay) {
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

function closeGalleryModal(e) {
  if (e && e.target !== document.getElementById("galleryModal")) return;
  closeGalleryModalBtn();
}

function closeGalleryModalBtn() {
  const overlay = document.getElementById("galleryModal");
  if (overlay) overlay.classList.remove("open");
  document.body.style.overflow = "";
}

/* ── Auto-load when gallery page opens (hook into loadPage) ──── */
(function () {
  var _prevLoadPage = window.loadPage;
  window.loadPage = function (name) {
    if (typeof _prevLoadPage === "function") _prevLoadPage(name);
    if (name === "gallery") loadGallery();
  };
})();

/* Escape key closes gallery modal */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeGalleryModalBtn();
});

/* ══════════════════════════════════════════════════════════════
   ADMIN GALLERY MANAGEMENT  (admin.html — DB connected)
   Uses: ../php/gallery_api.php
   Functions exposed globally so admin.html inline calls work.
══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const ADMIN_GAL_API = "../php/gallery_api.php";

  const VALID_CATS = [
    "general",
    "nature",
    "beach",
    "heritage",
    "wildlife",
    "food",
    "festival",
  ];
  const CAT_EMOJI = {
    general: "🖼️",
    nature: "🌿",
    beach: "🌊",
    heritage: "🏛️",
    wildlife: "🐆",
    food: "🍛",
    festival: "🎉",
  };

  let _galData = []; // full dataset from DB
  let _galFilter = "all";
  let _galSearch = "";
  let _galEditId = null; // null = add, number = edit
  let _galPage = 1;
  const GAL_PER_PAGE = 24;

  /* ── Helpers ──────────────────────────────────────────────── */
  function escH(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function toast(msg, type) {
    if (typeof showToast === "function") showToast(msg, type || "info");
  }
  function confirm_(title, msg, cb) {
    if (typeof showConfirm === "function") showConfirm(title, msg, cb);
    else if (window.confirm(msg)) cb();
  }

  /* ── Load from DB ─────────────────────────────────────────── */
  async function loadGalleryAdmin() {
    const grid = document.getElementById("gallery-grid-admin");
    if (!grid) return;
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:50px;color:#888"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.8rem"></i><p style="margin-top:10px">Loading gallery...</p></div>`;
    try {
      const res = await fetch(ADMIN_GAL_API);
      const rows = await res.json();
      _galData = Array.isArray(rows) ? rows : [];
      _galPage = 1;
      renderGalleryAdmin();
      updateGalStats();
    } catch (e) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:50px;color:#e05454"><i class="fa-solid fa-triangle-exclamation" style="font-size:1.8rem"></i><p style="margin-top:10px">Failed to load gallery. Check gallery_api.php.</p></div>`;
    }
  }

  /* ── Render cards ─────────────────────────────────────────── */
  function renderGalleryAdmin() {
    const grid = document.getElementById("gallery-grid-admin");
    const empty = document.getElementById("gal-admin-empty");
    const info = document.getElementById("gal-pag-info");
    if (!grid) return;

    const q = _galSearch.trim().toLowerCase();
    let filtered = _galData.filter((r) => {
      const catOk =
        _galFilter === "all" || (r.category || "general") === _galFilter;
      const srchOk =
        !q ||
        (r.title || "").toLowerCase().includes(q) ||
        (r.location || "").toLowerCase().includes(q);
      return catOk && srchOk;
    });

    const total = filtered.length;
    const start = (_galPage - 1) * GAL_PER_PAGE;
    const page = filtered.slice(start, start + GAL_PER_PAGE);

    if (info)
      info.textContent = `Showing ${page.length} of ${total} image${total !== 1 ? "s" : ""}`;

    if (page.length === 0) {
      grid.innerHTML = "";
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";

    grid.innerHTML = page
      .map((r) => {
        const cat = r.category || "general";
        const emoji = CAT_EMOJI[cat] || "🖼️";
        const imgSrc = escH(r.image || "");
        return `
      <div class="gal-admin-card" onclick="openGalAdminModal(${r.id})">
        <img src="../${imgSrc}" alt="${escH(r.title)}" onerror="this.src='https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80'">
        <div class="gal-sort-badge">#${r.sort_order || 0}</div>
        <div class="gal-admin-actions" onclick="event.stopPropagation()">
          <button class="gal-admin-act-btn gal-act-edit" onclick="openGalAdminModal(${r.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="gal-admin-act-btn gal-act-del"  onclick="deleteGalImage(${r.id})"    title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div class="gal-admin-card-body">
          <div class="gal-admin-card-title">${escH(r.title)}</div>
          <div class="gal-admin-card-meta">
            <span class="gal-admin-cat-tag">${emoji} ${cat}</span>
            ${r.location ? `<span><i class="fa-solid fa-location-dot" style="font-size:.6rem;color:#c9a84c"></i> ${escH(r.location)}</span>` : ""}
          </div>
        </div>
      </div>`;
      })
      .join("");
  }

  /* ── Stats ────────────────────────────────────────────────── */
  function updateGalStats() {
    const el = (id) => document.getElementById(id);
    if (el("gal-stat-total"))
      el("gal-stat-total").textContent = _galData.length;
    if (el("gal-stat-nature"))
      el("gal-stat-nature").textContent = _galData.filter(
        (r) => (r.category || "general") === "nature",
      ).length;
    if (el("gal-stat-beach"))
      el("gal-stat-beach").textContent = _galData.filter(
        (r) => (r.category || "general") === "beach",
      ).length;
    if (el("gal-stat-heritage"))
      el("gal-stat-heritage").textContent = _galData.filter(
        (r) => (r.category || "general") === "heritage",
      ).length;
  }

  /* ── Filter / search ──────────────────────────────────────── */
  window.setGalAdminCat = function (el, cat) {
    document
      .querySelectorAll(".gal-cat-pill")
      .forEach((b) => b.classList.remove("active"));
    el.classList.add("active");
    _galFilter = cat;
    _galPage = 1;
    renderGalleryAdmin();
  };

  window.searchGalAdmin = function (val) {
    _galSearch = val;
    _galPage = 1;
    renderGalleryAdmin();
  };

  /* ── Open Add / Edit modal ────────────────────────────────── */
  window.openGalAdminModal = function (id) {
    _galEditId = id || null;
    const titleEl = document.getElementById("gal-modal-title");
    const preview = document.getElementById("gal-img-preview");
    const ph = document.getElementById("gal-img-placeholder");
    const fileInput = document.getElementById("gal-file-input");

    // Reset file input
    if (fileInput) fileInput.value = "";

    if (id) {
      const r = _galData.find((x) => x.id == id);
      if (!r) return;
      if (titleEl) titleEl.textContent = "Edit Gallery Image";
      _setV("gal-title", r.title || "");
      _setV("gal-caption", r.caption || "");
      _setV("gal-location", r.location || "");
      _setV("gal-category", r.category || "general");
      _setV("gal-sort", r.sort_order ?? 0);
      _setV("gal-img-path", r.image || "");
      // Show existing image preview
      if (preview && ph) {
        preview.src = "../" + (r.image || "");
        preview.className = "visible";
        ph.style.display = "none";
      }
    } else {
      if (titleEl) titleEl.textContent = "Upload Gallery Image";
      ["gal-title", "gal-caption", "gal-location", "gal-img-path"].forEach(
        (i) => _setV(i, ""),
      );
      _setV("gal-category", "general");
      _setV("gal-sort", 0);
      if (preview && ph) {
        preview.src = "";
        preview.className = "";
        ph.style.display = "";
      }
    }
    if (typeof openModal === "function") openModal("gallery-modal");
  };

  function _setV(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  /* ── File picker preview ──────────────────────────────────── */
  window.galPickFile = function () {
    const fi = document.getElementById("gal-file-input");
    if (fi) fi.click();
  };

  window.galFileChosen = function (input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const preview = document.getElementById("gal-img-preview");
    const ph = document.getElementById("gal-img-placeholder");
    const reader = new FileReader();
    reader.onload = (e) => {
      if (preview) {
        preview.src = e.target.result;
        preview.className = "visible";
      }
      if (ph) ph.style.display = "none";
    };
    reader.readAsDataURL(file);
    // Auto-fill title from filename if empty
    const titleEl = document.getElementById("gal-title");
    if (titleEl && !titleEl.value.trim()) {
      titleEl.value = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    }
  };

  /* ── Save (POST / PUT) ────────────────────────────────────── */
  window.saveGalImage = async function () {
    const title = (document.getElementById("gal-title")?.value || "").trim();
    const caption = (
      document.getElementById("gal-caption")?.value || ""
    ).trim();
    const location = (
      document.getElementById("gal-location")?.value || ""
    ).trim();
    const category =
      document.getElementById("gal-category")?.value || "general";
    const sortOrder = parseInt(document.getElementById("gal-sort")?.value) || 0;
    const imgPath = (
      document.getElementById("gal-img-path")?.value || ""
    ).trim();
    const fileInput = document.getElementById("gal-file-input");
    const hasFile = fileInput && fileInput.files && fileInput.files[0];

    if (!title) {
      toast("Title is required", "error");
      return;
    }
    if (!hasFile && !imgPath && !_galEditId) {
      toast("Please upload an image or enter an image path", "error");
      return;
    }

    try {
      let url, method, body, headers;

      if (hasFile) {
        // Multipart upload
        const fd = new FormData();
        fd.append("image", fileInput.files[0]);
        fd.append("title", title);
        fd.append("caption", caption);
        fd.append("location", location);
        fd.append("category", category);
        fd.append("sort_order", sortOrder);
        if (_galEditId) {
          url = ADMIN_GAL_API + "?id=" + _galEditId + "&_method=PUT";
          method = "POST";
        } else {
          url = ADMIN_GAL_API;
          method = "POST";
        }
        body = fd;
        headers = {}; // browser sets multipart boundary
      } else {
        // JSON (path only)
        const payload = {
          title,
          caption,
          location,
          category,
          sort_order: sortOrder,
        };
        if (imgPath) payload.image = imgPath;
        if (_galEditId) {
          url = ADMIN_GAL_API + "?id=" + _galEditId + "&_method=PUT";
          method = "POST";
        } else {
          url = ADMIN_GAL_API;
          method = "POST";
          payload.image = imgPath;
        }
        body = JSON.stringify(payload);
        headers = { "Content-Type": "application/json" };
      }

      const res = await fetch(url, { method, headers, body });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        toast(
          "Server error: " +
          txt
            .replace(/<[^>]+>/g, "")
            .trim()
            .substring(0, 120),
          "error",
        );
        return;
      }
      const data = await res.json();
      if (data.success || data.id) {
        toast(_galEditId ? "Image updated!" : "Image uploaded!", "success");
        if (typeof closeModal === "function") closeModal("gallery-modal");
        await loadGalleryAdmin();
      } else {
        toast("Save failed: " + (data.error || "Unknown error"), "error");
      }
    } catch (e) {
      toast("Network error: " + e.message, "error");
    }
  };

  /* ── Delete ───────────────────────────────────────────────── */
  window.deleteGalImage = function (id) {
    const r = _galData.find((x) => x.id == id);
    confirm_(
      "Delete Image",
      'Delete "' + (r ? r.title : "this image") + '"? This cannot be undone.',
      async function () {
        try {
          const res = await fetch(
            ADMIN_GAL_API + "?id=" + id + "&_method=DELETE",
            { method: "POST" },
          );
          const data = await res.json();
          if (data.success) {
            toast("Image deleted", "success");
            loadGalleryAdmin();
          } else toast("Delete failed: " + (data.error || ""), "error");
        } catch (e) {
          toast("Server error", "error");
        }
      },
    );
  };

  /* ── Expose loadGalleryAdmin globally ─────────────────────── */
  window.loadGalleryAdmin = loadGalleryAdmin;

  /* ── Patch renderGallery so admin renderAll() works ── */
  window.renderGallery = function () {
    loadGalleryAdmin();
  };
})();
