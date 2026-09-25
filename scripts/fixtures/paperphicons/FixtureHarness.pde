// FixtureHarness.pde
//
// Added by scripts/fixtures/paperphicons/generate.mjs to a TEMPORARY COPY of the PaperPhicons
// sketch. It is never added to the PaperPrototyping repo.
//
// For each case in fixture_cases.json: set the block and marker settings, wait a few frames
// (draw() computes the copy spacing from the previous frame's sizes, as it does when a user
// types and then clicks Export), request an export (the Export button), and move the files it
// writes into fixture_out/<id>/ (PaperPhicons names exports by timestamp only).

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
    pending = c.getString("id");
    settleFrames = 3;
    waitFrames = 1;
  }
}
