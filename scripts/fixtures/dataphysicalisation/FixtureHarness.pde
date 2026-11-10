// FixtureHarness.pde
//
// Added by scripts/fixtures/dataphysicalisation/generate.mjs to a TEMPORARY COPY of the
// DataPhysicalisation sketch. It is never added to the PaperPrototyping repo.
//
// For each case in fixture_cases.json: load the CSV as fileSelected() does (which also picks
// the default column mapping), apply the case's mapping and settings, and call exportJSON()
// (the Export JSON button) with the case id as file name.

Object __fixtureHarness = __startFixtureHarness();

Object __startFixtureHarness() {
  FixtureHarness h = new FixtureHarness();
  registerMethod("draw", h);
  return h;
}

public class FixtureHarness {
  JSONArray cases;
  int next = 0;
  int frame = 0;

  int colIndex(JSONObject map, String key, int current) {
    if (!map.hasKey(key)) return current;          // keep the default mapping
    if (map.isNull(key)) return -1;                // explicitly unmapped
    return java.util.Arrays.asList(columnNames).indexOf(map.getString(key));
  }

  public void draw() {
    frame++;
    if (frame < 10) return;
    if (cases == null) cases = loadJSONArray(sketchPath("fixture_cases.json"));
    if (next >= cases.size()) {
      println("[fixtures] done");
      exit();
      return;
    }
    JSONObject c = cases.getJSONObject(next++);
    String id = c.getString("id");

    fileSelected(new File(sketchPath(c.getString("csv"))));
    JSONObject map = c.getJSONObject("mapping");
    mapLabel    = colIndex(map, "label", mapLabel);
    mapHeight   = colIndex(map, "height", mapHeight);
    mapDiameter = colIndex(map, "diameter", mapDiameter);
    mapWidth    = colIndex(map, "width", mapWidth);
    mapDepth    = colIndex(map, "depth", mapDepth);
    mapSides    = colIndex(map, "sides", mapSides);
    mapColor    = colIndex(map, "color", mapColor);

    polyMode     = c.getString("mode").equals("polyhedra");
    barLinked    = c.getString("barSize").equals("linked");
    trueSize     = c.getBoolean("trueSize");
    scaleH       = c.getFloat("scaleH");
    minHeightPct = c.getFloat("minHeightPct");
    scaleDiam    = c.getFloat("scaleDiam");
    minDiamPct   = c.getFloat("minDiamPct");
    scaleSides   = c.getInt("scaleSides");
    thresholdStr = c.getString("thresholds");
    parseThresholds();
    if (c.getInt("visible") > 0) visibleBars = c.getInt("visible");

    cp5.get(Textfield.class, "exportName").setText("fixture_out/" + id);
    exportJSON();
    println("[fixtures] exported " + id + ": " + exportMsg);
  }
}
