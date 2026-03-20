Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$source = @'
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml;

public sealed class LscLatestSummary
{
    public int AthleteCount { get; set; }
    public int ComparableEntries { get; set; }
    public double AverageAbsDelta { get; set; }
    public double MaxAbsDelta { get; set; }
    public int Over1 { get; set; }
    public int Over5 { get; set; }
    public int Over10 { get; set; }
    public int Over25 { get; set; }
    public int Over50 { get; set; }
    public List<LscLatestDelta> TopDeltas { get; set; }

    public LscLatestSummary()
    {
        TopDeltas = new List<LscLatestDelta>();
    }
}

public sealed class LscLatestDelta
{
    public string AthleteName { get; set; }
    public int BirthYear { get; set; }
    public string Date { get; set; }
    public string MeetName { get; set; }
    public string Ortsgruppe { get; set; }
    public int SourceIndex { get; set; }
    public double? ExcelLsc { get; set; }
    public double CalculatedLsc { get; set; }
    public double? Delta { get; set; }
    public double? AbsDelta { get; set; }

    public LscLatestDelta()
    {
        AthleteName = "";
        Date = "";
        MeetName = "";
        Ortsgruppe = "";
    }
}

internal sealed class RunEntry
{
    public string AthleteId;
    public string AthleteName;
    public int BirthYear;
    public string DateIso;
    public string MeetName;
    public string Ortsgruppe;
    public double DateSerial;
    public int SourceIndex;
    public string Gender;
    public double? ExcelLsc;

    public double[] Points;
    public bool[] CountablePoints;

    public RunEntry()
    {
        AthleteId = "";
        AthleteName = "";
        DateIso = "";
        MeetName = "";
        Ortsgruppe = "";
        Gender = "";
        Points = new double[6];
        CountablePoints = new bool[6];
    }
}

internal sealed class DisciplineDef
{
    public int Index;
    public int TimeCol;
    public int PlaceCol;
    public string Key;
    public string[] RecordKeys;

    public DisciplineDef()
    {
        Key = "";
        RecordKeys = new string[0];
    }
}

internal sealed class WrState
{
    public const int HeaderRowNumber = 4;
    public const int FirstDataRowNumber = 5;

    public List<int> Years = new List<int>();
    public Dictionary<int, int> YearRowIndex = new Dictionary<int, int>();
    public Dictionary<string, int> ColumnIndex = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
    public Dictionary<int, Dictionary<int, string>> RowMap = new Dictionary<int, Dictionary<int, string>>();
}

public static class LscLatestComparer
{
    private static readonly DisciplineDef[] Disciplines = new[]
    {
        new DisciplineDef { Index = 0, Key = "100_lifesaver", TimeCol = 3, PlaceCol = 15, RecordKeys = new[] { "100m Lifesaver", "100m Retten m Fl. u Gr.", "100m Retten mit Flossen u Gurtretter" } },
        new DisciplineDef { Index = 1, Key = "50_retten", TimeCol = 4, PlaceCol = 16, RecordKeys = new[] { "50m Retten" } },
        new DisciplineDef { Index = 2, Key = "200_super", TimeCol = 5, PlaceCol = 17, RecordKeys = new[] { "200m Superlifesaver", "200m Super Lifesaver" } },
        new DisciplineDef { Index = 3, Key = "100_kombi", TimeCol = 6, PlaceCol = 18, RecordKeys = new[] { "100m Kombi", "100m komb. Rettungsubung", "100m kombinierte Rettungsubung" } },
        new DisciplineDef { Index = 4, Key = "100_retten_flosse", TimeCol = 7, PlaceCol = 19, RecordKeys = new[] { "100m Retten", "100m Retten mit Flossen", "100m Flossenretten" } },
        new DisciplineDef { Index = 5, Key = "200_hindernis", TimeCol = 8, PlaceCol = 20, RecordKeys = new[] { "200m Hindernis", "200m Hindernisschwimmen" } }
    };

    public static LscLatestSummary Compare(string dataWorkbookPath, string wrWorkbookPath)
    {
        var wrState = LoadWrState(wrWorkbookPath);
        var runsByAthlete = LoadRuns(dataWorkbookPath, wrState);

        var comparable = new List<LscLatestDelta>();

        foreach (var pair in runsByAthlete)
        {
            var runs = pair.Value;
            if (runs.Count == 0) continue;
            runs.Sort((a, b) =>
            {
                var cmp = a.DateSerial.CompareTo(b.DateSerial);
                if (cmp != 0) return cmp;
                return a.SourceIndex.CompareTo(b.SourceIndex);
            });

            var latest = runs[runs.Count - 1];
            if (!latest.ExcelLsc.HasValue) continue;

            var calc = CalculateLatestLsc(runs);
            var delta = Round2(calc - latest.ExcelLsc.Value);
            comparable.Add(new LscLatestDelta
            {
                AthleteName = latest.AthleteName,
                BirthYear = latest.BirthYear,
                Date = latest.DateIso,
                MeetName = latest.MeetName,
                Ortsgruppe = latest.Ortsgruppe,
                SourceIndex = latest.SourceIndex,
                ExcelLsc = latest.ExcelLsc,
                CalculatedLsc = calc,
                Delta = delta,
                AbsDelta = Round2(Math.Abs(delta))
            });
        }

        comparable.Sort((a, b) =>
        {
            var cmp = (b.AbsDelta ?? 0).CompareTo(a.AbsDelta ?? 0);
            if (cmp != 0) return cmp;
            cmp = string.Compare(a.AthleteName, b.AthleteName, StringComparison.CurrentCulture);
            if (cmp != 0) return cmp;
            cmp = string.Compare(a.Date, b.Date, StringComparison.Ordinal);
            if (cmp != 0) return cmp;
            return a.SourceIndex.CompareTo(b.SourceIndex);
        });

        var summary = new LscLatestSummary();
        summary.AthleteCount = runsByAthlete.Count;
        summary.ComparableEntries = comparable.Count;
        summary.AverageAbsDelta = comparable.Count == 0 ? 0 : Round2(comparable.Sum(x => x.AbsDelta ?? 0) / comparable.Count);
        summary.MaxAbsDelta = comparable.Count == 0 ? 0 : comparable[0].AbsDelta ?? 0;
        summary.Over1 = comparable.Count(x => (x.AbsDelta ?? 0) > 1);
        summary.Over5 = comparable.Count(x => (x.AbsDelta ?? 0) > 5);
        summary.Over10 = comparable.Count(x => (x.AbsDelta ?? 0) > 10);
        summary.Over25 = comparable.Count(x => (x.AbsDelta ?? 0) > 25);
        summary.Over50 = comparable.Count(x => (x.AbsDelta ?? 0) > 50);
        summary.TopDeltas = comparable.Take(50).ToList();
        return summary;
    }

    private static double CalculateLatestLsc(List<RunEntry> runs)
    {
        int targetIndex = runs.Count - 1;
        double targetDate = runs[targetIndex].DateSerial;
        var disciplineValues = new List<double>();

        for (int disc = 0; disc < 6; disc++)
        {
            var points = new List<double>();
            for (int j = targetIndex; j >= 0; j--)
            {
                if (targetDate - runs[j].DateSerial > 731) break;
                if (runs[j].CountablePoints[disc]) points.Add(runs[j].Points[disc]);
            }

            if (points.Count == 0) continue;
            points.Sort((a, b) => b.CompareTo(a));
            int take = Math.Min(3, points.Count);
            double sum = 0;
            for (int i = 0; i < take; i++) sum += points[i];
            disciplineValues.Add(sum / take);
        }

        if (disciplineValues.Count == 0) return 0;
        disciplineValues.Sort((a, b) => b.CompareTo(a));
        int topCount = Math.Min(3, disciplineValues.Count);
        double total = 0;
        for (int i = 0; i < topCount; i++) total += disciplineValues[i];
        return Round2(total / topCount);
    }

    private static Dictionary<string, List<RunEntry>> LoadRuns(string workbookPath, WrState wrState)
    {
        var rows = ReadWorksheetRows(workbookPath, "Tabelle2");
        var byAthlete = new Dictionary<string, List<RunEntry>>(StringComparer.OrdinalIgnoreCase);
        var wrCache = new Dictionary<string, double?>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in rows)
        {
            string name = GetCell(row.Cells, 1).Trim();
            string gender = GetCell(row.Cells, 0).Trim();
            string dateIso = ExcelSerialToIso(GetCell(row.Cells, 9));
            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(dateIso)) continue;

            double dateSerial;
            if (!double.TryParse(GetCell(row.Cells, 9), NumberStyles.Any, CultureInfo.InvariantCulture, out dateSerial) || dateSerial <= 0)
                continue;

            int? birthYear = ParseTwoDigitYearWithMeetYear(GetCell(row.Cells, 11), dateIso);
            if (!birthYear.HasValue) continue;

            string athleteId = MakeAthleteId(name, gender, birthYear.Value);
            List<RunEntry> list;
            if (!byAthlete.TryGetValue(athleteId, out list))
            {
                list = new List<RunEntry>();
                byAthlete[athleteId] = list;
            }

            string mehrkampf = ToNumOrBlank(GetCell(row.Cells, 14)).Trim().ToLowerInvariant();
            bool excluded = mehrkampf == "ausg." || mehrkampf == "ausg";
            int year = int.Parse(dateIso.Substring(0, 4), CultureInfo.InvariantCulture);
            string genderKey = NormalizeGender(gender);

            var run = new RunEntry
            {
                AthleteId = athleteId,
                AthleteName = name,
                BirthYear = birthYear.Value,
                DateIso = dateIso,
                DateSerial = dateSerial,
                MeetName = GetCell(row.Cells, 10).Trim(),
                Ortsgruppe = GetCell(row.Cells, 12).Trim(),
                SourceIndex = row.RowNumber,
                Gender = gender,
                ExcelLsc = ParseStoredLsc(GetCell(row.Cells, 2))
            };

            foreach (var disc in Disciplines)
            {
                string raw = GetCell(row.Cells, disc.TimeCol).Trim();
                string placeRaw = ToNumOrBlank(GetCell(row.Cells, disc.PlaceCol)).Trim();
                bool isDq = IsDqLike(raw) || IsDqLike(placeRaw);
                if (string.IsNullOrWhiteSpace(raw) && !isDq)
                {
                    run.Points[disc.Index] = 0;
                    run.CountablePoints[disc.Index] = false;
                    continue;
                }

                if (excluded)
                {
                    run.Points[disc.Index] = 0;
                    run.CountablePoints[disc.Index] = false;
                    continue;
                }

                double? wrSeconds = null;
                if (!isDq)
                {
                    string wrKey = year + "|" + genderKey + "|" + disc.Key;
                    if (!wrCache.TryGetValue(wrKey, out wrSeconds))
                    {
                        wrSeconds = ReadWrSeconds(wrState, year, genderKey, disc.RecordKeys);
                        wrCache[wrKey] = wrSeconds;
                    }
                    if (!wrSeconds.HasValue || wrSeconds.Value <= 0)
                    {
                        run.Points[disc.Index] = 0;
                        run.CountablePoints[disc.Index] = false;
                        continue;
                    }
                }

                if (isDq)
                {
                    run.Points[disc.Index] = 0;
                    run.CountablePoints[disc.Index] = true;
                    continue;
                }

                double timeSeconds = ParseTimeToSec(raw);
                double points = CalcPoints(timeSeconds, wrSeconds ?? double.NaN);
                run.Points[disc.Index] = points;
                run.CountablePoints[disc.Index] = points > 0;
            }

            list.Add(run);
        }

        return byAthlete;
    }

    private static WrState LoadWrState(string workbookPath)
    {
        var rows = ReadWorksheetRows(workbookPath, "WR-Open");
        var state = new WrState();

        foreach (var row in rows)
        {
            state.RowMap[row.RowNumber] = row.Cells;
        }

        foreach (var row in rows)
        {
            if (row.RowNumber < WrState.FirstDataRowNumber) continue;
            int year;
            if (int.TryParse(GetCell(row.Cells, 0), NumberStyles.Any, CultureInfo.InvariantCulture, out year))
            {
                state.Years.Add(year);
                state.YearRowIndex[year] = row.RowNumber;
            }
        }
        state.Years.Sort();

        Dictionary<int, string> headerRow;
        if (state.RowMap.TryGetValue(WrState.HeaderRowNumber, out headerRow))
        {
            foreach (var pair in headerRow)
            {
                int col = pair.Key;
                if (col <= 0) continue;

                string header = CanonicalRecordKey(pair.Value);
                if (string.IsNullOrWhiteSpace(header) || header == CanonicalRecordKey("WR-Open")) continue;

                string genderKey = "w";
                if (Regex.IsMatch(header, @"\d$"))
                {
                    string suffix = header.Substring(header.Length - 1);
                    if (suffix == "2")
                    {
                        genderKey = "m";
                        header = header.Substring(0, header.Length - 1).Trim();
                    }
                }

                state.ColumnIndex[header + "|" + genderKey] = col;
            }
        }

        return state;
    }

    private static double? ReadWrSeconds(WrState state, int year, string genderKey, string[] recordKeys)
    {
        int? selectedYear = GetSelectedWrYear(state, year);
        if (!selectedYear.HasValue) return null;

        var candidateYears = new List<int>();
        foreach (int y in state.Years) if (y >= selectedYear.Value) candidateYears.Add(y);
        for (int i = state.Years.Count - 1; i >= 0; i--) if (state.Years[i] < selectedYear.Value) candidateYears.Add(state.Years[i]);

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (string label in recordKeys)
        {
            string key = CanonicalRecordKey(label) + "|" + genderKey;
            int col;
            if (!state.ColumnIndex.TryGetValue(key, out col)) continue;

            foreach (int y in candidateYears)
            {
                string seenKey = label + "|" + y;
                if (!seen.Add(seenKey)) continue;
                int row;
                if (!state.YearRowIndex.TryGetValue(y, out row)) continue;
                Dictionary<int, string> map;
                if (!state.RowMap.TryGetValue(row, out map)) continue;

                string cellText = GetCell(map, col);
                double? sec = CellTextToSeconds(cellText);
                if (sec.HasValue && sec.Value > 0) return sec.Value;
            }
        }

        return null;
    }

    private static int? GetSelectedWrYear(WrState state, int year)
    {
        if (state.Years.Count == 0) return null;
        if (state.YearRowIndex.ContainsKey(year)) return year;

        int? best = null;
        foreach (int y in state.Years)
        {
            if (y <= year) best = y;
            else break;
        }
        return best ?? state.Years[0];
    }

    private static List<WorksheetRow> ReadWorksheetRows(string workbookPath, string sheetName)
    {
        using (var zip = ZipFile.OpenRead(workbookPath))
        {
            var sharedStrings = LoadSharedStrings(zip);
            string sheetPath = GetWorksheetPathByName(zip, sheetName);
            string xmlText = ReadEntryText(zip, sheetPath);

            var xml = new XmlDocument();
            xml.LoadXml(xmlText);

            var ns = new XmlNamespaceManager(xml.NameTable);
            ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main");

            var rows = new List<WorksheetRow>();
            foreach (XmlNode rowNode in xml.SelectNodes("//x:sheetData/x:row", ns))
            {
                var cells = new Dictionary<int, string>();
                foreach (XmlNode cellNode in rowNode.SelectNodes("./x:c", ns))
                {
                    string cellRef = "";
                    var refAttr = cellNode.Attributes["r"];
                    if (refAttr != null) cellRef = refAttr.Value ?? "";
                    if (string.IsNullOrWhiteSpace(cellRef)) continue;
                    int colIndex = GetColumnIndexFromRef(cellRef);
                    cells[colIndex] = GetCellValue(cellNode, sharedStrings);
                }
                rows.Add(new WorksheetRow
                {
                    RowNumber = int.Parse(rowNode.Attributes["r"].Value, CultureInfo.InvariantCulture),
                    Cells = cells
                });
            }
            return rows;
        }
    }

    private static string GetWorksheetPathByName(ZipArchive zip, string sheetName)
    {
        var workbook = new XmlDocument();
        workbook.LoadXml(ReadEntryText(zip, "xl/workbook.xml"));
        var rels = new XmlDocument();
        rels.LoadXml(ReadEntryText(zip, "xl/_rels/workbook.xml.rels"));

        XmlNode sheetNode = workbook.SelectSingleNode("/*[local-name()='workbook']/*[local-name()='sheets']/*[local-name()='sheet' and @name='" + sheetName + "']");
        if (sheetNode == null) throw new InvalidOperationException("Blatt nicht gefunden: " + sheetName);

        string relId = null;
        var relAttr = sheetNode.Attributes["r:id"];
        if (relAttr != null) relId = relAttr.Value;
        if (string.IsNullOrWhiteSpace(relId))
        {
            var relAttrNs = sheetNode.Attributes["id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships"];
            if (relAttrNs != null) relId = relAttrNs.Value;
        }
        if (string.IsNullOrWhiteSpace(relId)) throw new InvalidOperationException("Keine Relationship-Id fuer Blatt: " + sheetName);

        var ns = new XmlNamespaceManager(rels.NameTable);
        ns.AddNamespace("r", "http://schemas.openxmlformats.org/package/2006/relationships");
        XmlNode relNode = rels.SelectSingleNode("//r:Relationship[@Id='" + relId + "']", ns);
        if (relNode == null) throw new InvalidOperationException("Keine Relationship fuer Blatt: " + sheetName);

        string target = "";
        var targetAttr = relNode.Attributes["Target"];
        if (targetAttr != null) target = targetAttr.Value ?? "";
        if (target.StartsWith("/")) return target.TrimStart('/');
        if (target.StartsWith("xl/")) return target;
        return "xl/" + target;
    }

    private static List<string> LoadSharedStrings(ZipArchive zip)
    {
        var entry = zip.GetEntry("xl/sharedStrings.xml");
        if (entry == null) return new List<string>();

        var xml = new XmlDocument();
        xml.LoadXml(ReadEntryText(zip, "xl/sharedStrings.xml"));
        var ns = new XmlNamespaceManager(xml.NameTable);
        ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main");

        var list = new List<string>();
        foreach (XmlNode si in xml.SelectNodes("//x:si", ns))
        {
            var parts = new StringBuilder();
            foreach (XmlNode t in si.SelectNodes(".//x:t", ns))
            {
                parts.Append(t.InnerText);
            }
            list.Add(parts.ToString());
        }
        return list;
    }

    private static string GetCellValue(XmlNode cellNode, List<string> sharedStrings)
    {
        string type = "";
        var typeAttr = cellNode.Attributes["t"];
        if (typeAttr != null) type = typeAttr.Value ?? "";
        XmlNode valueNode = cellNode.SelectSingleNode("./*[local-name()='v']");
        XmlNode inlineNode = cellNode.SelectSingleNode("./*[local-name()='is']");

        if (type == "inlineStr") return inlineNode != null ? (inlineNode.InnerText ?? "") : "";
        if (type == "s")
        {
            int idx;
            if (valueNode != null && int.TryParse(valueNode.InnerText, NumberStyles.Any, CultureInfo.InvariantCulture, out idx))
            {
                if (idx >= 0 && idx < sharedStrings.Count) return sharedStrings[idx];
            }
            return "";
        }
        if (valueNode != null) return valueNode.InnerText ?? "";
        return cellNode.InnerText ?? "";
    }

    private static int GetColumnIndexFromRef(string cellRef)
    {
        int col = 0;
        foreach (char ch in cellRef)
        {
            if (ch < 'A' || ch > 'Z') break;
            col = (col * 26) + (ch - 'A' + 1);
        }
        return col - 1;
    }

    private static string ReadEntryText(ZipArchive zip, string entryPath)
    {
        var entry = zip.GetEntry(entryPath);
        if (entry == null) throw new InvalidOperationException("ZIP-Eintrag nicht gefunden: " + entryPath);
        using (var reader = new StreamReader(entry.Open()))
        {
            return reader.ReadToEnd();
        }
    }

    private static string GetCell(Dictionary<int, string> cells, int col)
    {
        string value;
        return cells.TryGetValue(col, out value) ? value ?? "" : "";
    }

    private static string ExcelSerialToIso(string value)
    {
        double num;
        if (!double.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out num)) return "";
        var dt = new DateTime(1899, 12, 30, 0, 0, 0, DateTimeKind.Utc).AddDays(num);
        return dt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    private static int? ParseTwoDigitYearWithMeetYear(string twoDigit, string meetIso)
    {
        int yy;
        if (!int.TryParse(twoDigit, NumberStyles.Any, CultureInfo.InvariantCulture, out yy)) return null;
        if (meetIso.Length < 4) return null;
        int meetYear;
        if (!int.TryParse(meetIso.Substring(0, 4), NumberStyles.Any, CultureInfo.InvariantCulture, out meetYear)) return null;
        int year = 1900 + yy;
        while ((meetYear - year) > 100) year += 100;
        return year;
    }

    private static string MakeAthleteId(string name, string gender, int birthYear)
    {
        string s = name.ToLowerInvariant().Normalize(NormalizationForm.FormKD);
        s = Regex.Replace(s, @"\p{IsCombiningDiacriticalMarks}+", "");
        s = Regex.Replace(s, @"\s+", "-");
        s = Regex.Replace(s, @"[^a-z0-9\-]", "");
        string g = gender.ToLowerInvariant().StartsWith("w") ? "w" : "m";
        return "ath_" + s + "_" + birthYear.ToString(CultureInfo.InvariantCulture) + "_" + g;
    }

    private static string NormalizeGender(string gender)
    {
        return gender.ToLowerInvariant().StartsWith("w") ? "w" : "m";
    }

    private static double ParseTimeToSec(string raw)
    {
        if (raw == null) return double.NaN;
        string s = raw.Trim().Replace(",", ".");
        if (string.IsNullOrWhiteSpace(s)) return double.NaN;
        if (s.Equals("dq", StringComparison.OrdinalIgnoreCase) || s.Equals("disq", StringComparison.OrdinalIgnoreCase)) return double.NaN;

        string[] parts = s.Split(':');
        if (parts.Length == 1)
        {
            double sec;
            return double.TryParse(parts[0], NumberStyles.Any, CultureInfo.InvariantCulture, out sec) ? sec : double.NaN;
        }
        if (parts.Length == 2)
        {
            int min;
            double sec;
            return int.TryParse(parts[0], NumberStyles.Any, CultureInfo.InvariantCulture, out min)
                && double.TryParse(parts[1], NumberStyles.Any, CultureInfo.InvariantCulture, out sec)
                ? (min * 60.0) + sec
                : double.NaN;
        }
        return double.NaN;
    }

    private static double? CellTextToSeconds(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        double num;
        if (double.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out num))
        {
            if (num >= 0 && num < 1) return Round2(num * 86400.0);
            return Round2(num);
        }
        double parsed = ParseTimeToSec(text);
        return double.IsNaN(parsed) ? (double?)null : Round2(parsed);
    }

    private static string NormalizeKey(string value)
    {
        string s = (value ?? "").Normalize(NormalizationForm.FormKD).ToLowerInvariant();
        s = Regex.Replace(s, @"\p{IsCombiningDiacriticalMarks}+", "");
        s = s.Replace("ß", "ss").Replace("×", "x").Replace("*", "x");
        s = Regex.Replace(s, @"[^a-z0-9x]+", " ");
        s = Regex.Replace(s, @"\s+", " ");
        return s.Trim();
    }

    private static string CanonicalRecordKey(string value)
    {
        string s = NormalizeKey(value);
        s = s.Replace("hindernisschwimmen", "hindernis");
        s = s.Replace("kombinierte rettungsuebung", "kombi");
        s = s.Replace("kombinierte rettungsubung", "kombi");
        s = s.Replace("komb rettungsuebung", "kombi");
        s = s.Replace("komb rettungsubung", "kombi");
        s = s.Replace("super lifesaver", "superlifesaver");
        s = s.Replace("manikin tow with fins", "100m retten");
        s = s.Replace("manikin carry with fins", "100m retten");
        s = s.Replace("rescue medley", "100m kombi");
        s = s.Replace("obstacle swim", "hindernis");
        s = s.Replace("100m retten m fl u gr", "100m lifesaver");
        s = s.Replace("100m retten mit flossen u gurtretter", "100m lifesaver");
        return Regex.Replace(s, @"\s+", " ").Trim();
    }

    private static string ToNumOrBlank(string value)
    {
        string clean = Regex.Replace(value ?? "", @"[^\d\-]", "");
        int num;
        return int.TryParse(clean, NumberStyles.Any, CultureInfo.InvariantCulture, out num)
            ? num.ToString(CultureInfo.InvariantCulture)
            : (value ?? "").Trim();
    }

    private static bool IsDqLike(string value)
    {
        string s = (value ?? "").Trim().ToLowerInvariant();
        return s == "dq" || s == "disq";
    }

    private static double? ParseStoredLsc(string value)
    {
        string s = (value ?? "").Trim().Replace(",", ".");
        if (string.IsNullOrWhiteSpace(s)) return null;
        double num;
        return double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out num) ? (double?)Round2(num) : null;
    }

    private static void PushTop3(double value, ref double top1, ref double top2, ref double top3)
    {
        if (value >= top1)
        {
            top3 = top2;
            top2 = top1;
            top1 = value;
        }
        else if (value >= top2)
        {
            top3 = top2;
            top2 = value;
        }
        else if (value > top3)
        {
            top3 = value;
        }
    }

    private static double AvgTop3(double top1, double top2, double top3)
    {
        if (top2 == 0) return top1;
        if (top3 == 0) return (top1 + top2) / 2.0;
        return (top1 + top2 + top3) / 3.0;
    }

    private static double Round2(double value)
    {
        return Math.Round(value, 2);
    }

    private static double CalcPoints(double timeSec, double recordSec)
    {
        if (double.IsNaN(timeSec) || timeSec <= 0 || double.IsNaN(recordSec) || recordSec <= 0) return 0;

        double ratio = timeSec / recordSec;
        if (ratio >= 5) return 0;
        if (ratio >= 2) return Round2((2000.0 / 3.0) - ((400.0 / 3.0) * ratio));
        return Round2((467.0 * ratio * ratio) - (2001.0 * ratio) + 2534.0);
    }

    private sealed class WorksheetRow
    {
        public int RowNumber;
        public Dictionary<int, string> Cells = new Dictionary<int, string>();
    }
}
'@

Add-Type -TypeDefinition $source -Language CSharp -ReferencedAssemblies @(
  'System.dll',
  'System.Core.dll',
  'System.IO.Compression.dll',
  'System.IO.Compression.FileSystem.dll',
  'System.Xml.dll'
)

$root = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $root "web\utilities\test (1).xlsx"
$wrPath = Join-Path $root "web\utilities\records_kriterien.xlsx"

$summary = [LscLatestComparer]::Compare($dataPath, $wrPath)
$summary | ConvertTo-Json -Depth 5
