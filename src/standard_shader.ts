import {FragmentShader, VertexShader, ShaderProgram, VertexArrayObject} from "./shader"
import { GlslAttribute, GlslUniformMat4, GlslType, Buffer, VertexAttributeBuffer, VertexIndicesBuffer } from "./glsl"
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

    public run({vao, u_object_to_clip_value}: {
        vao: StandardVAO,
        u_object_to_clip_value: mat4,
    }){
        vao.bind();
        this.use();
        this.vertex_shader.u_object_to_clip.set(u_object_to_clip_value, this);
        this.gl.drawElements(this.gl.TRIANGLES, vao.num_indices, this.gl.UNSIGNED_SHORT, 0)
    }
}

export class StandardVAO extends VertexArrayObject{
    public readonly a_position_buffer: Buffer<Float32Array>
    public readonly a_position_indices_buffer: Buffer<Uint16Array>
    public readonly num_indices: number
    program: StandardShaderProgram
    constructor({gl, program, a_position_data, a_position_indices}: {
        gl: WebGL2RenderingContext,
        program: StandardShaderProgram,
        a_position_data: Float32Array,
        a_position_indices: Uint16Array
    }){
        super(gl)
        this.program = program;

        this.a_position_buffer = new VertexAttributeBuffer(gl, "a_position_buffer", a_position_data, "STATIC_DRAW")
        this.a_position_indices_buffer = new VertexIndicesBuffer(gl, "position_indices_buffer", a_position_indices, "STATIC_DRAW")
        this.num_indices = a_position_indices.length

        super.bind()
        this.program.vertex_shader.a_position.enable({program: this.program, buffer: this.a_position_buffer, normalize: false})
    }

    public bind(){
        super.bind()
        this.a_position_indices_buffer.bind()
    }

    public drop(){
        console.error("IMPLEMENT ME! Don't forget to also drop the buffers")
    }
}