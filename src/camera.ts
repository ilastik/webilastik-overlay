import {vec3, mat4, quat, mat3, vec4, ReadonlyVec3} from "gl-matrix"
import { Plane, MeshObject } from "./shapes";
import { StandardShaderProgram, RenderParams} from "./standard_shader";
import { CullFace, FrontFace, DepthFunc } from "./gl";

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

    public move(delta_c: ReadonlyVec3){
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
    private solid_renderer : StandardShaderProgram
    private identity_mat = mat4.create()
    constructor(public readonly gl: WebGL2RenderingContext, public readonly camera: Camera, slicing_plane_position_c: vec3){
        this.main_renderer =  new StandardShaderProgram(gl, {solid_color: false})
        this.solid_renderer = new StandardShaderProgram(gl, {solid_color: true})
        this.slicing_plane = new Plane({gl}, slicing_plane_position_c)
    }

    public sliced_render(obj: MeshObject, color: vec4){
        // these should happen just once, not for every cube being rendered
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);


        //render the entire cube so we can have some bearing. Debug only, this can be removed ******
        this.render(obj, vec4.fromValues(color[0], color[1], color[2], 0.8), {
            // stencilConfig: {
            //     func: "EQUAL", ref: 1, mask: 0xFFFFFFFF,//if stencil is 1, pass
            //     fail: "KEEP", zfail: "KEEP", zpass: "KEEP", // do not touch stencil
            // },
            cullConfig:{
                face: CullFace.BACK, //cull the BACK faces (i.e.: render just front faces) into the color buffer
                frontFace: FrontFace.CCW,
            },
        })

        //render the slicing plane just so we get depth values **************
        this.main_renderer.run({
            vao: this.slicing_plane.vao,
            u_color: vec4.fromValues(1, 0 ,0, 0.1),
            u_object_to_world: this.identity_mat,
            u_world_to_view: this.identity_mat,
            u_view_to_device: this.camera.view_to_device_matrix,

            renderParams: {
                depthConfig: {
                    mask: true,
                    func: DepthFunc.ALWAYS,
                }
                //colorMask: {r: false, g: false, b: false, a: false}, //disable drawing of colors. only interested in depth
            }
        });

        // Create the stencil of the part of the cube behind the slicing plane ***************
        this.render(obj, color, {
            depthConfig:{
                mask: false, //do not update depth buffer when doing stencil stuff
                func: DepthFunc.GREATER, //only render the stencil behind the slicing place
            },
            colorMask: {r: false, g: false, b: false, a: false}, //disable drawing of colors. only interested in stencil
            stencilConfig: {
                func: "ALWAYS", ref: 1 /*DON'T CARE*/, mask: 0xFFFFFFFF, //always pass test to update the stencil buffer with stencil_plane geometry
                fail: "ZERO", zfail: "ZERO", zpass: "INCR"//since the buffer has been reset, this should increment the buffer to 1
            },
            cullConfig:{
                face: CullFace.FRONT, //cull the front faces (i.e.: render just the backfaces) into the stencil buffer
                frontFace: FrontFace.CCW,
            },
        })

        //Then, finally, draw the front of the cube, only on stencil, as solid colors *******************
        this.render(obj, vec4.fromValues(1, 0, 1, 0.2), {
            stencilConfig: {
                func: "EQUAL", ref: 1, mask: 0xFFFFFFFF,//if stencil is 1, pass
                fail: "KEEP", zfail: "KEEP", zpass: "KEEP", // do not touch stencil
            },
        }, this.solid_renderer)

    }

    private render(obj: MeshObject, color: vec4, renderParams: RenderParams, renderer?: StandardShaderProgram){
        let world_to_view_matrix = mat4.create(); this.camera.get_world_to_view_matrix(world_to_view_matrix)
        let active_renderer = renderer === undefined ? this.main_renderer : renderer;
        active_renderer.run({
            vao: obj.vao,
            u_color: color,
            u_object_to_world: obj.object_to_world_matrix,
            u_world_to_view: world_to_view_matrix,
            u_view_to_device: this.camera.view_to_device_matrix,

            renderParams
        });
    }
}