import {FragmentShader, VertexShader, ShaderProgram} from "./shader"
import { mat4, vec4, vec3 } from "gl-matrix"
import { CullFace, FrontFace, BlendFactor, DepthFunc, RenderParams, StencilOp, StencilFunc } from "./gl"
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
                float slicing_plane_z_d = 0.5;
                vec3 color;
                if(gl_FrontFacing){
                    if(v_cube_position_d.z > slicing_plane_z_d && gl_FragCoord.z < slicing_plane_z_d){ //only draw front face if the cube is behind (greater depth) slicing plane
                        color = vec3(1.0, 1.0, 0.0); // yellow
                    }else{
                        // discard;
                        color = u_color.rgb;
                    }
                }else{
                    if(v_cube_position_d.z < slicing_plane_z_d  && gl_FragCoord.z > slicing_plane_z_d){ //only draw back face if the cube is in front of (smaller depth) slicing plane
                        color = vec3(1.0, 0.0, 0.0); // red
                    }else{
                        // discard;
                        color = u_color.rgb;
                    }
                }
                    
                float color_intensity = gl_FragCoord.z;

                //outf_color = vec4(color_intensity, color_intensity, color_intensity, u_color.a);
                outf_color = vec4((color * color_intensity), u_color.a);
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

        renderParams: {
            colorMask={r: true, g: true, b: true, a: true},
            depthConfig={
                mask: true,
                func: DepthFunc.LESS,
            },
            stencilConfig={
                func: StencilFunc.ALWAYS, ref: 1, mask: 0xFFFFFFFF, //default stencilFunc to Always pass
                fail: StencilOp.KEEP, zfail: StencilOp.KEEP, zpass: StencilOp.KEEP //default tencil op to not touch the stencil
            },
            cullConfig={
                face: CullFace.BACK,
                frontFace: FrontFace.CCW,
            },
            blendingConfig={
                sfactor: BlendFactor.SRC_ALPHA,
                dfactor: BlendFactor.ONE_MINUS_SRC_ALPHA,
            }
        },
    }: {
        vao: StandardVAO,

        u_world_to_view: mat4,
        u_view_to_device: mat4,
        u_cube_position_w: vec3,

        u_color: vec4,

        renderParams: RenderParams
    }){
        this.gl.colorMask(colorMask.r, colorMask.g, colorMask.b, colorMask.a)

        this.gl.depthMask(depthConfig.mask)
        this.gl.depthFunc(depthConfig.func)

        this.gl.stencilFunc(/*func=*/stencilConfig.func, /*ref=*/stencilConfig.ref, /*mask=*/stencilConfig.mask)
        this.gl.stencilOp(/*fail=*/stencilConfig.fail, /*zfail=*/stencilConfig.zfail, /*zpass=*/stencilConfig.zpass)

        if(cullConfig === false){
            this.gl.disable(this.gl.CULL_FACE)
        }else{
            this.gl.enable(this.gl.CULL_FACE)
            this.gl.frontFace(cullConfig.frontFace)
            this.gl.cullFace(cullConfig.face)
        }

        if(blendingConfig === false){
            this.gl.disable(this.gl.BLEND)
        }else{
            this.gl.enable(this.gl.BLEND)
            this.gl.blendFunc(blendingConfig.sfactor, blendingConfig.dfactor)
        }

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