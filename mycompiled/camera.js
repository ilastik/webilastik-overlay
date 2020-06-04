import { vec3, mat4 } from "gl-matrix";
export class PerspectiveCamera {
    constructor({ fovy = 2, aspect = 1, near = 0.1, far = 1000 }) {
        this.position = vec3.fromValues(0, 0, 0);
        this.world_to_view_matrix = mat4.create();
        this.view_to_perspective_matrix = mat4.create();
        mat4.perspective(this.view_to_perspective_matrix, fovy, aspect, near, far);
    }
    moveTo(position) {
        vec3.copy(this.position, position);
    }
    lookAt(point, up = vec3.fromValues(0, 1, 0)) {
        mat4.lookAt(
        /*out=*/ this.world_to_view_matrix, 
        /*eye=*/ this.position, 
        /*center=*/ point, 
        /*up=*/ up);
    }
    get world_to_perspective_matrix() {
        let out = mat4.create();
        return mat4.mul(out, this.view_to_perspective_matrix, this.world_to_view_matrix);
    }
}
//# sourceMappingURL=camera.js.map