// FixtureHarness.pde
//
// Added by scripts/fixtures/paperpolyhedra/generate.mjs to a TEMPORARY COPY of the
// PaperPolyhedra sketch. It is never added to the PaperPrototyping repo.
//
// It waits until the sketch has finished setting up, then for each shape in
// fixture_shapes.json sets the same inputs the sidebar would (sides, top/bottom diameter,
// height, tab and flap sizes), calls applyToModel() exactly as the UI does, exports with
// exportPlan() (the E key), and finally exits.

Object __fixtureHarness = __startFixtureHarness();

Object __startFixtureHarness() {
  FixtureHarness h = new FixtureHarness();
  // "draw" runs right after the sketch's own draw(), inside the frame, so exporting from
  // here behaves exactly like pressing E.
  registerMethod("draw", h);
  return h;
}

public class FixtureHarness {
  JSONArray specs;
  int next = 0;
  int frame = 0;

  public void draw() {
    frame++;
    if (frame < 15) return;  // let setup(), the UI and the first layout settle
    if (specs == null) specs = loadJSONArray(sketchPath("fixture_shapes.json"));
    if (next >= specs.size()) {
      println("[fixtures] done");
      exit();
      return;
    }
    JSONObject s = specs.getJSONObject(next++);
    String id = s.getString("id");

    uiSides  = s.getInt("sides");
    uiTopW   = s.getFloat("topDiameter");
    uiBotW   = s.getFloat("bottomDiameter");
    uiHeight = s.getFloat("height");
    uiLock   = false;
    if (tLock != null) tLock.setState(false);
    tabDepth  = s.getFloat("tabDepth");
    flapDepth = s.getFloat("flapDepth");
    flapTaper = s.getFloat("flapTaper");

    applyToModel();
    uiExportFilename = id;
    // Export exactly as the E key does: draw() calls exportPlan() with bSavePDF set.
    bSavePDF = true;
    exportPlan();
    bSavePDF = false;
    println("[fixtures] exported " + id + " perimeters top/bottom " + cylinder.x + " / " + cylinder.y + " height " + cylinder.z);
  }
}
