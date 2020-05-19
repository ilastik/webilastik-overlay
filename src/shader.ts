export class Shader{
    public readonly raw: WebGLShader
    public readonly source: string
    constructor(public readonly gl: WebGL2RenderingContext, source: string, shader_type: number){
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
        super(gl, source, gl.FRAGMENT_SHADER)
    }
}


export type AttributeElementType = "BYTE" | "SHORT" | "UNSIGNED_BYTE" | "UNSIGNED_SHORT" | "FLOAT"
export type AttributeNumElements = 1 | 2 | 3 | 4
export type BinaryArray = ArrayBufferView & {length: number}

export class AttributeType<Arr extends BinaryArray>{
    private constructor(
        public readonly glslName: string,
        public readonly elementType: AttributeElementType,
        public readonly numElements: number,
        public readonly binaryArrayFactory: {new(values: Array<number>): Arr}
    ){
    }

    static vec4 = new AttributeType("vec4", "FLOAT", 4, Float32Array)
    static vec3 = new AttributeType("vec3", "FLOAT", 3, Float32Array)
    static vec2 = new AttributeType("vec2", "FLOAT", 2, Float32Array)
}

export class Attribute<Arr extends BinaryArray>{
    constructor(
        public readonly gl: WebGL2RenderingContext,
        public readonly attributeType: AttributeType<Arr>,
        public readonly name: string
    ){}

    public toCode() : string{
        return `in ${this.attributeType.glslName} ${this.name};`
    }

    public enable({program, buffer, normalize, byteOffset=0}: {
        program: ShaderProgram,
        buffer: Buffer<Arr>,
        normalize: boolean,
        byteOffset: number
    }){
        let location = program.getAttribLocation(this.name);
        this.gl.enableVertexAttribArray(location.raw);
        buffer.bindAs("ARRAY_BUFFER")
        this.gl.vertexAttribPointer(
            /*index=*/location.raw,
            /*size=*/this.attributeType.numElements,
            /*type=*/this.gl[this.attributeType.elementType],
            /*normalize=*/normalize,
            /*stride=*/0,
            /*offset=*/byteOffset
        )
        buffer.unbind()
    }
}

export class VertexShader extends Shader{
    constructor(gl: WebGL2RenderingContext, source: string){
        super(gl, source, gl.VERTEX_SHADER)
    }
}


export class AttributeLocation{
    constructor(public readonly raw: number){
        if(raw == -1){throw `Could not find attribute`}
    }
}

export class ShaderProgram{
    private glprogram: WebGLProgram
    constructor(
        public readonly gl: WebGL2RenderingContext,
        public readonly vertexShader: VertexShader,
        public readonly fragmentShader: FragmentShader
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

    public use(){
        this.gl.useProgram(this.glprogram)
    }
}


export type BindTarget = "ARRAY_BUFFER" | "ELEMENT_ARRAY_BUFFER"
export type BufferUsageHint = "STATIC_DRAW" | "DYNAMIC_DRAW"

export class Buffer<Arr extends BinaryArray>{
    protected static bindings = new Map<BindTarget, string>();

    protected glbuffer: WebGLBuffer
    protected target: BindTarget | undefined
    public numElements: number

    constructor(
        public readonly gl: WebGL2RenderingContext,
        public readonly name: string,
        data: Arr,
        usageHint: BufferUsageHint,
    ){
        let buf = gl.createBuffer();
        if(buf === null){
            throw `Could not create buffer`
        }
        this.glbuffer = buf
        this.populate(data, usageHint)
    }

    public get bindTarget() : BindTarget | undefined{
        return this.target
    }

    public bindAs(target: BindTarget){
        let previouslyBound = Buffer.bindings.get(target)
        if(previouslyBound !== undefined){
            throw `Buffer ${previouslyBound} was still bound to ${target} when binding ${this.name}`
        }
        this.gl.bindBuffer(this.gl[target], this.glbuffer);
        this.target = target
        Buffer.bindings.set(target, this.name)
    }

    public unbind(){
        if(this.target === undefined){
            throw `Trying to unbind unbound vuffer ${this.name}`
        }
        this.gl.bindBuffer(this.gl[this.target!], null);
        Buffer.bindings.delete(this.target)
        this.target = undefined
    }

    public populate(data: Arr, usageHint: BufferUsageHint){
        this.bindAs("ARRAY_BUFFER")
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl[usageHint])
        this.unbind()
        this.numElements = data.length
    }
}

export class VertexArrayObject{
    private glAttributeObject : WebGLVertexArrayObject
    constructor(public readonly gl: WebGL2RenderingContext){
        let vao = this.gl.createVertexArray();
        if(vao === null){
            throw `Could not create vertex attribute object`
        }
        this.glAttributeObject = vao;
    }

    public bind(){
        this.gl.bindVertexArray(this.glAttributeObject);
    }
}
