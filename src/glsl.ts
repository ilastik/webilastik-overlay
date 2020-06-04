import { mat4, vec3 } from "gl-matrix"
import { ShaderProgram } from "./shader"

export type AttributeElementType = "BYTE" | "SHORT" | "UNSIGNED_BYTE" | "UNSIGNED_SHORT" | "FLOAT"
export type AttributeNumElements = 1 | 2 | 3 | 4
export type BinaryArray = ArrayBufferView & {length: number}

export class GlslType<Arr extends BinaryArray>{
    private constructor(
        public readonly GlslName: string,
        public readonly elementType: AttributeElementType,
        public readonly numElements: number,
        public readonly binaryArrayFactory: {new(values: Array<number>): Arr}
    ){
    }

    static vec4 = new GlslType("vec4", "FLOAT", 4, Float32Array)
    static vec3 = new GlslType("vec3", "FLOAT", 3, Float32Array)
    static vec2 = new GlslType("vec2", "FLOAT", 2, Float32Array)
}

export type UniformHostType = mat4 | vec3

export abstract class GlslUniform<VARIABLE_TYPE extends UniformHostType>{
    constructor(
        public readonly gl: WebGL2RenderingContext,
        public readonly name: string,
    ){}

    public abstract toCode() : string;
    protected abstract doSet(position: WebGLUniformLocation, value: VARIABLE_TYPE): void;

    public set(value: VARIABLE_TYPE, program: ShaderProgram){
        program.use()
        var uniform_location = this.gl.getUniformLocation(program.glprogram, this.name);
        if(uniform_location === null){
            throw `Could not find uniform named ${this.name}`
        }
        this.doSet(uniform_location, value);
    }
}

export class GlslUniformMat4 extends GlslUniform<mat4>{
    protected doSet(uniform_location: WebGLUniformLocation, value: mat4){
        this.gl.uniformMatrix4fv(uniform_location, false, value)
    }

    public toCode() : string{
        return `uniform mat4 ${this.name};\n`
    }
}

export class GlslAttribute<Arr extends BinaryArray>{
    constructor(
        public readonly gl: WebGL2RenderingContext,
        public readonly GlslType: GlslType<Arr>,
        public readonly name: string
    ){}

    public toCode() : string{
        return `in ${this.GlslType.GlslName} ${this.name};\n`
    }

    public enable({program, buffer, normalize, byteOffset=0}: {
        program: ShaderProgram,
        buffer: Buffer<Arr>,
        normalize: boolean,
        byteOffset?: number
    }){
        let location = program.getAttribLocation(this.name);
        this.gl.enableVertexAttribArray(location.raw);
        buffer.bindAs("ARRAY_BUFFER")
        this.gl.vertexAttribPointer(
            /*index=*/location.raw,
            /*size=*/this.GlslType.numElements,
            /*type=*/this.gl[this.GlslType.elementType],
            /*normalize=*/normalize,
            /*stride=*/0,
            /*offset=*/byteOffset
        )
        buffer.unbind()
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

    public destroy(){
        this.gl.deleteBuffer(this.glbuffer)
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

