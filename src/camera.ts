import { mat3, mat4, quat, ReadonlyVec3, vec3 } from "gl-matrix";

export const forward_c = vec3.fromValues( 0,  0, -1);
export const    left_c = vec3.fromValues(-1,  0,  0);
export const      up_c = vec3.fromValues( 0,  1,  0);


export abstract class Camera{
    position_w: vec3
    orientation: quat
    view_to_device_matrix: mat4

    public constructor({position, orientation, view_to_device_matrix}: {
        position?: vec3,
        orientation?: quat,
        view_to_device_matrix: mat4
    }){
        this.position_w = vec3.create();
        if(position !== undefined){
            vec3.copy(this.position_w, position)
        }
        this.orientation = quat.create()
        if(orientation !== undefined){
            quat.copy(this.orientation, orientation)
        }
        this.view_to_device_matrix = mat4.create(); mat4.copy(this.view_to_device_matrix, view_to_device_matrix)
    }

    public get_view_to_world_matrix(out: mat4): mat4{
        return mat4.fromRotationTranslation(out, this.orientation, this.position_w)
    }

    public get_world_to_view_matrix(out: mat4): mat4{
        this.get_view_to_world_matrix(out)
        return mat4.invert(out, out)
    }

    public reorient(orientation: quat){
        quat.copy(this.orientation, orientation)
    }

    public moveTo(position: vec3){
        vec3.copy(this.position_w, position)
    }

    public move(delta_c: ReadonlyVec3){
        let delta_w = vec3.create(); vec3.transformQuat(delta_w, delta_c, this.orientation);
        vec3.add(this.position_w, this.position_w, delta_w)
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
        quat.fromMat3(this.orientation, rotation_matrix); quat.normalize(this.orientation, this.orientation)
        vec3.copy(this.position_w, position_w)
    }

    public tiltUp(angle_rads: number){
        quat.rotateX(this.orientation, this.orientation, angle_rads)
        quat.normalize(this.orientation, this.orientation)
    }

    public rotateLeft(angle_rads: number){
        quat.rotateY(this.orientation, this.orientation, angle_rads)
        quat.normalize(this.orientation, this.orientation)
    }
}

export class PerspectiveCamera extends Camera{
    fovy: number
    aspect: number
    near: number
    far: number
    constructor({fovy=1, aspect=1, near=0.1, far=1000, position,  orientation}: {
        fovy?: number,
        aspect?: number,
        near?: number,
        far?: number,
        position?: vec3,
        orientation?: quat
    }){
        let view_to_device_matrix = mat4.create(); mat4.perspective(view_to_device_matrix, fovy, aspect, near, far)
        super({position, orientation, view_to_device_matrix})
    }
}

export class OrthoCamera extends Camera{
    constructor({left, right, bottom, top, near, far, position,  orientation}: {
        left: number,
        right: number,
        bottom: number,
        top: number,
        near: number,
        far: number,
        position?: vec3,
        orientation?: quat
    }){
        let view_to_device_matrix = mat4.create(); mat4.ortho(view_to_device_matrix, left, right, bottom, top, near, far)
        super({position, orientation, view_to_device_matrix})
    }

    public reconfigure({left, right, bottom, top, near, far}: {
        left: number,
        right: number,
        bottom: number,
        top: number,
        near: number,
        far: number,
    }){
        mat4.ortho(this.view_to_device_matrix, left, right, bottom, top, near, far)
    }
}
