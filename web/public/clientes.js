// ============================================================
// clientes.js — Panel de clientes (solicitudes del formulario)
//  · LIVE: lee la tabla "leads" de Supabase (solo autenticados).
//  · DEMO: lee los guardados en este navegador (localStorage).
// Filtros: nombre, rango de fechas e interés (caldera/aire/otros).
// ============================================================
(function () {
  "use strict";

  var cfg = window.DECOGAS_CONFIG || {};
  var LIVE = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  var sb = LIVE ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  var $ = function (id) { return document.getElementById(id); };
  var esc = window.DecogasUtil.esc;
  var norm = window.DecogasUtil.norm;

  var LEADS = [];
  var FILTER = { name: "", from: null, to: null, interest: "" };

  var toastTimer;
  function toast(text, isErr) {
    var t = $("toast");
    t.textContent = text;
    t.className = isErr ? "err show" : "show";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  // ---------- Sesión compartida entre paneles ----------
  if (LIVE) {
    sb.auth.getSession().then(function (res) {
      if (res.data && res.data.session) {
        $("loginScreen").classList.add("hidden");
        $("panel").style.display = "block";
        loadLeads();
      }
    }).catch(function () {
      // Sin red no podemos recuperar la sesión: dejamos la pantalla de login.
    });
  }

  // ---------- Login (mismo usuario que el panel de catálogo) ----------
  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = $("loginMsg");
    msg.classList.remove("show");
    $("loginBtn").disabled = true;
    var enter = function () {
      $("loginScreen").classList.add("hidden");
      $("panel").style.display = "block";
      loadLeads();
    };
    if (!LIVE) { enter(); $("loginBtn").disabled = false; return; }
    sb.auth.signInWithPassword({ email: $("adminEmail").value.trim(), password: $("adminPass").value })
      .then(function (res) {
        $("loginBtn").disabled = false;
        if (res.error) { msg.textContent = "Credenciales incorrectas."; msg.classList.add("show"); return; }
        enter();
      })
      .catch(function () {
        // Fallo de red: rehabilitamos el botón y avisamos en lugar de dejarlo colgado.
        $("loginBtn").disabled = false;
        msg.textContent = "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.";
        msg.classList.add("show");
      });
  });
  $("logoutBtn").addEventListener("click", function () {
    if (LIVE && sb) sb.auth.signOut();
    location.reload();
  });

  // ---------- Carga ----------
  function normalizeLead(r) {
    return {
      id: r.id || null,
      created_at: r.created_at || new Date().toISOString(),
      name: String(r.name || ""), phone: String(r.phone || ""),
      email: String(r.email || ""), interest: String(r.interest || ""),
      message: String(r.message || "")
    };
  }
  function loadLeads() {
    if (LIVE) {
      sb.from("leads").select("*").order("created_at", { ascending: false }).then(function (res) {
        if (res.error) {
          toast("Error leyendo clientes: " + res.error.message + " — ¿ejecutaste setup-supabase-v4.sql?", true);
          LEADS = [];
        } else {
          LEADS = (res.data || []).map(normalizeLead);
        }
        render();
      });
    } else {
      try { LEADS = JSON.parse(localStorage.getItem("decogas_leads") || "[]").map(normalizeLead); }
      catch (e) { LEADS = []; }
      render();
    }
  }

  // ---------- Clasificación de interés ----------
  function interestGroup(interest) {
    var t = norm(interest);
    if (t.indexOf("caldera") !== -1) return "caldera";
    if (t.indexOf("aire") !== -1) return "aire";
    return "otro";
  }
  function badgeHTML(interest) {
    var g = interestGroup(interest);
    var cls = g === "caldera" ? "caldera" : g === "aire" ? "aire" : "otro";
    return '<span class="badge ' + cls + '">' + esc(interest || "Consulta") + "</span>";
  }

  // ---------- Filtros ----------
  function filtered() {
    return LEADS.filter(function (l) {
      if (FILTER.name && norm(l.name).indexOf(FILTER.name) === -1) return false;
      var d = new Date(l.created_at);
      if (FILTER.from && d < FILTER.from) return false;
      if (FILTER.to) {
        var end = new Date(FILTER.to);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      if (FILTER.interest && interestGroup(l.interest) !== FILTER.interest) return false;
      return true;
    });
  }

  // ---------- Render ----------
  function fmtDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  function render() {
    var list = filtered();
    // Estadísticas
    $("statTotal").textContent = LEADS.length;
    var now = new Date();
    $("statMes").textContent = LEADS.filter(function (l) {
      var d = new Date(l.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    $("statFiltered").textContent = list.length;

    var box = $("leadsList");
    if (!list.length) {
      box.innerHTML = '<div class="empty-state">' +
        (LEADS.length ? "Ningún cliente coincide con los filtros actuales." :
          "Todavía no hay clientes. En cuanto alguien envíe el formulario de la web, aparecerá aquí.") +
        "</div>";
      return;
    }
    box.innerHTML = list.map(function (l, i) {
      return '<div class="lead" style="animation-delay:' + Math.min(i * 40, 400) + 'ms;">' +
        '<div class="lead-top">' +
          '<div class="lead-name">' + esc(l.name) + "</div>" +
          badgeHTML(l.interest) +
          '<span class="lead-date">' + fmtDate(l.created_at) + "</span>" +
          (l.id ? '<button class="lead-del" data-id="' + esc(l.id) + '" type="button">Eliminar</button>' : "") +
        "</div>" +
        '<div class="lead-contact">' +
          (l.phone ? '<a href="tel:' + esc(l.phone.replace(/\s/g, "")) + '"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' + esc(l.phone) + "</a>" : "") +
          (l.email ? '<a href="mailto:' + esc(l.email) + '"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>' + esc(l.email) + "</a>" : "") +
        "</div>" +
        (l.message ? '<div class="lead-msg">' + esc(l.message) + "</div>" : "") +
      "</div>";
    }).join("");
  }

  // ---------- Controles ----------
  var debounce;
  $("qName").addEventListener("input", function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      FILTER.name = norm($("qName").value.trim());
      render();
    }, 150);
  });
  $("qFrom").addEventListener("change", function () {
    FILTER.from = this.value ? new Date(this.value) : null;
    render();
  });
  $("qTo").addEventListener("change", function () {
    FILTER.to = this.value ? new Date(this.value) : null;
    render();
  });
  $("interestChips").addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    $("interestChips").querySelectorAll(".chip").forEach(function (c) { c.classList.remove("active"); });
    chip.classList.add("active");
    FILTER.interest = chip.dataset.int;
    render();
  });

  // Borrado (solo LIVE con id)
  document.addEventListener("click", function (e) {
    var del = e.target.closest(".lead-del");
    if (!del) return;
    if (!window.confirm("¿Eliminar este cliente de la lista? Esta acción no se puede deshacer.")) return;
    var id = del.dataset.id;
    if (LIVE) {
      sb.from("leads").delete().eq("id", id).then(function (res) {
        if (res.error) { toast("Error: " + res.error.message, true); return; }
        LEADS = LEADS.filter(function (l) { return String(l.id) !== String(id); });
        render();
        toast("Cliente eliminado.");
      });
    }
  });
})();
