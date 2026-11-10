// FixtureHarness.pde
//
// Added by scripts/fixtures/frustumsupport/generate.mjs to a TEMPORARY COPY of the
// FrustumSupport sketch. It is never added to the PaperPrototyping repo.
//
// After setup, for each case in fixture_cases.json it sets the frustum parameters, the rigs
// and the strut options, and writes the .scad with saveOpenSCADFile() (the SAVE button).
// Values are set and saved within one callback, before readControllers() runs again.

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
    if (frame < 10) return;
    if (cases == null) cases = loadJSONArray(sketchPath("fixture_cases.json"));
    if (next >= cases.size()) {
      println("[fixtures] done");
      exit();
      return;
    }
    JSONObject c = cases.getJSONObject(next++);
    String id = c.getString("id");

    globalParams[0] = c.getInt("nside");
    globalParams[1] = c.getFloat("bottomRadius");
    globalParams[2] = c.getFloat("topRadius");
    globalParams[3] = c.getFloat("height");
    globalParams[4] = c.getFloat("edgeRadius");
    cuboidEnabled = c.getBoolean("rigsEnabled");
    dualStruts = c.getBoolean("dualStruts");
    strutSpacing = c.getFloat("strutSpacing");

    rigs.clear();
    JSONArray rs = c.getJSONArray("rigs");
    for (int i = 0; i < rs.size(); i++) {
      JSONObject r = rs.getJSONObject(i);
      Rig rig = new Rig(r.getFloat("width"), r.getFloat("depth"), r.getFloat("height"),
                        r.getFloat("offsetX"), r.getFloat("offsetY"), r.getFloat("offsetZ"), r.getFloat("rotation"));
      rig.template = r.getString("template");
      rigs.add(rig);
    }
    selectedRig = 0;

    saveOpenSCADFile(sketchPath("fixture_out/" + id + ".scad"));
    println("[fixtures] exported " + id);
  }
}
