import {FragmentShader, VertexShader, ShaderProgram, VertexArrayObject} from "./shader"
import { GlslAttribute, GlslUniformMat4, GlslType, Buffer } from "./glsl"
import { mat4 } from "gl-matrix"


export class StandardVertexShader extends VertexShader{
    private constructor(
        gl: WebGL2RenderingContext,
        public readonly a_position: GlslAttribute<Float32Array>,
        public readonly u_object_to_clip: GlslUniformMat4,
    ){
        super(
            gl,
            a_position.toCode() + 
            u_object_to_clip.toCode() + `
            void main(){
                gl_Position = ${u_object_to_clip.name} * vec4(${a_position.name}, 1);
            }`
        )
    }

    public static create(gl: WebGL2RenderingContext): StandardVertexShader{
        let a_position = new GlslAttribute(gl, GlslType.vec3, "a_position")
        let u_object_to_clip = new GlslUniformMat4(gl, "u_object_to_clip")
        return new StandardVertexShader(gl, a_position, u_object_to_clip)
    }
}

export class StandardFragmentShader extends FragmentShader{
    private constructor(gl: WebGL2RenderingContext, code: string){
        super(gl, code)
    }

    public static create(gl: WebGL2RenderingContext): StandardFragmentShader{
        return new StandardFragmentShader(gl, `
            out highp vec4 outf_color;

            void main(){
                outf_color = vec4(1,0,0,1);
            }`
        )
    }
}

export class StandardShaderProgram extends ShaderProgram{
    constructor(
        gl:WebGL2RenderingContext,
        public readonly vertex_shader: StandardVertexShader,
        public readonly fragment_shader: StandardFragmentShader
    ){
        super(gl, vertex_shader, fragment_shader)
    }

    public static create(gl: WebGL2RenderingContext): StandardShaderProgram{
        let vertex_shader = StandardVertexShader.create(gl);
        let fragment_shader = StandardFragmentShader.create(gl);
        return new StandardShaderProgram(gl, vertex_shader, fragment_shader);
    }
}

export class StandardVAO extends VertexArrayObject{
    program: StandardShaderProgram
    constructor({gl, a_position_buffer}: {
        gl: WebGL2RenderingContext,
        a_position_buffer: Buffer<Float32Array>
    }){
        super(gl)
        this.program = StandardShaderProgram.create(gl);

        this.bind()
        this.program.vertex_shader.a_position.enable({program: this.program, buffer: a_position_buffer, normalize: false})
    }

    public render({u_object_to_clip_value}: {
        u_object_to_clip_value: mat4
    }){
        this.program.use();
        this.bind();
        this.program.vertex_shader.u_object_to_clip.set(u_object_to_clip_value, this.program);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, /*offset=*/0, /*count=*/14); //FIXME: get this from g_position_buffer
    }
}