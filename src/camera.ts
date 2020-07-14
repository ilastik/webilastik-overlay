import {vec3, mat4, quat, mat3, vec4, ReadonlyVec3} from "gl-matrix"
import { Cube } from "./shapes";
import { SlicingShaderProgram } from "./slicing_shader";
import { StandardShaderProgram } from "./standard_shader";
// import { ShaderProgram } from "./shader";
//import { CullFace, FrontFace } from "./gl";

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
    private slicing_program: SlicingShaderProgram
    private standard_program: StandardShaderProgram
    private voxel = new Cube({gl: this.gl, scale: vec3.fromValues(0.5, 0.5, 0.5)});

    constructor(public readonly gl: WebGL2RenderingContext, public readonly camera: Camera){
        this.slicing_program = new SlicingShaderProgram(gl);
        this.standard_program = new StandardShaderProgram(gl, {solid_color: false})
    }

    private render_sliced(color: vec4, world_to_view_matrix: mat4, u_cube_position_w: vec3){
        this.slicing_program.run({
            vao: this.voxel.vao,

            u_color: color,
            u_world_to_view: world_to_view_matrix,
            u_view_to_device: this.camera.view_to_device_matrix,
            u_cube_position_w: u_cube_position_w,

            renderParams: {
                // cullConfig:{
                //     face: CullFace.FRONT,
                //     frontFace: FrontFace.CCW,
                // },
            }
        });
    }

    private render_standard(color: vec4, world_to_view_matrix: mat4){
        this.standard_program.run({
            vao: this.voxel.vao,

            u_color: color,
            u_object_to_world: this.voxel.object_to_world_matrix,
            u_world_to_view: world_to_view_matrix,
            u_view_to_device: this.camera.view_to_device_matrix,

            renderParams: {
                // cullConfig:{
                //     face: CullFace.FRONT,
                //     frontFace: FrontFace.CCW,
                // },
            }
        })
    }

    public renderBrushStroke(brushStroke: Array<vec3>, color: vec4, sliced: boolean){
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);

        let world_to_view_matrix = mat4.create(); this.camera.get_world_to_view_matrix(world_to_view_matrix)

        let cube_pos = vec3.create();
        vec3.transformMat4(cube_pos, brushStroke[0], world_to_view_matrix);
        vec3.transformMat4(cube_pos, cube_pos, this.camera.view_to_device_matrix);
        // console.log(`Cube_pos.z: ${cube_pos[2]}`)
        if(sliced){
            this.render_sliced(color, world_to_view_matrix, brushStroke[0])
        }else{
            this.render_standard(color, world_to_view_matrix)
        }
    }
}