import { mat3, mat4, vec3 } from "gl-matrix"
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

        let u_offset_w = vec3.clone(brush_stroke.getVertRef(0));
        vec3.add(u_offset_w, u_offset_w, vec3.fromValues(0.5, 0.5, 0.5)); // +0.5 so box is centered in the middle of the grid cell
        vec3.mul(u_offset_w, u_offset_w, u_voxel_shape_w)
        this.uniform3fv("u_offset_w", u_offset_w)

        let u_world_to_clip = mat4.clone(camera.world_to_clip);
        this.uniformMatrix4fv("u_world_to_clip", u_world_to_clip);

        let u_clip_to_world = mat3.create(); mat3.fromMat4(u_clip_to_world, camera.clip_to_world)
        this.uniformMatrix3fv("u_clip_to_world", u_clip_to_world)

        this.gl.drawArrays(this.box.vertices.getDrawingMode(), 0, this.box.vertices.numVerts)
    }
}
