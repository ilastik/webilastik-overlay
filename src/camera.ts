import {vec3, mat4} from "gl-matrix"


export abstract class Camera{
    position = vec3.fromValues(0,0,0)

    world_to_view_matrix = mat4.create()
    view_to_device_matrix = mat4.create()


    public moveTo(position: vec3){
        vec3.copy(this.position, position)
    }

    public lookAt(point: vec3, up=vec3.fromValues(0,1,0)): void{
        mat4.lookAt(
            /*out=*/this.world_to_view_matrix,
            /*eye=*/this.position,
            /*center=*/point,
            /*up=*/up
        )
    }
}

export class PerspectiveCamera extends Camera{
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
        super()
        mat4.perspective(this.view_to_device_matrix, fovy, aspect, near, far)
    }
}

export class OrthoCamera extends Camera{
    constructor({left, right, bottom, top, near, far}: {
        left: number, right: number,
        bottom: number, top: number,
        near: number, far: number,
    }){
        super()
        mat4.ortho(this.view_to_device_matrix, left, right, bottom, top, near, far)
    }
}