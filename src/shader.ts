export enum ShaderType{
    FRAGMENT_SHADER = WebGL2RenderingContext.FRAGMENT_SHADER,
    VERTEX_SHADER = WebGL2RenderingContext.VERTEX_SHADER,
}

export class Shader{
    public readonly raw: WebGLShader
    public readonly source: string
    constructor(public readonly gl: WebGL2RenderingContext, source: string, shader_type: ShaderType){
        this.source, source = "#version 300 es\n" + source
        let glshader = gl.createShader(shader_type)! //FIXME check this?
        gl.shaderSource(glshader, source)
        gl.compileShader(glshader)
        let success = gl.getShaderParameter(glshader, gl.COMPILE_STATUS);
        if (!success){
            let error_log = gl.getShaderInfoLog(glshader);
            gl.deleteShader(glshader);
            throw error_log + "\n\n" + source
        }
        this.raw = glshader
    }
}

export class FragmentShader extends Shader{
    constructor(gl: WebGL2RenderingContext, source: string){
        super(gl, source, ShaderType.FRAGMENT_SHADER)
    }
}

export class VertexShader extends Shader{
    constructor(gl: WebGL2RenderingContext, source: string){
        super(gl, source, ShaderType.VERTEX_SHADER)
    }
}

export class AttributeLocation{
    constructor(public readonly raw: number){
        if(raw == -1){throw `Could not find GlslAttribute`}
    }
}

export class ShaderProgram{
    public readonly glprogram: WebGLProgram
    public static currentProgram: ShaderProgram | undefined
    constructor(
        public readonly gl: WebGL2RenderingContext,
        vertexShader: VertexShader,
        fragmentShader: FragmentShader
    ){
        let program = gl.createProgram()!; //FIXME check this?
        gl.attachShader(program, vertexShader.raw);
        gl.attachShader(program, fragmentShader.raw);
        gl.linkProgram(program);
        var success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!success) {
            let error_log = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw error_log
        }
        this.glprogram = program;
        console.log(`Created program ${this.glprogram}`)
    }

    public getAttribLocation(name: string) : AttributeLocation{
        return new AttributeLocation(this.gl.getAttribLocation(this.glprogram, name))
    }

    public getUniformLocation(name: string): WebGLUniformLocation | null{
        return this.gl.getUniformLocation(this.glprogram, name)
    }

    public use(){
        if(ShaderProgram.currentProgram == this){
            return
        }
        this.gl.useProgram(this.glprogram)
        ShaderProgram.currentProgram = this
    }
}
