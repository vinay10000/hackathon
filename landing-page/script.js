/* =================================================================
   HabitAI Landing — Interactions
   - Theme toggle with localStorage persistence
   - Sticky nav shadow on scroll
   - Mobile menu
   - Smooth scroll for in-page anchors
   - IntersectionObserver reveal animations
   - Footer year
   ================================================================= */

(() => {
  const root = document.documentElement;
  const STORAGE_KEY = "habitai-theme";

  /* ---------------- Theme ---------------- */
  const getStoredTheme = () => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  };
  const setStoredTheme = (value) => {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* ignore */ }
  };

  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "light" ? "#fafafa" : "#0a0a0b");
    }
  };

  const initialTheme = getStoredTheme() || root.getAttribute("data-theme") || "dark";
  applyTheme(initialTheme);

  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      setStoredTheme(next);
    });
  }

  /* ---------------- Nav scroll state ---------------- */
  const nav = document.getElementById("nav");
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 8) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------- Mobile menu ---------------- */
  const burger = document.getElementById("navBurger");
  const mobileMenu = document.getElementById("mobileMenu");
  if (burger && mobileMenu) {
    const setOpen = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open) mobileMenu.removeAttribute("hidden");
      else mobileMenu.setAttribute("hidden", "");
    };
    setOpen(false);

    burger.addEventListener("click", () => {
      const open = burger.getAttribute("aria-expanded") === "true";
      setOpen(!open);
    });

    mobileMenu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => setOpen(false));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* ---------------- Reveal on scroll ---------------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = entry.target.getAttribute("data-delay");
            if (delay) {
              entry.target.style.transitionDelay = `${delay}ms`;
            }
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------------- Footer year ---------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
