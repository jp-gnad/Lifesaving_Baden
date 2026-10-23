(function () {
  const MERGED_CLUBS = [
    {
      name: "Bodman-Ludwigshafen",
      aliases: ["Bodman", "Bodmann", "Ludwigshafen", "Bodman-Ludwigshafen", "Bodmann-Ludwigshafen"]
    },
    {
      name: "Müllheim-Neuenburg",
      aliases: ["Müllheim", "Muellheim", "Müllheim-Neuenburg", "Muellheim-Neuenburg",
        "Müllheim-Neunburg", "Muellheim-Neunburg", "Staufen"],
      preserveAffiliation: true
    },
    {
      name: "Teningen",
      aliases: ["Nimburg", "Nimburg-Teningen", "Köndringen", "Koendringen", "Teningen", "Tenningen"],
      preserveAffiliation: true
    },
    {
      name: "Waldshut-Tiengen",
      aliases: ["Waldshut", "Tiengen", "Waldshut-Tiengen"],
      preserveAffiliation: true
    },
    {
      name: "Villingen-Schwenningen",
      aliases: ["Villingen", "Schwenningen", "Villingen-Schwenningen"],
      preserveAffiliation: true
    }
  ];

  function aliasKey(value) {
    return String(value ?? "")
      .trim()
      .replace(/^(og|dlrg)\s+/i, "")
      .toLowerCase()
      .replace(/[\s/\u2013\u2014-]+/g, "-");
  }

  const clubsByAlias = new Map();
  for (const club of MERGED_CLUBS) {
    for (const alias of club.aliases) clubsByAlias.set(aliasKey(alias), club);
  }

  function normalize(value) {
    return clubsByAlias.get(aliasKey(value))?.name || String(value ?? "").trim();
  }

  function getAliases(value) {
    return [...(clubsByAlias.get(aliasKey(value))?.aliases || [])];
  }

  function preservesAffiliation(value) {
    return clubsByAlias.get(aliasKey(value))?.preserveAffiliation === true;
  }

  function affiliation(value) {
    return preservesAffiliation(value) ? String(value ?? "").trim() : normalize(value);
  }

  window.ClubNames = { normalize, getAliases, affiliation, preservesAffiliation };
})();
