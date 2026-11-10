import java.util.Random;
// Writes float-strings.tsv: float bits and Java 17 Float.toString, for tests/lib/java-format.test.ts.
// Run with the JDK bundled in Processing 4.3: java Generate.java > float-strings.tsv
public class Generate { public static void main(String[] a) {
  Random r = new Random(20260925L);
  StringBuilder sb = new StringBuilder();
  for (int i = 0; i < 5000; i++) {
    float x;
    switch (i % 5) {
      case 0: x = Math.round(r.nextFloat() * 4000 - 2000) / 2f; break;          // UI steps of 0.5
      case 1: x = Math.round(r.nextFloat() * 200000 - 100000) / 100f; break;    // typed 2-decimal values
      case 2: x = (float)(r.nextDouble() * 500); break;                           // arbitrary
      case 3: x = (float)Math.pow(10, r.nextDouble() * 16 - 8); break;           // tiny to huge
      default: x = Float.intBitsToFloat(r.nextInt()); if (Float.isNaN(x)) x = 1; break; // any bits
    }
    sb.append(Float.floatToRawIntBits(x)).append('\t').append("" + x).append('\n');
  }
  System.out.print(sb);
}}
