import {vec3, mat4, quat, mat3, vec4, ReadonlyVec3} from "gl-matrix"
import { Cube } from "./shapes";
import { SlicingShaderProgram } from "./slicing_shader";
import { StandardShaderProgram } from "./standard_shader";
import { BlendFactor, RenderParams, CullConfig, DepthConfig, BlendingConfig, CullFace, FrontFace } from "./gl";

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
}

export class SlicingCamera{
    private slicing_program: SlicingShaderProgram
    private standard_program: StandardShaderProgram
    private voxel : Cube;


    constructor(public readonly gl: WebGL2RenderingContext, public readonly camera: Camera){
        this.slicing_program = new SlicingShaderProgram(gl);
        this.standard_program = new StandardShaderProgram(gl, {solid_color: false})
        this.voxel = new Cube({gl: this.gl});
    }

    private render_sliced(color: vec4, brushStroke: Array<vec3>){
        this.voxel.moveTo(vec3.fromValues(0,0,0));
        let world_to_view_matrix = mat4.create(); this.camera.get_world_to_view_matrix(world_to_view_matrix)

        console.log("=============================")
        for(let vox_position of brushStroke){
            ////DEBUG BEGIN//////
            let cube_pos = vec3.create();
            vec3.transformMat4(cube_pos, vox_position, world_to_view_matrix);
            vec3.transformMat4(cube_pos, cube_pos, this.camera.view_to_device_matrix);
            console.log(`Cube_pos.z: ${cube_pos[2]}`)
            ////DEBUG END//////


            this.slicing_program.run({
                vao: this.voxel.vao,

                u_color: color,
                u_world_to_view: world_to_view_matrix,
                u_view_to_device: this.camera.view_to_device_matrix,
                u_cube_position_w: vox_position,

                renderParams: new RenderParams({
                    depthConfig: new DepthConfig({
                        mask: false, //disable writing to depth buffer
                    }),
                    blendingConfig: new BlendingConfig({
                        sfactor: BlendFactor.SRC_ALPHA,
                        dfactor: BlendFactor.ONE_MINUS_SRC_ALPHA,
                        color: vec4.fromValues(1, 1, 1, 0)
                    }),
                    cullConfig: new CullConfig({
                        enable: false,  //DEBUG: don't cull so we can see backfaces
                        face: CullFace.FRONT,
                        frontFace: FrontFace.CCW,
                    })
                }),
            });
        }
    }

    private render_standard(color: vec4, brushStroke: Array<vec3>){
        let world_to_view_matrix = mat4.create(); this.camera.get_world_to_view_matrix(world_to_view_matrix)

        for(let vox_position of brushStroke){
            console.log(`Moving voxel to ${vox_position}`)
            this.voxel.moveTo(vox_position);
            console.log(`--> obj_to_world: ${this.voxel.object_to_world_matrix}`)
            this.standard_program.run({
                vao: this.voxel.vao,

                u_color: color,
                u_object_to_world: this.voxel.object_to_world_matrix,
                u_world_to_view: world_to_view_matrix,
                u_view_to_device: this.camera.view_to_device_matrix,

                renderParams: new RenderParams({})
            })
        }
    }

    public renderBrushStroke({color, brushStroke}: {brushStroke: Array<vec3>, color: vec4}){
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);

        this.render_standard(color, brushStroke)
        this.gl.clear(this.gl.DEPTH_BUFFER_BIT); //do not let debug rendering disturb slicing?
        this.render_sliced(color, brushStroke)
    }
}