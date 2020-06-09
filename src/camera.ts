import {vec3, mat4} from "gl-matrix"

export interface Camera{
    world_to_view_matrix: mat4
    view_to_device_matrix: mat4
}

export class PerspectiveCamera implements Camera{
    position = vec3.fromValues(0,0,0)

    world_to_view_matrix = mat4.create()
    view_to_device_matrix = mat4.create()

    fovy: number
    aspect: number
    near: number
    far: number
    constructor({fovy=2, aspect=1, near=0.1, far=1000}: {
        fovy?: number,
        aspect?: number,
        near?: number,
        far?: number
    }){
        mat4.perspective(this.view_to_device_matrix, fovy, aspect, near, far)
    }

    public moveTo(position: vec3){
        vec3.copy(this.position, position)
    }

    public lookAt(point: vec3, up=vec3.fromValues(0,1,0)){
        mat4.lookAt(
            /*out=*/this.world_to_view_matrix,
            /*eye=*/this.position,
            /*center=*/point,
            /*up=*/up
        )
    }
}