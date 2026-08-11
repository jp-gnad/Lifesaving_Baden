import test from "node:test";
import assert from "node:assert/strict";
import { parseIlsRecordsHtml } from "../src/index.js";

const fixture = `
  <select>
    <optgroup label="Individual">
      <option value="200m-obstacle-swim">200m Obstacle Swim</option>
    </optgroup>
    <optgroup label="Team">
      <option value="pool-lifesaver-relay">4x50m Pool Lifesaver Relay</option>
    </optgroup>
  </select>
  <table>
    <tr id="r-1" class="record-table-row font-medium">
      <td data-label="Event">Open - 200m Obstacle Swim - Men</td>
      <td data-label="Competitor">Example</td>
      <td data-label="Date"><span>Southport<br />29-08-2024</span></td>
      <td data-label="Time">1:51.73</td>
      <td data-label="History"><a href="/records/world/open/200m-obstacle-swim/men">History</a></td>
    </tr>
    <tr id="r-2" class="record-table-row font-medium">
      <td data-label="Event">Masters - 200m Obstacle Swim - Women - M30</td>
      <td data-label="Competitor">Example</td>
      <td data-label="Date">01-01-2026</td>
      <td data-label="Time">2:10.14</td>
      <td data-label="History"></td>
    </tr>
    <tr id="r-3" class="record-table-row font-medium">
      <td data-label="Event">Youth - 4x50m Pool Lifesaver Relay - Mixed</td>
      <td data-label="Competitor">Example Team</td>
      <td data-label="Date">27-08-2025</td>
      <td data-label="Time">1:49.14</td>
      <td data-label="History"></td>
    </tr>
  </table>
`;

test("parses current individual, masters and mixed team records", () => {
  const records = parseIlsRecordsHtml(fixture);
  assert.equal(records.length, 3);

  assert.deepEqual(records[0], {
    category: "open",
    age: "Open",
    gender: "male",
    event: "200m Obstacle Swim",
    kind: "individual",
    time: "1:51.73",
    seconds: 111.73,
    date: "29-08-2024",
    historyUrl: "https://sport.ilsf.org/records/world/open/200m-obstacle-swim/men"
  });

  assert.equal(records[1].category, "masters");
  assert.equal(records[1].age, "M30");
  assert.equal(records[1].gender, "female");
  assert.equal(records[1].seconds, 130.14);

  assert.equal(records[2].category, "youth");
  assert.equal(records[2].gender, "mixed");
  assert.equal(records[2].kind, "team");
});
