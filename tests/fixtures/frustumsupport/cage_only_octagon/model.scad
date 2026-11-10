// Exported programmatically from Processing Canvas Workspace

flap_length = 8.0;  // wedge flap length at the top of each wall strut

// --- ASSEMBLY: wall struts sheared flush at the top plane ---
difference() {
  frustum(8, 20.0, 25.0, 40.0, 1.0);
  // Top trimming slice: cuts all wall struts off straight
  translate([0, 0, 40.0/2 - 1.0])
    scale([25.0 + 1.0, 25.0 + 1.0, 1])
    cylinder(h = 1.0 * 2, r = 1, $fn = 64);
}

module frustum(
    frustum_nside, frustum_bottom_radius, frustum_top_radius, frustum_height, edge_radius
){
    vertex_radius = edge_radius;
    $fn = 16;
    bottom_radius = frustum_bottom_radius - edge_radius;
    top_radius    = frustum_top_radius - edge_radius;
    height        = frustum_height - (2 * vertex_radius);
    vertices = [
        for (i = [0 : frustum_nside - 1])
            let(angle = i * 360 / frustum_nside)
            [bottom_radius * cos(angle), bottom_radius * sin(angle), -height/2],
            
        for (i = [0 : frustum_nside - 1])
            let(angle = i * 360 / frustum_nside)
            [top_radius * cos(angle), top_radius * sin(angle), height/2]
    ];
    union() {
        for (i = [0 : frustum_nside - 1]) {
            translate(vertices[i]) sphere(r = vertex_radius);
        }
        // Bottom perimeter ring
        for (i = [0 : frustum_nside - 1]) {
            _local_draw_edge(vertices[i], vertices[(i + 1) % frustum_nside], edge_radius);
        }
        // Vertical wall struts (wedged flap tips, sheared flush by the top slice)
        for (i = [0 : frustum_nside - 1]) {
            _local_draw_half_edge(vertices[i], vertices[i + frustum_nside], edge_radius, 0);
        }
    }
}

module _local_draw_edge(p1, p2, r) {
    v = p2 - p1;
    d = norm(v);
    b = acos(v[2] / d);
    a = atan2(v[1], v[0]);
    translate(p1)
    rotate([0, b, a])
    cylinder(h = d, r = r);
}

// Vertical wall strut: a full cylinder whose top `flap_length` tapers
// linearly into a half-circle, forming an angled wedge flap at the tip.
// The flap is then sheared flush by the top trimming slice in the export.
// Reads the global `flap_length` (written near the top of the exported file).
module _local_draw_half_edge(p1, p2, r, pillar_rot = 0) {
    v = p2 - p1;
    d = norm(v);
    b = acos(v[2] / d);
    a = atan2(v[1], v[0]);

    extended_height = d + r;
    height_80 = extended_height - flap_length;   // where the taper begins
    height_20 = flap_length;

    translate(p1)
    rotate([0, b, a])
    rotate([0, 0, pillar_rot])
    difference() {
        // Core full-thickness strut
        cylinder(h = extended_height, r = r);

        // Linear wedge cutter over the top flap_length: stays outside the
        // radius at the taper start, sweeps to the centre line (Y=0) at the tip.
        translate([0, 0, height_80]) {
            hull() {
                translate([-r*2, r, 0])
                    cube([r*4, r*2, 0.01]);
                translate([-r*2, 0, height_20])
                    cube([r*4, r*2, 0.01]);
            }
            // Clean-up block past the tip so no ghost fragments remain
            translate([-r*2, 0, height_20 - 0.01])
                cube([r*4, r*2, r * 2]);
        }
    }
}
