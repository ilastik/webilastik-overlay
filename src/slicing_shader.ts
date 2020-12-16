import {FragmentShader, VertexShader, ShaderProgram} from "./shader"
import { mat4, vec4, vec3 } from "gl-matrix"
import { RenderParams } from "./gl"
import { StandardVAO } from "./standard_shader"



export class SlicingShaderProgram extends ShaderProgram{
    constructor(gl:WebGL2RenderingContext){
        let vertex_shader = new VertexShader(gl, `
            layout(location=0) in vec3 a_position_o;
            layout(location=1) in vec3 a_normal_o;

            //voxels never rotate in the world, so just an offset (instead of a mat4) is enough
            uniform vec3 u_cube_position_w;
            uniform mat4 u_world_to_view;
            uniform mat4 u_view_to_device;

            out mediump vec4 v_cube_position_d;


            void main(){
                vec4 position_w = vec4(a_position_o + u_cube_position_w, 1);
                gl_Position = u_view_to_device * u_world_to_view * position_w;
                v_cube_position_d = u_view_to_device * u_world_to_view * vec4(u_cube_position_w, 1);
            }`
        )

        let fragment_shader = new FragmentShader(gl, `
            precision mediump float;

            uniform vec4 u_color;

            in vec4 v_cube_position_d;

            out highp vec4 outf_color;


            void main(){
                vec3 color;
                if(gl_FrontFacing){
                    if(/*v_cube_position_d.z > 0.0 && */gl_FragCoord.z < 0.5){
                        color = vec3(1.0, 0.0, 0.0); // red
                    }else{
                        discard;
                    }
                }else{
                    if(/*v_cube_position_d.z < 0.0 && */gl_FragCoord.z > 0.5){
                        color = vec3(0.0, 1.0, 0.0); // green
                    }else{
                        discard;
                    }
                }
                // outf_color = vec4(color * (1.0 - gl_FragCoord.z), 0.0);
                outf_color = vec4(color, 0.5);
            }`
        )

        super(gl, vertex_shader, fragment_shader)
    }

    public run({
        vao,

        u_world_to_view,
        u_view_to_device,
        u_cube_position_w,

        u_color,

        renderParams = new RenderParams({})
    }: {
        vao: StandardVAO,

        u_world_to_view: mat4,
        u_view_to_device: mat4,
        u_cube_position_w: vec3,

        u_color: vec4,

        renderParams: RenderParams
    }){
        renderParams.use(this.gl)
        this.use()

        let uniform_location = this.gl.getUniformLocation(this.glprogram, "u_world_to_view");
        this.gl.uniformMatrix4fv(uniform_location, false, u_world_to_view);

        uniform_location = this.gl.getUniformLocation(this.glprogram, "u_view_to_device");
        this.gl.uniformMatrix4fv(uniform_location, false, u_view_to_device);

        uniform_location = this.gl.getUniformLocation(this.glprogram, "u_cube_position_w");
        this.gl.uniform3f(uniform_location, u_cube_position_w[0], u_cube_position_w[1], u_cube_position_w[2]);


        uniform_location = this.gl.getUniformLocation(this.glprogram, "u_color")
        this.gl.uniform4f(uniform_location, u_color[0], u_color[1], u_color[2], u_color[3]);

        vao.bind();
        //console.log(`Trying to draw ${vao.num_positions} verts`)
        this.gl.drawArrays(this.gl.TRIANGLES, 0, vao.num_positions)
    }
}