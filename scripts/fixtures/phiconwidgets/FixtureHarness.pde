// FixtureHarness.pde
//
// Added by scripts/fixtures/paperphicons/generate.mjs to a TEMPORARY COPY of the PaperPhicons
// sketch. It is never added to the TEI27Software folder.
//
// For each case in fixture_cases.json: set the block and marker settings, wait a few frames
// (draw() computes the copy spacing from the previous frame's sizes, as it does when a user
// types and then clicks Export), request an export (the Export button), and move the files it
// writes into fixture_out/<id>/ (the sketch names exports by timestamp only).

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
  String pending = null;
  int waitFrames = 0;
  int settleFrames = 0;

  public void draw() {
    frame++;
    if (frame < 10) return;
    if (cases == null) cases = loadJSONArray(sketchPath("fixture_cases.json"));

    if (pending != null) {
      if (settleFrames > 0) {
        if (--settleFrames == 0) bSavePDF = true;
        return;
      }
      if (waitFrames-- > 0) return;
      File out = new File(sketchPath("output"));
      File dest = new File(sketchPath("fixture_out/" + pending));
      dest.mkdirs();
      File[] files = out.listFiles();
      if (files != null) for (File f : files) f.renameTo(new File(dest, f.getName()));
      println("[fixtures] exported " + pending);
      pending = null;
      return;
    }
    if (next >= cases.size()) {
      println("[fixtures] done");
      exit();
      return;
    }
    JSONObject c = cases.getJSONObject(next++);
    voxelW = c.getFloat("width");
    voxelL = c.getFloat("length");
    voxelH = c.getFloat("height");
    Start_Index = c.getInt("markerId");
    Marker_Size = c.getInt("markerSize");
    nRep = c.getInt("repeat");
    Marker_Pos = c.getBoolean("markerOnSide");
    Marker_OffY = c.getInt("markerOffsetY");
    // The sketch always exports the cut-out being edited (the "pending" one) as well as the
    // added ones: add all but the last, and make the last the pending one.
    cutouts.clear();
    JSONArray cs = c.getJSONArray("cutouts");
    showCutouts = cs.size() > 0;
    for (int k = 0; k < cs.size(); k++) {
      JSONObject o = cs.getJSONObject(k);
      int type = o.getString("shape").equals("square") ? CUT_SQUARE : o.getString("shape").equals("pill") ? CUT_PILL : CUT_CIRCLE;
      float w = o.getFloat("width");
      float h = o.getFloat("height");
      float x = o.getFloat("x");
      float y = o.getFloat("y");
      boolean v = o.getBoolean("vertical");
      if (k < cs.size() - 1) {
        cutouts.add(new Cutout(type, w, h, x, y, v));
      } else {
        cutType = type; cutW = w; cutH = h; cutOffX = x; cutOffY = y; cutVertical = v;
      }
    }
    pending = c.getString("id");
    settleFrames = 3;
    waitFrames = 1;
  }
}
