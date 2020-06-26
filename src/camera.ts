import {vec3, mat4, quat, mat3, vec4} from "gl-matrix"
import { Plane, MeshObject } from "./shapes";
import { StandardShaderProgram, RenderParams } from "./standard_shader";

export const forward_c = vec3.fromValues( 0,  0, -1);
export const    left_c = vec3.fromValues(-1,  0,  0);
export const      up_c = vec3.fromValues( 0,  1,  0);


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

    public move(delta_c: vec3){
        let delta_w = vec3.create(); vec3.transformQuat(delta_w, delta_c, this.rotation);
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
    constructor({fovy=1, aspect=1, near=0.1, far=1000}: {
        fovy?: number,
        aspect?: number,
        near?: number,
        far?: number
    }){
        super()
        mat4.perspective(this.view_to_device_matrix, fovy, aspect, near, far)
    }
}

export interface OrthoCameraConfig{
    left: number, right: number,
    bottom: number, top: number,
    near: number, far: number,
}

export class OrthoCamera extends Camera{
    constructor({left, right, bottom, top, near, far}: OrthoCameraConfig){
        super()
        mat4.ortho(this.view_to_device_matrix, left, right, bottom, top, near, far)
    }
}

export class SlicingCamera{
    slicing_plane: Plane
    private main_renderer : StandardShaderProgram
    constructor(public readonly gl: WebGL2RenderingContext, public readonly camera: Camera, slicing_plane_position_c: vec3){
        this.main_renderer =  new StandardShaderProgram(gl)
        this.slicing_plane = new Plane({gl}, slicing_plane_position_c)
    }

    public render_slicing_plane(){
        //let move_slicing_plane_matrix = mat4.create(); mat4.fromRotationTranslation(move_slicing_plane_matrix, quat.create(), vec3.fromValues(0,0, -3))
        this.main_renderer.run({
            vao: this.slicing_plane.vao,
            u_color: vec4.fromValues(1, 0 ,0, 1),
            u_object_to_world: mat4.create(),
            u_world_to_view: mat4.create(),
            u_view_to_device: this.camera.view_to_device_matrix,

            renderParams: {
                //colorMask: {r: false, g: false, b: false, a: false}, //disable drawing of colors. only interested in depth
            }
        });
    }

    public sliced_render(obj: MeshObject, color: vec4){
        this.render(obj, color, {})
    }

    private render(obj: MeshObject, color: vec4, renderParams: RenderParams){
        this.render_slicing_plane() //this should happen just once, not for every cube being rendered

        let world_to_view_matrix = mat4.create(); this.camera.get_world_to_view_matrix(world_to_view_matrix)
        this.main_renderer.run({
            vao: obj.vao,
            u_color: color,
            u_object_to_world: obj.object_to_world_matrix,
            u_world_to_view: world_to_view_matrix,
            u_view_to_device: this.camera.view_to_device_matrix,

            renderParams
        });
    }
}