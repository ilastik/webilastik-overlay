import {vec3, mat4, quat, mat3} from "gl-matrix"

export abstract class Camera{
    position_w = vec3.fromValues(0,0,0)
    rotation = quat.create()

    view_to_device_matrix = mat4.create()

    public get_view_to_world_matrix(out: mat4): mat4{
        return mat4.fromRotationTranslation(out, this.rotation, this.position_w)
    }

    public get_world_to_view_matrix(out: mat4): mat4{
        this.get_view_to_world_matrix(out)
        return mat4.invert(out, out)
    }

    public moveTo(position: vec3){
        vec3.copy(this.position_w, position)
    }

    public lookAt({target_w, up_w=vec3.fromValues(0,1,0), position_w}: {
        target_w: vec3, up_w: vec3, position_w: vec3
    }){
        let world_to_view = mat4.create(); mat4.lookAt(
            /*out=*/world_to_view,
            /*eye=*/position_w,
            /*center=*/target_w,
            /*up=*/up_w
        )
        let view_to_world = mat4.create(); mat4.invert(view_to_world, world_to_view);
        let rotation_matrix = mat3.create(); mat3.fromMat4(rotation_matrix, view_to_world);
        quat.fromMat3(this.rotation, rotation_matrix); quat.normalize(this.rotation, this.rotation)
        vec3.copy(this.position_w, position_w)
    }

    public tiltUp(angle_rads: number){
        quat.rotateX(this.rotation, this.rotation, angle_rads)
        quat.normalize(this.rotation, this.rotation)
    }

    public rotateLeft(angle_rads: number){
        quat.rotateY(this.rotation, this.rotation, angle_rads)
        quat.normalize(this.rotation, this.rotation)
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