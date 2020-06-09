import { AttributeElementType, BinaryArray } from "./gl";

export class VertexArrayObject{
    private glAttributeObject : WebGLVertexArrayObject
    constructor(public readonly gl: WebGL2RenderingContext){
        let vao = this.gl.createVertexArray();
        if(vao === null){
            throw `Could not create vertex GlslAttribute object`
        }
        this.glAttributeObject = vao;
    }

    public bind(){
        this.gl.bindVertexArray(this.glAttributeObject);
    }

    public unbind(){
        this.gl.bindVertexArray(null);
    }
}

export type BindTarget = "ARRAY_BUFFER" | "ELEMENT_ARRAY_BUFFER"
export type BufferUsageHint = "STATIC_DRAW" | "DYNAMIC_DRAW"

export abstract class Buffer<Arr extends BinaryArray>{
    protected glbuffer: WebGLBuffer
    public numElements: number

    constructor(
        public readonly gl: WebGL2RenderingContext,
        data: Arr,
        usageHint: BufferUsageHint,
        public readonly name="",
    ){
        let buf = gl.createBuffer();
        if(buf === null){
            throw `Could not create buffer`
        }
        this.glbuffer = buf
        this.populate(data, usageHint)
    }

    public abstract get_bind_target(): BindTarget;

    public destroy(){
        this.gl.deleteBuffer(this.glbuffer)
    }

    public bind(){
        this.gl.bindBuffer(this.gl[this.get_bind_target()], this.glbuffer);
    }

    public unbind(){
        this.gl.bindBuffer(this.gl[this.get_bind_target()], null);
    }

    public populate(data: Arr, usageHint: BufferUsageHint){
        this.bind()
        this.gl.bufferData(this.gl[this.get_bind_target()], data, this.gl[usageHint])
        //this.unbind() //i'm not sure if unbinding will remove the index buffer from its vao
        this.numElements = data.length
    }

}

export abstract class VertexAttributeBuffer extends Buffer<Float32Array>{
    public get_bind_target(): BindTarget{
        return "ARRAY_BUFFER"
    }

    protected vertexAttribPointer({vao, location, byteOffset=0, normalize, numElements, elementType}:{
        vao: VertexArrayObject,
        location: number,
        byteOffset?: number,
        normalize: boolean,
        numElements: number,
        elementType: AttributeElementType
    }){
        vao.bind();
        this.gl.enableVertexAttribArray(location);
        this.bind()
        this.gl.vertexAttribPointer(
            /*index=*/location,
            /*size=*/numElements,
            /*type=*/this.gl[elementType],
            /*normalize=*/normalize,
            /*stride=*/0,
            /*offset=*/byteOffset
        )
        this.unbind()
    }
}


export class Vec3AttributeBuffer extends VertexAttributeBuffer{
    public useWithAttribute({vao, location}:{
        vao: VertexArrayObject,
        location: number,
    }){
        this.vertexAttribPointer({vao, location, numElements: 3, elementType: "FLOAT", normalize: false})
    }
}

export class VertexIndicesBuffer extends Buffer<Uint16Array>{
    public readonly num_indices: number
    constructor(
        gl: WebGL2RenderingContext,
        data: Uint16Array,
        usageHint: BufferUsageHint,
        name="",
    ){
        super(gl, data, usageHint, name)
        this.num_indices = data.length
    }

    public get_bind_target(): BindTarget{
        return "ELEMENT_ARRAY_BUFFER"
    }
}