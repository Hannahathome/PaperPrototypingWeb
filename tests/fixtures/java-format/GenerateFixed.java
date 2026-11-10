// Writes fixed-4.tsv: float bits and String.format(Locale.US, "%.4f", float) as ScaffoldShell's
// scadNum() prints it, for tests/lib/java-format.test.ts.
// Run with the JDK bundled in Processing 4.3: java GenerateFixed.java > fixed-4.tsv
import java.util.Locale;
import java.util.Random;
public class GenerateFixed { public static void main(String[] a) {
  Random r = new Random(20260926L);
  StringBuilder sb = new StringBuilder();
  float[] special = {0f, -0f, 0.03125f, -0.03125f, 1.53125f, -1.53125f, 0.00005f, -0.00005f, 0.00004f, -0.00004f, 99999.99995f, 20.3f, -112.5f, 1e-7f, -1e-7f, 123456789f};
  for (float x : special) sb.append(Float.floatToRawIntBits(x)).append('\t').append(String.format(Locale.US, "%.4f", x)).append('\n');
  for (int i = 0; i < 5000; i++) {
    float x;
    switch (i % 5) {
      case 0: x = Math.round(r.nextFloat() * 4000 - 2000) / 2f; break;
      case 1: x = Math.round(r.nextFloat() * 2000000 - 1000000) / 10000f; break;   // 4-decimal values
      case 2: x = (float)(r.nextDouble() * 500 - 250); break;
      case 3: x = Math.round(r.nextFloat() * 64000 - 32000) / 32f; break;             // exact binary ties
      default: x = (float)Math.pow(10, r.nextDouble() * 10 - 6) * (r.nextBoolean() ? 1 : -1); break;
    }
    sb.append(Float.floatToRawIntBits(x)).append('\t').append(String.format(Locale.US, "%.4f", x)).append('\n');
  }
  System.out.print(sb);
}}
