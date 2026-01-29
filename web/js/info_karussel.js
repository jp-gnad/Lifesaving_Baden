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

  function berlinToUtcDate(y, m, d, hh, mm) {
    var tz = "Europe/Berlin";
    var guess = new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0, 0));
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

  function parseDateRange(dateStr) {
    var s = String(dateStr || "");
    var matches = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g);
    if (!matches || matches.length === 0) return null;

    function toYMD(m) {
      var p = m.split(".");
      var dd = Number(p[0]);
      var mo = Number(p[1]);
      var yy = String(p[2]).length === 2 ? 2000 + Number(p[2]) : Number(p[2]);
      return { y: yy, m: mo, d: dd, num: yy * 10000 + mo * 100 + dd };
    }

    var start = toYMD(matches[0]);
    var end = toYMD(matches[matches.length - 1]);
    return { start: start, end: end };
  }

  function parseTimeRange(timeStr) {
    var s = String(timeStr || "");
    var m = s.match(/(\d{1,2}):(\d{2})/g);
    if (!m || m.length === 0) return null;

    function hm(x) {
      var p = x.split(":");
      return { h: Number(p[0]), min: Number(p[1]) };
    }

    var start = hm(m[0]);
    var end = m.length >= 2 ? hm(m[1]) : null;
    return { start: start, end: end };
  }

  function computeStartEnd(item) {
    if (item && item.start && item.end) {
      return {
        start: item.start instanceof Date ? item.start : new Date(item.start),
        end: item.end instanceof Date ? item.end : new Date(item.end)
      };
    }

    var dr = parseDateRange(item && item.date ? item.date : "");
    if (!dr) return null;

    var tr = parseTimeRange(item && item.time ? item.time : "");

    var sh = tr && tr.start ? tr.start.h : 0;
    var sm = tr && tr.start ? tr.start.min : 0;

    var eh, em;
    if (tr && tr.end) {
      eh = tr.end.h;
      em = tr.end.min;
    } else {
      eh = sh;
      em = sm + 60;
      if (em >= 60) {
        eh = eh + Math.floor(em / 60);
        em = em % 60;
      }
    }

    var startUtc = berlinToUtcDate(dr.start.y, dr.start.m, dr.start.d, sh, sm);
    var endUtc = berlinToUtcDate(dr.end.y, dr.end.m, dr.end.d, eh, em);

    if (endUtc.getTime() <= startUtc.getTime()) {
      endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);
    }

    return { start: startUtc, end: endUtc };
  }

  function getItemRangeNums(item) {
    var dr = parseDateRange(item && item.date ? item.date : "");
    if (dr) return { startNum: dr.start.num, endNum: dr.end.num };

    if (item && item.start) {
      var s = berlinYmdFromDate(item.start);
      var e = item.end ? berlinYmdFromDate(item.end) : s;
      return { startNum: s.num, endNum: e.num };
    }

    return null;
  }

  function buildIcs(item, startEnd) {
    var now = new Date();
    var uid;
    if (item && item.uid) uid = String(item.uid);
    else if (window.crypto && typeof window.crypto.randomUUID === "function") uid = window.crypto.randomUUID();
    else uid = String(Date.now()) + "-" + String(Math.random()).slice(2);

    var title = item && item.text ? String(item.text) : "Termin";
    var location = item && item.location ? String(item.location) : "";
    var kader = item && item.kader ? String(item.kader) : "";
    var dateLabel = item && item.date ? String(item.date) : "";
    var timeLabel = item && item.time ? String(item.time) : "";

    var descParts = [];
    if (dateLabel) descParts.push("Datum: " + dateLabel);
    if (timeLabel) descParts.push("Zeit: " + timeLabel);
    if (location) descParts.push("Ort: " + location);
    if (kader) descParts.push("Kader: " + kader);

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DLRG//InfoKarussel//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + escapeIcsText(uid),
      "DTSTAMP:" + toUtcIcsTimestamp(now),
      "DTSTART:" + toUtcIcsTimestamp(startEnd.start),
      "DTEND:" + toUtcIcsTimestamp(startEnd.end),
      "SUMMARY:" + escapeIcsText(title),
      "DESCRIPTION:" + escapeIcsText(descParts.join("\n")),
      "LOCATION:" + escapeIcsText(location),
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
  }

  function openIcs(item) {
    var se = computeStartEnd(item);
    if (!se) return false;

    var ics = buildIcs(item, se);
    var filenameBase = (item && item.text ? String(item.text) : "termin").trim();
    if (!filenameBase) filenameBase = "termin";
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
    var buttonTextDefault = "zum Kalender";

    var container =
      typeof containerOrSelector === "string"
        ? document.querySelector(containerOrSelector)
        : containerOrSelector;

    if (!container) return;

    var todayNum = berlinYmdFromDate(new Date()).num;

    var filtered = (items || []).filter(function (it) {
      var r = getItemRangeNums(it);
      if (!r) return false;
      return r.endNum >= todayNum;
    });

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

    function buildCard(item) {
      var card = el("div", "info-card");
      var header = el("div", "info-card-header");
      header.textContent = item && item.date ? String(item.date) : "";
      var body = el("div", "info-card-body");

      var title = el("div", "info-title", { text: item && item.text ? String(item.text) : "" });

      var lineZeit = el("div", "info-line");
      var zeitLabel = el("span", "info-label", { text: "Zeit:" });
      var zeitVal = el("span", "info-value", { text: item && item.time ? String(item.time) : "" });
      lineZeit.appendChild(zeitLabel);
      lineZeit.appendChild(zeitVal);

      var lineOrt = el("div", "info-line");
      var ortLabel = el("span", "info-label", { text: "Ort:" });
      var ortVal = el("span", "info-value", { text: item && item.location ? String(item.location) : "" });
      lineOrt.appendChild(ortLabel);
      lineOrt.appendChild(ortVal);

      var lineKader = el("div", "info-line");
      var kaderLabel = el("span", "info-label", { text: "Kader:" });
      var kaderVal = el("span", "info-value", { text: item && item.kader ? String(item.kader) : "" });
      lineKader.appendChild(kaderLabel);
      lineKader.appendChild(kaderVal);

      var btn = el("button", "info-button", { type: "button", text: buttonTextDefault });
      btn.addEventListener("click", function () {
        if (typeof options.onCalendarClick === "function") {
          options.onCalendarClick(item);
          return;
        }
        openIcs(item);
      });

      body.appendChild(title);
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
            setPage(idx);
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

    function applyTransform() {
      track.style.transform = "translateX(" + (-pageIndex * 100) + "%)";
    }

    function setPage(idx) {
      if (idx < 0) idx = 0;
      if (idx > pageCount - 1) idx = pageCount - 1;
      pageIndex = idx;
      applyTransform();
      buildDots();
      updateArrows();
    }

    arrowLeft.addEventListener("click", function () {
      setPage(pageIndex - 1);
    });
    arrowRight.addEventListener("click", function () {
      setPage(pageIndex + 1);
    });

    buildPages();
    buildDots();
    updateArrows();
    applyTransform();

    window.addEventListener("keydown", function (e) {
      if (pageCount <= 1) return;
      if (e.key === "ArrowLeft") setPage(pageIndex - 1);
      if (e.key === "ArrowRight") setPage(pageIndex + 1);
    });

    return {
      setPage: setPage,
      getPage: function () { return pageIndex; },
      getPageCount: function () { return pageCount; }
    };
  }

  window.initInfoKarussel = initInfoKarussel;
})();
