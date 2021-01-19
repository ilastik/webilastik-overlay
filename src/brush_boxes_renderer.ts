import { mat3, mat4, vec3, vec4 } from "gl-matrix"
import { BrushStroke, VoxelShape } from "."
import { BufferUsageHint, VertexArrayObject } from "./buffer"
import { Camera } from "./camera"
import { RenderParams } from "./gl"
import { FragmentShader, ShaderProgram, VertexShader } from "./shader"
import { Cube } from "./shapes"
// import { m4_to_s, vecToString } from "./utils"


export class BrushelBoxRenderer extends ShaderProgram{
    u_world_to_view : mat4 = mat4.create()
    box : Cube
    vao: VertexArrayObject



    constructor(gl: WebGL2RenderingContext){
        super(
            gl,
            new VertexShader(gl, `
                //vertex shader to render a single voxel of the brush stroke. Use instanced rendering to render the whole stroke
                precision mediump float;

                in vec3 a_vert_pos_o; //box vertex

                uniform vec3 u_offset_w;
                uniform vec3 u_voxel_shape_w;
                uniform mat4 u_world_to_clip;
                uniform mat3 u_clip_to_world;

                out vec3 v_dist_vert_proj_to_box_center_w;

                vec3 face_colors[6] = vec3[](
                    vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1),
                    vec3(1, 1, 0), vec3(0, 1, 1), vec3(1, 0, 1)
                );
                out vec3 v_color;

                void main(){
                    vec4 box_center_c = u_world_to_clip * vec4(u_offset_w, 1);

                    vec3 vert_pos_w = u_voxel_shape_w * a_vert_pos_o + u_offset_w;
                    vec4 vert_pos_c = u_world_to_clip * vec4(vert_pos_w, 1);
                    vec3 vert_pos_proj_on_slc_plane_c = vec3(vert_pos_c.xy, 0);
                    vec3 dist_vert_proj_to_box_center_c = vert_pos_proj_on_slc_plane_c - box_center_c.xyz;
                    v_dist_vert_proj_to_box_center_w = u_clip_to_world * dist_vert_proj_to_box_center_c;


                    gl_Position = vert_pos_c;
                    v_color = face_colors[int(floor(float(gl_VertexID) / 6.0))]; //2 tris per side, 3 verts per tri
                    if(gl_VertexID == 6){
                        v_color = vec3(1, 0, 0);
                    }
                }
            `),
            new FragmentShader(gl, `
                precision mediump float;

                uniform  vec3 u_voxel_shape_w;

                in vec4 v_box_center_c;
                in vec3 v_color;
                in vec3 v_dist_vert_proj_to_box_center_w;


                out highp vec4 outf_color;

                void main(){
                    vec3 color = v_color;
                    if(all(lessThan(
                        abs(v_dist_vert_proj_to_box_center_w), u_voxel_shape_w / 2.0  //if projection onto slicing plane is still inside box
                    ))){
                        color = mix(color, vec3(1,1,1), 0.5); //increase brightness
                    }
                    outf_color = vec4(color, 1);
                }
            `)
        )
        this.box = new Cube({gl})
        this.vao = new VertexArrayObject(gl) //FIXME: cleanup the vao and box buffer (but vao autodelets on GC anyway...)
    }

    public render({
        brush_strokes,
        camera,
        voxelShape,
        renderParams=new RenderParams({})
    }: {
        brush_strokes: Array<BrushStroke>,
        camera: Camera,
        voxelShape: VoxelShape,
        renderParams?: RenderParams
    }){
        renderParams.use(this.gl)
        this.use()
        this.vao.bind()

        let brush_stroke = brush_strokes[0]

        this.box.getPositionsBuffer(this.gl, BufferUsageHint.STATIC_DRAW).useWithAttribute({
            vao: this.vao, location: this.getAttribLocation("a_vert_pos_o")
        })



        let u_voxel_shape_w = vec3.clone(voxelShape.proportions);
        this.uniform3fv("u_voxel_shape_w", u_voxel_shape_w);

        let m3 = mat3.create(); mat3.fromMat4(m3, camera.world_to_clip)
        // let u_voxel_shape_c = vec3.create(); vec3.transformMat3(u_voxel_shape_c, u_voxel_shape_w, m3);
        // this.uniform3fv("u_voxel_shape_c", u_voxel_shape_c);

        let u_offset_w = vec3.clone(brush_stroke.getVertRef(0));
        vec3.add(u_offset_w, u_offset_w, vec3.fromValues(0.5, 0.5, 0.5)); // +0.5 so box is centered in the middle of the grid cell
        vec3.mul(u_offset_w, u_offset_w, u_voxel_shape_w)
        this.uniform3fv("u_offset_w", u_offset_w)

        let u_world_to_clip = mat4.clone(camera.world_to_clip);
        this.uniformMatrix4fv("u_world_to_clip", u_world_to_clip);


        let v_box_center_c = vec4.create();
        vec4.transformMat4(v_box_center_c, vec4.fromValues(u_offset_w[0], u_offset_w[1], u_offset_w[2], 1), u_world_to_clip);


        let a_vert_pos_o = vec3.clone(this.box.vertices.getVertRef(6));
        let vert_pos_w = vec3.create();
            vec3.mul(vert_pos_w, u_voxel_shape_w, a_vert_pos_o);
            vec3.add(vert_pos_w, vert_pos_w, u_offset_w);
        let vert_pos_c = vec4.create();
            vec4.transformMat4(vert_pos_c, vec4.fromValues(vert_pos_w[0], vert_pos_w[1], vert_pos_w[2], 1), u_world_to_clip);
        let vert_pos_proj_on_slc_plane_c = vec3.fromValues(vert_pos_c[0], vert_pos_c[1], 0);
        let v_dist_vert_proj_to_box_center_c = vec3.fromValues(
            /*Math.abs(*/vert_pos_proj_on_slc_plane_c[0] - v_box_center_c[0],//),
            /*Math.abs(*/vert_pos_proj_on_slc_plane_c[1] - v_box_center_c[1],//),
            /*Math.abs(*/vert_pos_proj_on_slc_plane_c[2] - v_box_center_c[2],//),
        );

        let u_clip_to_world = mat3.create(); mat3.fromMat4(u_clip_to_world, camera.clip_to_world)
        this.uniformMatrix3fv("u_clip_to_world", u_clip_to_world)
        let dist_w = vec3.create(); vec3.transformMat3(dist_w, v_dist_vert_proj_to_box_center_c, u_clip_to_world)


        // console.log(`vert_pos_c: ${vecToString(vert_pos_c)}`)
        // console.log(`v_box_center_c: ${vecToString(v_box_center_c)}`)
        // console.log(`vert_pos_proj_on_slc_plane_c: ${vecToString(vert_pos_proj_on_slc_plane_c)}`)
        // console.log(`v_dist_vert_proj_to_box_center_c: ${vecToString(v_dist_vert_proj_to_box_center_c)}`)
        // console.log(`dist_w: ${vecToString(dist_w)}`)
        // // console.log(`u_voxel_shape_c: ${vecToString(u_voxel_shape_c)}`)
        // console.log("--------------------------------------------------------------")


        this.gl.drawArrays(this.box.vertices.getDrawingMode(), 0, this.box.vertices.numVerts)
    }
}
