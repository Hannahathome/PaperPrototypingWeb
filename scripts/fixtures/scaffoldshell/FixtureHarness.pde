// FixtureHarness.pde
//
// Added by scripts/fixtures/scaffoldshell/generate.mjs to a TEMPORARY COPY of the ScaffoldShell
// sketch. It is never added to the PaperPrototyping repo.
//
// For each case in fixture_cases.json: set the shape as the sidebar would (then applyToModel()),
// set the selected shape's scaffold (FrameSpec and rigs), and export as the E key does (bSavePDF
// set around exportPlan()),
// which writes the PDF, the fold and calibration SVGs and one .scad per framed shape.

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

  public void draw() {
    frame++;
    if (frame < 15) return;
    if (cases == null) cases = loadJSONArray(sketchPath("fixture_cases.json"));
    if (next >= cases.size()) {
      println("[fixtures] done");
      exit();
      return;
    }
    JSONObject c = cases.getJSONObject(next++);
    String id = c.getString("id");

    uiSides  = c.getInt("sides");
    uiTopW   = c.getFloat("topDiameter");
    uiBotW   = c.getFloat("bottomDiameter");
    uiHeight = c.getFloat("height");
    uiLock   = false;
    if (tLock != null) tLock.setState(false);
    tabDepth  = c.getFloat("tabDepth");
    flapDepth = c.getFloat("flapDepth");
    flapTaper = c.getFloat("flapTaper");
    applyToModel();

    ShapeSpec s = shapes.get(selectedShapeIdx);
    JSONObject f = c.getJSONObject("frame");
    s.frame.enabled      = true;
    s.frame.strutRadius  = f.getFloat("strutRadius");
    s.frame.clearanceMM  = f.getFloat("clearance");
    s.frame.dualStruts   = f.getBoolean("dualStruts");
    s.frame.strutSpacing = f.getFloat("strutSpacing");
    s.frame.flapLength   = f.getFloat("flapLength");
    s.frame.rigs.clear();
    JSONArray rs = f.getJSONArray("rigs");
    for (int i = 0; i < rs.size(); i++) {
      JSONObject r = rs.getJSONObject(i);
      Rig rig = new Rig(r.getFloat("width"), r.getFloat("depth"), r.getFloat("height"),
                        r.getFloat("offsetX"), r.getFloat("offsetY"), r.getFloat("offsetZ"), r.getFloat("rotation"));
      rig.preset     = r.getString("preset");
      rig.cutoutFace = r.getInt("cutoutFace");
      rig.cutoutSize = r.getInt("cutoutSize");
      s.frame.rigs.add(rig);
    }
    uiExportFilename = id;
    // Export exactly as the E key does: draw() calls exportPlan() with bSavePDF set.
    bSavePDF = true;
    exportPlan();
    bSavePDF = false;
    println("[fixtures] exported " + id);
  }
}
