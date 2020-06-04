import { vec3, quat, mat4 } from "gl-matrix";
import { Buffer } from "./glsl";
import { StandardVAO } from "./standard_shader";
export class Cube {
    constructor({ gl, position = vec3.fromValues(0, 0, 0), rotation = quat.create() }) {
        this.gl = gl;
        this.position = position;
        this.rotation = rotation;
        this.verts = new Float32Array([
            // front face
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, 1.0, 1.0,
            -1.0, 1.0, 1.0,
            // back face
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,
            1.0, 1.0, -1.0,
            1.0, -1.0, -1.0,
            // top face
            -1.0, 1.0, -1.0,
            -1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, -1.0,
            // bottom face
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0,
            // right face
            1.0, -1.0, -1.0,
            1.0, 1.0, -1.0,
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,
            // left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0,
            -1.0, 1.0, -1.0
        ]);
        this.vert_buffer = new Buffer(this.gl, "cube_vert_buffer", this.verts, "STATIC_DRAW");
        this.vao = new StandardVAO({ gl: gl, a_position_buffer: this.vert_buffer });
    }
    get object_to_world_matrix() {
        let out = mat4.create();
        mat4.fromRotationTranslation(out, this.rotation, this.position);
        return out;
    }
    render(camera) {
        let object_to_clip_matrix = mat4.create();
        mat4.mul(object_to_clip_matrix, camera.world_to_perspective_matrix, this.object_to_world_matrix);
        this.vao.render({ u_object_to_clip_value: object_to_clip_matrix });
    }
}
//# sourceMappingURL=shapes.js.map