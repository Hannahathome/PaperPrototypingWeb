// Exported programmatically from Processing Canvas Workspace

flap_length = 8.0;  // wedge flap length at the top of each wall strut

// --- ASSEMBLY: wall struts sheared flush at the top plane ---
difference() {
  union() {
    // --- FRUSTUM CAGE (drawn once) ---
    frustumCage(3, 45.0, 35.5, 60.0, 1.5);

    // --- INTERNAL RIGS (2) ---
    // Rig 1 (M5Core_lying)
    rigSupport(60.0, 1.5, 54.0, 54.0, 17.0, -3.5, 2.0, 4.0, 30.0, 2, 12.5);
    // Rig 2
    rigSupport(60.0, 1.5, 20.3, 10.8, 7.25, 12.0, -7.5, 30.0, -45.0, 2, 12.5);
  }
  // Top trimming slice: cuts all wall struts off straight
  translate([0, 0, 60.0/2 - 1.5])
    scale([35.5 + 1.5, 35.5 + 1.5, 1])
    cylinder(h = 1.5 * 2, r = 1, $fn = 64);
}

// Frustum cage (drawn once) + per-rig internal supports (drawn once per rig).

module frustumCage(
    frustum_nside, frustum_bottom_radius, frustum_top_radius, frustum_height, edge_radius
){
    $fn = 16;
    vertex_radius = edge_radius;
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
    bottom_cross_spokes = [
        for (i = [0 : frustum_nside - 1]) let(
            p1 = vertices[i],
            p2 = vertices[(i + 1) % frustum_nside],
            midpoint = (p1 + p2) / 2,
            center   = [0, 0, -height/2]
        )
        [midpoint, center]
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
        for (spoke = bottom_cross_spokes) {
            _local_draw_edge(spoke[0], spoke[1], edge_radius);
        }
    }
}

module rigSupport(
    frustum_height, edge_radius,
    cuboid_width, cuboid_depth, cuboid_height,
    cuboid_offset_x, cuboid_offset_y, cuboid_offset_z, cuboid_rotation,
    strut_mode = 1, strut_spacing = 15
){
    $fn = 16;
    vertex_radius   = edge_radius;
    height          = frustum_height - (2 * vertex_radius);
    hx              = cuboid_width / 2;
    hy              = cuboid_depth / 2;
    z_bottom        = -height/2;
    z_support_start = z_bottom;
    z_cuboid_bot    = z_bottom + cuboid_offset_z - edge_radius*2;
    z_cuboid_top    = z_cuboid_bot + cuboid_height;
    center_start = [cuboid_offset_x, cuboid_offset_y, z_support_start];
    center_end   = [cuboid_offset_x, cuboid_offset_y, z_cuboid_bot];
    half_sp = strut_spacing / 2;
    // strut_mode 2 = two posts per face (spread by strut_spacing); 1 = one post per face
    supports = strut_mode == 2 ? [
        // +Y face: two posts spread along X
        [[cuboid_offset_x - half_sp, cuboid_offset_y + hy + edge_radius, z_support_start],
         [cuboid_offset_x - half_sp, cuboid_offset_y + hy + edge_radius, z_cuboid_top]],
        [[cuboid_offset_x + half_sp, cuboid_offset_y + hy + edge_radius, z_support_start],
         [cuboid_offset_x + half_sp, cuboid_offset_y + hy + edge_radius, z_cuboid_top]],
        // -Y face: two posts spread along X
        [[cuboid_offset_x - half_sp, cuboid_offset_y - hy - edge_radius, z_support_start],
         [cuboid_offset_x - half_sp, cuboid_offset_y - hy - edge_radius, z_cuboid_top]],
        [[cuboid_offset_x + half_sp, cuboid_offset_y - hy - edge_radius, z_support_start],
         [cuboid_offset_x + half_sp, cuboid_offset_y - hy - edge_radius, z_cuboid_top]],
        // +X face: two posts spread along Y
        [[cuboid_offset_x + hx + edge_radius, cuboid_offset_y - half_sp, z_support_start],
         [cuboid_offset_x + hx + edge_radius, cuboid_offset_y - half_sp, z_cuboid_top]],
        [[cuboid_offset_x + hx + edge_radius, cuboid_offset_y + half_sp, z_support_start],
         [cuboid_offset_x + hx + edge_radius, cuboid_offset_y + half_sp, z_cuboid_top]],
        // -X face: two posts spread along Y
        [[cuboid_offset_x - hx - edge_radius, cuboid_offset_y - half_sp, z_support_start],
         [cuboid_offset_x - hx - edge_radius, cuboid_offset_y - half_sp, z_cuboid_top]],
        [[cuboid_offset_x - hx - edge_radius, cuboid_offset_y + half_sp, z_support_start],
         [cuboid_offset_x - hx - edge_radius, cuboid_offset_y + half_sp, z_cuboid_top]]
    ] : [
        [[cuboid_offset_x, cuboid_offset_y + hy + edge_radius, z_support_start],
         [cuboid_offset_x, cuboid_offset_y + hy + edge_radius, z_cuboid_top]],
        [[cuboid_offset_x, cuboid_offset_y - hy - edge_radius, z_support_start],
         [cuboid_offset_x, cuboid_offset_y - hy - edge_radius, z_cuboid_top]],
        [[cuboid_offset_x + hx + edge_radius, cuboid_offset_y, z_support_start],
         [cuboid_offset_x + hx + edge_radius, cuboid_offset_y, z_cuboid_top]],
        [[cuboid_offset_x - hx - edge_radius, cuboid_offset_y, z_support_start],
         [cuboid_offset_x - hx - edge_radius, cuboid_offset_y, z_cuboid_top]]
    ];
    cuboid_bottom_connectors = [
        for (line = supports) [center_start, line[0]]
    ];
    union() {
        // Spine + base link sit on the rig axis (rotation-invariant)
        _local_draw_edge(center_start, center_end, edge_radius);
        _local_draw_edge([0, 0, z_bottom], center_start, edge_radius);

        // Posts + connectors yaw about the rig centre (offset_x, offset_y)
        translate([cuboid_offset_x, cuboid_offset_y, 0])
        rotate([0, 0, cuboid_rotation])
        translate([-cuboid_offset_x, -cuboid_offset_y, 0])
        union() {
            for (line = supports) {
                _local_draw_edge(line[0], line[1], edge_radius);
                translate(line[0]) sphere(r = vertex_radius);
            }
            for (conn = cuboid_bottom_connectors) {
                _local_draw_edge(conn[0], conn[1], edge_radius);
            }
        }
    }

    // Translucent reference box (rotated about the rig centre)
    translate([cuboid_offset_x, cuboid_offset_y, z_cuboid_bot + cuboid_height/2])
        rotate([0, 0, cuboid_rotation])
            %cube([cuboid_width, cuboid_depth, cuboid_height], center=true);
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
