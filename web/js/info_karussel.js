(function () {
  function el(tag, className, attrs) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") n.textContent = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    return n;
  }

  function chunk(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function escapeIcsText(s) {
    return String(s || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function toUtcIcsTimestamp(date) {
    var d = date instanceof Date ? date : new Date(date);
    var y = d.getUTCFullYear();
    var m = pad2(d.getUTCMonth() + 1);
    var da = pad2(d.getUTCDate());
    var hh = pad2(d.getUTCHours());
    var mm = pad2(d.getUTCMinutes());
    var ss = pad2(d.getUTCSeconds());
    return "" + y + m + da + "T" + hh + mm + ss + "Z";
  }

  function getTzOffsetMs(date, tz) {
    var dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    var parts = dtf.formatToParts(date);
    var map = {};
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type !== "literal") map[parts[i].type] = parts[i].value;
    }
    var asUTC = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second)
    );
    return asUTC - date.getTime();
  }

  function berlinToUtcDate(y, m, d, hh, mm, ss) {
    var tz = "Europe/Berlin";
    var guess = new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0, ss || 0));
    var off1 = getTzOffsetMs(guess, tz);
    var adj = new Date(guess.getTime() - off1);
    var off2 = getTzOffsetMs(adj, tz);
    if (off2 !== off1) adj = new Date(guess.getTime() - off2);
    return adj;
  }

  function berlinYmdFromDate(date) {
    var tz = "Europe/Berlin";
    var dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    var parts = dtf.formatToParts(date instanceof Date ? date : new Date(date));
    var map = {};
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type !== "literal") map[parts[i].type] = parts[i].value;
    }
    var y = Number(map.year);
    var m = Number(map.month);
    var d = Number(map.day);
    return { y: y, m: m, d: d, num: y * 10000 + m * 100 + d };
  }

  function parseDdMmYy(s) {
    var m = String(s || "").match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (!m) return null;
    var d = Number(m[1]);
    var mo = Number(m[2]);
    var yy = String(m[3]).length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return { y: yy, m: mo, d: d, num: yy * 10000 + mo * 100 + d };
  }

  function parseHm(s) {
    var m = String(s || "").match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return { h: Number(m[1]), min: Number(m[2]) };
  }

  function getWeekdayShortBerlin(y, m, d) {
    var dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    var w = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "short" }).format(dt);
    return w.replace(/\.$/, "");
  }

  function formatDdMmYy(ymd) {
    return pad2(ymd.d) + "." + pad2(ymd.m) + "." + String(ymd.y).slice(-2);
  }

  function normalize(item) {
    var ds = parseDdMmYy(item && item.dateStart ? item.dateStart : "");
    if (!ds) return null;

    var deRaw = item && item.dateEnd ? String(item.dateEnd).trim() : "";
    var de = deRaw ? parseDdMmYy(deRaw) : null;

    var ts = parseHm(item && item.timeStart ? item.timeStart : "");
    var te = parseHm(item && item.timeEnd ? item.timeEnd : "");

    var hasEndDate = !!deRaw && !!de;
    var endDate = hasEndDate ? de : ds;

    var sh = ts ? ts.h : 0;
    var sm = ts ? ts.min : 0;

    var eh, em;
    if (te) {
      eh = te.h;
      em = te.min;
    } else {
      eh = sh;
      em = sm + 60;
      if (em >= 60) {
        eh = eh + Math.floor(em / 60);
        em = em % 60;
      }
    }

    var startUtc = berlinToUtcDate(ds.y, ds.m, ds.d, sh, sm, 0);
    var endUtc = berlinToUtcDate(endDate.y, endDate.m, endDate.d, eh, em, 0);
    if (endUtc.getTime() <= startUtc.getTime()) endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);

    var wdStart = getWeekdayShortBerlin(ds.y, ds.m, ds.d);
    var header = wdStart + ", " + formatDdMmYy(ds);
    if (hasEndDate) {
      var wdEnd = getWeekdayShortBerlin(de.y, de.m, de.d);
      header = header + " bis\n" + wdEnd + ", " + formatDdMmYy(de);
    }

    var durationMs = endUtc.getTime() - startUtc.getTime();
    var isAllDay = durationMs > 23 * 60 * 60 * 1000;

    var timeLine = "";
    if (isAllDay) {
      timeLine = "Ganztägig!";
    } else if (ts && te) {
      timeLine = pad2(ts.h) + ":" + pad2(ts.min) + " - " + pad2(te.h) + ":" + pad2(te.min) + " Uhr";
    } else if (ts) {
      timeLine = pad2(ts.h) + ":" + pad2(ts.min) + " Uhr";
    } else {
      timeLine = "";
    }

    return {
      _raw: item,
      _startUtc: startUtc,
      _endUtc: endUtc,
      _startNum: ds.num,
      _endNum: hasEndDate ? de.num : ds.num,
      header: header,
      title: item && item.text ? String(item.text) : "",
      meta: item && item.meta ? String(item.meta) : "",
      timeLine: timeLine,
      location: item && item.location ? String(item.location) : "",
      kader: item && item.kader ? String(item.kader) : ""
    };
  }

  function buildIcs(n) {
    var now = new Date();
    var raw = n._raw || {};
    var uid;
    if (raw && raw.uid) uid = String(raw.uid);
    else if (window.crypto && typeof window.crypto.randomUUID === "function") uid = window.crypto.randomUUID();
    else uid = String(Date.now()) + "-" + String(Math.random()).slice(2);

    var descParts = [];
    if (n.meta) descParts.push(n.meta);
    if (n.header) descParts.push("Datum: " + n.header.replace(/\n/g, " "));
    if (n.timeLine) descParts.push("Zeit: " + n.timeLine);
    if (n.location) descParts.push("Ort: " + n.location);
    if (n.kader) descParts.push("Kader: " + n.kader);

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DLRG//InfoKarussel//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + escapeIcsText(uid),
      "DTSTAMP:" + toUtcIcsTimestamp(now),
      "DTSTART:" + toUtcIcsTimestamp(n._startUtc),
      "DTEND:" + toUtcIcsTimestamp(n._endUtc),
      "SUMMARY:" + escapeIcsText(n.title || "Termin"),
      "DESCRIPTION:" + escapeIcsText(descParts.join("\n")),
      "LOCATION:" + escapeIcsText(n.location || ""),
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
  }

  function openIcs(n) {
    var ics = buildIcs(n);
    var filenameBase = (n.title || "termin").trim() || "termin";
    var filename = filenameBase.replace(/[^\w\-]+/g, "_").slice(0, 60) + ".ics";

    try {
      var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        try { URL.revokeObjectURL(url); } catch (e) {}
      }, 1000);
      return true;
    } catch (e) {
      try {
        var dataUrl = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
        window.location.href = dataUrl;
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  function initInfoKarussel(containerOrSelector, items, options) {
    options = options || {};
    var itemsPerPage = options.itemsPerPage || 4;

    var container =
      typeof containerOrSelector === "string"
        ? document.querySelector(containerOrSelector)
        : containerOrSelector;

    if (!container) return;

    var todayNum = berlinYmdFromDate(new Date()).num;

    var normalized = (items || []).map(normalize).filter(function (x) { return !!x; });

    var filtered = normalized
      .filter(function (n) { return n._endNum >= todayNum; })
      .sort(function (a, b) { return a._startUtc.getTime() - b._startUtc.getTime(); });

    if (filtered.length === 0) {
      container.innerHTML = `<ul class="updates__list"><li>Erste Inhalte folgen.</li></ul>`;
      return;
    }

    container.innerHTML = "";
    container.classList.add("info-karussel");
    container.setAttribute("lang", "de");

    var arrowLeft = el("button", "info-arrow info-arrow-left", { type: "button", "aria-label": "Vorherige Seite", text: "‹" });
    var arrowRight = el("button", "info-arrow info-arrow-right", { type: "button", "aria-label": "Nächste Seite", text: "›" });

    var viewport = el("div", "info-viewport");
    viewport.style.height = "0px";
    viewport.style.transition = "height 780ms ease";
    viewport.style.touchAction = "pan-y";

    var track = el("div", "info-track");
    viewport.appendChild(track);

    var dots = el("div", "info-dots");

    container.appendChild(arrowLeft);
    container.appendChild(viewport);
    container.appendChild(arrowRight);
    container.appendChild(dots);

    var pages = chunk(filtered, itemsPerPage);
    var pageCount = pages.length;
    var pageIndex = 0;

    var autoMs = 12000;
    var autoTimer = null;

    function currentPageEl() {
      return track.children && track.children[pageIndex] ? track.children[pageIndex] : null;
    }

    function measurePageHeight(pageEl) {
      if (!pageEl) return 0;
      var h = pageEl.scrollHeight || 0;
      if (h <= 0) h = pageEl.getBoundingClientRect().height || 0;
      return Math.max(0, Math.ceil(h));
    }

    function updateViewportHeight() {
      var p = currentPageEl();
      var h = measurePageHeight(p);
      if (h > 0) viewport.style.height = h + "px";
    }

    function applyTransform() {
      track.style.transform = "translateX(" + (-pageIndex * 100) + "%)";
    }

    function setPageCore(idx, userAction, wrap) {
      if (pageCount <= 1) return;
      if (wrap) idx = ((idx % pageCount) + pageCount) % pageCount;
      else {
        if (idx < 0) idx = 0;
        if (idx > pageCount - 1) idx = pageCount - 1;
      }
      pageIndex = idx;
      updateViewportHeight();
      applyTransform();
      buildDots();
      updateArrows();
      requestAnimationFrame(function () {
        updateViewportHeight();
        requestAnimationFrame(updateViewportHeight);
      });
      if (userAction) startAuto();
    }

    function setPage(idx, userAction) {
      setPageCore(idx, userAction, false);
    }

    function setPageWrap(idx, userAction) {
      setPageCore(idx, userAction, true);
    }

    function buildCard(n) {
      var card = el("div", "info-card");
      var header = el("div", "info-card-header");
      header.textContent = n.header || "";
      var body = el("div", "info-card-body");

      var title = el("div", "info-title", { text: n.title || "" });
      var meta = n.meta ? el("div", "info-meta", { text: n.meta }) : null;

      var lineZeit = el("div", "info-line");
      var zeitLabel = el("span", "info-label", { text: "Zeit:" });
      var zeitVal = el("span", "info-value", { text: n.timeLine || "" });
      lineZeit.appendChild(zeitLabel);
      lineZeit.appendChild(zeitVal);

      var lineOrt = el("div", "info-line");
      var ortLabel = el("span", "info-label", { text: "Ort:" });
      var ortVal = el("span", "info-value", { text: n.location || "" });
      lineOrt.appendChild(ortLabel);
      lineOrt.appendChild(ortVal);

      var lineKader = el("div", "info-line");
      var kaderLabel = el("span", "info-label", { text: "Kader:" });
      var kaderVal = el("span", "info-value", { text: n.kader || "" });
      lineKader.appendChild(kaderLabel);
      lineKader.appendChild(kaderVal);

      var btn = el("button", "info-button", { type: "button", text: "zum Kalender" });
      btn.addEventListener("click", function () {
        if (typeof options.onCalendarClick === "function") {
          options.onCalendarClick(n._raw);
          return;
        }
        openIcs(n);
      });

      body.appendChild(title);
      if (meta) body.appendChild(meta);
      body.appendChild(lineZeit);
      body.appendChild(lineOrt);
      body.appendChild(lineKader);
      body.appendChild(btn);

      card.appendChild(header);
      card.appendChild(body);
      return card;
    }

    function buildPages() {
      track.innerHTML = "";
      for (var p = 0; p < pageCount; p++) {
        var page = el("div", "info-page");
        for (var i = 0; i < pages[p].length; i++) page.appendChild(buildCard(pages[p][i]));
        track.appendChild(page);
      }
      requestAnimationFrame(function () {
        updateViewportHeight();
        requestAnimationFrame(updateViewportHeight);
      });
    }

    function buildDots() {
      dots.innerHTML = "";
      if (pageCount <= 1) {
        dots.style.display = "none";
        return;
      }
      dots.style.display = "";
      for (var i = 0; i < pageCount; i++) {
        (function (idx) {
          var d = el("button", "info-dot" + (idx === pageIndex ? " is-active" : ""), {
            type: "button",
            "aria-label": "Seite " + (idx + 1)
          });
          d.addEventListener("click", function () {
            setPage(idx, true);
          });
          dots.appendChild(d);
        })(i);
      }
    }

    function updateArrows() {
      if (pageCount <= 1) {
        arrowLeft.style.display = "none";
        arrowRight.style.display = "none";
        return;
      }
      arrowLeft.style.display = "";
      arrowRight.style.display = "";
      arrowLeft.disabled = pageIndex === 0;
      arrowRight.disabled = pageIndex === pageCount - 1;
    }

    function stopAuto() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
      }
    }

    function startAuto() {
      stopAuto();
      if (pageCount <= 1) return;
      autoTimer = setInterval(function () {
        setPageWrap(pageIndex + 1, false);
      }, autoMs);
    }

    arrowLeft.addEventListener("click", function () {
      setPage(pageIndex - 1, true);
    });
    arrowRight.addEventListener("click", function () {
      setPage(pageIndex + 1, true);
    });

    container.addEventListener("mouseenter", function () { stopAuto(); });
    container.addEventListener("mouseleave", function () { startAuto(); });
    container.addEventListener("focusin", function () { stopAuto(); });
    container.addEventListener("focusout", function () { startAuto(); });

    var resizeT = null;
    window.addEventListener("resize", function () {
      if (resizeT) clearTimeout(resizeT);
      resizeT = setTimeout(function () {
        requestAnimationFrame(function () {
          updateViewportHeight();
          requestAnimationFrame(updateViewportHeight);
        });
      }, 80);
    });

    var swipe = { active: false, sx: 0, sy: 0, locked: null };
    var SWIPE_LOCK_PX = 10;
    var SWIPE_TRIGGER_PX = 50;

    function isInteractiveTarget(t) {
      if (!t || !t.closest) return false;
      return !!t.closest("button,a,input,textarea,select,label,.info-dot,.info-button");
    }

    function onSwipeStart(x, y, target) {
      if (pageCount <= 1) return;
      if (isInteractiveTarget(target)) return;
      swipe.active = true;
      swipe.sx = x;
      swipe.sy = y;
      swipe.locked = null;
      stopAuto();
    }

    function onSwipeMove(x, y, evt) {
      if (!swipe.active) return;
      var dx = x - swipe.sx;
      var dy = y - swipe.sy;
      if (swipe.locked === null) {
        if (Math.abs(dx) > SWIPE_LOCK_PX || Math.abs(dy) > SWIPE_LOCK_PX) swipe.locked = Math.abs(dx) > Math.abs(dy);
      }
      if (swipe.locked === true && evt && evt.cancelable) evt.preventDefault();
    }

    function onSwipeEnd(x, y) {
      if (!swipe.active) return;
      var dx = x - swipe.sx;
      var dy = y - swipe.sy;
      var doSwipe = swipe.locked === true && Math.abs(dx) > SWIPE_TRIGGER_PX && Math.abs(dx) > Math.abs(dy);
      swipe.active = false;
      swipe.locked = null;
      if (doSwipe) {
        if (dx < 0) setPageWrap(pageIndex + 1, true);
        else setPageWrap(pageIndex - 1, true);
      } else {
        startAuto();
      }
    }

    if ("PointerEvent" in window) {
      viewport.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        onSwipeStart(e.clientX, e.clientY, e.target);
      });

      viewport.addEventListener("pointermove", function (e) {
        onSwipeMove(e.clientX, e.clientY, e);
      });

      viewport.addEventListener("pointerup", function (e) {
        onSwipeEnd(e.clientX, e.clientY);
      });

      viewport.addEventListener("pointercancel", function (e) {
        onSwipeEnd(e.clientX, e.clientY);
      });
    } else {
      viewport.addEventListener("touchstart", function (e) {
        if (!e.touches || !e.touches[0]) return;
        onSwipeStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
      }, { passive: true });

      viewport.addEventListener("touchmove", function (e) {
        if (!e.touches || !e.touches[0]) return;
        onSwipeMove(e.touches[0].clientX, e.touches[0].clientY, e);
      }, { passive: false });

      viewport.addEventListener("touchend", function (e) {
        var t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
        if (!t) return;
        onSwipeEnd(t.clientX, t.clientY);
      }, { passive: true });

      viewport.addEventListener("touchcancel", function (e) {
        var t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
        if (!t) return;
        onSwipeEnd(t.clientX, t.clientY);
      }, { passive: true });
    }

    buildPages();
    buildDots();
    updateArrows();
    applyTransform();
    startAuto();

    window.addEventListener("keydown", function (e) {
      if (pageCount <= 1) return;
      if (e.key === "ArrowLeft") setPageWrap(pageIndex - 1, true);
      if (e.key === "ArrowRight") setPageWrap(pageIndex + 1, true);
    });

    return {
      setPage: function (idx) { setPage(idx, true); },
      setPageWrap: function (idx) { setPageWrap(idx, true); },
      getPage: function () { return pageIndex; },
      getPageCount: function () { return pageCount; }
    };
  }

  window.initInfoKarussel = initInfoKarussel;
})();
